/**
 * FrontMatterService 单元测试
 * 
 * 测试 FrontMatterService 的核心功能，包括：
 * - UUID 管理（评论功能依赖）
 * - Front Matter 字段查询
 * - 文件发布状态管理
 * - 作者和元数据管理
 * - 高级查询和搜索
 * - 统计和分析功能
 * - 缓存和 Vault 管理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { FrontMatterService } from '../FrontMatterService.js';
import type { IMetadataService, MetadataArray, FrontMatter } from '../interfaces/IMetadataService.js';

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

// ===============================
// 测试数据
// ===============================

const mockFrontMatter1: FrontMatter = {
  uuid: 'uuid-001',
  publish: true,
  created: '2024-01-01T00:00:00Z',
  modified: '2024-01-15T12:00:00Z',
  author: 'John Doe',
  description: 'A test document about React development',
  cssclass: 'article',
  customField: 'custom-value'
};

const mockFrontMatter2: FrontMatter = {
  uuid: 'uuid-002',
  publish: false,
  created: '2024-02-01T00:00:00Z',
  modified: '2024-02-10T10:00:00Z',
  author: 'Jane Smith',
  description: 'Guide to Vue.js development',
  cssclass: 'guide'
};

const mockFrontMatter3: FrontMatter = {
  // No UUID - for testing files without UUID
  publish: true,
  created: '2024-03-01T00:00:00Z',
  author: 'John Doe',
  description: 'TypeScript best practices'
};

const mockMetadata: MetadataArray = [
  {
    fileName: 'react-guide',
    relativePath: 'guides/react-guide.md',
    tags: ['react', 'frontend'],
    frontmatter: mockFrontMatter1
  },
  {
    fileName: 'vue-basics',
    relativePath: 'tutorials/vue-basics.md',
    tags: ['vue', 'frontend'],
    frontmatter: mockFrontMatter2
  },
  {
    fileName: 'typescript-tips',
    relativePath: 'docs/typescript-tips.md',
    tags: ['typescript', 'programming'],
    frontmatter: mockFrontMatter3
  },
  {
    fileName: 'no-frontmatter',
    relativePath: 'misc/no-frontmatter.md',
    tags: []
    // No frontmatter
  }
];

describe('FrontMatterService', () => {
  let frontMatterService: FrontMatterService;
  let mockMetadataService: IMetadataService;

  beforeEach(() => {
    mockMetadataService = createMockMetadataService();
    frontMatterService = new FrontMatterService(mockMetadataService, 'TestVault');
    
    // 设置 mock 默认返回值
    (mockMetadataService.getMetadata as Mock).mockResolvedValue(mockMetadata);
    (mockMetadataService.getFileMetadata as Mock).mockImplementation((filePath: string) => {
      const fileData = mockMetadata.find(f => f.relativePath === filePath);
      return Promise.resolve(fileData || null);
    });
    
    vi.clearAllMocks();
  });

  describe('构造函数和初始化', () => {
    it('应该正确创建 FrontMatterService 实例', () => {
      expect(frontMatterService).toBeInstanceOf(FrontMatterService);
      expect(frontMatterService.getCurrentVault()).toEqual({
        id: 'TestVault',
        path: '/vaults/TestVault'
      });
    });

    it('应该使用默认 vault', () => {
      const defaultService = new FrontMatterService(mockMetadataService);
      expect(defaultService.getCurrentVault().id).toBe('Demo');
    });
  });

  describe('核心数据获取', () => {
    it('应该能够获取文件的 Front Matter', async () => {
      const frontMatter = await frontMatterService.getFrontMatter('guides/react-guide.md');
      
      expect(frontMatter).toEqual(mockFrontMatter1);
      expect(mockMetadataService.getFileMetadata).toHaveBeenCalledWith('guides/react-guide.md');
    });

    it('应该能够获取所有文件的 Front Matter', async () => {
      const allFrontMatter = await frontMatterService.getAllFrontMatter();
      
      expect(allFrontMatter).toHaveLength(3); // 只有3个文件有frontmatter
      expect(allFrontMatter[0]).toEqual({
        filePath: 'guides/react-guide.md',
        frontMatter: mockFrontMatter1
      });
    });

    it('应该处理没有 Front Matter 的文件', async () => {
      const frontMatter = await frontMatterService.getFrontMatter('misc/no-frontmatter.md');
      expect(frontMatter).toBeNull();
    });
  });

  describe('UUID 管理（评论功能依赖）', () => {
    it('应该能够获取文件的 UUID', async () => {
      const uuid = await frontMatterService.getUuid('guides/react-guide.md');
      expect(uuid).toBe('uuid-001');
    });

    it('应该返回 null 如果文件没有 UUID', async () => {
      const uuid = await frontMatterService.getUuid('docs/typescript-tips.md');
      expect(uuid).toBeNull();
    });

    it('应该能够根据 UUID 查找文件', async () => {
      const filePath = await frontMatterService.getFileByUuid('uuid-002');
      expect(filePath).toBe('tutorials/vue-basics.md');
    });

    it('应该返回 null 如果 UUID 不存在', async () => {
      const filePath = await frontMatterService.getFileByUuid('non-existent-uuid');
      expect(filePath).toBeNull();
    });

    it('应该能够获取所有 UUID 映射', async () => {
      const allUuids = await frontMatterService.getAllUuids();
      
      expect(allUuids).toEqual({
        'uuid-001': 'guides/react-guide.md',
        'uuid-002': 'tutorials/vue-basics.md'
      });
    });

    it('应该能够检查 UUID 是否存在', async () => {
      const exists1 = await frontMatterService.hasUuid('uuid-001');
      const exists2 = await frontMatterService.hasUuid('non-existent');
      
      expect(exists1).toBe(true);
      expect(exists2).toBe(false);
    });
  });

  describe('发布状态管理', () => {
    it('应该能够检查文件是否已发布', async () => {
      const published1 = await frontMatterService.isPublished('guides/react-guide.md');
      const published2 = await frontMatterService.isPublished('tutorials/vue-basics.md');
      
      expect(published1).toBe(true);
      expect(published2).toBe(false);
    });

    it('应该能够获取所有已发布的文件', async () => {
      const publishedFiles = await frontMatterService.getPublishedFiles();
      
      expect(publishedFiles).toContain('guides/react-guide.md');
      expect(publishedFiles).toContain('docs/typescript-tips.md');
      expect(publishedFiles).not.toContain('tutorials/vue-basics.md');
    });

    it('应该能够获取所有未发布的文件', async () => {
      const unpublishedFiles = await frontMatterService.getUnpublishedFiles();
      
      expect(unpublishedFiles).toContain('tutorials/vue-basics.md');
      expect(unpublishedFiles).not.toContain('guides/react-guide.md');
    });
  });

  describe('作者管理', () => {
    it('应该能够获取文件的作者', async () => {
      const author = await frontMatterService.getAuthor('guides/react-guide.md');
      expect(author).toBe('John Doe');
    });

    it('应该能够根据作者查找文件', async () => {
      const johnFiles = await frontMatterService.getFilesByAuthor('John Doe');
      
      expect(johnFiles).toContain('guides/react-guide.md');
      expect(johnFiles).toContain('docs/typescript-tips.md');
      expect(johnFiles).not.toContain('tutorials/vue-basics.md');
    });

    it('应该能够获取所有作者列表', async () => {
      const authors = await frontMatterService.getAllAuthors();
      
      expect(authors).toEqual(['Jane Smith', 'John Doe']); // 按字母排序
    });
  });

  describe('元数据字段查询', () => {
    it('应该能够获取文件描述', async () => {
      const description = await frontMatterService.getDescription('guides/react-guide.md');
      expect(description).toBe('A test document about React development');
    });

    it('应该能够获取文件的 CSS 类', async () => {
      const cssClass = await frontMatterService.getCssClass('guides/react-guide.md');
      expect(cssClass).toBe('article');
    });

    it('应该能够根据 CSS 类查找文件', async () => {
      const files = await frontMatterService.getFilesByCssClass('guide');
      expect(files).toContain('tutorials/vue-basics.md');
    });

    it('应该能够获取创建时间', async () => {
      const createdDate = await frontMatterService.getCreatedDate('guides/react-guide.md');
      expect(createdDate).toEqual(new Date('2024-01-01T00:00:00Z'));
    });

    it('应该能够获取修改时间', async () => {
      const modifiedDate = await frontMatterService.getModifiedDate('guides/react-guide.md');
      expect(modifiedDate).toEqual(new Date('2024-01-15T12:00:00Z'));
    });
  });

  describe('高级查询', () => {
    it('应该能够按发布状态过滤文件', async () => {
      const publishedFiles = await frontMatterService.queryFiles({
        includePublished: true,
        includeUnpublished: false
      });
      
      expect(publishedFiles).toContain('guides/react-guide.md');
      expect(publishedFiles).toContain('docs/typescript-tips.md');
      expect(publishedFiles).not.toContain('tutorials/vue-basics.md');
    });

    it('应该能够按作者过滤文件', async () => {
      const johnFiles = await frontMatterService.queryFiles({
        author: 'John Doe'
      });
      
      expect(johnFiles).toContain('guides/react-guide.md');
      expect(johnFiles).toContain('docs/typescript-tips.md');
    });

    it('应该能够按日期range过滤文件', async () => {
      const files = await frontMatterService.queryFiles({
        dateRange: {
          field: 'created',
          start: new Date('2024-01-15T00:00:00Z'),
          end: new Date('2024-02-15T00:00:00Z')
        }
      });
      
      expect(files).toContain('tutorials/vue-basics.md');
      expect(files).not.toContain('guides/react-guide.md');
    });

    it('应该能够搜索 Front Matter 字段', async () => {
      const results = await frontMatterService.searchFrontMatter('React');
      
      expect(results).toHaveLength(1);
      expect(results[0].filePath).toBe('guides/react-guide.md');
      expect(results[0].matches).toEqual([
        { field: 'description', value: 'A test document about React development' }
      ] as Array<{ field: string; value: unknown }>);
    });

    it('应该能够获取自定义字段', async () => {
      const customValue = await frontMatterService.getCustomField('guides/react-guide.md', 'customField');
      expect(customValue).toBe('custom-value');
    });

    it('应该能够根据自定义字段查找文件', async () => {
      const files = await frontMatterService.getFilesByCustomField('customField', 'custom-value');
      expect(files).toContain('guides/react-guide.md');
    });

    it('应该能够获取所有自定义字段', async () => {
      const customFields = await frontMatterService.getAllCustomFields();
      expect(customFields).toEqual(['customField']);
    });
  });

  describe('统计和分析', () => {
    it('应该能够获取统计信息', async () => {
      const stats = await frontMatterService.getStatistics();
      
      expect(stats.totalFiles).toBe(4);
      expect(stats.filesWithUuid).toBe(2);
      expect(stats.publishedFiles).toBe(2);
      expect(stats.unpublishedFiles).toBe(1); // vue-basics (no-frontmatter doesn't have frontmatter so not counted)
      expect(stats.topAuthors).toEqual([
        { author: 'John Doe', count: 2 },
        { author: 'Jane Smith', count: 1 }
      ]);
    });

    it('应该能够分析 Front Matter 使用模式', async () => {
      const patterns = await frontMatterService.analyzeFrontMatterPatterns();
      
      expect(patterns.commonFields).toEqual(
        expect.arrayContaining([
          { field: 'publish', usage: 3 },
          { field: 'created', usage: 3 },
          { field: 'author', usage: 3 }
        ])
      );
      
      // Since all standard fields are used in our test data, no fields are recommended
      expect(Array.isArray(patterns.recommendedFields)).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理 MetadataService 错误', async () => {
      (mockMetadataService.getMetadata as Mock).mockRejectedValue(new Error('Metadata error'));
      
      const frontMatter = await frontMatterService.getAllFrontMatter();
      expect(frontMatter).toEqual([]);
    });

    it('应该处理文件元数据获取错误', async () => {
      (mockMetadataService.getFileMetadata as Mock).mockRejectedValue(new Error('File error'));
      
      const frontMatter = await frontMatterService.getFrontMatter('test.md');
      expect(frontMatter).toBeNull();
    });

    it('应该处理无效日期格式', async () => {
      const invalidDateMetadata = [{
        ...mockMetadata[0],
        frontmatter: { ...mockFrontMatter1, created: 'invalid-date' }
      }];
      
      (mockMetadataService.getMetadata as Mock).mockResolvedValue(invalidDateMetadata);
      (mockMetadataService.getFileMetadata as Mock).mockResolvedValue(invalidDateMetadata[0]);
      
      const createdDate = await frontMatterService.getCreatedDate('guides/react-guide.md');
      expect(createdDate).toBeNull();
    });
  });

  describe('缓存管理', () => {
    it('应该支持刷新缓存', async () => {
      // 先获取一次数据建立缓存
      await frontMatterService.getFrontMatter('guides/react-guide.md');
      
      // 刷新缓存
      await frontMatterService.refreshCache();
      
      // 验证缓存已清除
      expect(mockMetadataService.refreshCache).toHaveBeenCalled();
    });

    it('应该返回缓存统计信息', async () => {
      const stats = await frontMatterService.getCacheStats();
      
      expect(stats.vaultId).toBe('TestVault');
      expect(typeof stats.frontMatterCacheSize).toBe('number');
    });
  });

  describe('Vault 管理', () => {
    it('应该支持切换 vault', () => {
      frontMatterService.switchVault('NewVault');
      
      expect(frontMatterService.getCurrentVault()).toEqual({
        id: 'NewVault',
        path: '/vaults/NewVault'
      });
      expect(mockMetadataService.switchVault).toHaveBeenCalledWith('NewVault');
    });

    it('应该返回当前 vault 信息', () => {
      const vaultInfo = frontMatterService.getCurrentVault();
      
      expect(vaultInfo).toEqual({
        id: 'TestVault',
        path: '/vaults/TestVault'
      });
    });
  });

  describe('边界条件', () => {
    it('应该处理空的元数据', async () => {
      (mockMetadataService.getMetadata as Mock).mockResolvedValue([]);
      
      const allFrontMatter = await frontMatterService.getAllFrontMatter();
      expect(allFrontMatter).toEqual([]);
    });

    it('应该处理 null 元数据', async () => {
      (mockMetadataService.getMetadata as Mock).mockResolvedValue(null);
      
      const allFrontMatter = await frontMatterService.getAllFrontMatter();
      expect(allFrontMatter).toEqual([]);
    });

    it('应该处理没有匹配的查询', async () => {
      const results = await frontMatterService.queryFiles({
        author: 'Non-existent Author'
      });
      expect(results).toEqual([]);
    });

    it('应该处理空搜索查询', async () => {
      const results = await frontMatterService.searchFrontMatter('');
      expect(results).toEqual([]);
    });
  });
});