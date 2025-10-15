/**
 * IndexedDB 持久化缓存实现
 *
 * 提供跨会话的持久化缓存，支持TTL和LRU策略，离线可用
 */

import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { ICacheService, CacheEntry, CacheStatistics, CacheMetadata } from '../interfaces/ICacheService.js';

/** 缓存层级定义 */
type CacheTier = 'persistent' | 'lru';

/** 分层缓存配置 */
interface TierConfig {
  /** 最大条目数量 */
  maxCount?: number;
  /** 最大容量(MB) */
  maxSizeMB?: number;
  /** 默认TTL(毫秒) */
  defaultTTL?: number;
}

interface IndexedDBCacheOptions {
  /** 数据库名称 */
  dbName?: string;
  /** 数据库版本 */
  dbVersion?: number;

  /** 分层配置 */
  tiers?: {
    /** 持久层：metadata.json等核心数据，永不淘汰 */
    persistent?: TierConfig;
    /** LRU层：文章和附件，按容量淘汰 */
    lru?: TierConfig;
  };

  /** MD5轮询配置 */
  polling?: {
    /** 是否启用MD5检测 */
    enabled?: boolean;
    /** 轮询间隔(毫秒) */
    interval?: number;
    /** 轮询的URL基础路径 */
    baseUrl?: string;
  };

  /** 清理配置 */
  cleanup?: {
    /** 清理间隔(毫秒) - 可以设置为很大的值或0禁用 */
    interval?: number;
    /** 是否启用自动清理 */
    enabled?: boolean;
  };
}

interface StoredCacheEntry extends CacheEntry {
  key: string;
  lastAccessed: number;
  /** 缓存层级 */
  tier: CacheTier;
  /** 文件内容MD5哈希 */
  contentHash?: string;
  /** 源文件URL */
  sourceUrl?: string;
  /** 文件修改时间 */
  lastModified?: number;
}

export class IndexedDBCache implements ICacheService {
  private db?: IDBPDatabase;
  private options: Required<IndexedDBCacheOptions>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private cleanupTimer?: NodeJS.Timeout;
  private pollingTimer?: NodeJS.Timeout;
  private initialized = false;
  private initPromise?: Promise<void>;

  // 默认配置
  private defaultOptions: Required<IndexedDBCacheOptions> = {
    dbName: 'helenite-cache',
    dbVersion: 1,
    tiers: {
      persistent: {
        maxCount: Infinity, // 持久层无自动数量限制（不主动清理）
        maxSizeMB: Infinity, // 持久层无自动大小限制（不主动清理）
        defaultTTL: undefined // 持久层无自动TTL过期（不主动清理）
      },
      lru: {
        maxCount: 1000, // LRU层最大1000个文件
        maxSizeMB: 500, // LRU层最大500MB
        defaultTTL: 1800000 // LRU层默认30分钟TTL
      }
    },
    polling: {
      enabled: false,
      interval: 300000, // 5分钟轮询一次
      baseUrl: ''
    },
    cleanup: {
      interval: 3600000, // 1小时清理一次（低频）
      enabled: true
    }
  };

  constructor(options: IndexedDBCacheOptions = {}) {
    // 合并用户配置与默认配置
    this.options = this.mergeOptions(options);

    // 初始化数据库
    this.initPromise = this.initialize();

    // 启动定期清理（如果启用）
    if (this.options.cleanup?.enabled && this.options.cleanup?.interval) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.options.cleanup.interval);
    }

    // 启动MD5轮询（如果启用）
    if (this.options.polling?.enabled) {
      this.pollingTimer = setInterval(() => {
        this.pollForChanges();
      }, this.options.polling?.interval || 300000);
    }
  }

  /**
   * 合并用户配置与默认配置
   */
  private mergeOptions(userOptions: IndexedDBCacheOptions): Required<IndexedDBCacheOptions> {
    return {
      ...this.defaultOptions,
      ...userOptions,
      tiers: {
        ...this.defaultOptions.tiers,
        ...userOptions.tiers,
        persistent: { ...this.defaultOptions.tiers.persistent, ...userOptions.tiers?.persistent },
        lru: { ...this.defaultOptions.tiers.lru, ...userOptions.tiers?.lru }
      },
      polling: { ...this.defaultOptions.polling, ...userOptions.polling },
      cleanup: { ...this.defaultOptions.cleanup, ...userOptions.cleanup }
    };
  }

  /**
   * 计算字符串的内容哈希（使用 SHA-256）
   * 注：Web Crypto API 不支持 MD5，使用 SHA-256 代替
   */
  private async calculateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 根据缓存键判断应该存储在哪个层级
   */
  private determineTier(key: string): CacheTier {
    // 持久层关键词：metadata, file-tree, global-graph, config, settings
    const persistentKeywords = ['metadata', 'file-tree', 'global-graph', 'config', 'settings', 'vault-info'];

    for (const keyword of persistentKeywords) {
      if (key.includes(keyword)) {
        return 'persistent';
      }
    }

    // 默认存储在LRU层
    return 'lru';
  }

  /**
   * 内容哈希轮询检查文件变更（使用 SHA-256）
   */
  private async pollForChanges(): Promise<void> {
    if (!this.options.polling?.enabled || !this.options.polling?.baseUrl) {
      return;
    }

    try {
      const tx = this.db!.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      for await (const cursor of store) {
        const entry: StoredCacheEntry = cursor.value;

        // 只检查有sourceUrl的条目
        if (entry.sourceUrl) {
          await this.checkAndUpdateEntry(entry);
        }
      }
    } catch {
      // TODO: 处理错误
    }
  }

  /**
   * 检查并更新单个缓存条目
   */
  private async checkAndUpdateEntry(entry: StoredCacheEntry): Promise<void> {
    try {
      // 构造完整 URL：sourceUrl 存储的是相对路径
      const baseUrl = this.options.polling?.baseUrl || '';
      const fullUrl = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/${entry.sourceUrl}` : entry.sourceUrl!;

      const response = await fetch(fullUrl, {
        cache: 'no-cache' // 绕过浏览器缓存
      });
      if (!response.ok) return;

      const content = await response.text();
      const currentHash = await this.calculateContentHash(content);

      // 哈希不匹配，需要更新
      if (currentHash !== entry.contentHash) {
        // 更新缓存条目
        await this.set(entry.key, content, entry.ttl, {
          tier: entry.tier,
          sourceUrl: entry.sourceUrl,
          contentHash: currentHash
        });

        // 触发上层服务更新事件
        this.notifyUpstreamServices(entry.key, content);
      }
    } catch {
      // TODO: 处理错误
    }
  }

  /**
   * 通知上层服务数据已更新
   */
  private notifyUpstreamServices(key: string, newContent: unknown): void {
    // 发送自定义事件，上层服务可以监听
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cacheUpdated', {
        detail: { key, content: newContent, timestamp: Date.now() }
      }));
    }
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    this.db = await openDB(this.options.dbName || 'helenite-cache', this.options.dbVersion || 1, {
      upgrade(db) {
        // 创建主缓存存储
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('lastAccessed', 'lastAccessed');
          store.createIndex('timestamp', 'timestamp');
        }

        // 创建命名空间存储
        if (!db.objectStoreNames.contains('namespaces')) {
          db.createObjectStore('namespaces');
        }
      },
    });
    this.initialized = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    await this.ensureInitialized();

    try {
      const entry: StoredCacheEntry | undefined = await this.db!.get('cache', key);

      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // 检查是否过期
      const now = Date.now();
      if (entry.ttl && now > entry.timestamp + entry.ttl) {
        await this.db!.delete('cache', key);
        this.stats.misses++;
        return null;
      }

      // 更新访问时间 (LRU)
      const updatedEntry: StoredCacheEntry = {
        ...entry,
        lastAccessed: now
      };
      await this.db!.put('cache', updatedEntry);

      this.stats.hits++;
      return entry.value as T;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  /**
   * 增强的set方法，支持分层存储和内容哈希检测（SHA-256）
   */
  async set<T = unknown>(
    key: string,
    value: T,
    ttl?: number,
    metadata?: CacheMetadata
  ): Promise<void> {
    await this.ensureInitialized();

    const tier = metadata?.tier || this.determineTier(key);
    const tierConfig = this.options.tiers![tier]!;

    // 计算TTL：持久层可能没有TTL
    const finalTTL = ttl ?? tierConfig.defaultTTL;
    const now = Date.now();

    // 计算内容哈希（如果是字符串内容）
    let contentHash = metadata?.contentHash;
    if (!contentHash && typeof value === 'string' && metadata?.sourceUrl) {
      contentHash = await this.calculateContentHash(value);
    }

    const entry: StoredCacheEntry = {
      key,
      value,
      timestamp: now,
      ttl: finalTTL,
      size: this.estimateSize(value),
      lastAccessed: now,
      tier,
      contentHash,
      sourceUrl: metadata?.sourceUrl
    };

    // 只对LRU层执行容量检查和清理
    if (tier === 'lru') {
      await this.enforceCapacityLimits('lru');
    }

    await this.db!.put('cache', entry);

  }

  async getOrSet<T = unknown>(key: string, factory: () => Promise<T>, ttl?: number, metadata?: CacheMetadata): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl, metadata);
    return value;
  }

  async delete(key: string): Promise<void> {
    await this.ensureInitialized();
    try {
      await this.db!.delete('cache', key);
    } catch {
      // TODO: 处理错误
    }
  }

  async has(key: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      const entry: StoredCacheEntry | undefined = await this.db!.get('cache', key);
      if (!entry) return false;

      // 检查是否过期
      if (entry.ttl && Date.now() > entry.timestamp + entry.ttl) {
        await this.db!.delete('cache', key);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async getMultiple<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }

    return result;
  }

  async setMultiple<T = unknown>(entries: Map<string, T>, ttl?: number, metadata?: CacheMetadata): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl, metadata);
    }
  }

  async deleteMultiple(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.delete(key);
    }
  }

  async getKeysMatching(pattern: string): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const regex = this.patternToRegex(pattern);
      const matchingKeys: string[] = [];

      const tx = this.db!.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      for await (const cursor of store) {
        if (regex.test(cursor.value.key)) {
          matchingKeys.push(cursor.value.key);
        }
      }

      return matchingKeys;
    } catch {
      return [];
    }
  }

  async deleteMatching(pattern: string): Promise<number> {
    const matchingKeys = await this.getKeysMatching(pattern);
    await this.deleteMultiple(matchingKeys);
    return matchingKeys.length;
  }

  async clearByPrefix(prefix: string): Promise<number> {
    return this.deleteMatching(`${prefix}*`);
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      const tx = this.db!.transaction('cache', 'readwrite');
      await tx.objectStore('cache').clear();
      this.stats = { hits: 0, misses: 0, evictions: 0 };
    } catch {
      // TODO: 处理错误
    }
  }

  async getStatistics(): Promise<CacheStatistics> {
    await this.ensureInitialized();

    try {
      const total = this.stats.hits + this.stats.misses;
      const totalEntries = await this.getCount();
      const totalSize = await this.getSize();

      return {
        totalEntries,
        totalSize,
        hitRate: total > 0 ? this.stats.hits / total : 0,
        missRate: total > 0 ? this.stats.misses / total : 0,
        evictions: this.stats.evictions
      };
    } catch {
      return {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        missRate: 0,
        evictions: 0
      };
    }
  }

  async getSize(): Promise<number> {
    await this.ensureInitialized();

    try {
      let totalSize = 0;
      const tx = this.db!.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      for await (const cursor of store) {
        totalSize += cursor.value.size || 0;
      }

      return totalSize;
    } catch {
      return 0;
    }
  }

  async getCount(): Promise<number> {
    await this.ensureInitialized();

    try {
      return await this.db!.count('cache');
    } catch {
      return 0;
    }
  }

  setDefaultTTL(ttl: number): void {
    // Update default TTL for LRU tier
    if (this.options.tiers?.lru) {
      this.options.tiers.lru.defaultTTL = ttl;
    }
  }

  setMaxSize(maxSize: number): void {
    // Update LRU tier max size (in MB)
    if (this.options.tiers?.lru) {
      this.options.tiers.lru.maxSizeMB = maxSize / (1024 * 1024); // Convert bytes to MB
    }
  }

  /**
   * 强制执行容量限制（分层LRU）
   * 重要：只对LRU层执行自动清理，持久层需要手动清理
   */
  private async enforceCapacityLimits(tier: CacheTier): Promise<number> {
    // 持久层不执行自动容量限制
    if (tier === 'persistent') {
      return 0;
    }

    const tierConfig = this.options.tiers![tier]!;
    let evicted = 0;

    try {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');

      // 获取该层级的所有条目，按访问时间排序
      const tierEntries: StoredCacheEntry[] = [];
      let _totalSize = 0;

      for await (const cursor of store) {
        const entry: StoredCacheEntry = cursor.value;
        if (entry.tier === tier) {
          tierEntries.push(entry);
          _totalSize += entry.size || 0;
        }
      }

      // 按访问时间排序（最久未访问的在前）
      tierEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);

      // 检查数量限制
      if (tierConfig.maxCount && tierConfig.maxCount !== Infinity && tierEntries.length > tierConfig.maxCount) {
        const toEvict = tierEntries.length - tierConfig.maxCount;
        for (let i = 0; i < toEvict; i++) {
          await store.delete(tierEntries[i].key);
          evicted++;
        }
      }

      // 检查大小限制
      if (tierConfig.maxSizeMB && tierConfig.maxSizeMB !== Infinity) {
        const maxSizeBytes = tierConfig.maxSizeMB * 1024 * 1024;
        let currentSize = tierEntries.reduce((sum, entry) => sum + (entry.size || 0), 0);
        let evictIndex = 0;

        while (currentSize > maxSizeBytes && evictIndex < tierEntries.length) {
          const entryToEvict = tierEntries[evictIndex];
          await store.delete(entryToEvict.key);
          currentSize -= entryToEvict.size || 0;
          evicted++;
          evictIndex++;
        }
      }

      this.stats.evictions += evicted;
      return evicted;
    } catch {
      return 0;
    }
  }

  async cleanup(): Promise<number> {
    await this.ensureInitialized();

    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');

      for await (const cursor of store) {
        const entry: StoredCacheEntry = cursor.value;

        // 只清理有TTL且已过期的条目
        // 持久层条目通常没有TTL，不会被自动清理
        if (entry.ttl && now > entry.timestamp + entry.ttl) {
          // 额外检查：即使过期，持久层数据也需要用户确认才删除
          if (entry.tier === 'persistent') {
            continue; // 跳过持久层数据的自动清理
          }

          expiredKeys.push(entry.key);
          await cursor.delete();
        }
      }

      return expiredKeys.length;
    } catch {
      return 0;
    }
  }

  // ===============================
  // 用户可控的清理和管理函数
  // ===============================

  /**
   * 手动清理指定层级的缓存
   * 注意：持久层数据需要用户主动清理，系统不会自动删除
   */
  async clearTier(tier: CacheTier): Promise<number> {
    await this.ensureInitialized();

    try {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      let cleared = 0;

      for await (const cursor of store) {
        const entry: StoredCacheEntry = cursor.value;
        if (entry.tier === tier) {
          await cursor.delete();
          cleared++;
        }
      }

      return cleared;
    } catch {
      return 0;
    }
  }

  /**
   * 强制清理LRU层（保留持久层）
   */
  async clearLRU(): Promise<number> {
    return this.clearTier('lru');
  }

  /**
   * 获取分层统计信息
   */
  async getTierStatistics(): Promise<{
    persistent: { count: number; sizeMB: number };
    lru: { count: number; sizeMB: number };
  }> {
    await this.ensureInitialized();

    const stats = {
      persistent: { count: 0, sizeMB: 0 },
      lru: { count: 0, sizeMB: 0 }
    };

    try {
      const tx = this.db!.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      for await (const cursor of store) {
        const entry: StoredCacheEntry = cursor.value;
        stats[entry.tier].count++;
        stats[entry.tier].sizeMB += (entry.size || 0) / (1024 * 1024);
      }

      // 四舍五入到小数点后2位
      stats.persistent.sizeMB = Math.round(stats.persistent.sizeMB * 100) / 100;
      stats.lru.sizeMB = Math.round(stats.lru.sizeMB * 100) / 100;

    } catch {
      // TODO: 处理错误
    }

    return stats;
  }

  /**
   * 启用/禁用MD5轮询
   */
  enablePolling(baseUrl?: string): void {
    if (!this.options.polling) {
      this.options.polling = { enabled: true, interval: 300000, baseUrl: baseUrl || '' };
    } else {
      this.options.polling.enabled = true;
      if (baseUrl) this.options.polling.baseUrl = baseUrl;
    }

    if (!this.pollingTimer) {
      this.pollingTimer = setInterval(() => {
        this.pollForChanges();
      }, this.options.polling.interval || 300000);
    }
  }

  /**
   * 禁用MD5轮询
   */
  disablePolling(): void {
    if (this.options.polling) {
      this.options.polling.enabled = false;
    }

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }

  /**
   * 手动触发一次MD5检查
   */
  async checkForUpdates(): Promise<void> {
    await this.pollForChanges();
  }

  /**
   * 清理持久层数据（需要用户明确确认）
   */
  async clearPersistent(confirmMessage = '确认清理所有持久层数据？这将删除 metadata.json 等核心文件的缓存'): Promise<number> {
    // 在浏览器环境中要求用户确认
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) {
        return 0;
      }
    }

    const cleared = await this.clearTier('persistent');
    return cleared;
  }

  /**
   * 获取过期但未自动清理的持久层数据
   */
  async getExpiredPersistentData(): Promise<string[]> {
    await this.ensureInitialized();

    const expiredKeys: string[] = [];
    const now = Date.now();

    try {
      const tx = this.db!.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      for await (const cursor of store) {
        const entry: StoredCacheEntry = cursor.value;

        if (entry.tier === 'persistent' && entry.ttl && now > entry.timestamp + entry.ttl) {
          expiredKeys.push(entry.key);
        }
      }
    } catch {
      // TODO: 处理错误
    }

    return expiredKeys;
  }

  /**
   * 强制清理过期的持久层数据（跳过用户确认）
   */
  async forceCleanupExpiredPersistent(): Promise<number> {
    const expiredKeys = await this.getExpiredPersistentData();

    if (expiredKeys.length === 0) {
      return 0;
    }

    let cleared = 0;
    try {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');

      for (const key of expiredKeys) {
        await store.delete(key);
        cleared++;
      }

    } catch {
      // TODO: 处理错误
    }

    return cleared;
  }

  /**
   * 更新层级配置
   */
  updateTierConfig(tier: CacheTier, config: Partial<TierConfig>): void {
    if (this.options.tiers && this.options.tiers[tier]) {
      this.options.tiers[tier] = { ...this.options.tiers[tier], ...config };
    }
  }

  namespace(name: string): ICacheService {
    return new NamespacedCache(this, name);
  }

  async getNamespaces(): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const namespaces = new Set<string>();
      const tx = this.db!.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      for await (const cursor of store) {
        const key = cursor.value.key;
        const colonIndex = key.indexOf(':');
        if (colonIndex > 0) {
          namespaces.add(key.substring(0, colonIndex));
        }
      }

      return Array.from(namespaces);
    } catch {
      return [];
    }
  }

  // 清理资源
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }

    // 关闭数据库连接
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }

    this.initialized = false;
  }

  // 私有方法

  private patternToRegex(pattern: string): RegExp {
    // 将通配符模式转换为正则表达式
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }

  private estimateSize(value: unknown): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    if (value instanceof Uint8Array) {
      return value.length;
    }
    // 兼容 Node.js Buffer (在浏览器中不存在)
    if (typeof Buffer !== 'undefined' && value instanceof Buffer) {
      return value.length;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    }
    return 8; // 基本类型估算
  }
}

/**
 * 命名空间缓存代理
 */
class NamespacedCache implements ICacheService {
  private cache: ICacheService;
  private namespaceName: string;

  constructor(
    cache: ICacheService,
    namespaceName: string
  ) {
    this.cache = cache;
    this.namespaceName = namespaceName;
  }

  private getNamespacedKey(key: string): string {
    return `${this.namespaceName}:${key}`;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.cache.get<T>(this.getNamespacedKey(key));
  }

  async set<T = unknown>(key: string, value: T, ttl?: number, metadata?: CacheMetadata): Promise<void> {
    return this.cache.set(this.getNamespacedKey(key), value, ttl, metadata);
  }

  async getOrSet<T = unknown>(key: string, factory: () => Promise<T>, ttl?: number, metadata?: CacheMetadata): Promise<T> {
    return this.cache.getOrSet(this.getNamespacedKey(key), factory, ttl, metadata);
  }

  async delete(key: string): Promise<void> {
    return this.cache.delete(this.getNamespacedKey(key));
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(this.getNamespacedKey(key));
  }

  async getMultiple<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
    const namespacedKeys = keys.map(k => this.getNamespacedKey(k));
    const result = await this.cache.getMultiple<T>(namespacedKeys);

    // 转换回原始键名
    const converted = new Map<string, T | null>();
    for (let i = 0; i < keys.length; i++) {
      converted.set(keys[i], result.get(namespacedKeys[i]) || null);
    }

    return converted;
  }

  async setMultiple<T = unknown>(entries: Map<string, T>, ttl?: number, metadata?: CacheMetadata): Promise<void> {
    const namespacedEntries = new Map<string, T>();
    for (const [key, value] of entries) {
      namespacedEntries.set(this.getNamespacedKey(key), value);
    }
    return this.cache.setMultiple(namespacedEntries, ttl, metadata);
  }

  async deleteMultiple(keys: string[]): Promise<void> {
    const namespacedKeys = keys.map(k => this.getNamespacedKey(k));
    return this.cache.deleteMultiple(namespacedKeys);
  }

  async getKeysMatching(pattern: string): Promise<string[]> {
    const namespacedPattern = this.getNamespacedKey(pattern);
    const matchingKeys = await this.cache.getKeysMatching(namespacedPattern);

    // 移除命名空间前缀
    const prefix = `${this.namespace}:`;
    return matchingKeys
      .filter(key => key.startsWith(prefix))
      .map(key => key.substring(prefix.length));
  }

  async deleteMatching(pattern: string): Promise<number> {
    return this.cache.deleteMatching(this.getNamespacedKey(pattern));
  }

  async clearByPrefix(prefix: string): Promise<number> {
    return this.cache.clearByPrefix(this.getNamespacedKey(prefix));
  }

  async clear(): Promise<void> {
    await this.cache.clearByPrefix(`${this.namespaceName}:`);
  }

  async getStatistics(): Promise<CacheStatistics> {
    // 注意：这返回的是整个缓存的统计，而不是命名空间的
    return this.cache.getStatistics();
  }

  async getSize(): Promise<number> {
    return this.cache.getSize();
  }

  async getCount(): Promise<number> {
    return this.cache.getCount();
  }

  setDefaultTTL(ttl: number): void {
    this.cache.setDefaultTTL(ttl);
  }

  setMaxSize(maxSize: number): void {
    this.cache.setMaxSize(maxSize);
  }

  async cleanup(): Promise<number> {
    return this.cache.cleanup();
  }

  // Note: updateTierConfig is specific to IndexedDBCache implementation
  // Not available in namespaced cache as it's not part of ICacheService interface

  namespace(name: string): ICacheService {
    return this.cache.namespace(`${this.namespaceName}:${name}`);
  }

  async getNamespaces(): Promise<string[]> {
    return this.cache.getNamespaces();
  }
}