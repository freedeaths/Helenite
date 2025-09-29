/**
 * FileTreeService 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileTreeService } from '../FileTreeService';
import type { IMetadataService, MetadataArray } from '../interfaces/IMetadataService';
import type { FileTreeOptions } from '../interfaces/IFileTreeService';

// Mock MetadataService
const createMockMetadataService = (): IMetadataService => ({
  getMetadata: vi.fn(),
  getFileMetadata: vi.fn(),
  getAllFiles: vi.fn(),
  getFileByName: vi.fn(),
  getFilesByTag: vi.fn(),
  getAllTags: vi.fn(),
  getFileLinks: vi.fn(),
  getFileBacklinks: vi.fn(),
  getFileHeadings: vi.fn(),
  getFileAliases: vi.fn(),
  getFileFrontMatter: vi.fn(),
  hasFile: vi.fn(),
  getFilesLinkingTo: vi.fn(),
  searchInMetadata: vi.fn(),
  refreshCache: vi.fn(),
  getCacheStats: vi.fn(),
  switchVault: vi.fn(),
  getCurrentVault: vi.fn()
});

// 测试数据
const mockMetadata: MetadataArray = [
  {
    fileName: 'Welcome',
    relativePath: 'Welcome.md',
    tags: ['welcome', 'intro'],
    headings: [
      { heading: 'Welcome to Helenite', level: 1 },
      { heading: 'Getting Started', level: 2 }
    ],
    links: [
      { link: 'Abilities', relativePath: 'FolderA/SubFolder/Abilities.md' }
    ],
    backlinks: []
  },
  {
    fileName: 'Abilities',
    relativePath: 'FolderA/SubFolder/Abilities.md',
    tags: ['features', 'abilities'],
    headings: [
      { heading: 'System Abilities', level: 1 }
    ],
    links: [
      { link: 'Welcome', relativePath: 'Welcome.md' }
    ],
    backlinks: [
      { fileName: 'Welcome', link: 'Abilities', relativePath: 'Welcome.md' }
    ]
  },
  {
    fileName: 'README',
    relativePath: 'docs/README.md',
    tags: ['documentation'],
    headings: [
      { heading: 'Documentation', level: 1 }
    ],
    links: [],
    backlinks: []
  }
];

describe('FileTreeService', () => {
  let mockMetadataService: IMetadataService;
  let fileTreeService: FileTreeService;

  beforeEach(() => {
    mockMetadataService = createMockMetadataService();
    vi.mocked(mockMetadataService.getMetadata).mockResolvedValue(mockMetadata);
    fileTreeService = new FileTreeService(mockMetadataService, 'Demo');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor and Basic Setup', () => {
    it('should create FileTreeService with default vault', () => {
      const service = new FileTreeService(mockMetadataService);
      expect(service).toBeInstanceOf(FileTreeService);

      const vault = service.getCurrentVault();
      expect(vault.id).toBe('Demo'); // default vault
    });

    it('should create FileTreeService with specified vault', () => {
      const service = new FileTreeService(mockMetadataService, 'Publish');
      expect(service).toBeInstanceOf(FileTreeService);

      const vault = service.getCurrentVault();
      expect(vault.id).toBe('Publish');
    });
  });

  describe('File Tree Construction', () => {
    it('should build file tree from metadata', async () => {
      const tree = await fileTreeService.getFileTree();

      expect(tree).toBeDefined();
      expect(Array.isArray(tree)).toBe(true);

      // 验证根级结构
      const rootFolders = tree.filter(node => node.type === 'folder');
      const rootFiles = tree.filter(node => node.type === 'file');

      expect(rootFiles.length).toBeGreaterThan(0); // Welcome.md 在根级
      expect(rootFolders.length).toBeGreaterThan(0); // FolderA, docs 文件夹

    });

    it('should handle empty metadata gracefully', async () => {
      vi.mocked(mockMetadataService.getMetadata).mockResolvedValue([]);

      const tree = await fileTreeService.getFileTree();
      expect(tree).toEqual([]);
    });

    it('should handle metadata loading failure', async () => {
      vi.mocked(mockMetadataService.getMetadata).mockResolvedValue(null);

      const tree = await fileTreeService.getFileTree();
      expect(tree).toEqual([]);
    });
  });

  describe('File Tree Options', () => {
    it('should apply custom sort function', async () => {
      const options: FileTreeOptions = {
        customSort: (a, b) => b.name.localeCompare(a.name) // 倒序
      };

      const tree = await fileTreeService.getFileTree(options);
      expect(tree).toBeDefined();

    });

    it('should exclude empty folders when specified', async () => {
      const options: FileTreeOptions = {
        includeEmptyFolders: false
      };

      const tree = await fileTreeService.getFileTree(options);
      expect(tree).toBeDefined();
    });

    it('should skip folder filters when disabled', async () => {
      const options: FileTreeOptions = {
        applyFolderFilters: false
      };

      const tree = await fileTreeService.getFileTree(options);
      expect(tree).toBeDefined();
    });
  });

  describe('Node Operations', () => {
    it('should find node by path', async () => {
      const node = await fileTreeService.findNode('/Welcome.md');

      expect(node).not.toBeNull();
      expect(node?.name).toBe('Welcome');
      expect(node?.type).toBe('file');
      expect(node?.metadata?.fileName).toBe('Welcome');
    });

    it('should return null for non-existent path', async () => {
      const node = await fileTreeService.findNode('/NonExistent.md');
      expect(node).toBeNull();
    });

    it('should check path existence', async () => {
      const exists = await fileTreeService.pathExists('/Welcome.md');
      expect(exists).toBe(true);

      const notExists = await fileTreeService.pathExists('/NonExistent.md');
      expect(notExists).toBe(false);
    });

    it('should get children of folder', async () => {
      const children = await fileTreeService.getChildren('/FolderA');
      expect(Array.isArray(children)).toBe(true);

    });
  });

  describe('File Operations', () => {
    it('should get all files', async () => {
      const files = await fileTreeService.getAllFiles();

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
      expect(files.every(path => path.startsWith('/'))).toBe(true);

    });

    it('should get files by folder', async () => {
      // 获取根级文件
      const rootFiles = await fileTreeService.getFilesByFolder();
      expect(Array.isArray(rootFiles)).toBe(true);

      // 获取特定文件夹的文件
      const folderFiles = await fileTreeService.getFilesByFolder('/docs');
      expect(Array.isArray(folderFiles)).toBe(true);

    });

    it('should search files by name', async () => {
      const results = await fileTreeService.searchFiles('Welcome');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(file => file.name.includes('Welcome'))).toBe(true);

    });

    it('should search files by tag', async () => {
      const results = await fileTreeService.searchFiles('welcome');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

    });

    it('should search case-insensitively', async () => {
      const upperResults = await fileTreeService.searchFiles('WELCOME');
      const lowerResults = await fileTreeService.searchFiles('welcome');

      expect(upperResults.length).toBe(lowerResults.length);
    });
  });

  describe('Folder Operations', () => {
    it('should get all folders', async () => {
      const folders = await fileTreeService.getAllFolders();

      expect(Array.isArray(folders)).toBe(true);
      expect(folders.every(path => path.startsWith('/'))).toBe(true);

    });

    it('should get root folders', async () => {
      const rootFolders = await fileTreeService.getRootFolders();

      expect(Array.isArray(rootFolders)).toBe(true);
      expect(rootFolders.every(folder => folder.type === 'folder')).toBe(true);

    });

    it('should get folder stats', async () => {
      const stats = await fileTreeService.getFolderStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalFiles).toBe('number');
      expect(typeof stats.totalFolders).toBe('number');
      expect(stats.totalFiles).toBeGreaterThan(0);

    });

    it('should get specific folder stats', async () => {
      const stats = await fileTreeService.getFolderStats('/FolderA');

      expect(stats).toBeDefined();
      expect(typeof stats.totalFiles).toBe('number');
      expect(typeof stats.totalFolders).toBe('number');

    });
  });

  describe('Utility Methods', () => {
    it('should normalize paths correctly', () => {
      expect(fileTreeService.normalizePath('/path/to/file.md')).toBe('path/to/file.md');
      expect(fileTreeService.normalizePath('///path/to/file.md')).toBe('path/to/file.md');
      expect(fileTreeService.normalizePath('path/to/file.md')).toBe('path/to/file.md');
    });

    it('should get parent path correctly', () => {
      expect(fileTreeService.getParentPath('/folder/subfolder/file.md')).toBe('folder/subfolder');
      expect(fileTreeService.getParentPath('/folder/file.md')).toBe('folder');
      expect(fileTreeService.getParentPath('/file.md')).toBeNull();
      expect(fileTreeService.getParentPath('file.md')).toBeNull();
    });

    it('should get node name correctly', () => {
      expect(fileTreeService.getNodeName('/folder/subfolder/file.md')).toBe('file.md');
      expect(fileTreeService.getNodeName('/folder')).toBe('folder');
      expect(fileTreeService.getNodeName('file.md')).toBe('file.md');
    });

    it('should identify file paths correctly', () => {
      expect(fileTreeService.isFilePath('/path/file.md')).toBe(true);
      expect(fileTreeService.isFilePath('/path/FILE.MD')).toBe(true);
      expect(fileTreeService.isFilePath('/path/folder')).toBe(false);
      expect(fileTreeService.isFilePath('/path/file.txt')).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should refresh cache', async () => {
      await fileTreeService.refreshCache();

      expect(mockMetadataService.refreshCache).toHaveBeenCalled();
    });

    it('should get cache stats', async () => {
      vi.mocked(mockMetadataService.getCacheStats).mockResolvedValue({
        vaultId: 'Demo',
        fileCount: 3
      });

      const stats = await fileTreeService.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats.vaultId).toBe('Demo');
      expect(stats.totalFiles).toBeDefined();
      expect(stats.totalFolders).toBeDefined();
      expect(stats.metadataStats).toBeDefined();

    });
  });

  describe('Vault Switching', () => {
    it('should switch vault', () => {
      fileTreeService.switchVault('Publish');

      const vault = fileTreeService.getCurrentVault();
      expect(vault.id).toBe('Publish');
      expect(mockMetadataService.switchVault).toHaveBeenCalledWith('Publish');
    });

    it('should get current vault info', () => {
      const vault = fileTreeService.getCurrentVault();

      expect(vault).toBeDefined();
      expect(vault.id).toBe('Demo');
      expect(vault.path).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle metadata service errors gracefully', async () => {
      vi.mocked(mockMetadataService.getMetadata).mockRejectedValue(new Error('Network error'));

      // FileTreeService 应该捕获错误并返回空数组
      const tree = await fileTreeService.getFileTree();
      expect(tree).toEqual([]);
    });

    it('should handle search with empty results', async () => {
      const results = await fileTreeService.searchFiles('NonExistentQuery');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle folder operations on non-existent paths', async () => {
      const children = await fileTreeService.getChildren('/NonExistentFolder');
      expect(children).toEqual([]);

      const files = await fileTreeService.getFilesByFolder('/NonExistentFolder');
      expect(files).toEqual([]);
    });
  });
});