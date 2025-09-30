/**
 * TagService 单元测试
 *
 * 测试 TagService 的核心功能，包括：
 * - 全局标签从 tags.json 读取
 * - 局部标签从 metadata 计算
 * - 标签查询和分析功能
 * - 降级处理机制
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { TagService } from '../TagService.js';
import type { IMetadataService, MetadataArray } from '../interfaces/IMetadataService.js';
import type { IStorageService } from '../interfaces/IStorageService.js';

// ===============================
// Mock 依赖服务
// ===============================

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

const createMockStorageService = (): IStorageService => ({
  readFile: vi.fn(),
  exists: vi.fn(),
  getFileInfo: vi.fn(),
  listFiles: vi.fn(),
  readFileWithInfo: vi.fn(),
  normalizePath: vi.fn(),
  resolvePath: vi.fn(),
  isValidPath: vi.fn(),
  getMimeType: vi.fn(),
  isImageFile: vi.fn(),
  isTrackFile: vi.fn(),
  isMarkdownFile: vi.fn(),
  clearCache: vi.fn(),
  preloadFiles: vi.fn(),
  config: { basePath: '', timeout: 5000 },
  initialize: vi.fn(),
  dispose: vi.fn(),
  healthCheck: vi.fn()
});

// ===============================
// 测试数据
// ===============================

const mockTagsJson = [
  {
    tag: 'tech',
    tagCount: 3,
    relativePaths: ['How-to-Implement.md', 'React-Guide.md', 'TypeScript-Tips.md']
  },
  {
    tag: 'travel',
    tagCount: 2,
    relativePaths: ['Japan-Trip.md', 'Europe-Guide.md']
  },
  {
    tag: 'cooking',
    tagCount: 1,
    relativePaths: ['Pasta-Recipe.md']
  }
];

const mockMetadata: MetadataArray = [
  {
    relativePath: 'How-to-Implement.md',
    fileName: 'How-to-Implement',
    tags: ['tech', 'tutorial']
  },
  {
    relativePath: 'Japan-Trip.md',
    fileName: 'Japan-Trip',
    tags: ['travel', 'japan']
  },
  {
    relativePath: 'React-Guide.md',
    fileName: 'React-Guide',
    tags: ['tech', 'react']
  },
  {
    relativePath: 'Pasta-Recipe.md',
    fileName: 'Pasta-Recipe',
    tags: ['cooking']
  }
];

describe('TagService', () => {
  let tagService: TagService;
  let mockMetadataService: IMetadataService;
  let mockStorageService: IStorageService;

  beforeEach(() => {
    mockMetadataService = createMockMetadataService();
    mockStorageService = createMockStorageService();
    tagService = new TagService(mockMetadataService, mockStorageService, 'TestVault');

    // 清除所有 mock 调用记录
    vi.clearAllMocks();
  });

  describe('构造函数和初始化', () => {
    it('应该正确创建 TagService 实例', () => {
      expect(tagService).toBeInstanceOf(TagService);
      expect(tagService.getCurrentVault()).toEqual({
        id: 'TestVault',
        path: '/vaults/TestVault'
      });
    });

    it('应该使用默认 vault', () => {
      const defaultTagService = new TagService(mockMetadataService, mockStorageService);
      expect(defaultTagService.getCurrentVault().id).toBe('Demo');
    });
  });

  describe('getAllTags - 全局标签获取', () => {
    it('应该从 tags.json 读取全局标签', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getAllTags();

      // Assert
      expect(mockStorageService.readFile).toHaveBeenCalledWith('.obsidian/plugins/metadata-extractor/tags.json');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: '#tech',
        count: 3,
        files: ['How-to-Implement.md', 'React-Guide.md', 'TypeScript-Tips.md']
      });
      expect(result[1]).toEqual({
        name: '#travel',
        count: 2,
        files: ['Japan-Trip.md', 'Europe-Guide.md']
      });
      expect(result[2]).toEqual({
        name: '#cooking',
        count: 1,
        files: ['Pasta-Recipe.md']
      });
    });

    it('应该按使用频率降序排序', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getAllTags({ sortBy: 'count', sortOrder: 'desc' });

      // Assert
      expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
      expect(result[1].count).toBeGreaterThanOrEqual(result[2].count);
    });

    it('应该支持按名称排序', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getAllTags({ sortBy: 'name', sortOrder: 'asc' });

      // Assert
      expect(result[0].name).toBe('#cooking');
      expect(result[1].name).toBe('#tech');
      expect(result[2].name).toBe('#travel');
    });

    it('应该支持限制返回数量', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getAllTags({ limit: 2 });

      // Assert
      expect(result).toHaveLength(2);
    });

    it('tags.json 不存在时应该降级到 metadata 计算', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockRejectedValue(new Error('File not found'));
      (mockMetadataService.getMetadata as Mock).mockResolvedValue(mockMetadata);

      // Act
      const result = await tagService.getAllTags();

      // Assert
      expect(mockStorageService.readFile).toHaveBeenCalledWith('.obsidian/plugins/metadata-extractor/tags.json');
      expect(mockMetadataService.getMetadata).toHaveBeenCalled();
      expect(result).toHaveLength(6); // tech, travel, tutorial, japan, react, cooking
    });

    it('tags.json 为空时应该降级到 metadata 计算', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue('[]');
      (mockMetadataService.getMetadata as Mock).mockResolvedValue(mockMetadata);

      // Act
      await tagService.getAllTags();

      // Assert
      expect(mockMetadataService.getMetadata).toHaveBeenCalled();
    });
  });

  describe('getFileTags - 文件标签获取', () => {
    it('应该获取指定文件的标签', async () => {
      // Arrange
      const filePath = 'How-to-Implement.md';
      const expectedFileMetadata = mockMetadata.find(f => f.relativePath === filePath);
      (mockMetadataService.getFileMetadata as Mock).mockResolvedValue(expectedFileMetadata);

      // Act
      const result = await tagService.getFileTags(filePath);

      // Assert
      expect(mockMetadataService.getFileMetadata).toHaveBeenCalledWith(filePath);
      expect(result).toEqual(['#tech', '#tutorial']);
    });

    it('应该处理带前导斜杠的路径', async () => {
      // Arrange
      const filePath = '/How-to-Implement.md';
      const expectedFileMetadata = mockMetadata.find(f => f.relativePath === 'How-to-Implement.md');
      (mockMetadataService.getFileMetadata as Mock).mockResolvedValue(expectedFileMetadata);

      // Act
      const result = await tagService.getFileTags(filePath);

      // Assert
      expect(mockMetadataService.getFileMetadata).toHaveBeenCalledWith('How-to-Implement.md');
      expect(result).toEqual(['#tech', '#tutorial']);
    });

    it('文件不存在时应该返回空数组', async () => {
      // Arrange
      (mockMetadataService.getFileMetadata as Mock).mockResolvedValue(null);

      // Act
      const result = await tagService.getFileTags('non-existent.md');

      // Assert
      expect(result).toEqual([]);
    });

    it('文件没有标签时应该返回空数组', async () => {
      // Arrange
      const fileMetadata = { relativePath: 'no-tags.md', fileName: 'no-tags' };
      (mockMetadataService.getFileMetadata as Mock).mockResolvedValue(fileMetadata);

      // Act
      const result = await tagService.getFileTags('no-tags.md');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getFilesByTag - 根据标签获取文件', () => {
    it('应该从 tags.json 获取标签对应的文件列表', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getFilesByTag('tech');

      // Assert
      expect(result).toEqual(['How-to-Implement.md', 'React-Guide.md', 'TypeScript-Tips.md']);
    });

    it('应该处理带 # 前缀的标签', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getFilesByTag('#travel');

      // Assert
      expect(result).toEqual(['Japan-Trip.md', 'Europe-Guide.md']);
    });

    it('标签在 tags.json 中不存在时应该降级到 metadata 查询', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));
      const mockMetadataFiles = [{ relativePath: 'tutorial.md' }];
      (mockMetadataService.getFilesByTag as Mock).mockResolvedValue(mockMetadataFiles);

      // Act
      const result = await tagService.getFilesByTag('tutorial');

      // Assert
      expect(mockMetadataService.getFilesByTag).toHaveBeenCalledWith('tutorial');
      expect(result).toEqual(['tutorial.md']);
    });

    it('tags.json 读取失败时应该直接使用 metadata 查询', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockRejectedValue(new Error('File not found'));
      const mockMetadataFiles = [{ relativePath: 'tutorial.md' }];
      (mockMetadataService.getFilesByTag as Mock).mockResolvedValue(mockMetadataFiles);

      // Act
      const result = await tagService.getFilesByTag('tutorial');

      // Assert
      expect(mockMetadataService.getFilesByTag).toHaveBeenCalledWith('tutorial');
      expect(result).toEqual(['tutorial.md']);
    });
  });

  describe('getTagStats - 标签统计', () => {
    it('应该计算标签统计信息', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));
      (mockMetadataService.getMetadata as Mock).mockResolvedValue(mockMetadata);

      // Act
      const result = await tagService.getTagStats();

      // Assert
      expect(result.totalTags).toBe(3);
      expect(result.totalFiles).toBe(4); // 4 files with tags
      expect(result.averageTagsPerFile).toBeGreaterThan(0);
      expect(result.averageFilesPerTag).toBeGreaterThan(0);
      expect(result.mostUsedTag).toEqual({
        name: '#tech',
        count: 3,
        files: ['How-to-Implement.md', 'React-Guide.md', 'TypeScript-Tips.md']
      });
      expect(result.frequencyDistribution).toHaveLength(5);
    });

    it('metadata 为空时应该返回空统计', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));
      (mockMetadataService.getMetadata as Mock).mockResolvedValue([]);

      // Act
      const result = await tagService.getTagStats();

      // Assert
      expect(result.totalTags).toBe(0); // No tags when metadata is empty
      expect(result.totalFiles).toBe(0);
      expect(result.averageTagsPerFile).toBe(0);
      expect(result.averageFilesPerTag).toBe(0);
    });
  });

  describe('searchTags - 标签搜索', () => {
    it('应该搜索匹配的标签', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.searchTags('te');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('#tech');
    });

    it('应该支持大小写敏感搜索', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.searchTags('TECH', { caseSensitive: true });

      // Assert
      expect(result).toHaveLength(0);
    });

    it('应该支持大小写不敏感搜索', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.searchTags('TECH', { caseSensitive: false });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('#tech');
    });

    it('应该处理带 # 前缀的搜索', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.searchTags('#travel');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('#travel');
    });
  });

  describe('filterTags - 标签过滤', () => {
    it('应该按最小使用次数过滤', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.filterTags({ minCount: 2 });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(tag => tag.count >= 2)).toBe(true);
    });

    it('应该按最大使用次数过滤', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.filterTags({ maxCount: 2 });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(tag => tag.count <= 2)).toBe(true);
    });

    it('应该排除指定标签', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.filterTags({ excludeTags: ['#tech'] });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.find(tag => tag.name === '#tech')).toBeUndefined();
    });

    it('应该按路径前缀过滤', async () => {
      // Arrange
      const modifiedTagsJson = [
        {
          tag: 'tech',
          tagCount: 2,
          relativePaths: ['folder/tech1.md', 'folder/tech2.md']
        },
        {
          tag: 'other',
          tagCount: 1,
          relativePaths: ['other.md']
        }
      ];
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(modifiedTagsJson));

      // Act
      const result = await tagService.filterTags({ pathPrefix: 'folder/' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('#tech');
    });
  });

  describe('getTagDetails - 标签详情', () => {
    it('应该获取标签详细信息', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getTagDetails('tech');

      // Assert
      expect(result).toEqual({
        name: '#tech',
        count: 3,
        files: ['How-to-Implement.md', 'React-Guide.md', 'TypeScript-Tips.md']
      });
    });

    it('应该处理带 # 前缀的标签', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getTagDetails('#travel');

      // Assert
      expect(result).toEqual({
        name: '#travel',
        count: 2,
        files: ['Japan-Trip.md', 'Europe-Guide.md']
      });
    });

    it('标签不存在时应该返回 null', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getTagDetails('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('hasTag - 标签存在检查', () => {
    it('存在的标签应该返回 true', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.hasTag('tech');

      // Assert
      expect(result).toBe(true);
    });

    it('不存在的标签应该返回 false', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.hasTag('nonexistent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getMostUsedTags - 最常用标签', () => {
    it('应该返回使用频率最高的标签', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getMostUsedTags(2);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
      expect(result[0].name).toBe('#tech');
    });
  });

  describe('getLeastUsedTags - 最少用标签', () => {
    it('应该返回使用频率最低的标签', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getLeastUsedTags(2);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].count).toBeLessThanOrEqual(result[1].count);
      expect(result[0].name).toBe('#cooking');
    });
  });

  describe('getOrphanTags - 孤立标签', () => {
    it('应该返回只被一个文件使用的标签', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getOrphanTags();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('#cooking');
      expect(result[0].count).toBe(1);
    });
  });

  describe('缓存管理', () => {
    it('应该支持刷新缓存', async () => {
      // Act
      await tagService.refreshCache();

      // Assert
      expect(mockMetadataService.refreshCache).toHaveBeenCalled();
    });

    it('应该返回缓存统计信息', async () => {
      // Arrange
      const mockMetadataStats = { entries: 100, size: 1024 };
      (mockMetadataService.getCacheStats as Mock).mockResolvedValue(mockMetadataStats);
      (mockStorageService.readFile as Mock).mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getCacheStats();

      // Assert
      expect(result.vaultId).toBe('TestVault');
      expect(result.metadataStats).toEqual(mockMetadataStats);
      expect(result.totalTags).toBe(0); // Empty when tags.json is empty
    });
  });

  describe('Vault 管理', () => {
    it('应该支持切换 vault', () => {
      // Act
      tagService.switchVault('NewVault');

      // Assert
      expect(tagService.getCurrentVault()).toEqual({
        id: 'NewVault',
        path: '/vaults/NewVault'
      });
      expect(mockMetadataService.switchVault).toHaveBeenCalledWith('NewVault');
    });

    it('应该返回当前 vault 信息', () => {
      // Act
      const result = tagService.getCurrentVault();

      // Assert
      expect(result).toEqual({
        id: 'TestVault',
        path: '/vaults/TestVault'
      });
    });
  });

  describe('错误处理', () => {
    it('getAllTags 出错时应该返回空数组', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockRejectedValue(new Error('Read error'));
      (mockMetadataService.getMetadata as Mock).mockRejectedValue(new Error('Metadata error'));

      // Act
      const result = await tagService.getAllTags();

      // Assert
      expect(result).toEqual([]);
    });

    it('getFileTags 出错时应该返回空数组', async () => {
      // Arrange
      (mockMetadataService.getFileMetadata as Mock).mockRejectedValue(new Error('Metadata error'));

      // Act
      const result = await tagService.getFileTags('test.md');

      // Assert
      expect(result).toEqual([]);
    });

    it('getFilesByTag 出错时应该返回空数组', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockRejectedValue(new Error('Read error'));
      (mockMetadataService.getFilesByTag as Mock).mockRejectedValue(new Error('Metadata error'));

      // Act
      const result = await tagService.getFilesByTag('test');

      // Assert
      expect(result).toEqual([]);
    });

    it('getTagStats 出错时应该返回空统计', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockRejectedValue(new Error('Read error'));
      (mockMetadataService.getMetadata as Mock).mockRejectedValue(new Error('Metadata error'));

      // Act
      const result = await tagService.getTagStats();

      // Assert
      expect(result).toEqual({
        totalTags: 0,
        totalFiles: 0,
        averageTagsPerFile: 0,
        averageFilesPerTag: 0,
        frequencyDistribution: []
      });
    });
  });
});