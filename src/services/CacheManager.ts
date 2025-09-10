/**
 * CacheManager - 缓存管理器
 * 
 * 为现有服务提供零侵入式缓存增强，与 ServiceContainer 集成
 */

import { ICacheService } from './interfaces/ICacheService.js';
import { IStorageService } from './interfaces/IStorageService.js';
import { IndexedDBCache } from './cache/IndexedDBCache.js';
import { createCachedService, CacheConfig, cacheConfig, CachePresets } from './cache/CacheProxyFactory.js';

export interface CacheManagerConfig {
  /** 数据库名称 */
  dbName?: string;
  /** 分层配置 */
  tiers?: {
    /** 持久层：metadata.json等核心数据，永不淘汰 */
    persistent?: {
      maxCount?: number;
      maxSizeMB?: number;
      defaultTTL?: number;
    };
    /** LRU层：文章和附件，按容量淘汰 */
    lru?: {
      maxCount?: number;
      maxSizeMB?: number;
      defaultTTL?: number;
    };
  };
  /** MD5轮询配置 */
  polling?: {
    enabled?: boolean;
    interval?: number;
    baseUrl?: string;
  };
  /** 清理配置 */
  cleanup?: {
    interval?: number;
    enabled?: boolean;
  };
}

/**
 * 缓存管理器 - 统一管理所有服务的缓存代理
 */
export class CacheManager {
  private _cache: ICacheService;
  private _cachedServices = new Map<string, any>();

  constructor(config: CacheManagerConfig = {}) {
    this._cache = new IndexedDBCache({
      dbName: config.dbName,
      tiers: config.tiers,
      polling: config.polling,
      cleanup: config.cleanup
    });
  }

  // ===============================
  // 核心缓存服务
  // ===============================

  /**
   * 获取缓存服务实例
   */
  get cache(): ICacheService {
    return this._cache;
  }

  // ===============================
  // 服务缓存代理创建
  // ===============================

  /**
   * 为 StorageService 创建缓存代理
   */
  createCachedStorageService(storageService: IStorageService): IStorageService {
    const cacheKey = 'storage';
    
    if (this._cachedServices.has(cacheKey)) {
      return this._cachedServices.get(cacheKey);
    }

    const cachedService = createCachedService(
      storageService,
      this._cache,
      'storage',
      this.createStorageServiceCacheConfig()
    );

    this._cachedServices.set(cacheKey, cachedService);
    return cachedService;
  }

  /**
   * 通用服务缓存代理创建方法
   */
  createCachedService<T extends object>(
    service: T,
    namespace: string,
    config: CacheConfig<T>
  ): T {
    const cacheKey = namespace;
    
    if (this._cachedServices.has(cacheKey)) {
      return this._cachedServices.get(cacheKey);
    }

    const cachedService = createCachedService(service, this._cache, namespace, config);
    this._cachedServices.set(cacheKey, cachedService);
    return cachedService;
  }

  // ===============================
  // 缓存配置定义
  // ===============================

  /**
   * StorageService 缓存配置
   */
  private createStorageServiceCacheConfig(): CacheConfig<IStorageService> {
    return cacheConfig<IStorageService>()
      .method('readFile')
        .ttl(600000) // 10分钟
        .condition((path: string) => 
          // 只缓存文本文件，排除二进制大文件
          path.endsWith('.md') || path.endsWith('.json') || path.endsWith('.txt') || path.endsWith('.css')
        )
        .keyGenerator((path: string, options?: any) => 
          `file:${path}:${JSON.stringify(options || {})}`
        )
      .and()
      .method('getFileInfo')
        .ttl(300000) // 5分钟
        .keyGenerator((path: string) => `info:${path}`)
      .and()
      .method('exists')
        .ttl(180000) // 3分钟
        .keyGenerator((path: string) => `exists:${path}`)
      .and()
      .method('readFileWithInfo')
        .ttl(600000) // 10分钟
        .condition((path: string) => path.endsWith('.md') || path.endsWith('.json'))
        .keyGenerator((path: string, options?: any) => 
          `file-with-info:${path}:${JSON.stringify(options || {})}`
        )
      .build();
  }

  // ===============================
  // 缓存管理功能
  // ===============================

  /**
   * 获取缓存统计信息
   */
  async getStatistics() {
    const stats = await this._cache.getStatistics();
    const namespaces = await this._cache.getNamespaces();
    
    // 获取各命名空间的条目数
    const namespaceStats: Record<string, number> = {};
    for (const ns of namespaces) {
      const keys = await this._cache.getKeysMatching(`${ns}:*`);
      namespaceStats[ns] = keys.length;
    }

    return {
      ...stats,
      namespaces,
      namespaceStats,
      cachedServicesCount: this._cachedServices.size
    };
  }

  /**
   * 清理缓存
   */
  async clearCache(namespace?: string): Promise<number> {
    if (namespace) {
      return await this._cache.clearByPrefix(`${namespace}:`);
    } else {
      await this._cache.clear();
      return 0;
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(
    storageService: IStorageService, 
    commonFiles: string[]
  ): Promise<void> {
    const cachedStorage = this.createCachedStorageService(storageService);
    
    console.log(`🔥 Warming up cache with ${commonFiles.length} files...`);
    
    // 为每个文件创建独立的预热任务
    const warmupTasks = commonFiles.map((filePath) => {
      return this.warmupSingleFile(cachedStorage, filePath);
    });

    // 使用 Promise.allSettled 确保所有错误都被捕获
    await Promise.allSettled(warmupTasks);
    
    const stats = await this.getStatistics();
    console.log(`✅ Cache warmup completed. Total entries: ${stats.totalEntries}`);
  }

  /**
   * 预热单个文件的缓存
   */
  private async warmupSingleFile(cachedStorage: IStorageService, filePath: string): Promise<void> {
    try {
      // 并行预热所有相关操作
      await Promise.allSettled([
        cachedStorage.readFile(filePath).catch(error => {
          console.warn(`Failed to cache readFile for ${filePath}:`, error);
        }),
        cachedStorage.getFileInfo(filePath).catch(error => {
          console.warn(`Failed to cache getFileInfo for ${filePath}:`, error);
        }),
        cachedStorage.exists(filePath).catch(error => {
          console.warn(`Failed to cache exists for ${filePath}:`, error);
        })
      ]);
    } catch (error) {
      console.warn(`Failed to warmup cache for ${filePath}:`, error);
    }
  }

  /**
   * 缓存健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = 'health-check';
      const testValue = { timestamp: Date.now() };
      
      await this._cache.set(testKey, testValue, 1000);
      const retrieved = await this._cache.get(testKey);
      await this._cache.delete(testKey);
      
      return retrieved !== null && 
             typeof retrieved === 'object' && 
             'timestamp' in retrieved;
    } catch {
      return false;
    }
  }

  // ===============================
  // 分层缓存管理函数 (导出供用户使用)
  // ===============================

  /**
   * 清理指定层级的缓存
   */
  async clearTier(tier: 'persistent' | 'lru'): Promise<number> {
    if (this._cache instanceof IndexedDBCache) {
      return (this._cache as any).clearTier(tier);
    }
    return 0;
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
    if (this._cache instanceof IndexedDBCache) {
      return (this._cache as any).getTierStatistics();
    }
    return {
      persistent: { count: 0, sizeMB: 0 },
      lru: { count: 0, sizeMB: 0 }
    };
  }

  /**
   * 启用MD5轮询
   */
  enablePolling(baseUrl?: string): void {
    if (this._cache instanceof IndexedDBCache) {
      (this._cache as any).enablePolling(baseUrl);
    }
  }

  /**
   * 禁用MD5轮询
   */
  disablePolling(): void {
    if (this._cache instanceof IndexedDBCache) {
      (this._cache as any).disablePolling();
    }
  }

  /**
   * 手动触发一次MD5检查
   */
  async checkForUpdates(): Promise<void> {
    if (this._cache instanceof IndexedDBCache) {
      await (this._cache as any).checkForUpdates();
    }
  }

  /**
   * 更新层级配置
   */
  updateTierConfig(tier: 'persistent' | 'lru', config: { maxCount?: number; maxSizeMB?: number; defaultTTL?: number }): void {
    if (this._cache instanceof IndexedDBCache) {
      (this._cache as any).updateTierConfig(tier, config);
    }
  }

  /**
   * 清理持久层数据（需要用户确认）
   */
  async clearPersistent(confirmMessage?: string): Promise<number> {
    if (this._cache instanceof IndexedDBCache) {
      return (this._cache as any).clearPersistent(confirmMessage);
    }
    return 0;
  }

  /**
   * 获取过期但未自动清理的持久层数据
   */
  async getExpiredPersistentData(): Promise<string[]> {
    if (this._cache instanceof IndexedDBCache) {
      return (this._cache as any).getExpiredPersistentData();
    }
    return [];
  }

  /**
   * 强制清理过期的持久层数据（跳过用户确认）
   */
  async forceCleanupExpiredPersistent(): Promise<number> {
    if (this._cache instanceof IndexedDBCache) {
      return (this._cache as any).forceCleanupExpiredPersistent();
    }
    return 0;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this._cache instanceof IndexedDBCache) {
      (this._cache as IndexedDBCache).dispose();
    }
    this._cachedServices.clear();
  }
}

// ===============================
// 全局缓存管理器实例
// ===============================

let _globalCacheManager: CacheManager | null = null;

/**
 * 获取全局缓存管理器
 */
export function getCacheManager(): CacheManager {
  if (!_globalCacheManager) {
    _globalCacheManager = new CacheManager();
  }
  return _globalCacheManager;
}

/**
 * 初始化全局缓存管理器
 */
export function initializeCacheManager(config?: CacheManagerConfig): CacheManager {
  if (_globalCacheManager) {
    _globalCacheManager.dispose();
  }
  
  _globalCacheManager = new CacheManager(config);
  console.log('✅ CacheManager initialized');
  return _globalCacheManager;
}

/**
 * 销毁全局缓存管理器
 */
export function disposeCacheManager(): void {
  if (_globalCacheManager) {
    _globalCacheManager.dispose();
    _globalCacheManager = null;
    console.log('🗑️ CacheManager disposed');
  }
}