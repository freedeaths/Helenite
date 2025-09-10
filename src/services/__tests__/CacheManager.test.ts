/**
 * CacheManager 单元测试
 */

// 设置 IndexedDB 模拟
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, initializeCacheManager, disposeCacheManager } from '../CacheManager.js';
import { StorageService } from '../infra/StorageService.js';
import { IStorageService } from '../interfaces/IStorageService.js';
import type { StorageConfig } from '../types/StorageTypes.js';

// Mock StorageService 用于测试
class MockStorageService implements IStorageService {
  private callCounts = new Map<string, number>();
  
  // 记录方法调用次数
  private recordCall(method: string): void {
    this.callCounts.set(method, (this.callCounts.get(method) || 0) + 1);
  }
  
  getCallCount(method: string): number {
    return this.callCounts.get(method) || 0;
  }
  
  resetCallCounts(): void {
    this.callCounts.clear();
  }

  get config() {
    return { basePath: '/test' };
  }

  async readFile(path: string): Promise<string> {
    this.recordCall('readFile');
    return `Content of ${path}`;
  }

  async getFileInfo(path: string) {
    this.recordCall('getFileInfo');
    return {
      path,
      size: 1000,
      mimeType: 'text/markdown',
      lastModified: new Date(),
      exists: true
    };
  }

  async exists(path: string): Promise<boolean> {
    this.recordCall('exists');
    return path !== 'nonexistent.md';
  }

  async readFileWithInfo(path: string) {
    this.recordCall('readFileWithInfo');
    return {
      content: `Content of ${path}`,
      info: await this.getFileInfo(path)
    };
  }

  // 其他必需的方法
  async listFiles(): Promise<string[]> { return []; }
  normalizePath(path: string): string { return path; }
  resolvePath(path: string): string { return path; }
  isValidPath(): boolean { return true; }
  getMimeType(): string { return 'text/plain'; }
  isImageFile(): boolean { return false; }
  isTrackFile(): boolean { return false; }
  isMarkdownFile(): boolean { return true; }
  async clearCache(): Promise<void> {}
  async preloadFiles(): Promise<void> {}
  async initialize(): Promise<void> {}
  async dispose(): Promise<void> {}
  async healthCheck(): Promise<boolean> { return true; }
}

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockStorageService: MockStorageService;

  beforeEach(async () => {
    cacheManager = new CacheManager({
      dbName: `test-cache-${Date.now()}-${Math.random()}`, // 每次测试使用不同的数据库
      tiers: {
        lru: {
          maxCount: 100,
          maxSizeMB: 10,
          defaultTTL: 60000
        }
      },
      cleanup: {
        interval: 5000,
        enabled: true
      }
    });
    mockStorageService = new MockStorageService();
    
    // 等待缓存初始化完成
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    cacheManager.dispose();
    disposeCacheManager();
  });

  describe('Core Cache Service', () => {
    it('should provide access to cache service', () => {
      expect(cacheManager.cache).toBeDefined();
      expect(typeof cacheManager.cache.get).toBe('function');
      expect(typeof cacheManager.cache.set).toBe('function');
    });

    it('should perform basic cache operations', async () => {
      const cache = cacheManager.cache;
      
      await cache.set('test-key', 'test-value', 1000);
      const retrieved = await cache.get('test-key');
      
      expect(retrieved).toBe('test-value');
    });
  });

  describe('StorageService Caching', () => {
    it('should create cached storage service', () => {
      const cachedStorage = cacheManager.createCachedStorageService(mockStorageService);
      
      expect(cachedStorage).toBeDefined();
      expect(typeof cachedStorage.readFile).toBe('function');
      expect(typeof cachedStorage.getFileInfo).toBe('function');
    });

    it('should cache readFile results', async () => {
      const cachedStorage = cacheManager.createCachedStorageService(mockStorageService);
      
      // 第一次调用 - 应该调用原始方法
      const result1 = await cachedStorage.readFile('test.md');
      expect(result1).toBe('Content of test.md');
      expect(mockStorageService.getCallCount('readFile')).toBe(1);
      
      // 第二次调用同样的文件 - 应该从缓存返回，不调用原始方法
      const result2 = await cachedStorage.readFile('test.md');
      expect(result2).toBe('Content of test.md');
      expect(mockStorageService.getCallCount('readFile')).toBe(1); // 没有增加
    });

    it('should cache getFileInfo results', async () => {
      const cachedStorage = cacheManager.createCachedStorageService(mockStorageService);
      
      // 第一次调用
      const info1 = await cachedStorage.getFileInfo('test.md');
      expect(info1.path).toBe('test.md');
      expect(mockStorageService.getCallCount('getFileInfo')).toBe(1);
      
      // 第二次调用 - 从缓存返回
      const info2 = await cachedStorage.getFileInfo('test.md');
      expect(info2.path).toBe('test.md');
      expect(mockStorageService.getCallCount('getFileInfo')).toBe(1);
    });

    it('should cache exists results', async () => {
      const cachedStorage = cacheManager.createCachedStorageService(mockStorageService);
      
      // 第一次调用
      const exists1 = await cachedStorage.exists('test.md');
      expect(exists1).toBe(true);
      expect(mockStorageService.getCallCount('exists')).toBe(1);
      
      // 第二次调用 - 从缓存返回
      const exists2 = await cachedStorage.exists('test.md');
      expect(exists2).toBe(true);
      expect(mockStorageService.getCallCount('exists')).toBe(1);
    });

    it('should cache readFileWithInfo for markdown files', async () => {
      const cachedStorage = cacheManager.createCachedStorageService(mockStorageService);
      
      // Markdown 文件应该被缓存
      const result1 = await cachedStorage.readFileWithInfo('document.md');
      expect(result1.content).toBe('Content of document.md');
      expect(mockStorageService.getCallCount('readFileWithInfo')).toBe(1);
      
      // 第二次调用 - 从缓存返回
      const result2 = await cachedStorage.readFileWithInfo('document.md');
      expect(result2.content).toBe('Content of document.md');
      expect(mockStorageService.getCallCount('readFileWithInfo')).toBe(1);
    });

    it('should respect cache conditions', async () => {
      const cachedStorage = cacheManager.createCachedStorageService(mockStorageService);
      
      // .md 文件应该被缓存
      await cachedStorage.readFile('test.md');
      await cachedStorage.readFile('test.md');
      expect(mockStorageService.getCallCount('readFile')).toBe(1);
      
      mockStorageService.resetCallCounts();
      
      // 非文本文件（假设缓存条件不匹配）可能不会被缓存
      // 这里我们测试不同的文件类型
      await cachedStorage.readFile('image.png');
      await cachedStorage.readFile('image.png');
      // PNG 文件不在缓存条件中，所以每次都会调用原始方法
      expect(mockStorageService.getCallCount('readFile')).toBe(2);
    });

    it('should generate proper cache keys', async () => {
      const cachedStorage = cacheManager.createCachedStorageService(mockStorageService);
      const cache = cacheManager.cache;
      
      // 调用 readFile
      await cachedStorage.readFile('test.md');
      
      // 检查缓存中是否存在预期的键
      const keys = await cache.getKeysMatching('storage:*');
      expect(keys.length).toBeGreaterThan(0);
      
      // 应该包含 file: 前缀的键
      const fileKeys = keys.filter(key => key.includes('file:test.md'));
      expect(fileKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', async () => {
      const cachedStorage = cacheManager.createCachedStorageService(mockStorageService);
      
      // 添加一些缓存数据
      await cachedStorage.readFile('test1.md');
      await cachedStorage.getFileInfo('test2.md');
      await cachedStorage.exists('test3.md');
      
      const stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.cachedServicesCount).toBe(1);
      expect(stats.namespaces).toContain('storage');
    });

    it('should clear specific namespace cache', async () => {
      const cachedStorage = cacheManager.createCachedStorageService(mockStorageService);
      
      // 添加缓存数据
      await cachedStorage.readFile('test.md');
      
      let stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBeGreaterThan(0);
      
      // 清理 storage 命名空间
      const clearedCount = await cacheManager.clearCache('storage');
      expect(clearedCount).toBeGreaterThan(0);
      
      stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBe(0);
    });

    it('should clear all cache', async () => {
      const cachedStorage = cacheManager.createCachedStorageService(mockStorageService);
      
      // 添加缓存数据
      await cachedStorage.readFile('test.md');
      
      let stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBeGreaterThan(0);
      
      // 清理所有缓存
      await cacheManager.clearCache();
      
      stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('Cache Warmup', () => {
    it('should warmup cache with common files', async () => {
      const commonFiles = ['welcome.md', 'readme.md', 'config.json'];
      
      await cacheManager.warmupCache(mockStorageService, commonFiles);
      
      // 检查所有文件都被调用了
      expect(mockStorageService.getCallCount('readFile')).toBe(3);
      expect(mockStorageService.getCallCount('getFileInfo')).toBe(3);
      expect(mockStorageService.getCallCount('exists')).toBe(3);
      
      // 检查缓存中有数据
      const stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it('should handle warmup errors gracefully', async () => {
      // 创建一个会抛出错误的 mock service
      const errorStorage = {
        ...mockStorageService,
        async readFile(path: string): Promise<string> {
          if (path === 'error.md') {
            throw new Error('File not found');
          }
          return `Content of ${path}`;
        }
      } as IStorageService;

      const commonFiles = ['good.md', 'error.md', 'another.md'];
      
      // 应该不抛出错误，优雅处理失败的文件
      await expect(cacheManager.warmupCache(errorStorage, commonFiles))
        .resolves.not.toThrow();
    });
  });

  describe('Health Check', () => {
    it('should pass health check', async () => {
      const isHealthy = await cacheManager.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Global Instance Management', () => {
    it('should initialize global cache manager', () => {
      const globalManager = initializeCacheManager({
        tiers: {
          lru: {
            maxCount: 500,
            defaultTTL: 120000
          }
        }
      });
      
      expect(globalManager).toBeDefined();
      expect(globalManager.cache).toBeDefined();
    });

    it('should dispose global cache manager', () => {
      initializeCacheManager();
      expect(() => disposeCacheManager()).not.toThrow();
    });
  });

  describe('Reusable Service Proxies', () => {
    it('should reuse cached service proxy for same service', () => {
      const cachedStorage1 = cacheManager.createCachedStorageService(mockStorageService);
      const cachedStorage2 = cacheManager.createCachedStorageService(mockStorageService);
      
      // 应该返回同一个代理实例
      expect(cachedStorage1).toBe(cachedStorage2);
    });

    it('should create generic cached service', () => {
      interface TestService {
        getData(id: string): Promise<string>;
      }
      
      const testService: TestService = {
        async getData(id: string): Promise<string> {
          return `data-${id}`;
        }
      };

      const cacheConfig = {
        getData: {
          ttl: 60000,
          keyGenerator: (id: string) => `data:${id}`
        }
      };

      const cachedTestService = cacheManager.createCachedService(
        testService,
        'test',
        cacheConfig
      );

      expect(cachedTestService).toBeDefined();
      expect(typeof cachedTestService.getData).toBe('function');
    });
  });
});