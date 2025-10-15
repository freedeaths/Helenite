/**
 * Cache Service Interface - 缓存基础设施服务
 * 
 * 职责：提供统一的缓存抽象，支持多种存储策略和缓存层级
 */

export interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
  size?: number; // Entry size in bytes
}

export interface CacheMetadata {
  /** 源文件 URL，用于内容哈希轮询 */
  sourceUrl?: string;
  /** 内容哈希（SHA-256） */
  contentHash?: string;
  /** 缓存层级 */
  tier?: 'persistent' | 'lru';
}

export interface CacheStatistics {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}

export interface ICacheService {
  // === 基础缓存操作 ===
  /**
   * 获取缓存值
   */
  get<T = unknown>(key: string): Promise<T | null>;

  /**
   * 设置缓存值
   */
  set<T = unknown>(key: string, value: T, ttl?: number, metadata?: CacheMetadata): Promise<void>;

  /**
   * 获取或设置缓存值（核心方法）
   * @param key 缓存键
   * @param factory 值工厂函数
   * @param ttl 生存时间(毫秒)
   * @param metadata 缓存元数据（sourceUrl、contentHash 等）
   * @returns 缓存值或新计算的值
   */
  getOrSet<T = unknown>(key: string, factory: () => Promise<T>, ttl?: number, metadata?: CacheMetadata): Promise<T>;

  /**
   * 删除缓存项
   */
  delete(key: string): Promise<void>;

  /**
   * 检查缓存项是否存在
   */
  has(key: string): Promise<boolean>;

  // === 批量操作 ===
  /**
   * 批量获取
   */
  getMultiple<T = unknown>(keys: string[]): Promise<Map<string, T | null>>;

  /**
   * 批量设置
   */
  setMultiple<T = unknown>(entries: Map<string, T>, ttl?: number, metadata?: CacheMetadata): Promise<void>;

  /**
   * 批量删除
   */
  deleteMultiple(keys: string[]): Promise<void>;

  // === 模式匹配操作 ===
  /**
   * 根据键模式获取所有匹配的键
   */
  getKeysMatching(pattern: string): Promise<string[]>;

  /**
   * 删除匹配模式的所有缓存项
   */
  deleteMatching(pattern: string): Promise<number>;

  /**
   * 按前缀清理缓存
   */
  clearByPrefix(prefix: string): Promise<number>;

  // === 缓存管理 ===
  /**
   * 清空所有缓存
   */
  clear(): Promise<void>;

  /**
   * 获取缓存统计信息
   */
  getStatistics(): Promise<CacheStatistics>;

  /**
   * 获取缓存大小（字节）
   */
  getSize(): Promise<number>;

  /**
   * 获取缓存项数量
   */
  getCount(): Promise<number>;

  // === 缓存策略 ===
  /**
   * 设置默认 TTL
   */
  setDefaultTTL(ttl: number): void;

  /**
   * 触发缓存清理（移除过期项）
   */
  cleanup(): Promise<number>;

  /**
   * 设置最大缓存大小
   */
  setMaxSize(maxSize: number): void;

  // === 缓存层级支持 ===
  /**
   * 创建命名空间缓存
   */
  namespace(name: string): ICacheService;

  /**
   * 获取所有命名空间
   */
  getNamespaces(): Promise<string[]>;

  // === 事件和监听 ===
  /**
   * 监听缓存事件
   */
  on?(event: 'hit' | 'miss' | 'set' | 'delete' | 'expire', callback: (key: string, value?: unknown) => void): void;

  /**
   * 移除事件监听
   */
  off?(event: 'hit' | 'miss' | 'set' | 'delete' | 'expire', callback: (key: string, value?: unknown) => void): void;

  // === 持久化支持（可选）===
  /**
   * 持久化缓存到存储
   */
  persist?(): Promise<void>;

  /**
   * 从存储恢复缓存
   */
  restore?(): Promise<void>;
}