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
    // @ts-ignore
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
      // console.log('✅ 检测到开发服务器已运行在', serverUrl);
    } else {
      // console.log('🚀 启动临时开发服务器...');

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
          // console.log('✅ 开发服务器启动成功');
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
      // console.log('🔄 关闭临时开发服务器...');
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

      // console.log(`📄 Front Matter for Welcome.md:`, frontMatter);

      // Front Matter 可能存在也可能不存在
      if (frontMatter) {
        expect(typeof frontMatter).toBe('object');
        // console.log(`✅ Front Matter 字段:`, Object.keys(frontMatter));
      } else {
        // console.log('ℹ️ Welcome.md 没有 Front Matter');
      }
    });

    it('应该能够获取所有文件的 Front Matter', async () => {
      const allFrontMatter = await frontMatterService.getAllFrontMatter();

      // console.log(`📊 总共 ${allFrontMatter.length} 个文件有 Front Matter`);

      expect(Array.isArray(allFrontMatter)).toBe(true);

      if (allFrontMatter.length > 0) {
        const firstFile = allFrontMatter[0];
        expect(firstFile).toHaveProperty('filePath');
        expect(firstFile).toHaveProperty('frontMatter');
        // console.log(`📄 第一个文件: ${firstFile.filePath}`);
      }
    });

    it('应该能够获取统计信息', async () => {
      const stats = await frontMatterService.getStatistics();

      // console.log(`📊 Front Matter 统计信息:`);
      // console.log(`   总文件数: ${stats.totalFiles}`);
      // console.log(`   有 UUID 的文件: ${stats.filesWithUuid}`);
      // console.log(`   已发布文件: ${stats.publishedFiles}`);
      // console.log(`   未发布文件: ${stats.unpublishedFiles}`);

      expect(stats.totalFiles).toBeGreaterThanOrEqual(0);
      expect(stats.filesWithUuid).toBeGreaterThanOrEqual(0);
      expect(stats.publishedFiles).toBeGreaterThanOrEqual(0);
      expect(stats.unpublishedFiles).toBeGreaterThanOrEqual(0);

      if (stats.topAuthors.length > 0) {
        // console.log(`   热门作者: ${stats.topAuthors.map(a => `${a.author}(${a.count})`).join(', ')}`);
      }
    });
  });

  // ===============================
  // UUID 管理测试（评论功能依赖）
  // ===============================

  describe('UUID 管理功能', () => {
    it('应该能够获取 UUID 映射', async () => {
      const allUuids = await frontMatterService.getAllUuids();

      // console.log(`🔑 找到 ${Object.keys(allUuids).length} 个 UUID`);

      expect(typeof allUuids).toBe('object');

      if (Object.keys(allUuids).length > 0) {
        const firstUuid = Object.keys(allUuids)[0];
        const filePath = allUuids[firstUuid];

        // console.log(`   UUID: ${firstUuid} → ${filePath}`);

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

      // console.log('✅ 正确处理不存在的 UUID');
    });
  });

  // ===============================
  // 发布状态和作者管理
  // ===============================

  describe('发布状态和作者管理', () => {
    it('应该能够管理发布状态', async () => {
      const publishedFiles = await frontMatterService.getPublishedFiles();
      const unpublishedFiles = await frontMatterService.getUnpublishedFiles();

      // console.log(`📢 发布管理:`);
      // console.log(`   已发布文件: ${publishedFiles.length} 个`);
      // console.log(`   未发布文件: ${unpublishedFiles.length} 个`);

      expect(Array.isArray(publishedFiles)).toBe(true);
      expect(Array.isArray(unpublishedFiles)).toBe(true);

      // 测试具体文件的发布状态
      if (publishedFiles.length > 0) {
        const firstPublished = publishedFiles[0];
        const isPublished = await frontMatterService.isPublished(firstPublished);
        expect(isPublished).toBe(true);
        // console.log(`   ${firstPublished} 是已发布状态`);
      }
    });

    it('应该能够管理作者信息', async () => {
      const allAuthors = await frontMatterService.getAllAuthors();

      // console.log(`👥 作者管理:`);
      // console.log(`   总作者数: ${allAuthors.length}`);

      expect(Array.isArray(allAuthors)).toBe(true);

      if (allAuthors.length > 0) {
        const firstAuthor = allAuthors[0];
        // console.log(`   作者: ${firstAuthor}`);

        // 测试按作者查找文件
        const authorFiles = await frontMatterService.getFilesByAuthor(firstAuthor);
        expect(Array.isArray(authorFiles)).toBe(true);
        expect(authorFiles.length).toBeGreaterThan(0);

        // console.log(`   ${firstAuthor} 的文件: ${authorFiles.length} 个`);

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

      // console.log(`🔍 复杂查询:`);
      // console.log(`   仅已发布: ${publishedOnly.length} 个文件`);
      // console.log(`   仅未发布: ${unpublishedOnly.length} 个文件`);

      expect(Array.isArray(publishedOnly)).toBe(true);
      expect(Array.isArray(unpublishedOnly)).toBe(true);
    });

    it('应该支持 Front Matter 搜索', async () => {
      const searchResults = await frontMatterService.searchFrontMatter('test');

      // console.log(`🔎 Front Matter 搜索 "test": ${searchResults.length} 个结果`);

      expect(Array.isArray(searchResults)).toBe(true);

      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        expect(firstResult).toHaveProperty('filePath');
        expect(firstResult).toHaveProperty('matches');
        expect(Array.isArray(firstResult.matches)).toBe(true);

        // console.log(`   第一个匹配: ${firstResult.filePath}`);
        if (firstResult.matches.length > 0) {
          // console.log(`   匹配字段: ${firstResult.matches[0].field}`);
        }
      }
    });

    it('应该支持自定义字段管理', async () => {
      const customFields = await frontMatterService.getAllCustomFields();

      // console.log(`🔧 自定义字段: ${customFields.length} 个`);
      // console.log(`   字段名: ${customFields.join(', ')}`);

      expect(Array.isArray(customFields)).toBe(true);

      // 测试自定义字段查询
      for (const fieldName of customFields.slice(0, 3)) { // 只测试前3个
        const filesWithField = await frontMatterService.getFilesByCustomField(fieldName);
        expect(Array.isArray(filesWithField)).toBe(true);
        // console.log(`   字段 "${fieldName}": ${filesWithField.length} 个文件`);
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

      // console.log(`⏱️ 统计分析性能: ${analysisTime}ms`);

      // 统计分析应该在 3 秒内完成
      expect(analysisTime).toBeLessThan(3000);
      expect(stats).toBeDefined();
    });

    it('应该能够分析 Front Matter 使用模式', async () => {
      const patterns = await frontMatterService.analyzeFrontMatterPatterns();

      // console.log(`📈 Front Matter 使用模式分析:`);
      // console.log(`   常用字段数: ${patterns.commonFields.length}`);
      // console.log(`   推荐字段数: ${patterns.recommendedFields.length}`);

      expect(patterns).toHaveProperty('commonFields');
      expect(patterns).toHaveProperty('fieldValueDistribution');
      expect(patterns).toHaveProperty('recommendedFields');
      expect(Array.isArray(patterns.commonFields)).toBe(true);
      expect(Array.isArray(patterns.recommendedFields)).toBe(true);

      if (patterns.commonFields.length > 0) {
        const topField = patterns.commonFields[0];
        // console.log(`   最常用字段: ${topField.field} (使用 ${topField.usage} 次)`);
      }

      if (patterns.recommendedFields.length > 0) {
        // console.log(`   推荐字段: ${patterns.recommendedFields.join(', ')}`);
      }
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
        // console.log(`🔗 MetadataService 集成验证: ${metadata.length} 个文件的元数据`);

        // 验证 FrontMatterService 能使用元数据
        const allFrontMatter = await frontMatterService.getAllFrontMatter();
        expect(Array.isArray(allFrontMatter)).toBe(true);

        // console.log(`🔗 FrontMatterService 处理了 ${allFrontMatter.length} 个文件的 Front Matter`);
      }
    });

    it('应该支持缓存管理', async () => {
      // 建立缓存
      await frontMatterService.getAllFrontMatter();

      // 获取缓存统计
      const cacheStats = await frontMatterService.getCacheStats();
      expect(cacheStats).toHaveProperty('vaultId');
      expect(cacheStats).toHaveProperty('frontMatterCacheSize');

      // console.log(`💾 缓存统计: ${JSON.stringify(cacheStats, null, 2)}`);

      // 刷新缓存
      await frontMatterService.refreshCache();
      // console.log('🔄 缓存刷新完成');
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

      // console.log(`🔄 Vault 切换: ${originalVault.id} → TestVault → ${originalVault.id}`);
    });

    it('应该返回正确的 vault 信息', () => {
      const vaultInfo = frontMatterService.getCurrentVault();

      expect(vaultInfo.id).toBe('Demo');
      expect(vaultInfo.path).toBe('/vaults/Demo');

      // console.log(`📂 当前 Vault: ${vaultInfo.id} (${vaultInfo.path})`);
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

      // console.log('❌ 正确处理不存在的文件');
    });

    it('应该处理空查询', async () => {
      const emptySearchResults = await frontMatterService.searchFrontMatter('');
      expect(emptySearchResults).toEqual([]);

      const emptyQueryResults = await frontMatterService.queryFiles({
        author: 'Non-existent Author'
      });
      expect(emptyQueryResults).toEqual([]);

      // console.log('⚪ 正确处理空查询');
    });
  });

  // ===============================
  // 综合业务场景测试
  // ===============================

  describe('业务场景集成', () => {
    it('应该支持评论功能的 UUID 工作流', async () => {
      // console.log('💬 测试评论功能 UUID 工作流...');

      // 1. 获取所有有 UUID 的文件
      const allUuids = await frontMatterService.getAllUuids();
      // console.log(`   找到 ${Object.keys(allUuids).length} 个有 UUID 的文件`);

      if (Object.keys(allUuids).length > 0) {
        const testUuid = Object.keys(allUuids)[0];
        const filePath = allUuids[testUuid];

        // 2. 根据文件路径获取 UUID
        const retrievedUuid = await frontMatterService.getUuid(filePath);
        expect(retrievedUuid).toBe(testUuid);
        // console.log(`   文件 ${filePath} 的 UUID: ${retrievedUuid}`);

        // 3. 根据 UUID 反向查找文件
        const retrievedFile = await frontMatterService.getFileByUuid(testUuid);
        expect(retrievedFile).toBe(filePath);
        // console.log(`   UUID ${testUuid} 对应文件: ${retrievedFile}`);

        // 4. 检查 UUID 存在性（评论系统需要）
        const uuidExists = await frontMatterService.hasUuid(testUuid);
        expect(uuidExists).toBe(true);
        // console.log(`   UUID ${testUuid} 存在性检查: ${uuidExists}`);
      }

      // console.log('✅ 评论功能 UUID 工作流测试完成');
    });

    it('应该支持内容管理系统工作流', async () => {
      // console.log('📝 测试内容管理系统工作流...');

      // 1. 获取发布统计
      const stats = await frontMatterService.getStatistics();
      // console.log(`   内容统计: ${stats.publishedFiles} 已发布, ${stats.unpublishedFiles} 未发布`);

      // 2. 按作者分组
      if (stats.topAuthors.length > 0) {
        const topAuthor = stats.topAuthors[0];
        const authorFiles = await frontMatterService.getFilesByAuthor(topAuthor.author);
        // console.log(`   作者 "${topAuthor.author}" 有 ${authorFiles.length} 个文件`);

        // 3. 分析该作者的发布状态
        let publishedCount = 0;
        let unpublishedCount = 0;

        for (const filePath of authorFiles.slice(0, 5)) { // 只检查前5个文件
          const isPublished = await frontMatterService.isPublished(filePath);
          if (isPublished === true) publishedCount++;
          else if (isPublished === false) unpublishedCount++;
        }

        // console.log(`   该作者的发布状态: ${publishedCount} 已发布, ${unpublishedCount} 未发布`);
      }

      // 4. 自定义字段分析
      const customFields = await frontMatterService.getAllCustomFields();
      if (customFields.length > 0) {
        // console.log(`   发现 ${customFields.length} 个自定义字段: ${customFields.slice(0, 3).join(', ')}`);
      }

      // console.log('✅ 内容管理系统工作流测试完成');
    });
  });
});