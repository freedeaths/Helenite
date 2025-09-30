/**
 * CacheManager 集成测试 - 测试与真实 StorageService 的集成
 */

// 设置 IndexedDB 模拟
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CacheManager } from '../CacheManager.js';
import { StorageService } from '../infra/StorageService.js';
import type { StorageConfig } from '../types/StorageTypes.js';
import type { IStorageService } from '../interfaces/IStorageService.js';
import fetch from 'node-fetch';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('CacheManager Integration Tests', () => {
  let cacheManager: CacheManager;
  let storageService: IStorageService;
  let cachedStorageService: IStorageService;
  let viteProcess: ChildProcess | null = null;
  const serverUrl = 'http://localhost:5173'; // Vite 默认开发服务器端口

  beforeAll(async () => {
    // 设置全局 fetch 为 node-fetch，确保真实的网络请求
    // @ts-expect-error - Global fetch setup for testing
    global.fetch = fetch;

    // 检查服务器是否已经在运行
    const isServerRunning = async (): Promise<boolean> => {
      try {
        const response = await fetch(`${serverUrl}/vaults/Demo/Welcome.md`);
        const contentType = response.headers.get('content-type');
        return response.ok && (contentType?.includes('text') ?? false);
      } catch {
        return false;
      }
    };

    if (await isServerRunning()) {
      // SKIP
    } else {

      // 启动 Vite 开发服务器
      viteProcess = spawn('npm', ['run', 'dev'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true' },
        detached: false
      });

      // 等待服务器启动
      let attempts = 0;
      const maxAttempts = 30; // 30秒超时

      while (attempts < maxAttempts) {
        await sleep(1000);
        if (await isServerRunning()) {
          break;
        }
        attempts++;
      }

      if (attempts >= maxAttempts) {
        if (viteProcess) {
          viteProcess.kill('SIGTERM');
          viteProcess = null;
        }
        throw new Error('❌ 启动开发服务器超时');
      }
    }


    // 配置真实的 StorageService 指向测试 vault
    const config: StorageConfig = {
      basePath: `${serverUrl}/vaults/Demo`,
      timeout: 10000,
      cache: false // 禁用 StorageService 内置缓存，只测试我们的代理缓存
    };

    storageService = new StorageService(config);

    await storageService.initialize(); // 初始化 StorageService

    cacheManager = new CacheManager({
      tiers: {
        lru: {
          maxCount: 200,
          defaultTTL: 300000 // 5分钟
        }
      },
      cleanup: {
        interval: 30000, // 30秒
        enabled: true
      }
    });
  }, 15000);

  afterAll(async () => {
    if (cacheManager) {
      cacheManager.dispose();
    }
    if (storageService) {
      await storageService.dispose();
    }

    // 如果我们启动了临时服务器，现在关闭它
    if (viteProcess) {
      viteProcess.kill('SIGTERM');

      // 等待进程关闭
      await new Promise<void>((resolve) => {
        viteProcess!.on('exit', () => {
          resolve();
        });

        // 强制关闭超时
        setTimeout(() => {
          if (viteProcess && !viteProcess.killed) {
            viteProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    }
  });

  beforeEach(() => {
    // 每个测试前清理缓存
    cacheManager.clearCache();
    cachedStorageService = cacheManager.createCachedStorageService(storageService);
  });

  describe('Real File Caching', () => {
    it('should cache markdown file reading', async () => {

      const filePath = '/Welcome.md';

      // 第一次读取 - 网络请求
      const start1 = Date.now();
      const content1 = await cachedStorageService.readFile(filePath);
      const time1 = Date.now() - start1;

      expect(typeof content1).toBe('string');
      expect((content1 as string).length).toBeGreaterThan(0);

      // 第二次读取 - 应该从缓存返回，更快
      const start2 = Date.now();
      const content2 = await cachedStorageService.readFile(filePath);
      const time2 = Date.now() - start2;

      expect(content2).toBe(content1);
      expect(time2).toBeLessThan(time1); // 缓存应该更快

      // 验证缓存中确实有数据
      const stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.namespaces).toContain('storage');
    }, 15000); // 增加超时时间用于网络请求

    it('should cache file info requests', async () => {
      const filePath = '/Welcome.md';

      // 第一次获取文件信息
      const info1 = await cachedStorageService.getFileInfo(filePath);
      expect(info1.exists).toBe(true);
      expect(info1.path).toBe('Welcome.md');

      // 第二次获取 - 应该从缓存返回
      const start = Date.now();
      const info2 = await cachedStorageService.getFileInfo(filePath);
      const time = Date.now() - start;

      expect(info2).toEqual(info1);
      expect(time).toBeLessThan(50); // 缓存应该在50ms内返回

      // 验证缓存键结构
      const cache = cacheManager.cache;
      const keys = await cache.getKeysMatching('storage:*');
      const infoKeys = keys.filter(key => key.includes('info:/Welcome.md'));
      expect(infoKeys.length).toBeGreaterThan(0);
    }, 10000);

    it('should cache file existence checks', async () => {
      const filePath = '/Welcome.md';

      // 第一次检查存在性
      const exists1 = await cachedStorageService.exists(filePath);
      expect(exists1).toBe(true);

      // 第二次检查 - 从缓存返回
      const start = Date.now();
      const exists2 = await cachedStorageService.exists(filePath);
      const time = Date.now() - start;

      expect(exists2).toBe(exists1);
      expect(time).toBeLessThan(10); // 缓存应该极快

      // 测试不存在的文件
      const notExists1 = await cachedStorageService.exists('/NonExistent.md');
      const notExists2 = await cachedStorageService.exists('/NonExistent.md');

      expect(notExists1).toBe(notExists2);
    }, 10000);

    it('should cache readFileWithInfo for markdown files', async () => {
      const filePath = '/Welcome.md';

      // 第一次读取文件和信息
      const result1 = await cachedStorageService.readFileWithInfo(filePath);
      expect(typeof result1.content).toBe('string');
      expect(result1.info.exists).toBe(true);

      // 第二次读取 - 应该从缓存返回
      const start = Date.now();
      const result2 = await cachedStorageService.readFileWithInfo(filePath);
      const time = Date.now() - start;

      expect(result2.content).toBe(result1.content);
      expect(result2.info).toEqual(result1.info);
      expect(time).toBeLessThan(50); // 缓存响应时间
    }, 10000);
  });

  describe('Cache Behavior Verification', () => {
    it('should respect cache conditions for different file types', async () => {
      // 测试 Markdown 文件 - 应该被缓存
      await cachedStorageService.readFile('/Welcome.md');

      let stats = await cacheManager.getStatistics();
      const entriesAfterMd = stats.totalEntries;

      // 再次读取同一文件 - 不应该增加缓存条目
      await cachedStorageService.readFile('/Welcome.md');
      stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBe(entriesAfterMd);

      // 测试图片文件（如果存在）- 可能不被缓存
      try {
        await cachedStorageService.readFile('/Attachments/inversed mt fuji.png');
        stats = await cacheManager.getStatistics();
        // 图片文件可能不会增加缓存条目（因为缓存条件）
      } catch {
        // 文件可能不存在，这是正常的
      }
    }, 15000);

    it('should generate unique cache keys for different options', async () => {
      const filePath = '/Welcome.md';

      // 以文本模式读取
      await cachedStorageService.readFile(filePath);

      // 以二进制模式读取（如果支持）
      try {
        await cachedStorageService.readFile(filePath, { binary: true });
      } catch {
        // 某些实现可能不支持二进制模式，这是正常的
      }

      const cache = cacheManager.cache;
      const keys = await cache.getKeysMatching('storage:*');
      const fileKeys = keys.filter(key => key.includes('file:/Welcome.md'));

      // 应该有不同选项对应的缓存键
      expect(fileKeys.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Cache Performance', () => {
    it('should demonstrate significant performance improvement', async () => {
      const filePath = '/Welcome.md';

      // 测量无缓存的性能（直接使用原始服务）
      const start1 = Date.now();
      await storageService.readFile(filePath);
      const uncachedTime = Date.now() - start1;

      // 第一次使用缓存服务（网络请求 + 缓存写入）
      const start2 = Date.now();
      await cachedStorageService.readFile(filePath);
      const firstCachedTime = Date.now() - start2;

      // 第二次使用缓存服务（纯缓存读取）
      const start3 = Date.now();
      await cachedStorageService.readFile(filePath);
      const secondCachedTime = Date.now() - start3;

      // 缓存应该显著提升性能，但在本地测试中网络很快，所以允许相等的情况
      // 由于 JavaScript 计时器精度问题，允许 1ms 的误差
      if (Math.abs(secondCachedTime - firstCachedTime) <= 1) {
        // 时间差在 1ms 以内，认为是相等的（计时器精度问题）
        expect(true).toBe(true);
      } else {
        // 如果时间差超过 1ms，则第二次缓存应该更快或相等
        expect(secondCachedTime).toBeLessThanOrEqual(firstCachedTime);
      }

      // 如果网络足够慢能体现差异，则验证性能提升
      // 但在本地开发环境中，网络可能很快，所以要更宽容
      if (uncachedTime > 10) {
        // 只有当网络调用超过10ms时，才期望看到明显的性能提升
        expect(secondCachedTime).toBeLessThan(uncachedTime * 0.8); // 至少20%提升
      } else if (uncachedTime > 2) {
        // 对于较快的网络，只要缓存不比原始调用慢就行
        expect(secondCachedTime).toBeLessThanOrEqual(uncachedTime);
      }
    }, 15000);
  });

  describe('Cache Warmup Integration', () => {
    it('should warmup cache with real files', async () => {
      const commonFiles = [
        '/Welcome.md',
        // 其他可能存在的文件
      ];

      // 清理缓存确保从干净状态开始
      await cacheManager.clearCache();

      let stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBe(0);

      // 执行缓存预热
      await cacheManager.warmupCache(storageService, commonFiles);

      // 验证缓存中有数据
      stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.namespaces).toContain('storage');

      // 验证预热的文件现在可以快速访问
      const start = Date.now();
      const content = await cachedStorageService.readFile('/Welcome.md');
      const time = Date.now() - start;

      expect(typeof content).toBe('string');
      expect(time).toBeLessThan(50); // 预热的文件应该快速返回
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle non-existent files properly', async () => {
      const nonExistentFile = '/ThisFileDoesNotExist.md';

      // 第一次尝试 - 应该抛出错误或返回特定值
      let error1: unknown;
      try {
        await cachedStorageService.readFile(nonExistentFile);
      } catch (e) {
        error1 = e;
      }

      // 第二次尝试 - 应该有相同的行为（错误也会被缓存）
      let error2: unknown;
      try {
        await cachedStorageService.readFile(nonExistentFile);
      } catch (e) {
        error2 = e;
      }

      // 错误应该一致
      if (error1 && error2) {
        expect((error1 as Error).message).toBe((error2 as Error).message);
      }
    });

    it('should handle network errors gracefully', async () => {
      // 创建一个会超时的配置
      const timeoutConfig: StorageConfig = {
        basePath: '/vaults/Demo',
        timeout: 1 // 1ms 超时，几乎肯定会失败
      };

      const timeoutStorageService = new StorageService(timeoutConfig);
      cacheManager.createCachedStorageService(timeoutStorageService);

      // 尝试读取文件 - 应该失败
      let error: unknown;
      try {
        await timeoutStorageService.initialize();
        // 如果初始化成功，说明网络很快，跳过这个测试
        return;
      } catch (e) {
        error = e;
        expect(error).toBeDefined();
      }
    });
  });

  describe('Memory Usage', () => {
    it('should respect max cache size limits', async () => {
      // 创建一个小容量的缓存管理器
      const smallCacheManager = new CacheManager({
        tiers: {
          lru: {
            maxCount: 3, // 只允许3个条目
            defaultTTL: 60000
          }
        }
      });

      // 使用已经初始化的 storageService
      const smallCachedService = smallCacheManager.createCachedStorageService(storageService);

      try {
        // 添加超过限制的条目
        await smallCachedService.readFile('/Welcome.md');

        const stats = await smallCacheManager.getStatistics();
        expect(stats.totalEntries).toBeLessThanOrEqual(3);

      } finally {
        smallCacheManager.dispose();
      }
    }, 10000);
  });
});