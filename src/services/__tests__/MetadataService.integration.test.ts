/**
 * MetadataService 集成测试
 *
 * 使用真实的 metadata.json 数据进行测试
 */

// 设置 IndexedDB 模拟
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { MetadataService } from '../MetadataService.js';
import { CacheManager } from '../CacheManager.js';
import type { IMetadataService } from '../interfaces/IMetadataService.js';
import fetch from 'node-fetch';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('MetadataService Integration Tests', () => {
  let metadataService: MetadataService;
  let cacheManager: CacheManager;
  let cachedMetadataService: IMetadataService;
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
        throw new Error('❌ 启动开发服务器超时');
      }
    }
  });

  afterAll(async () => {
    if (viteProcess) {
      // console.log('🛑 关闭临时开发服务器...');
      viteProcess.kill('SIGTERM');

      // 等待进程关闭
      await new Promise<void>((resolve) => {
        viteProcess!.on('exit', () => {
          // console.log('✅ 开发服务器已关闭');
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

  beforeEach(async () => {
    // 创建服务实例，传入完整的服务器URL作为baseUrl
    metadataService = new MetadataService('Demo', serverUrl);
    cacheManager = new CacheManager();
    cachedMetadataService = cacheManager.createCachedMetadataService(metadataService);
  });

  afterEach(() => {
    if (cacheManager && typeof cacheManager.dispose === 'function') {
      cacheManager.dispose();
    }
  });

  describe('Real Data Loading', () => {
    it('should load real metadata from Demo vault', async () => {
      // 调试：检查 MetadataService 使用的 URL
      const metadataUrl = metadataService['vaultConfig'].getMetadataUrl();
      // console.log('🔍 MetadataService URL:', metadataUrl);

      const metadata = await metadataService.getMetadata();

      expect(metadata).toBeTruthy();
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata!.length).toBeGreaterThan(0);

      // 验证实际文件数量 (基于读取到的数据)
      expect(metadata!.length).toBe(12); // 包含所有 Demo vault 中的文件

      // console.log(`📄 Loaded ${metadata!.length} files from real vault`);
    });

    it('should find specific files from real data', async () => {
      const metadata = await metadataService.getMetadata();
      expect(metadata).toBeTruthy();

      // 验证特定文件存在
      const files = metadata!.map(file => file.fileName);
      expect(files).toContain('services-architecture');
      expect(files).toContain('Welcome');
      expect(files).toContain('Abilities');
      expect(files).toContain('README');

      // console.log('✅ Found expected files in real metadata');
    });

    it('should have correct file structure for services-architecture', async () => {
      const fileMetadata = await metadataService.getFileMetadata('helenite-docs/services-architecture.md');

      expect(fileMetadata).toBeTruthy();
      expect(fileMetadata!.fileName).toBe('services-architecture');
      expect(fileMetadata!.relativePath).toBe('helenite-docs/services-architecture.md');
      expect(fileMetadata!.tags).toContain('helenite');
      expect(fileMetadata!.aliases).toContain('helenite');
      expect(fileMetadata!.aliases).toContain('design');
      expect(fileMetadata!.frontmatter?.uuid).toBe('215e245b-8b86-43b8-9728-472b60e47711');

      // 验证标题结构
      expect(fileMetadata!.headings).toBeTruthy();
      expect(fileMetadata!.headings!.length).toBeGreaterThan(10);

      const firstHeading = fileMetadata!.headings![0];
      expect(firstHeading.heading).toBe('Helenite 服务架构概览');
      expect(firstHeading.level).toBe(1);

      // console.log(`✅ services-architecture has ${fileMetadata!.headings!.length} headings`);
    });

    it('should have correct file structure for Abilities', async () => {
      const fileMetadata = await metadataService.getFileMetadata('FolderA/SubFolder/Abilities.md');

      expect(fileMetadata).toBeTruthy();
      expect(fileMetadata!.fileName).toBe('Abilities');
      expect(fileMetadata!.relativePath).toBe('FolderA/SubFolder/Abilities.md');

      // 验证标签
      expect(fileMetadata!.tags).toContain('test');
      expect(fileMetadata!.tags).toContain('react');
      expect(fileMetadata!.tags).toContain('markdown');
      expect(fileMetadata!.tags).toContain('obsidian');
      expect(fileMetadata!.tags).toContain('abc');

      // 验证链接
      expect(fileMetadata!.links).toBeTruthy();
      expect(fileMetadata!.links!.some(link => link.link === 'Usages')).toBe(true);
      expect(fileMetadata!.links!.some(link => link.link === 'Welcome')).toBe(true);

      // console.log(`✅ Abilities has ${fileMetadata!.tags!.length} tags and ${fileMetadata!.links!.length} links`);
    });
  });

  describe('Real Data Queries', () => {
    it('should extract all unique tags from real data', async () => {
      const tags = await metadataService.getAllTags();

      expect(tags.length).toBeGreaterThan(0);

      // 验证特定标签存在
      expect(tags).toContain('helenite');
      expect(tags).toContain('test');
      expect(tags).toContain('react');
      expect(tags).toContain('markdown');
      expect(tags).toContain('obsidian');
      expect(tags).toContain('abc');

      // console.log(`🏷️ Found ${tags.length} unique tags: ${tags.join(', ')}`);
    });

    it('should search files by tag in real data', async () => {
      const reactFiles = await metadataService.getFilesByTag('react');

      expect(reactFiles.length).toBeGreaterThan(0);
      expect(reactFiles.some(file => file.fileName === 'Abilities')).toBe(true);

      const heleniteFiles = await metadataService.getFilesByTag('helenite');
      expect(heleniteFiles.length).toBeGreaterThan(0);
      expect(heleniteFiles.some(file => file.fileName === 'services-architecture')).toBe(true);

      // console.log(`🔍 Found ${reactFiles.length} files with 'react' tag, ${heleniteFiles.length} files with 'helenite' tag`);
    });

    it('should search files by name in real data', async () => {
      const searchResults = await metadataService.searchInMetadata('Welcome');

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some(file => file.fileName === 'Welcome')).toBe(true);
      expect(searchResults.some(file => file.fileName === 'Abilities')).toBe(true); // Abilities has "Welcome to Helenite" heading

      // console.log(`🔍 Search 'Welcome' found ${searchResults.length} files`);
    });

    it('should find backlinks in real data', async () => {
      const backlinks = await metadataService.getFileBacklinks('Welcome.md');

      expect(backlinks.length).toBeGreaterThan(0);
      expect(backlinks.some(link => link.fileName === 'Abilities')).toBe(true);

      // console.log(`🔗 Welcome.md has ${backlinks.length} backlinks`);
    });

    it('should find outgoing links in real data', async () => {
      const outgoingLinks = await metadataService.getFileLinks('FolderA/SubFolder/Abilities.md');

      expect(outgoingLinks.length).toBeGreaterThan(0);
      expect(outgoingLinks.some(link => link.link === 'Usages')).toBe(true);
      expect(outgoingLinks.some(link => link.link === 'Welcome')).toBe(true);

      // console.log(`🔗 Abilities.md has ${outgoingLinks.length} outgoing links`);
    });
  });

  describe('Caching Integration', () => {
    it('should demonstrate caching performance with real data', async () => {
      // console.log('🔄 Testing caching performance with real data...');

      // 第一次调用 - 从网络加载
      console.time('First call (network)');
      const metadata1 = await cachedMetadataService.getMetadata();
      console.timeEnd('First call (network)');

      // 第二次调用 - 从缓存加载
      console.time('Second call (cached)');
      const metadata2 = await cachedMetadataService.getMetadata();
      console.timeEnd('Second call (cached)');

      // 验证数据一致性
      expect(metadata1).toEqual(metadata2);
      expect(metadata1!.length).toBe(metadata2!.length);

      // 获取缓存统计
      const stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBeGreaterThan(0);

      // console.log(`📊 Cache stats: ${stats.totalEntries} entries, hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    });

    it('should cache individual file metadata', async () => {
      // 测试单个文件元数据的缓存
      console.time('First file metadata call');
      const fileMetadata1 = await cachedMetadataService.getFileMetadata('helenite-docs/services-architecture.md');
      console.timeEnd('First file metadata call');

      console.time('Second file metadata call (cached)');
      const fileMetadata2 = await cachedMetadataService.getFileMetadata('helenite-docs/services-architecture.md');
      console.timeEnd('Second file metadata call (cached)');

      expect(fileMetadata1).toEqual(fileMetadata2);
      expect(fileMetadata1!.fileName).toBe('services-architecture');

      // console.log('✅ File metadata caching works correctly');
    });

    it('should cache search results', async () => {
      // 测试搜索结果的缓存
      console.time('First search');
      const searchResults1 = await cachedMetadataService.searchInMetadata('react');
      console.timeEnd('First search');

      console.time('Second search (cached)');
      const searchResults2 = await cachedMetadataService.searchInMetadata('react');
      console.timeEnd('Second search (cached)');

      expect(searchResults1).toEqual(searchResults2);
      expect(searchResults1.length).toBeGreaterThan(0);

      // console.log(`✅ Search results caching works correctly (${searchResults1.length} results)`);
    });
  });

  describe('Link Analysis Integration', () => {
    it('should analyze link relationships in real data', async () => {
      const allFiles = await metadataService.getAllFiles();

      // 统计链接关系
      let totalLinks = 0;
      let totalBacklinks = 0;

      for (const file of allFiles) {
        const links = file.links || [];
        const backlinks = file.backlinks || [];
        totalLinks += links.length;
        totalBacklinks += backlinks.length;
      }

      expect(totalLinks).toBeGreaterThan(0);
      expect(totalBacklinks).toBeGreaterThan(0);

      // console.log(`🔗 Total links: ${totalLinks}, total backlinks: ${totalBacklinks}`);
    });

    it('should find files linking to specific target', async () => {
      const filesLinkingToWelcome = await metadataService.getFilesLinkingTo('Welcome');

      expect(filesLinkingToWelcome.length).toBeGreaterThan(0);
      expect(filesLinkingToWelcome.some(file => file.fileName === 'Abilities')).toBe(true);

      // console.log(`📄 ${filesLinkingToWelcome.length} files link to 'Welcome'`);
    });
  });

  describe('Error Handling with Real Data', () => {
    it('should handle non-existent file gracefully', async () => {
      const fileMetadata = await metadataService.getFileMetadata('non-existent-file.md');
      expect(fileMetadata).toBeNull();
    });

    it('should handle non-existent tag gracefully', async () => {
      const files = await metadataService.getFilesByTag('non-existent-tag');
      expect(files).toEqual([]);
    });

    it('should handle empty search gracefully', async () => {
      const results = await metadataService.searchInMetadata('xyznonsensesearch');
      expect(results).toEqual([]);
    });
  });
});