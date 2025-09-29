/**
 * 缓存系统使用示例
 *
 * 演示如何在 Helenite 应用中使用零侵入式缓存系统
 */

import { CacheManager, initializeCacheManager } from '../CacheManager.js';
import { StorageService } from '../infra/StorageService.js';
import { IStorageService } from '../interfaces/IStorageService.js';

// ===============================
// 1. 基础缓存使用示例
// ===============================

export async function basicCacheExample() {

  // 1.1 初始化缓存管理器
  const cacheManager = initializeCacheManager({
    tiers: {
      lru: {
        maxCount: 1000,
        defaultTTL: 300000 // 5分钟
      }
    },
    cleanup: {
      interval: 60000, // 1分钟清理间隔
      enabled: true
    }
  });

  // 1.2 创建原始 StorageService
  const storageService = new StorageService({
    basePath: '/vaults/Demo',
    timeout: 10000,
    cache: false // 禁用内置缓存
  });

  // 1.3 创建缓存代理 - 零侵入式增强
  const cachedStorage: IStorageService = cacheManager.createCachedStorageService(storageService);

  // 1.4 使用缓存代理 - 接口完全相同
  try {
    // 1.5 查看缓存统计
    const stats = await cacheManager.getStatistics();

    return { cacheManager, cachedStorage, stats };
  } catch {
    return { cacheManager, cachedStorage, stats: { totalEntries: 0, hitRate: 0, namespaces: [] } };
  }
}

// ===============================
// 2. 应用级集成示例
// ===============================

export class ApplicationServiceContainer {
  private cacheManager: CacheManager;
  private cachedStorageService: IStorageService;

  constructor(vaultPath: string) {
    this.cacheManager = new CacheManager({
      dbName: `app-cache-${Date.now()}-${Math.random()}`,
      tiers: {
        lru: {
          maxCount: 2000,
          defaultTTL: 600000 // 10分钟
        }
      }
    });

    const storageService = new StorageService({
      basePath: vaultPath,
      cache: false
    });

    this.cachedStorageService = this.cacheManager.createCachedStorageService(storageService);
  }

  getStorageService(): IStorageService {
    return this.cachedStorageService;
  }

  async getCacheStats() {
    return this.cacheManager.getStatistics();
  }

  dispose(): void {
    this.cacheManager.dispose();
  }
}

// ===============================
// 3. 自定义服务缓存示例
// ===============================

export interface ISearchService {
  search(query: string): Promise<string[]>;
  getPopularTags(): Promise<string[]>;
}

export class SearchService implements ISearchService {
  async search(query: string): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [`result1-${query}`, `result2-${query}`];
  }

  async getPopularTags(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return ['react', 'javascript', 'typescript'];
  }
}

export function customServiceCacheExample() {
  const cacheManager = new CacheManager({
    dbName: `test-search-cache-${Date.now()}-${Math.random()}`
  });
  const searchService = new SearchService();

  const searchCacheConfig = {
    search: {
      ttl: 120000,
      keyGenerator: (query: string) => `search:${query.toLowerCase()}`
    },
    getPopularTags: {
      ttl: 600000,
      keyGenerator: () => 'popular-tags'
    }
  };

  const cachedSearchService = cacheManager.createCachedService(
    searchService,
    'search',
    searchCacheConfig
  );

  return { cacheManager, cachedSearchService };
}