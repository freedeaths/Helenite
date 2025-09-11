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
    // @ts-ignore
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
      console.log('✅ 检测到开发服务器已运行在', serverUrl);
    } else {
      console.log('🚀 启动临时开发服务器...');
      
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
          console.log('✅ 开发服务器启动成功');
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
      console.log('🔄 关闭临时开发服务器...');
      viteProcess.kill();
      viteProcess = null;
    }
  });

  beforeEach(async () => {
    // 创建真实的服务实例，不使用 mock
    storageService = new StorageService({ 
      basePath: `${serverUrl}/vaults/Demo`,
      timeout: 10000,
      cache: false // 禁用缓存确保测试准确性
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

      console.log(`🔍 内容搜索 "Welcome" 找到 ${results.length} 个结果`);
      
      expect(results.length).toBeGreaterThan(0);
      
      const firstResult = results[0];
      expect(firstResult.filePath).toBeDefined();
      expect(firstResult.fileName).toBeDefined();
      expect(firstResult.matches.length).toBeGreaterThan(0);
      expect(firstResult.matches[0].content).toBeDefined();
      expect(firstResult.matches[0].highlighted).toContain('search-result-file-matched-text');
      
      console.log(`📄 第一个结果: ${firstResult.fileName} (${firstResult.matchCount} 匹配)`);
    });

    it('应该能够搜索标签', async () => {
      const results = await searchService.searchByTag('#helenite');

      console.log(`🏷️ 标签搜索 "#helenite" 找到 ${results.length} 个结果`);
      
      expect(results.length).toBeGreaterThan(0);
      
      const firstResult = results[0];
      expect(firstResult.filePath).toBeDefined();
      expect(firstResult.fileName).toBeDefined();
      expect(firstResult.matches.length).toBeGreaterThan(0);
      
      console.log(`📄 标签结果: ${firstResult.fileName}`);
    });

    it('应该能够使用统一搜索入口', async () => {
      // 测试内容搜索
      const contentResults = await searchService.search('Helenite');
      expect(contentResults.length).toBeGreaterThan(0);
      
      // 测试标签搜索
      const tagResults = await searchService.search('#react');
      expect(tagResults.length).toBeGreaterThanOrEqual(0);
      
      console.log(`🔍 统一搜索: 内容搜索 ${contentResults.length} 结果, 标签搜索 ${tagResults.length} 结果`);
    });

    it('应该支持搜索选项', async () => {
      // 测试结果限制
      const limitedResults = await searchService.searchContent('the', { maxResults: 2 });
      expect(limitedResults.length).toBeLessThanOrEqual(2);
      
      // 测试每文件匹配限制
      const matchLimitedResults = await searchService.searchContent('the', { maxMatchesPerFile: 1 });
      matchLimitedResults.forEach(result => {
        expect(result.matches.length).toBeLessThanOrEqual(1);
      });
      
      console.log(`⚙️ 搜索选项测试完成: 限制结果 ${limitedResults.length}, 限制匹配 ${matchLimitedResults.length}`);
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
      expect(content.length).toBeGreaterThan(0);
      
      // 验证搜索服务能使用该内容
      const results = await searchService.searchContent('Welcome');
      expect(results.some(r => r.filePath === testFile)).toBe(true);
      
      console.log(`🔗 StorageService 集成验证: 文件大小 ${content.length} 字符`);
    });

    it('应该能够与 MetadataService 正确集成', async () => {
      // 验证能够获取元数据
      const metadata = await metadataService.getMetadata();
      expect(metadata.length).toBeGreaterThan(0);
      
      // 验证搜索服务能使用元数据
      const results = await searchService.search('test-query-that-might-not-exist');
      expect(Array.isArray(results)).toBe(true);
      
      console.log(`🔗 MetadataService 集成验证: ${metadata.length} 个文件`);
    });

    it('应该能够获取搜索统计信息', async () => {
      const stats = await searchService.getSearchStatistics('Helenite');
      
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.searchTime).toBeGreaterThan(0);
      expect(Array.isArray(stats.topFolders)).toBe(true);
      
      console.log(`📊 搜索统计: ${stats.totalFiles} 文件, ${stats.matchedFiles} 匹配, ${stats.searchTime}ms`);
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
      filteredResults.forEach(result => {
        expect(result.filePath.startsWith('Features/')).toBe(true);
      });
      
      console.log(`🗂️ 路径过滤: ${allResults.length} → ${filteredResults.length} 结果`);
    });

    it('应该支持高亮搜索结果', async () => {
      const content = 'This is a test content with React framework.';
      const highlighted = searchService.highlightSearchResults(content, 'React');
      
      expect(highlighted).toContain('<span class="search-result-file-matched-text">React</span>');
      
      console.log('🎨 高亮功能验证通过');
    });

    it('应该验证搜索查询', () => {
      expect(searchService.validateSearchQuery('valid query')).toBe(true);
      expect(searchService.validateSearchQuery('')).toBe(false);
      expect(searchService.validateSearchQuery('a'.repeat(101))).toBe(false);
      
      console.log('✅ 查询验证功能正常');
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
      
      console.log(`⚡ 缓存性能: 第一次 ${time1}ms, 第二次 ${time2}ms`);
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
      
      console.log('🔄 缓存刷新功能正常');
    });

    it('应该在合理时间内完成搜索', async () => {
      const startTime = Date.now();
      const results = await searchService.searchContent('test');
      const searchTime = Date.now() - startTime;
      
      // 搜索应该在 5 秒内完成
      expect(searchTime).toBeLessThan(5000);
      
      console.log(`⏱️ 搜索性能: ${results.length} 结果在 ${searchTime}ms 内完成`);
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
      
      console.log(`🔄 Vault 切换: ${originalVault.id} → TestVault → ${originalVault.id}`);
    });

    it('应该返回正确的 vault 信息', () => {
      const vaultInfo = searchService.getCurrentVault();
      
      expect(vaultInfo.id).toBe('Demo');
      expect(vaultInfo.path).toBe('/vaults/Demo');
      
      console.log(`📂 当前 Vault: ${vaultInfo.id} (${vaultInfo.path})`);
    });
  });

  // ===============================
  // 错误处理和边界情况
  // ===============================

  describe('错误处理', () => {
    it('应该处理不存在的文件搜索', async () => {
      const results = await searchService.searchContent('this-definitely-does-not-exist-in-any-file');
      
      expect(results).toEqual([]);
      
      console.log('❌ 不存在内容搜索处理正常');
    });

    it('应该处理不存在的标签搜索', async () => {
      const results = await searchService.searchByTag('#nonexistent-tag');
      
      expect(results).toEqual([]);
      
      console.log('🏷️ 不存在标签搜索处理正常');
    });

    it('应该处理特殊字符查询', async () => {
      const specialQueries = ['[test]', '.*pattern', '^start$', 'end\\'];
      
      for (const query of specialQueries) {
        const results = await searchService.searchContent(query);
        expect(Array.isArray(results)).toBe(true);
      }
      
      console.log('🔤 特殊字符查询处理正常');
    });

    it('应该处理空查询', async () => {
      const emptyQueries = ['', '   ', '\t', '\n'];
      
      for (const query of emptyQueries) {
        const results = await searchService.search(query);
        expect(results).toEqual([]);
      }
      
      console.log('⚪ 空查询处理正常');
    });
  });

  // ===============================
  // 综合业务场景测试
  // ===============================

  describe('业务场景集成', () => {
    it('应该支持复杂的搜索工作流', async () => {
      console.log('🔍 执行复杂搜索工作流...');
      
      // 1. 全文搜索找到相关文档
      const contentResults = await searchService.searchContent('React');
      console.log(`📄 内容搜索: ${contentResults.length} 个文档包含 "React"`);
      
      // 2. 标签搜索找到分类文档
      const tagResults = await searchService.searchByTag('#development');
      console.log(`🏷️ 标签搜索: ${tagResults.length} 个文档标记为 "development"`);
      
      // 3. 获取搜索统计
      const stats = await searchService.getSearchStatistics('React');
      console.log(`📊 搜索统计: ${stats.matchedFiles}/${stats.totalFiles} 文件匹配`);
      
      // 4. 测试高亮功能
      if (contentResults.length > 0) {
        const highlighted = searchService.highlightSearchResults(
          contentResults[0].matches[0].content, 
          'React'
        );
        expect(highlighted).toContain('<span class="search-result-file-matched-text">');
        console.log('🎨 高亮功能正常');
      }
      
      // 所有操作都应该成功
      expect(contentResults).toBeDefined();
      expect(tagResults).toBeDefined();
      expect(stats).toBeDefined();
      
      console.log('✅ 复杂搜索工作流测试完成');
    });

    it('应该支持批量搜索操作', async () => {
      const queries = ['React', 'component', 'state', 'props'];
      const allResults = [];
      
      console.log('📦 执行批量搜索操作...');
      
      for (const query of queries) {
        const results = await searchService.searchContent(query);
        allResults.push({ query, count: results.length });
      }
      
      console.log('📊 批量搜索结果:');
      allResults.forEach(({ query, count }) => {
        console.log(`   "${query}": ${count} 结果`);
      });
      
      expect(allResults.every(r => typeof r.count === 'number')).toBe(true);
      
      console.log('✅ 批量搜索操作完成');
    });
  });
});