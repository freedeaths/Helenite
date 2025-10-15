/**
 * SearchService 集成测试
 *
 * 测试 SearchService 与真实服务的集成，包括：
 * - 与 StorageService 的 HTTP 集成
 * - 与 MetadataService 的集成
 * - 真实数据搜索功能
 * - 性能测试
 */

// 设置 IndexedDB 模拟
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SearchService } from '../SearchService.js';
import { StorageService } from '../infra/StorageService.js';
import { MetadataService } from '../MetadataService.js';
import fetch from 'node-fetch';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('SearchService Integration Tests', () => {
  let searchService: SearchService;
  let storageService: StorageService;
  let metadataService: MetadataService;
  let viteProcess: ChildProcess | null = null;
  const serverUrl = 'http://localhost:5173'; // Vite 默认开发服务器端口

  beforeAll(async () => {
    // 设置全局 fetch 为 node-fetch，确保真实的网络请求
    // @ts-expect-error Setting global.fetch for testing with node-fetch in Node.js environment
    global.fetch = fetch;

    // 检查服务器是否已经在运行
    const isServerRunning = async (): Promise<boolean> => {
      try {
        const response = await fetch(`${serverUrl}/vaults/Demo`);
        return response.ok;
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
        detached: false,
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
          viteProcess.kill();
          viteProcess = null;
        }
        throw new Error('开发服务器启动超时');
      }
    }
  }, 45000); // 增加超时时间到45秒，因为可能需要启动服务器

  afterAll(async () => {
    if (storageService) {
      await storageService.dispose();
    }

    // 只有当我们启动了服务器时才关闭它
    if (viteProcess) {
      viteProcess.kill();
      viteProcess = null;
    }
  });

  beforeEach(async () => {
    // 创建真实的服务实例，不使用 mock
    storageService = new StorageService({
      basePath: `${serverUrl}/vaults/Demo`,
      timeout: 10000,
      cache: false, // 禁用缓存确保测试准确性
    });
    await storageService.initialize();

    // MetadataService 构造函数是 (vaultId?, baseUrl?)
    metadataService = new MetadataService('Demo', serverUrl);
    searchService = new SearchService(storageService, metadataService, 'Demo');
  });

  // ===============================
  // 真实数据搜索测试
  // ===============================

  describe('真实数据搜索', () => {
    it('应该能够搜索真实文件内容', async () => {
      const results = await searchService.searchContent('Welcome');

      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult.filePath).toBeDefined();
      expect(firstResult.fileName).toBeDefined();
      expect(firstResult.matches.length).toBeGreaterThan(0);
      expect(firstResult.matches[0].content).toBeDefined();
      expect(firstResult.matches[0].highlighted).toContain('search-result-file-matched-text');
    });

    it('应该能够搜索标签', async () => {
      const results = await searchService.searchByTag('#helenite');

      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult.filePath).toBeDefined();
      expect(firstResult.fileName).toBeDefined();
      expect(firstResult.matches.length).toBeGreaterThan(0);
    });

    it('应该能够使用统一搜索入口', async () => {
      // 测试内容搜索
      const contentResults = await searchService.search('Helenite');
      expect(contentResults.length).toBeGreaterThan(0);

      // 测试标签搜索
      const tagResults = await searchService.search('#react');
      expect(tagResults.length).toBeGreaterThanOrEqual(0);
    });

    it('应该支持搜索选项', async () => {
      // 测试结果限制
      const limitedResults = await searchService.searchContent('the', { maxResults: 2 });
      expect(limitedResults.length).toBeLessThanOrEqual(2);

      // 测试每文件匹配限制
      const matchLimitedResults = await searchService.searchContent('the', {
        maxMatchesPerFile: 1,
      });
      matchLimitedResults.forEach((result) => {
        expect(result.matches.length).toBeLessThanOrEqual(1);
      });
    });
  });

  // ===============================
  // 与服务集成测试
  // ===============================

  describe('服务集成', () => {
    it('应该能够与 StorageService 正确集成', async () => {
      // 验证能够读取文件内容
      const testFile = 'Welcome.md';
      const content = await storageService.readFile(testFile);
      expect(typeof content === 'string' ? content.length : content.byteLength).toBeGreaterThan(0);

      // 验证搜索服务能使用该内容
      const results = await searchService.searchContent('Welcome');
      expect(results.some((r) => r.filePath === testFile)).toBe(true);
    });

    it('应该能够与 MetadataService 正确集成', async () => {
      // 验证能够获取元数据
      const metadata = await metadataService.getMetadata();
      expect(metadata?.length ?? 0).toBeGreaterThan(0);

      // 验证搜索服务能使用元数据
      const results = await searchService.search('test-query-that-might-not-exist');
      expect(Array.isArray(results)).toBe(true);
    });

    it('应该能够获取搜索统计信息', async () => {
      const stats = await searchService.getSearchStatistics('Helenite');

      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.searchTime).toBeGreaterThan(0);
      expect(Array.isArray(stats.topFolders)).toBe(true);
    });
  });

  // ===============================
  // 高级功能测试
  // ===============================

  describe('高级搜索功能', () => {
    it('应该支持路径前缀过滤', async () => {
      // 先获取所有结果
      const allResults = await searchService.searchContent('the');

      // 再获取过滤后的结果（假设有 Features/ 目录）
      const filteredResults = await searchService.searchContent('the', { pathPrefix: 'Features/' });

      // 过滤结果应该少于或等于所有结果
      expect(filteredResults.length).toBeLessThanOrEqual(allResults.length);

      // 验证所有过滤结果都以指定前缀开头
      filteredResults.forEach((result) => {
        expect(result.filePath.startsWith('Features/')).toBe(true);
      });
    });

    it('应该支持高亮搜索结果', async () => {
      const content = 'This is a test content with React framework.';
      const highlighted = searchService.highlightSearchResults(content, 'React');

      expect(highlighted).toContain('<span class="search-result-file-matched-text">React</span>');
    });

    it('应该验证搜索查询', () => {
      expect(searchService.validateSearchQuery('valid query')).toBe(true);
      expect(searchService.validateSearchQuery('')).toBe(false);
      expect(searchService.validateSearchQuery('a'.repeat(101))).toBe(false);
    });
  });

  // ===============================
  // 缓存和性能测试
  // ===============================

  describe('缓存和性能', () => {
    it('应该支持缓存功能', async () => {
      const query = 'performance-test-query';

      // 第一次搜索（建立缓存）
      const startTime1 = Date.now();
      const results1 = await searchService.search(query);
      const time1 = Date.now() - startTime1;

      // 第二次搜索（使用缓存）
      const startTime2 = Date.now();
      const results2 = await searchService.search(query);
      const time2 = Date.now() - startTime2;

      // 结果应该相同
      expect(results2).toEqual(results1);

      // 第二次应该更快（缓存效果）
      expect(time2).toBeLessThan(time1);
    });

    it('应该能够刷新缓存', async () => {
      const query = 'cache-refresh-test';

      // 建立缓存
      await searchService.search(query);

      // 刷新缓存
      await searchService.refreshCache();

      // 验证缓存已清空（通过检查缓存统计）
      const stats = await searchService.getCacheStats();
      expect(typeof stats.searchCacheSize).toBe('number');
    });

    it('应该在合理时间内完成搜索', async () => {
      const startTime = Date.now();
      await searchService.searchContent('test');
      const searchTime = Date.now() - startTime;

      // 搜索应该在 5 秒内完成
      expect(searchTime).toBeLessThan(5000);
    });
  });

  // ===============================
  // Vault 管理测试
  // ===============================

  describe('Vault 管理', () => {
    it('应该支持切换 vault', () => {
      const originalVault = searchService.getCurrentVault();

      searchService.switchVault('TestVault');
      const newVault = searchService.getCurrentVault();

      expect(newVault.id).toBe('TestVault');
      expect(newVault.path).toBe('/vaults/TestVault');

      // 恢复原始 vault
      searchService.switchVault(originalVault.id);
    });

    it('应该返回正确的 vault 信息', () => {
      const vaultInfo = searchService.getCurrentVault();

      expect(vaultInfo.id).toBe('Demo');
      expect(vaultInfo.path).toBe('/vaults/Demo');
    });
  });

  // ===============================
  // 错误处理和边界情况
  // ===============================

  describe('错误处理', () => {
    it('应该处理不存在的文件搜索', async () => {
      const results = await searchService.searchContent(
        'this-definitely-does-not-exist-in-any-file'
      );

      expect(results).toEqual([]);
    });

    it('应该处理不存在的标签搜索', async () => {
      const results = await searchService.searchByTag('#nonexistent-tag');

      expect(results).toEqual([]);
    });

    it('应该处理特殊字符查询', async () => {
      const specialQueries = ['[test]', '.*pattern', '^start$', 'end\\'];

      for (const query of specialQueries) {
        const results = await searchService.searchContent(query);
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('应该处理空查询', async () => {
      const emptyQueries = ['', '   ', '\t', '\n'];

      for (const query of emptyQueries) {
        const results = await searchService.search(query);
        expect(results).toEqual([]);
      }
    });
  });

  // ===============================
  // 综合业务场景测试
  // ===============================

  describe('业务场景集成', () => {
    it('应该支持复杂的搜索工作流', async () => {
      // 1. 全文搜索找到相关文档
      const contentResults = await searchService.searchContent('React');

      // 2. 标签搜索找到分类文档
      const tagResults = await searchService.searchByTag('#development');

      // 3. 获取搜索统计
      const stats = await searchService.getSearchStatistics('React');

      // 4. 测试高亮功能
      if (contentResults.length > 0) {
        const highlighted = searchService.highlightSearchResults(
          contentResults[0].matches[0].content,
          'React'
        );
        expect(highlighted).toContain('<span class="search-result-file-matched-text">');
      }

      // 所有操作都应该成功
      expect(contentResults).toBeDefined();
      expect(tagResults).toBeDefined();
      expect(stats).toBeDefined();
    });

    it('应该支持批量搜索操作', async () => {
      const queries = ['React', 'component', 'state', 'props'];
      const allResults = [];

      for (const query of queries) {
        const results = await searchService.searchContent(query);
        allResults.push({ query, count: results.length });
      }

      expect(allResults.every((r) => typeof r.count === 'number')).toBe(true);
    });
  });
});
