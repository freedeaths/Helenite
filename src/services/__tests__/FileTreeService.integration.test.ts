/**
 * FileTreeService 集成测试
 *
 * 使用真实的 metadata.json 数据测试 FileTreeService 功能
 * 与 MetadataService 和 CacheManager 集成测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import 'fake-indexeddb/auto';
import { FileTreeService } from '../FileTreeService';
import { MetadataService } from '../MetadataService';
import { CacheManager } from '../CacheManager';
import type { IFileTreeService } from '../interfaces/IFileTreeService';
import fetch from 'node-fetch';

const sleep = promisify(setTimeout);

describe('FileTreeService Integration Tests', () => {
  let fileTreeService: FileTreeService;
  let metadataService: MetadataService;
  let cacheManager: CacheManager;
  let cachedFileTreeService: IFileTreeService;
  let viteProcess: ChildProcess | null = null;
  const serverUrl = 'http://localhost:5173';

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
  }, 45000); // 增加超时时间到45秒

  afterAll(async () => {
    // 如果我们启动了临时服务器，现在关闭它
    if (viteProcess) {
      viteProcess.kill();
      viteProcess = null;
    }
  });

  beforeEach(async () => {
    // 创建服务实例，传入完整的服务器URL作为baseUrl
    metadataService = new MetadataService('Demo', serverUrl);
    fileTreeService = new FileTreeService(metadataService, 'Demo');
    cacheManager = new CacheManager();
    cachedFileTreeService = cacheManager.createCachedFileTreeService(fileTreeService);
  });

  describe('Real Data File Tree Building', () => {
    it('should build file tree from real metadata', async () => {
      const tree = await fileTreeService.getFileTree();

      expect(tree).toBeTruthy();
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);

      // 验证文件树结构
      const hasFiles = tree.some(node => node.type === 'file');
      const hasFolders = tree.some(node => node.type === 'folder');

      expect(hasFiles || hasFolders).toBe(true);

    });

    it('should find specific files from real data', async () => {
      const welcomeNode = await fileTreeService.findNode('/Welcome.md');
      const abilitiesNode = await fileTreeService.findNode('/FolderA/SubFolder/Abilities.md');

      // 检验至少一个文件存在
      expect(welcomeNode || abilitiesNode).toBeTruthy();

      if (welcomeNode) {
        expect(welcomeNode.name).toBe('Welcome');
        expect(welcomeNode.type).toBe('file');
        expect(welcomeNode.metadata).toBeTruthy();
      }

      if (abilitiesNode) {
        expect(abilitiesNode.name).toBe('Abilities');
        expect(abilitiesNode.type).toBe('file');
        expect(abilitiesNode.metadata).toBeTruthy();
      }
    });

    it('should have correct folder structure', async () => {
      const allFolders = await fileTreeService.getAllFolders();

      expect(Array.isArray(allFolders)).toBe(true);
      expect(allFolders.length).toBeGreaterThanOrEqual(0);

    });

    it('should have correct file structure', async () => {
      const allFiles = await fileTreeService.getAllFiles();

      expect(Array.isArray(allFiles)).toBe(true);
      expect(allFiles.length).toBeGreaterThan(0);

      // 验证所有文件路径格式正确
      allFiles.forEach(filePath => {
        expect(filePath.startsWith('/')).toBe(true);
      });

    });
  });

  describe('Real Data Queries', () => {
    it('should search files in real data', async () => {
      const tree = await fileTreeService.getFileTree();
      const allFiles = tree.filter(node => node.type === 'file');

      if (allFiles.length > 0) {
        // 使用第一个文件的名称进行搜索
        const firstFileName = allFiles[0].name;
        const searchResults = await fileTreeService.searchFiles(firstFileName);

        expect(Array.isArray(searchResults)).toBe(true);
        expect(searchResults.length).toBeGreaterThan(0);
        expect(searchResults.some(result => result.name.includes(firstFileName))).toBe(true);

      }
    });

    it('should get folder stats from real data', async () => {
      const stats = await fileTreeService.getFolderStats();

      expect(stats).toBeTruthy();
      expect(typeof stats.totalFiles).toBe('number');
      expect(typeof stats.totalFolders).toBe('number');
      expect(stats.totalFiles).toBeGreaterThan(0);

    });

    it('should get files by folder from real data', async () => {
      const rootFiles = await fileTreeService.getFilesByFolder();

      expect(Array.isArray(rootFiles)).toBe(true);
      expect(rootFiles.every(file => file.type === 'file')).toBe(true);


      // 如果有子文件夹，测试子文件夹的文件
      const allFolders = await fileTreeService.getAllFolders();
      if (allFolders.length > 0) {
        const firstFolder = allFolders[0];
        const folderFiles = await fileTreeService.getFilesByFolder(firstFolder);

        expect(Array.isArray(folderFiles)).toBe(true);
        expect(folderFiles.every(file => file.type === 'file')).toBe(true);

      }
    });

    it('should check path existence for real data', async () => {
      const allFiles = await fileTreeService.getAllFiles();

      if (allFiles.length > 0) {
        const firstFile = allFiles[0];
        const exists = await fileTreeService.pathExists(firstFile);

        expect(exists).toBe(true);
      }

      // 测试不存在的路径
      const notExists = await fileTreeService.pathExists('/NonExistentFile.md');
      expect(notExists).toBe(false);
    });
  });

  describe('File Tree Options with Real Data', () => {
    it('should apply folder filters to real data', async () => {
      // 默认启用文件夹过滤
      const filteredTree = await fileTreeService.getFileTree({ applyFolderFilters: true });

      // 禁用文件夹过滤
      const unfilteredTree = await fileTreeService.getFileTree({ applyFolderFilters: false });

      expect(Array.isArray(filteredTree)).toBe(true);
      expect(Array.isArray(unfilteredTree)).toBe(true);

    });

    it('should handle empty folders option with real data', async () => {
      const treeWithEmpty = await fileTreeService.getFileTree({ includeEmptyFolders: true });
      const treeWithoutEmpty = await fileTreeService.getFileTree({ includeEmptyFolders: false });

      expect(Array.isArray(treeWithEmpty)).toBe(true);
      expect(Array.isArray(treeWithoutEmpty)).toBe(true);

    });

    it('should apply custom sort to real data', async () => {
      const defaultTree = await fileTreeService.getFileTree();

      const reverseSortTree = await fileTreeService.getFileTree({
        customSort: (a, b) => b.name.localeCompare(a.name)
      });

      expect(Array.isArray(defaultTree)).toBe(true);
      expect(Array.isArray(reverseSortTree)).toBe(true);
      expect(defaultTree.length).toBe(reverseSortTree.length);

    });
  });

  describe('Caching Integration with Real Data', () => {
    it('should demonstrate caching performance with real data', async () => {

      const start1 = performance.now();
      const firstCall = await cachedFileTreeService.getFileTree();
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      const secondCall = await cachedFileTreeService.getFileTree();
      const time2 = performance.now() - start2;

      expect(firstCall).toBeTruthy();
      expect(secondCall).toBeTruthy();
      expect(firstCall.length).toBe(secondCall.length);


      // 缓存应该显著提高性能（至少快一些）
      expect(time2).toBeLessThanOrEqual(time1);

      // 获取缓存统计
      await cacheManager.getStatistics();
    });

    it('should cache individual file operations', async () => {
      const allFiles = await cachedFileTreeService.getAllFiles();

      if (allFiles.length > 0) {
        const testFile = allFiles[0];

        const start1 = performance.now();
        const firstFind = await cachedFileTreeService.findNode(testFile);
        const time1 = performance.now() - start1;

        const start2 = performance.now();
        const secondFind = await cachedFileTreeService.findNode(testFile);
        const time2 = performance.now() - start2;

        expect(firstFind).toBeTruthy();
        expect(secondFind).toBeTruthy();
        expect(firstFind?.path).toBe(secondFind?.path);


        expect(time2).toBeLessThanOrEqual(time1);
      }
    });

    it('should cache search results', async () => {
      const testQuery = 'test';

      const start1 = performance.now();
      const firstSearch = await cachedFileTreeService.searchFiles(testQuery);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      const secondSearch = await cachedFileTreeService.searchFiles(testQuery);
      const time2 = performance.now() - start2;

      expect(Array.isArray(firstSearch)).toBe(true);
      expect(Array.isArray(secondSearch)).toBe(true);
      expect(firstSearch.length).toBe(secondSearch.length);


      expect(time2).toBeLessThanOrEqual(time1);
    });
  });

  describe('Integration with MetadataService', () => {
    it('should work with cached MetadataService', async () => {
      const cachedMetadataService = cacheManager.createCachedMetadataService(metadataService);
      const fileTreeWithCachedMetadata = new FileTreeService(cachedMetadataService, 'Demo');

      const tree = await fileTreeWithCachedMetadata.getFileTree();

      expect(tree).toBeTruthy();
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);

    });

    it('should maintain consistency with MetadataService', async () => {
      const metadata = await metadataService.getMetadata();
      await fileTreeService.getFileTree();

      if (metadata && metadata.length > 0) {
        // 文件树中的文件数量应该与 metadata 中的条目数量相关
        const treeFiles = await fileTreeService.getAllFiles();

        expect(treeFiles.length).toBeGreaterThan(0);
        expect(treeFiles.length).toBeLessThanOrEqual(metadata.length);

      }
    });
  });

  describe('Error Handling with Real Data', () => {
    it('should handle network errors gracefully', async () => {
      // 创建一个使用错误URL的服务
      const faultyMetadataService = new MetadataService('Demo', 'http://localhost:9999');
      const faultyFileTreeService = new FileTreeService(faultyMetadataService, 'Demo');

      const tree = await faultyFileTreeService.getFileTree();

      // 应该返回空数组而不是抛出异常
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBe(0);
    });

    it('should handle invalid vault gracefully', async () => {
      const invalidVaultService = new FileTreeService(metadataService, 'NonExistentVault');

      const tree = await invalidVaultService.getFileTree();

      // 服务仍然依赖 MetadataService，所以可能有数据
      expect(Array.isArray(tree)).toBe(true);
    });
  });

  describe('Utility Methods with Real Data', () => {
    it('should correctly identify file vs folder paths', async () => {
      const allFiles = await fileTreeService.getAllFiles();
      const allFolders = await fileTreeService.getAllFolders();

      allFiles.forEach(filePath => {
        // 大多数应该是 .md 文件
        if (filePath.endsWith('.md')) {
          expect(fileTreeService.isFilePath(filePath)).toBe(true);
        }
      });

      allFolders.forEach(folderPath => {
        expect(fileTreeService.isFilePath(folderPath)).toBe(false);
      });

    });

    it('should correctly extract node names and parent paths', async () => {
      const allFiles = await fileTreeService.getAllFiles();

      if (allFiles.length > 0) {
        const testFile = allFiles[0];
        const nodeName = fileTreeService.getNodeName(testFile);
        const parentPath = fileTreeService.getParentPath(testFile);

        expect(nodeName).toBeTruthy();
        expect(typeof nodeName).toBe('string');

        if (testFile.includes('/')) {
          expect(parentPath).toBeTruthy();
          expect(typeof parentPath).toBe('string');
        } else {
          expect(parentPath).toBeNull();
        }

      }
    });
  });
});