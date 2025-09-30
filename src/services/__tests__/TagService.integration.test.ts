/**
 * TagService 集成测试
 *
 * 测试 TagService 与真实依赖服务的集成：
 * - 与 MetadataService 的集成
 * - 与 StorageService 的集成
 * - 真实数据处理流程
 * - 缓存集成测试
 */

// 设置 IndexedDB 模拟
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TagService } from '../TagService.js';
import { MetadataService } from '../MetadataService.js';
import { StorageService } from '../infra/StorageService.js';
import { CacheManager } from '../CacheManager.js';
import type { TagData } from '../interfaces/ITagService.js';

// Mock console methods to avoid test output noise
const originalConsole = { ...console };
beforeEach(() => {
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('TagService Integration Tests', () => {
  let tagService: TagService;
  let metadataService: MetadataService;
  let storageService: StorageService;
  let cacheManager: CacheManager;

  beforeEach(() => {
    // 创建真实的服务实例
    storageService = new StorageService({ basePath: '/vaults/Demo' });
    metadataService = new MetadataService('Demo');
    cacheManager = new CacheManager();

    // 创建 TagService 实例
    tagService = new TagService(metadataService, storageService, 'Demo');
  });

  describe('真实数据处理', () => {
    it('应该能够处理真实的 vault 配置', () => {
      // Arrange & Act
      const vaultInfo = tagService.getCurrentVault();

      // Assert
      expect(vaultInfo.id).toBe('Demo');
      expect(vaultInfo.path).toBe('/vaults/Demo');
    });

    it('应该能够切换不同的 vault', () => {
      // Arrange
      const originalVault = tagService.getCurrentVault();

      // Act
      tagService.switchVault('TestVault');
      const newVault = tagService.getCurrentVault();

      // Assert
      expect(originalVault.id).toBe('Demo');
      expect(newVault.id).toBe('TestVault');
      expect(newVault.path).toBe('/vaults/TestVault');
    });
  });

  describe('与 MetadataService 集成', () => {
    it('应该能够通过 MetadataService 获取文件标签', async () => {
      // Arrange
      const mockFileMetadata = {
        relativePath: 'test.md',
        fileName: 'test',
        tags: ['test-tag', 'integration']
      };

      // Mock MetadataService
      vi.spyOn(metadataService, 'getFileMetadata').mockResolvedValue(mockFileMetadata);

      // Act
      const result = await tagService.getFileTags('test.md');

      // Assert
      expect(result).toEqual(['#integration', '#test-tag']); // 排序后的结果
      expect(metadataService.getFileMetadata).toHaveBeenCalledWith('test.md');
    });

    it('应该能够通过 MetadataService 处理降级查询', async () => {
      // Arrange
      const mockMetadataFiles = [
        { relativePath: 'file1.md', fileName: 'file1' },
        { relativePath: 'file2.md', fileName: 'file2' }
      ];

      // Mock StorageService 读取失败，触发降级
      vi.spyOn(storageService, 'readFile').mockRejectedValue(new Error('File not found'));
      vi.spyOn(metadataService, 'getFilesByTag').mockResolvedValue(mockMetadataFiles);

      // Act
      const result = await tagService.getFilesByTag('test-tag');

      // Assert
      expect(result).toEqual(['file1.md', 'file2.md']);
      expect(metadataService.getFilesByTag).toHaveBeenCalledWith('test-tag');
    });

    it('应该能够通过 MetadataService 计算标签统计', async () => {
      // Arrange
      const mockMetadata = [
        {
          relativePath: 'file1.md',
          fileName: 'file1',
          tags: ['tag1', 'tag2']
        },
        {
          relativePath: 'file2.md',
          fileName: 'file2',
          tags: ['tag1', 'tag3']
        },
        {
          relativePath: 'file3.md',
          fileName: 'file3',
          tags: ['tag2']
        }
      ];

      // Mock StorageService 读取失败，触发降级到 metadata 计算
      vi.spyOn(storageService, 'readFile').mockRejectedValue(new Error('tags.json not found'));
      vi.spyOn(metadataService, 'getMetadata').mockResolvedValue(mockMetadata);

      // Act
      const allTags = await tagService.getAllTags();
      const stats = await tagService.getTagStats();

      // Assert
      expect(allTags).toHaveLength(3);
      expect(stats.totalTags).toBe(3);
      expect(stats.totalFiles).toBe(3);
      expect(stats.averageTagsPerFile).toBeCloseTo(1.67, 1); // (2+2+1)/3
    });
  });

  describe('与 StorageService 集成', () => {
    it('应该能够通过 StorageService 读取 tags.json', async () => {
      // Arrange
      const mockTagsJson = [
        {
          tag: 'integration-test',
          tagCount: 2,
          relativePaths: ['test1.md', 'test2.md']
        }
      ];

      vi.spyOn(storageService, 'readFile').mockResolvedValue(JSON.stringify(mockTagsJson));

      // Act
      const result = await tagService.getAllTags();

      // Assert
      expect(storageService.readFile).toHaveBeenCalledWith('.obsidian/plugins/metadata-extractor/tags.json');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: '#integration-test',
        count: 2,
        files: ['test1.md', 'test2.md']
      });
    });

    it('应该能够处理 StorageService 读取错误', async () => {
      // Arrange
      vi.spyOn(storageService, 'readFile').mockRejectedValue(new Error('Network error'));
      vi.spyOn(metadataService, 'getMetadata').mockResolvedValue([]); // 空 metadata

      // Act
      const result = await tagService.getAllTags();

      // Assert
      expect(result).toEqual([]);
    });

    it('应该能够处理无效的 JSON 数据', async () => {
      // Arrange
      vi.spyOn(storageService, 'readFile').mockResolvedValue('invalid json');
      vi.spyOn(metadataService, 'getMetadata').mockResolvedValue([]);

      // Act
      const result = await tagService.getAllTags();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('缓存集成测试', () => {
    it('应该能够与 CacheManager 集成', () => {
      // Arrange
      const cachedTagService = cacheManager.createCachedTagService(tagService);

      // Assert
      expect(cachedTagService).toBeDefined();
      expect(typeof cachedTagService.getAllTags).toBe('function');
      expect(typeof cachedTagService.getFileTags).toBe('function');
      expect(typeof cachedTagService.getFilesByTag).toBe('function');
    });

    it('缓存的服务应该保持相同的接口', async () => {
      // Arrange
      const cachedTagService = cacheManager.createCachedTagService(tagService);

      // Mock 底层服务
      vi.spyOn(storageService, 'readFile').mockResolvedValue('[]');
      vi.spyOn(metadataService, 'getMetadata').mockResolvedValue([]);

      // Act & Assert - 确保缓存服务具有相同的方法
      expect(typeof cachedTagService.getAllTags).toBe('function');
      expect(typeof cachedTagService.getFileTags).toBe('function');
      expect(typeof cachedTagService.getFilesByTag).toBe('function');
      expect(typeof cachedTagService.getTagStats).toBe('function');
      expect(typeof cachedTagService.searchTags).toBe('function');
      expect(typeof cachedTagService.filterTags).toBe('function');
      expect(typeof cachedTagService.getTagDetails).toBe('function');
      expect(typeof cachedTagService.hasTag).toBe('function');
      expect(typeof cachedTagService.getMostUsedTags).toBe('function');
      expect(typeof cachedTagService.getLeastUsedTags).toBe('function');
      expect(typeof cachedTagService.getOrphanTags).toBe('function');
      expect(typeof cachedTagService.getRelatedTags).toBe('function');
      expect(typeof cachedTagService.analyzeFileTagPattern).toBe('function');
      expect(typeof cachedTagService.getTagCooccurrence).toBe('function');
      expect(typeof cachedTagService.getFolderTagDistribution).toBe('function');
      expect(typeof cachedTagService.suggestTags).toBe('function');
      expect(typeof cachedTagService.refreshCache).toBe('function');
      expect(typeof cachedTagService.getCacheStats).toBe('function');
      expect(typeof cachedTagService.switchVault).toBe('function');
      expect(typeof cachedTagService.getCurrentVault).toBe('function');
    });
  });

  describe('复杂业务逻辑集成', () => {
    it('应该能够执行完整的标签分析流程', async () => {
      // Arrange
      const mockTagsJson = [
        {
          tag: 'react',
          tagCount: 3,
          relativePaths: ['react-guide.md', 'hooks-tutorial.md', 'component-design.md']
        },
        {
          tag: 'typescript',
          tagCount: 2,
          relativePaths: ['react-guide.md', 'ts-advanced.md']
        }
      ];

      const mockMetadata = [
        {
          relativePath: 'react-guide.md',
          fileName: 'react-guide',
          tags: ['react', 'typescript', 'frontend']
        },
        {
          relativePath: 'hooks-tutorial.md',
          fileName: 'hooks-tutorial',
          tags: ['react', 'hooks']
        }
      ];

      vi.spyOn(storageService, 'readFile').mockResolvedValue(JSON.stringify(mockTagsJson));
      vi.spyOn(metadataService, 'getMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(metadataService, 'getFileMetadata')
        .mockImplementation((path: string) => {
          return Promise.resolve(mockMetadata.find(f => f.relativePath === path) || null);
        });

      // Act - 执行多个相关操作
      const allTags = await tagService.getAllTags();
      const reactFiles = await tagService.getFilesByTag('react');
      const fileTags = await tagService.getFileTags('react-guide.md');
      const tagStats = await tagService.getTagStats();
      const mostUsed = await tagService.getMostUsedTags(1);
      const relatedTags = await tagService.getRelatedTags('react', 3);

      // Assert
      expect(allTags).toHaveLength(2);
      expect(reactFiles).toEqual(['react-guide.md', 'hooks-tutorial.md', 'component-design.md']);
      expect(fileTags).toEqual(['#frontend', '#react', '#typescript']);
      expect(tagStats.totalTags).toBe(2);
      expect(mostUsed[0].name).toBe('#react');
      expect(relatedTags).toHaveLength(1); // typescript 与 react 共现
      expect(relatedTags[0].name).toBe('#typescript');
    });

    it('应该能够处理标签共现分析', async () => {
      // Arrange
      const mockTagsJson = [
        {
          tag: 'javascript',
          tagCount: 2,
          relativePaths: ['js-basics.md', 'advanced-js.md']
        }
      ];

      vi.spyOn(storageService, 'readFile').mockResolvedValue(JSON.stringify(mockTagsJson));
      vi.spyOn(metadataService, 'getFileMetadata')
        .mockImplementation((path: string) => {
          const mockData = {
            'js-basics.md': { relativePath: 'js-basics.md', fileName: 'js-basics', tags: ['javascript', 'beginner', 'web'] },
            'advanced-js.md': { relativePath: 'advanced-js.md', fileName: 'advanced-js', tags: ['javascript', 'advanced', 'patterns'] }
          };
          return Promise.resolve(mockData[path as keyof typeof mockData] || null);
        });

      // Act
      const cooccurrence = await tagService.getTagCooccurrence('javascript');

      // Assert
      expect(cooccurrence.tag).toBe('#javascript');
      expect(cooccurrence.cooccurredTags).toHaveLength(4);

      // 验证共现标签包含预期的标签
      const tagNames = cooccurrence.cooccurredTags.map(t => t.tag);
      expect(tagNames).toContain('#beginner');
      expect(tagNames).toContain('#web');
      expect(tagNames).toContain('#advanced');
      expect(tagNames).toContain('#patterns');
    });

    it('应该能够处理文件夹标签分布分析', async () => {
      // Arrange
      const mockMetadata = [
        {
          relativePath: 'frontend/react.md',
          fileName: 'react',
          tags: ['react', 'frontend']
        },
        {
          relativePath: 'frontend/vue.md',
          fileName: 'vue',
          tags: ['vue', 'frontend']
        },
        {
          relativePath: 'backend/node.md',
          fileName: 'node',
          tags: ['nodejs', 'backend']
        }
      ];

      // Mock tags.json 读取失败，触发 metadata 计算
      vi.spyOn(storageService, 'readFile').mockRejectedValue(new Error('tags.json not found'));
      vi.spyOn(metadataService, 'getMetadata').mockResolvedValue(mockMetadata);

      // Act
      const frontendDistribution = await tagService.getFolderTagDistribution('frontend');
      const rootDistribution = await tagService.getFolderTagDistribution('');

      // Assert
      expect(frontendDistribution.folder).toBe('frontend');
      expect(frontendDistribution.totalFiles).toBe(2);
      expect(frontendDistribution.tagDistribution).toHaveLength(3); // react, vue, frontend

      expect(rootDistribution.folder).toBe('root');
      expect(rootDistribution.totalFiles).toBe(3);
      expect(rootDistribution.tagDistribution).toHaveLength(5); // 所有标签
    });

    it('应该能够提供智能标签建议', async () => {
      // Arrange
      const mockMetadata = [
        {
          relativePath: 'docs/api.md',
          fileName: 'api',
          tags: ['api', 'documentation']
        },
        {
          relativePath: 'docs/guide.md',
          fileName: 'guide',
          tags: ['guide', 'documentation', 'tutorial']
        },
        {
          relativePath: 'docs/examples.md',
          fileName: 'examples',
          tags: ['examples', 'documentation']
        }
      ];

      // Mock tags.json 读取失败，使用 metadata 计算
      vi.spyOn(storageService, 'readFile').mockRejectedValue(new Error('tags.json not found'));
      vi.spyOn(metadataService, 'getMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(metadataService, 'getFileMetadata').mockResolvedValue({
        relativePath: 'docs/new-doc.md',
        fileName: 'new-doc',
        tags: [] // 新文件，没有标签
      });

      // Act
      const suggestions = await tagService.suggestTags('docs/new-doc.md', 3);

      // Assert
      expect(suggestions).toHaveLength(3);
      expect(suggestions).toContain('#documentation'); // 文件夹中最常用的标签
    });

    it('应该能够进行文件标签模式分析', async () => {
      // Arrange
      const mockAllTags: TagData[] = [
        { name: '#common', count: 10, files: [] },     // 常见标签
        { name: '#rare', count: 1, files: [] },        // 稀少标签
        { name: '#moderate', count: 3, files: [] }     // 中等标签
      ];

      vi.spyOn(tagService, 'getFileTags').mockResolvedValue(['#common', '#rare', '#moderate']);
      vi.spyOn(tagService, 'getAllTags').mockResolvedValue(mockAllTags);

      // Act
      const pattern = await tagService.analyzeFileTagPattern('test.md');

      // Assert
      expect(pattern.totalTags).toBe(3);
      expect(pattern.uniqueTags).toEqual(['#common', '#rare', '#moderate']);
      expect(pattern.commonTags).toContain('#common');  // count >= 5
      expect(pattern.rareTags).toContain('#rare');      // count <= 2
    });
  });

  describe('错误恢复和健壮性', () => {
    it('应该能够从部分服务故障中恢复', async () => {
      // Arrange - StorageService 失败，但 MetadataService 正常
      vi.spyOn(storageService, 'readFile').mockRejectedValue(new Error('Storage service down'));
      vi.spyOn(metadataService, 'getMetadata').mockResolvedValue([
        { relativePath: 'test.md', fileName: 'test', tags: ['fallback'] }
      ]);

      // Act
      const result = await tagService.getAllTags();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('#fallback');
    });

    it('应该能够处理数据不一致的情况', async () => {
      // Arrange - tags.json 和 metadata 数据不一致
      const inconsistentTagsJson = [
        { tag: 'outdated', tagCount: 1, relativePaths: ['deleted-file.md'] }
      ];

      vi.spyOn(storageService, 'readFile').mockResolvedValue(JSON.stringify(inconsistentTagsJson));

      // Act - 应该能够正常返回数据，不会崩溃
      const allTags = await tagService.getAllTags();
      const filesByTag = await tagService.getFilesByTag('outdated');

      // Assert
      expect(allTags).toHaveLength(1);
      expect(filesByTag).toEqual(['deleted-file.md']); // 即使文件不存在也返回记录
    });

    it('应该能够处理大量数据', async () => {
      // Arrange - 模拟大量标签数据
      const largeTagsJson = Array.from({ length: 1000 }, (_, i) => ({
        tag: `tag-${i}`,
        tagCount: Math.floor(Math.random() * 10) + 1,
        relativePaths: [`file-${i}.md`]
      }));

      vi.spyOn(storageService, 'readFile').mockResolvedValue(JSON.stringify(largeTagsJson));

      // Mock metadata to match large data scenario
      const mockLargeMetadata = Array.from({ length: 1000 }, (_, i) => ({
        relativePath: `file-${i}.md`,
        fileName: `file-${i}`,
        tags: [`tag-${i}`]
      }));
      vi.spyOn(metadataService, 'getMetadata').mockResolvedValue(mockLargeMetadata);

      // Act
      const allTags = await tagService.getAllTags({ limit: 50 });
      const stats = await tagService.getTagStats();

      // Assert
      expect(allTags).toHaveLength(50); // 限制生效
      expect(stats.totalTags).toBe(1000); // 但统计是完整的
    });
  });
});