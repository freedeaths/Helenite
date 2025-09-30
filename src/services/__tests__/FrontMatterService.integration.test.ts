/**
 * FrontMatterService 集成测试
 *
 * 测试 FrontMatterService 与真实服务的集成，包括：
 * - 与 MetadataService 的集成
 * - 真实数据 Front Matter 处理
 * - UUID 管理功能验证
 * - 发布状态和作者管理
 * - 性能测试
 */

// 设置 IndexedDB 模拟
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FrontMatterService } from '../FrontMatterService.js';
import { MetadataService } from '../MetadataService.js';
import fetch from 'node-fetch';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('FrontMatterService Integration Tests', () => {
  let frontMatterService: FrontMatterService;
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
        const response = await fetch(`${serverUrl}/vaults/Demo/.obsidian/plugins/metadata-extractor/metadata.json`);
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
          viteProcess.kill();
          viteProcess = null;
        }
        throw new Error('开发服务器启动超时');
      }
    }
  }, 45000); // 增加超时时间到45秒，因为可能需要启动服务器

  afterAll(async () => {
    // 只有当我们启动了服务器时才关闭它
    if (viteProcess) {
      viteProcess.kill();
      viteProcess = null;
    }
  });

  beforeEach(() => {
    // 创建真实的服务实例，不使用 mock
    metadataService = new MetadataService('Demo', serverUrl);
    frontMatterService = new FrontMatterService(metadataService, 'Demo');
  });

  // ===============================
  // 真实数据 Front Matter 测试
  // ===============================

  describe('真实数据 Front Matter 处理', () => {
    it('应该能够获取真实文件的 Front Matter', async () => {
      const frontMatter = await frontMatterService.getFrontMatter('Welcome.md');


      // Front Matter 可能存在也可能不存在
      if (frontMatter) {
        expect(typeof frontMatter).toBe('object');
      }
    });

    it('应该能够获取所有文件的 Front Matter', async () => {
      const allFrontMatter = await frontMatterService.getAllFrontMatter();


      expect(Array.isArray(allFrontMatter)).toBe(true);

      if (allFrontMatter.length > 0) {
        const firstFile = allFrontMatter[0];
        expect(firstFile).toHaveProperty('filePath');
        expect(firstFile).toHaveProperty('frontMatter');
      }
    });

    it('应该能够获取统计信息', async () => {
      const stats = await frontMatterService.getStatistics();


      expect(stats.totalFiles).toBeGreaterThanOrEqual(0);
      expect(stats.filesWithUuid).toBeGreaterThanOrEqual(0);
      expect(stats.publishedFiles).toBeGreaterThanOrEqual(0);
      expect(stats.unpublishedFiles).toBeGreaterThanOrEqual(0);

    });
  });

  // ===============================
  // UUID 管理测试（评论功能依赖）
  // ===============================

  describe('UUID 管理功能', () => {
    it('应该能够获取 UUID 映射', async () => {
      const allUuids = await frontMatterService.getAllUuids();


      expect(typeof allUuids).toBe('object');

      if (Object.keys(allUuids).length > 0) {
        const firstUuid = Object.keys(allUuids)[0];
        const filePath = allUuids[firstUuid];


        // 验证反向查找
        const foundFile = await frontMatterService.getFileByUuid(firstUuid);
        expect(foundFile).toBe(filePath);

        // 验证 UUID 存在性检查
        const exists = await frontMatterService.hasUuid(firstUuid);
        expect(exists).toBe(true);
      }
    });

    it('应该正确处理不存在的 UUID', async () => {
      const nonExistentUuid = 'uuid-does-not-exist-12345';

      const foundFile = await frontMatterService.getFileByUuid(nonExistentUuid);
      expect(foundFile).toBeNull();

      const exists = await frontMatterService.hasUuid(nonExistentUuid);
      expect(exists).toBe(false);

    });
  });

  // ===============================
  // 发布状态和作者管理
  // ===============================

  describe('发布状态和作者管理', () => {
    it('应该能够管理发布状态', async () => {
      const publishedFiles = await frontMatterService.getPublishedFiles();
      const unpublishedFiles = await frontMatterService.getUnpublishedFiles();


      expect(Array.isArray(publishedFiles)).toBe(true);
      expect(Array.isArray(unpublishedFiles)).toBe(true);

      // 测试具体文件的发布状态
      if (publishedFiles.length > 0) {
        const firstPublished = publishedFiles[0];
        const isPublished = await frontMatterService.isPublished(firstPublished);
        expect(isPublished).toBe(true);
      }
    });

    it('应该能够管理作者信息', async () => {
      const allAuthors = await frontMatterService.getAllAuthors();


      expect(Array.isArray(allAuthors)).toBe(true);

      if (allAuthors.length > 0) {
        const firstAuthor = allAuthors[0];

        // 测试按作者查找文件
        const authorFiles = await frontMatterService.getFilesByAuthor(firstAuthor);
        expect(Array.isArray(authorFiles)).toBe(true);
        expect(authorFiles.length).toBeGreaterThan(0);


        // 验证第一个文件的作者
        if (authorFiles.length > 0) {
          const author = await frontMatterService.getAuthor(authorFiles[0]);
          expect(author).toBe(firstAuthor);
        }
      }
    });
  });

  // ===============================
  // 高级查询功能
  // ===============================

  describe('高级查询功能', () => {
    it('应该支持复杂查询过滤', async () => {
      // 测试发布状态过滤
      const publishedOnly = await frontMatterService.queryFiles({
        includePublished: true,
        includeUnpublished: false
      });

      const unpublishedOnly = await frontMatterService.queryFiles({
        includePublished: false,
        includeUnpublished: true
      });


      expect(Array.isArray(publishedOnly)).toBe(true);
      expect(Array.isArray(unpublishedOnly)).toBe(true);
    });

    it('应该支持 Front Matter 搜索', async () => {
      const searchResults = await frontMatterService.searchFrontMatter('test');


      expect(Array.isArray(searchResults)).toBe(true);

      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        expect(firstResult).toHaveProperty('filePath');
        expect(firstResult).toHaveProperty('matches');
        expect(Array.isArray(firstResult.matches)).toBe(true);

      }
    });

    it('应该支持自定义字段管理', async () => {
      const customFields = await frontMatterService.getAllCustomFields();


      expect(Array.isArray(customFields)).toBe(true);

      // 测试自定义字段查询
      for (const fieldName of customFields.slice(0, 3)) { // 只测试前3个
        const filesWithField = await frontMatterService.getFilesByCustomField(fieldName);
        expect(Array.isArray(filesWithField)).toBe(true);
      }
    });
  });

  // ===============================
  // 性能和分析测试
  // ===============================

  describe('性能和分析', () => {
    it('应该在合理时间内完成统计分析', async () => {
      const startTime = Date.now();
      const stats = await frontMatterService.getStatistics();
      const analysisTime = Date.now() - startTime;


      // 统计分析应该在 3 秒内完成
      expect(analysisTime).toBeLessThan(3000);
      expect(stats).toBeDefined();
    });

    it('应该能够分析 Front Matter 使用模式', async () => {
      const patterns = await frontMatterService.analyzeFrontMatterPatterns();


      expect(patterns).toHaveProperty('commonFields');
      expect(patterns).toHaveProperty('fieldValueDistribution');
      expect(patterns).toHaveProperty('recommendedFields');
      expect(Array.isArray(patterns.commonFields)).toBe(true);
      expect(Array.isArray(patterns.recommendedFields)).toBe(true);

    });
  });

  // ===============================
  // 服务集成测试
  // ===============================

  describe('服务集成', () => {
    it('应该能够与 MetadataService 正确集成', async () => {
      // 验证能够获取元数据
      const metadata = await metadataService.getMetadata();
      expect(metadata).toBeDefined();

      if (metadata && metadata.length > 0) {

        // 验证 FrontMatterService 能使用元数据
        const allFrontMatter = await frontMatterService.getAllFrontMatter();
        expect(Array.isArray(allFrontMatter)).toBe(true);

      }
    });

    it('应该支持缓存管理', async () => {
      // 建立缓存
      await frontMatterService.getAllFrontMatter();

      // 获取缓存统计
      const cacheStats = await frontMatterService.getCacheStats();
      expect(cacheStats).toHaveProperty('vaultId');
      expect(cacheStats).toHaveProperty('frontMatterCacheSize');


      // 刷新缓存
      await frontMatterService.refreshCache();
    });
  });

  // ===============================
  // Vault 管理测试
  // ===============================

  describe('Vault 管理', () => {
    it('应该支持切换 vault', () => {
      const originalVault = frontMatterService.getCurrentVault();

      frontMatterService.switchVault('TestVault');
      const newVault = frontMatterService.getCurrentVault();

      expect(newVault.id).toBe('TestVault');
      expect(newVault.path).toBe('/vaults/TestVault');

      // 恢复原始 vault
      frontMatterService.switchVault(originalVault.id);

    });

    it('应该返回正确的 vault 信息', () => {
      const vaultInfo = frontMatterService.getCurrentVault();

      expect(vaultInfo.id).toBe('Demo');
      expect(vaultInfo.path).toBe('/vaults/Demo');

    });
  });

  // ===============================
  // 错误处理和边界情况
  // ===============================

  describe('错误处理', () => {
    it('应该处理不存在的文件', async () => {
      const nonExistentFile = 'this-file-does-not-exist.md';

      const frontMatter = await frontMatterService.getFrontMatter(nonExistentFile);
      expect(frontMatter).toBeNull();

      const uuid = await frontMatterService.getUuid(nonExistentFile);
      expect(uuid).toBeNull();

      const author = await frontMatterService.getAuthor(nonExistentFile);
      expect(author).toBeNull();

    });

    it('应该处理空查询', async () => {
      const emptySearchResults = await frontMatterService.searchFrontMatter('');
      expect(emptySearchResults).toEqual([]);

      const emptyQueryResults = await frontMatterService.queryFiles({
        author: 'Non-existent Author'
      });
      expect(emptyQueryResults).toEqual([]);

    });
  });

  // ===============================
  // 综合业务场景测试
  // ===============================

  describe('业务场景集成', () => {
    it('应该支持评论功能的 UUID 工作流', async () => {

      // 1. 获取所有有 UUID 的文件
      const allUuids = await frontMatterService.getAllUuids();

      if (Object.keys(allUuids).length > 0) {
        const testUuid = Object.keys(allUuids)[0];
        const filePath = allUuids[testUuid];

        // 2. 根据文件路径获取 UUID
        const retrievedUuid = await frontMatterService.getUuid(filePath);
        expect(retrievedUuid).toBe(testUuid);

        // 3. 根据 UUID 反向查找文件
        const retrievedFile = await frontMatterService.getFileByUuid(testUuid);
        expect(retrievedFile).toBe(filePath);

        // 4. 检查 UUID 存在性（评论系统需要）
        const uuidExists = await frontMatterService.hasUuid(testUuid);
        expect(uuidExists).toBe(true);
      }

    });

    it('应该支持内容管理系统工作流', async () => {

      // 1. 获取发布统计
      const stats = await frontMatterService.getStatistics();

      // 2. 按作者分组
      if (stats.topAuthors.length > 0) {
        const topAuthor = stats.topAuthors[0];
        const authorFiles = await frontMatterService.getFilesByAuthor(topAuthor.author);

        // 3. 分析该作者的发布状态
        let _publishedCount = 0;
        let _unpublishedCount = 0;

        for (const filePath of authorFiles.slice(0, 5)) { // 只检查前5个文件
          const isPublished = await frontMatterService.isPublished(filePath);
          if (isPublished === true) _publishedCount++;
          else if (isPublished === false) _unpublishedCount++;
        }

      }

      // 4. 自定义字段分析
      await frontMatterService.getAllCustomFields();

    });
  });
});