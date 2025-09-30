/**
 * CacheManager - 缓存管理器
 *
 * 为现有服务提供零侵入式缓存增强，与 ServiceContainer 集成
 */

import type { ICacheService } from './interfaces/ICacheService.js';
import type { IStorageService } from './interfaces/IStorageService.js';
import type { IMetadataService } from './interfaces/IMetadataService.js';
import type { IFileTreeService } from './interfaces/IFileTreeService.js';
import type { IGraphService } from './interfaces/IGraphService.js';
import type { ITagService } from './interfaces/ITagService.js';
import type { IExifService } from './interfaces/IExifService.js';
import { SearchService } from './SearchService.js';
import { FrontMatterService } from './FrontMatterService.js';
import { FootprintsService } from './FootprintsService.js';
import { IndexedDBCache } from './infra/IndexedDBCache.js';
import { createCachedService, cacheConfig } from './infra/CacheProxyFactory.js';
import type { CacheConfig } from './infra/CacheProxyFactory.js';

// Utility functions to handle type casting for cache config
const condition = <T extends (...args: never[]) => boolean>(fn: T): ((...args: unknown[]) => boolean) => {
  return (...args: unknown[]) => ((fn as unknown) as (...args: unknown[]) => boolean)(...args);
};
const keyGen = <T extends (...args: never[]) => string>(fn: T): ((...args: unknown[]) => string) => {
  return (...args: unknown[]) => ((fn as unknown) as (...args: unknown[]) => string)(...args);
};

// 扩展接口定义，用于类型安全的方法调用
interface ExtendedCacheService extends ICacheService {
  clearTier?: (tier: 'persistent' | 'lru') => Promise<number>;
  getTierStatistics?: () => Promise<{
    persistent: { count: number; sizeMB: number };
    lru: { count: number; sizeMB: number };
  }>;
  enablePolling?: (baseUrl?: string) => void;
  disablePolling?: () => void;
  checkForUpdates?: () => Promise<void>;
  updateTierConfig?: (tier: 'persistent' | 'lru', config: { maxCount?: number; maxSizeMB?: number; defaultTTL?: number }) => void;
  clearPersistent?: (confirmMessage?: string) => Promise<number>;
  getExpiredPersistentData?: () => Promise<string[]>;
  forceCleanupExpiredPersistent?: () => Promise<number>;
}

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
  private _cache: ExtendedCacheService;
  private _cachedServices = new Map<string, unknown>();

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
  get cache(): ExtendedCacheService {
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
      return this._cachedServices.get(cacheKey) as IStorageService;
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
   * 为 MetadataService 创建缓存代理
   */
  createCachedMetadataService(metadataService: IMetadataService): IMetadataService {
    const cacheKey = 'metadata';

    if (this._cachedServices.has(cacheKey)) {
      return this._cachedServices.get(cacheKey) as IMetadataService;
    }

    const cachedService = createCachedService(
      metadataService,
      this._cache,
      'metadata',
      this.createMetadataServiceCacheConfig()
    );

    this._cachedServices.set(cacheKey, cachedService);
    return cachedService;
  }

  /**
   * 为 FileTreeService 创建缓存代理
   */
  createCachedFileTreeService(fileTreeService: IFileTreeService): IFileTreeService {
    const cacheKey = 'filetree';

    if (this._cachedServices.has(cacheKey)) {
      return this._cachedServices.get(cacheKey) as IFileTreeService;
    }

    const cachedService = createCachedService(
      fileTreeService,
      this._cache,
      'filetree',
      this.createFileTreeServiceCacheConfig()
    );

    this._cachedServices.set(cacheKey, cachedService);
    return cachedService;
  }

  /**
   * 为 GraphService 创建缓存代理
   */
  createCachedGraphService(graphService: IGraphService): IGraphService {
    const cacheKey = 'graph';

    if (this._cachedServices.has(cacheKey)) {
      return this._cachedServices.get(cacheKey) as IGraphService;
    }

    const cachedService = createCachedService(
      graphService,
      this._cache,
      'graph',
      this.createGraphServiceCacheConfig()
    );

    this._cachedServices.set(cacheKey, cachedService);
    return cachedService;
  }

  /**
   * 为 TagService 创建缓存代理
   */
  createCachedTagService(tagService: ITagService): ITagService {
    const cacheKey = 'tag';

    if (this._cachedServices.has(cacheKey)) {
      return this._cachedServices.get(cacheKey) as ITagService;
    }

    const cachedService = createCachedService(
      tagService,
      this._cache,
      'tag',
      this.createTagServiceCacheConfig()
    );

    this._cachedServices.set(cacheKey, cachedService);
    return cachedService;
  }

  /**
   * 为 ExifService 创建缓存代理
   */
  createCachedExifService(exifService: IExifService): IExifService {
    const cacheKey = 'exif';

    if (this._cachedServices.has(cacheKey)) {
      return this._cachedServices.get(cacheKey) as IExifService;
    }

    const cachedService = createCachedService(
      exifService,
      this._cache,
      'exif',
      this.createExifServiceCacheConfig()
    );

    this._cachedServices.set(cacheKey, cachedService);
    return cachedService;
  }

  /**
   * 为 SearchService 创建缓存代理
   */
  createCachedSearchService(searchService: SearchService): SearchService {
    const cacheKey = 'search';

    if (this._cachedServices.has(cacheKey)) {
      return this._cachedServices.get(cacheKey) as SearchService;
    }

    const cachedService = createCachedService(
      searchService,
      this._cache,
      'search',
      this.createSearchServiceCacheConfig()
    );

    this._cachedServices.set(cacheKey, cachedService);
    return cachedService;
  }

  /**
   * 为 FrontMatterService 创建缓存代理
   */
  createCachedFrontMatterService(frontMatterService: FrontMatterService): FrontMatterService {
    const cacheKey = 'frontmatter';

    if (this._cachedServices.has(cacheKey)) {
      return this._cachedServices.get(cacheKey) as FrontMatterService;
    }

    const cachedService = createCachedService(
      frontMatterService,
      this._cache,
      'frontmatter',
      this.createFrontMatterServiceCacheConfig()
    );

    this._cachedServices.set(cacheKey, cachedService);
    return cachedService;
  }

  /**
   * 为 FootprintsService 创建缓存代理
   */
  createCachedFootprintsService(footprintsService: FootprintsService): FootprintsService {
    const cacheKey = 'footprints';

    if (this._cachedServices.has(cacheKey)) {
      return this._cachedServices.get(cacheKey) as FootprintsService;
    }

    const cachedService = createCachedService(
      footprintsService,
      this._cache,
      'footprints',
      this.createFootprintsServiceCacheConfig()
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
      return this._cachedServices.get(cacheKey) as T;
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
        .condition(condition((path: string) =>
          // 只缓存文本文件，排除二进制大文件
          path.endsWith('.md') || path.endsWith('.json') || path.endsWith('.txt') || path.endsWith('.css')
        ))
        .keyGenerator(keyGen((path: string, options?: Record<string, unknown>) =>
          `file:${path}:${JSON.stringify(options || {})}`
        ))
      .and()
      .method('getFileInfo')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((path: string) => `info:${path}`))
      .and()
      .method('exists')
        .ttl(300000) // 5分钟
        .keyGenerator(keyGen((path: string) => `exists:${path}`))
      .and()
      .method('readFileWithInfo')
        .ttl(600000) // 10分钟
        .condition(condition((path: string) => path.endsWith('.md') || path.endsWith('.json')))
        .keyGenerator(keyGen((path: string, options?: Record<string, unknown>) =>
          `file-with-info:${path}:${JSON.stringify(options || {})}`
        ))
      .build();
  }

  /**
   * MetadataService 缓存配置
   */
  private createMetadataServiceCacheConfig(): CacheConfig<IMetadataService> {
    return cacheConfig<IMetadataService>()
      .method('getMetadata')
        .ttl(1800000) // 30分钟，metadata.json 更新频率低
        .keyGenerator(keyGen(() => 'metadata:all'))
      .and()
      .method('getFileMetadata')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((filePath: string) => `metadata:file:${filePath}`))
      .and()
      .method('getAllTags')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen(() => 'metadata:tags:all'))
      .and()
      .method('searchInMetadata')
        .ttl(300000) // 5分钟
        .keyGenerator(keyGen((query: string) => `metadata:search:${query.toLowerCase()}`))
      .and()
      .method('getFilesByTag')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((tag: string) => `metadata:tag:${tag}`))
      .build();
  }

  /**
   * FileTreeService 缓存配置
   */
  private createFileTreeServiceCacheConfig(): CacheConfig<IFileTreeService> {
    return cacheConfig<IFileTreeService>()
      .method('getFileTree')
        .ttl(1800000) // 30分钟，基于 metadata.json，更新频率低
        .keyGenerator(keyGen((options?: Record<string, unknown>) =>
          `filetree:tree:${JSON.stringify(options || {})}`))
      .and()
      .method('getChildren')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen((path: string) => `filetree:children:${path}`))
      .and()
      .method('findNode')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((path: string) => `filetree:node:${path}`))
      .and()
      .method('getFolderStats')
        .ttl(300000) // 5分钟
        .keyGenerator(keyGen((path?: string) => `filetree:stats:${path || 'root'}`))
      .and()
      .method('getAllFolders')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen(() => 'filetree:folders:all'))
      .and()
      .method('getAllFiles')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen(() => 'filetree:files:all'))
      .and()
      .method('getFilesByFolder')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((folderPath?: string) => `filetree:folder-files:${folderPath || 'root'}`))
      .and()
      .method('searchFiles')
        .ttl(300000) // 5分钟
        .keyGenerator(keyGen((query: string) => `filetree:search:${query.toLowerCase()}`))
      .build();
  }

  /**
   * GraphService 缓存配置
   */
  private createGraphServiceCacheConfig(): CacheConfig<IGraphService> {
    return cacheConfig<IGraphService>()
      .method('getGlobalGraph')
        .ttl(1800000) // 30分钟，基于 metadata.json，更新频率低
        .keyGenerator(keyGen((options?: Record<string, unknown>) =>
          `graph:global:${JSON.stringify(options || {})}`))
      .and()
      .method('getLocalGraph')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen((filePath: string, options?: Record<string, unknown>) =>
          `graph:local:${filePath}:${JSON.stringify(options || {})}`))
      .and()
      .method('filterByTag')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((tag: string, options?: Record<string, unknown>) =>
          `graph:tag:${tag}:${JSON.stringify(options || {})}`))
      .and()
      .method('getGraphStats')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen(() => 'graph:stats'))
      .and()
      .method('findNode')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((identifier: string) => `graph:node:${identifier}`))
      .and()
      .method('getNodeNeighbors')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((nodeId: string, depth?: number) =>
          `graph:neighbors:${nodeId}:${depth || 1}`))
      .and()
      .method('getPathBetweenNodes')
        .ttl(300000) // 5分钟
        .keyGenerator(keyGen((fromId: string, toId: string) =>
          `graph:path:${fromId}:${toId}`))
      .and()
      .method('getMostConnectedNodes')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen((limit?: number) => `graph:hubs:${limit || 10}`))
      .and()
      .method('getAllTagNodes')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen(() => 'graph:tags:all'))
      .and()
      .method('getAllFileNodes')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen(() => 'graph:files:all'))
      .and()
      .method('getOrphanedNodes')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen(() => 'graph:orphaned'))
      .and()
      .method('analyzeNodeConnectivity')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((nodeId: string) => `graph:connectivity:${nodeId}`))
      .build();
  }

  /**
   * TagService 缓存配置
   */
  private createTagServiceCacheConfig(): CacheConfig<ITagService> {
    return cacheConfig<ITagService>()
      .method('getAllTags')
        .ttl(1800000) // 30分钟，从 tags.json 读取，更新频率低
        .keyGenerator(keyGen((options?: Record<string, unknown>) =>
          `tag:all:${JSON.stringify(options || {})}`))
      .and()
      .method('getFileTags')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen((filePath: string) => `tag:file:${filePath}`))
      .and()
      .method('getFilesByTag')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((tag: string) => `tag:files:${tag}`))
      .and()
      .method('getTagStats')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen(() => 'tag:stats'))
      .and()
      .method('searchTags')
        .ttl(300000) // 5分钟
        .keyGenerator(keyGen((query: string, options?: Record<string, unknown>) =>
          `tag:search:${query}:${JSON.stringify(options || {})}`))
      .and()
      .method('filterTags')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((options: Record<string, unknown>) =>
          `tag:filter:${JSON.stringify(options)}`))
      .and()
      .method('getTagDetails')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen((tag: string) => `tag:details:${tag}`))
      .and()
      .method('hasTag')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((tag: string) => `tag:exists:${tag}`))
      .and()
      .method('getMostUsedTags')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen((limit?: number) => `tag:most-used:${limit || 10}`))
      .and()
      .method('getLeastUsedTags')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen((limit?: number) => `tag:least-used:${limit || 10}`))
      .and()
      .method('getOrphanTags')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen(() => 'tag:orphan'))
      .and()
      .method('getRelatedTags')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((tag: string, limit?: number) =>
          `tag:related:${tag}:${limit || 5}`))
      .and()
      .method('analyzeFileTagPattern')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((filePath: string) => `tag:pattern:${filePath}`))
      .and()
      .method('getTagCooccurrence')
        .ttl(600000) // 10分钟
        .keyGenerator(keyGen((tag: string) => `tag:cooccurrence:${tag}`))
      .and()
      .method('getFolderTagDistribution')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen((folderPath?: string) => `tag:folder:${folderPath || 'root'}`))
      .and()
      .method('suggestTags')
        .ttl(300000) // 5分钟
        .keyGenerator(keyGen((filePath: string, limit?: number) =>
          `tag:suggest:${filePath}:${limit || 5}`))
      .and()
      .build();
  }

  /**
   * ExifService 缓存配置
   */
  private createExifServiceCacheConfig(): CacheConfig<IExifService> {
    return cacheConfig<IExifService>()
      .method('parseExif')
        .ttl(3600000) // 60分钟，EXIF 数据很少变化
        .keyGenerator(keyGen((filePath: string) => `exif:parse:${filePath}`))
      .and()
      .method('parseMultipleExif')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen((filePaths: string[]) => `exif:batch:${JSON.stringify(filePaths.sort())}`))
      .and()
      .method('scanDirectoryForExif')
        .ttl(1800000) // 30分钟，目录扫描结果
        .keyGenerator(keyGen((dirPath?: string) => `exif:scan:${dirPath || 'Attachments'}`))
      .and()
      .method('getGpsCoordinates')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen((filePath: string) => `exif:gps:${filePath}`))
      .and()
      .method('getCameraInfo')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen((filePath: string) => `exif:camera:${filePath}`))
      .and()
      .method('getShootingParams')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen((filePath: string) => `exif:shooting:${filePath}`))
      .and()
      .method('getDateTimeInfo')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen((filePath: string) => `exif:datetime:${filePath}`))
      .and()
      .method('searchImagesWithGps')
        .ttl(900000) // 15分钟，搜索结果
        .keyGenerator(keyGen((options?: Record<string, unknown>) => `exif:search:gps:${JSON.stringify(options || {})}`))
      .and()
      .method('searchImagesByCamera')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen((make?: string, model?: string, options?: Record<string, unknown>) =>
          `exif:search:camera:${make || ''}:${model || ''}:${JSON.stringify(options || {})}`))
      .and()
      .method('searchImagesByDateRange')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen((startDate: Date, endDate: Date, options?: Record<string, unknown>) =>
          `exif:search:date:${startDate.getTime()}:${endDate.getTime()}:${JSON.stringify(options || {})}`))
      .and()
      .method('searchImagesByGeoBounds')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen((bounds?: Record<string, unknown>, options?: Record<string, unknown>) =>
          `exif:search:geo:${JSON.stringify(bounds)}:${JSON.stringify(options || {})}`))
      .and()
      .method('searchExif')
        .ttl(900000) // 15分钟
        .keyGenerator(keyGen((options: Record<string, unknown>) => `exif:search:${JSON.stringify(options)}`))
      .and()
      .method('getExifStatistics')
        .ttl(1800000) // 30分钟，统计信息
        .keyGenerator(keyGen(() => 'exif:stats'))
      .and()
      .method('getAllCameraMakes')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen(() => 'exif:makes'))
      .and()
      .method('getAllCameraModels')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen(() => 'exif:models'))
      .and()
      .method('getDateTimeRange')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen(() => 'exif:date-range'))
      .and()
      .method('getGpsBounds')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen(() => 'exif:gps-bounds'))
      .and()
      .build();
  }

  /**
   * SearchService 缓存配置
   */
  private createSearchServiceCacheConfig(): CacheConfig<SearchService> {
    return cacheConfig<SearchService>()
      .method('search')
        .ttl(300000) // 5分钟，搜索结果变化较快
        .keyGenerator(keyGen((query: string, options?: Record<string, unknown>) =>
          `search:unified:${query}:${JSON.stringify(options || {})}`))
      .and()
      .method('searchContent')
        .ttl(600000) // 10分钟，内容搜索相对稳定
        .keyGenerator(keyGen((query: string, options?: Record<string, unknown>) =>
          `search:content:${query}:${JSON.stringify(options || {})}`))
      .and()
      .method('searchByTag')
        .ttl(900000) // 15分钟，标签搜索更稳定
        .keyGenerator(keyGen((tag: string, options?: Record<string, unknown>) =>
          `search:tag:${tag}:${JSON.stringify(options || {})}`))
      .and()
      .method('getSearchStatistics')
        .ttl(300000) // 5分钟，统计信息
        .keyGenerator(keyGen((query: string, options?: Record<string, unknown>) =>
          `search:stats:${query}:${JSON.stringify(options || {})}`))
      .and()
      .build();
  }

  /**
   * FrontMatterService 缓存配置
   */
  private createFrontMatterServiceCacheConfig(): CacheConfig<FrontMatterService> {
    return cacheConfig<FrontMatterService>()
      .method('getFrontMatter')
        .ttl(1800000) // 30分钟，Front Matter 变化较少
        .keyGenerator(keyGen((filePath: string) => `frontmatter:file:${filePath}`))
      .and()
      .method('getAllFrontMatter')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen(() => 'frontmatter:all'))
      .and()
      .method('getUuid')
        .ttl(3600000) // 60分钟，UUID 很少变化
        .keyGenerator(keyGen((filePath: string) => `frontmatter:uuid:${filePath}`))
      .and()
      .method('getFileByUuid')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen((uuid: string) => `frontmatter:file-by-uuid:${uuid}`))
      .and()
      .method('getAllUuids')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen(() => 'frontmatter:all-uuids'))
      .and()
      .method('hasUuid')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen((uuid: string) => `frontmatter:has-uuid:${uuid}`))
      .and()
      .method('isPublished')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen((filePath: string) => `frontmatter:published:${filePath}`))
      .and()
      .method('getPublishedFiles')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen(() => 'frontmatter:published-files'))
      .and()
      .method('getUnpublishedFiles')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen(() => 'frontmatter:unpublished-files'))
      .and()
      .method('getAuthor')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen((filePath: string) => `frontmatter:author:${filePath}`))
      .and()
      .method('getFilesByAuthor')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen((author: string) => `frontmatter:files-by-author:${author}`))
      .and()
      .method('getAllAuthors')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen(() => 'frontmatter:all-authors'))
      .and()
      .method('getDescription')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen((filePath: string) => `frontmatter:description:${filePath}`))
      .and()
      .method('getCssClass')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen((filePath: string) => `frontmatter:css-class:${filePath}`))
      .and()
      .method('getFilesByCssClass')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen((cssClass: string) => `frontmatter:files-by-css:${cssClass}`))
      .and()
      .method('getCreatedDate')
        .ttl(3600000) // 60分钟，创建时间不变
        .keyGenerator(keyGen((filePath: string) => `frontmatter:created:${filePath}`))
      .and()
      .method('getModifiedDate')
        .ttl(1800000) // 30分钟，修改时间可能变化
        .keyGenerator(keyGen((filePath: string) => `frontmatter:modified:${filePath}`))
      .and()
      .method('queryFiles')
        .ttl(900000) // 15分钟，查询结果
        .keyGenerator(keyGen((options: Record<string, unknown>) =>
          `frontmatter:query:${JSON.stringify(options)}`))
      .and()
      .method('searchFrontMatter')
        .ttl(600000) // 10分钟，搜索结果
        .keyGenerator(keyGen((query: string, fields?: string[]) =>
          `frontmatter:search:${query}:${JSON.stringify(fields || [])}`))
      .and()
      .method('getCustomField')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen((filePath: string, fieldName: string) =>
          `frontmatter:custom:${filePath}:${fieldName}`))
      .and()
      .method('getFilesByCustomField')
        .ttl(1800000) // 30分钟
        .keyGenerator(keyGen((fieldName: string, value?: unknown) =>
          `frontmatter:files-by-custom:${fieldName}:${JSON.stringify(value)}`))
      .and()
      .method('getAllCustomFields')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen(() => 'frontmatter:all-custom-fields'))
      .and()
      .method('getStatistics')
        .ttl(1800000) // 30分钟，统计信息
        .keyGenerator(keyGen(() => 'frontmatter:statistics'))
      .and()
      .method('analyzeFrontMatterPatterns')
        .ttl(3600000) // 60分钟，分析结果变化较少
        .keyGenerator(keyGen(() => 'frontmatter:patterns'))
      .and()
      .build();
  }

  /**
   * FootprintsService 缓存配置
   */
  private createFootprintsServiceCacheConfig(): CacheConfig<FootprintsService> {
    return cacheConfig<FootprintsService>()
      .method('parseSingleTrack')
        .ttl(3600000) // 60分钟，轨迹文件解析结果很少变化
        .keyGenerator(keyGen((filePath: string) => `footprints:single:${filePath}`))
      .and()
      .method('parseMultipleTracks')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen((filePaths: string[]) =>
          `footprints:multiple:${JSON.stringify(filePaths.sort())}`))
      .and()
      .method('aggregateFootprints')
        .ttl(1800000) // 30分钟，聚合结果可能因配置变化
        .keyGenerator(keyGen((config: Record<string, unknown>) =>
          `footprints:aggregate:${JSON.stringify(config)}`))
      .and()
      .method('scanTrackFiles')
        .ttl(900000) // 15分钟，目录扫描结果
        .keyGenerator(keyGen((dirPath: string) => `footprints:scan:${dirPath}`))
      .and()
      .method('detectProvider')
        .ttl(3600000) // 60分钟，厂商检测结果不变
        .keyGenerator(keyGen((filePath: string) => `footprints:provider:${filePath}`))
      .and()
      .method('validateTrackFile')
        .ttl(3600000) // 60分钟，文件验证结果不变
        .keyGenerator(keyGen((filePath: string) => `footprints:validate:${filePath}`))
      .and()
      .method('processUserInputs')
        .ttl(1800000) // 30分钟，用户输入处理
        .keyGenerator(keyGen((userInputs: string[]) =>
          `footprints:user-inputs:${JSON.stringify(userInputs.sort())}`))
      .and()
      .method('processPhotoExif')
        .ttl(1800000) // 30分钟，照片 EXIF 处理
        .keyGenerator(keyGen((photosPath: string) => `footprints:photo-exif:${photosPath}`))
      .and()
      .method('geocodeLocation')
        .ttl(2592000000) // 30天，地理编码结果长期有效
        .keyGenerator(keyGen((locationName: string) => `footprints:geocode:${locationName}`))
      .and()
      .method('calculateTracksBounds')
        .ttl(3600000) // 60分钟，边界计算结果稳定
        .keyGenerator(keyGen((tracks: Array<{ id: string }>) =>
          `footprints:tracks-bounds:${JSON.stringify(tracks.map(t => t.id).sort())}`))
      .and()
      .method('calculateLocationsBounds')
        .ttl(3600000) // 60分钟
        .keyGenerator(keyGen((locations: Array<{ id: string }>) =>
          `footprints:locations-bounds:${JSON.stringify(locations.map(l => l.id).sort())}`))
      .and()
      .method('getTrackStatistics')
        .ttl(3600000) // 60分钟，轨迹统计稳定
        .keyGenerator(keyGen((track: Record<string, unknown>) =>
          `footprints:track-stats:${track.id}`))
      .and()
      .method('getCacheStats')
        .ttl(300000) // 5分钟，缓存统计实时性
        .keyGenerator(keyGen(() => 'footprints:cache-stats'))
      .and()
      .method('getCurrentVault')
        .ttl(1800000) // 30分钟，vault 信息相对稳定
        .keyGenerator(keyGen(() => 'footprints:current-vault'))
      .and()
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


    // 为每个文件创建独立的预热任务
    const warmupTasks = commonFiles.map((filePath) => {
      return this.warmupSingleFile(cachedStorage, filePath);
    });

    // 使用 Promise.allSettled 确保所有错误都被捕获
    await Promise.allSettled(warmupTasks);
  }

  /**
   * 预热单个文件的缓存
   */
  private async warmupSingleFile(cachedStorage: IStorageService, filePath: string): Promise<void> {
    try {
      // 并行预热所有相关操作
      await Promise.allSettled([
        cachedStorage.readFile(filePath).catch(_error => {
          // 忽略预热错误，继续其他操作
        }),
        cachedStorage.getFileInfo(filePath).catch(_error => {
          // 忽略预热错误，继续其他操作
        }),
        cachedStorage.exists(filePath).catch(_error => {
          // 忽略预热错误，继续其他操作
        })
      ]);
    } catch {
      // 忽略预热过程中的错误
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
      return this._cache.clearTier?.(tier) ?? 0;
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
      return this._cache.getTierStatistics?.() ?? {
        persistent: { count: 0, sizeMB: 0 },
        lru: { count: 0, sizeMB: 0 }
      };
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
      this._cache.enablePolling?.(baseUrl);
    }
  }

  /**
   * 禁用MD5轮询
   */
  disablePolling(): void {
    if (this._cache instanceof IndexedDBCache) {
      this._cache.disablePolling?.();
    }
  }

  /**
   * 手动触发一次MD5检查
   */
  async checkForUpdates(): Promise<void> {
    if (this._cache instanceof IndexedDBCache) {
      await this._cache.checkForUpdates?.();
    }
  }

  /**
   * 更新层级配置
   */
  updateTierConfig(tier: 'persistent' | 'lru', config: { maxCount?: number; maxSizeMB?: number; defaultTTL?: number }): void {
    if (this._cache instanceof IndexedDBCache) {
      this._cache.updateTierConfig?.(tier, config);
    }
  }

  /**
   * 清理持久层数据（需要用户确认）
   */
  async clearPersistent(confirmMessage?: string): Promise<number> {
    if (this._cache instanceof IndexedDBCache) {
      return this._cache.clearPersistent?.(confirmMessage) ?? 0;
    }
    return 0;
  }

  /**
   * 获取过期但未自动清理的持久层数据
   */
  async getExpiredPersistentData(): Promise<string[]> {
    if (this._cache instanceof IndexedDBCache) {
      return this._cache.getExpiredPersistentData?.() ?? [];
    }
    return [];
  }

  /**
   * 强制清理过期的持久层数据（跳过用户确认）
   */
  async forceCleanupExpiredPersistent(): Promise<number> {
    if (this._cache instanceof IndexedDBCache) {
      return this._cache.forceCleanupExpiredPersistent?.() ?? 0;
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
  return _globalCacheManager;
}

/**
 * 销毁全局缓存管理器
 */
export function disposeCacheManager(): void {
  if (_globalCacheManager) {
    _globalCacheManager.dispose();
    _globalCacheManager = null;
  }
}