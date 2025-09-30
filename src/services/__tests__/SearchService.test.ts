/**
 * SearchService 单元测试
 * 
 * 测试 SearchService 的核心功能，包括：
 * - 全文搜索
 * - 标签搜索
 * - 统一搜索入口
 * - 搜索选项
 * - 缓存功能
 * - 工具方法
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { SearchService } from '../SearchService.js';
import type { IStorageService } from '../interfaces/IStorageService.js';
import type { IMetadataService } from '../interfaces/IMetadataService.js';

// ===============================
// Mock 依赖服务
// ===============================

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

const mockMetadata = [
  {
    fileName: 'Welcome.md',
    relativePath: 'Welcome.md',
    tags: ['welcome', 'intro'],
    frontmatter: { title: 'Welcome to Helenite' }
  },
  {
    fileName: 'Abilities.md',
    relativePath: 'Features/Abilities.md',
    tags: ['features', 'helenite'],
    frontmatter: { title: 'Helenite Abilities' }
  },
  {
    fileName: 'React Guide.md',
    relativePath: 'Guides/React Guide.md',
    tags: ['react', 'development'],
    frontmatter: { title: 'React Development Guide' }
  }
];

const mockFileContents = {
  'Welcome.md': `---
title: Welcome to Helenite
tags: [welcome, intro]
---

# Welcome to Helenite

This is a knowledge management system built with React.`,

  'Features/Abilities.md': `---
title: Helenite Abilities
tags: [features, helenite]
---

# Helenite Abilities

Helenite provides powerful features for managing your knowledge.`,

  'Guides/React Guide.md': `---
title: React Development Guide
tags: [react, development]
---

# React Development Guide

Learn how to build React applications effectively.`
};

interface FileMetadata {
  tags: string[];
  frontmatter: Record<string, unknown>;
}

const mockFileMetadata: Record<string, FileMetadata> = {
  'Welcome.md': {
    tags: ['welcome', 'intro'],
    frontmatter: { title: 'Welcome to Helenite' }
  },
  'Features/Abilities.md': {
    tags: ['features', 'helenite'],
    frontmatter: { title: 'Helenite Abilities' }
  },
  'Guides/React Guide.md': {
    tags: ['react', 'development'],
    frontmatter: { title: 'React Development Guide' }
  }
};

describe('SearchService', () => {
  let searchService: SearchService;
  let mockStorageService: IStorageService;
  let mockMetadataService: IMetadataService;

  beforeEach(() => {
    mockStorageService = createMockStorageService();
    mockMetadataService = createMockMetadataService();
    searchService = new SearchService(mockStorageService, mockMetadataService, 'TestVault');
    
    // 设置 mock 默认返回值
    (mockMetadataService.getMetadata as Mock).mockResolvedValue(mockMetadata);
    (mockStorageService.readFile as Mock).mockImplementation((path: string) => {
      return Promise.resolve(mockFileContents[path as keyof typeof mockFileContents] || '');
    });
    (mockMetadataService.getFileMetadata as Mock).mockImplementation((path: string) => {
      return Promise.resolve(mockFileMetadata[path] || null);
    });
    
    vi.clearAllMocks();
  });

  describe('构造函数和初始化', () => {
    it('应该正确创建 SearchService 实例', () => {
      expect(searchService).toBeInstanceOf(SearchService);
      expect(searchService.getCurrentVault()).toEqual({
        id: 'TestVault',
        path: '/vaults/TestVault'
      });
    });

    it('应该使用默认 vault', () => {
      const defaultService = new SearchService(mockStorageService, mockMetadataService);
      expect(defaultService.getCurrentVault().id).toBe('Demo');
    });
  });

  describe('search - 统一搜索入口', () => {
    it('应该能够处理空查询', async () => {
      const results = await searchService.search('');
      expect(results).toEqual([]);
      
      const results2 = await searchService.search('   ');
      expect(results2).toEqual([]);
    });

    it('应该自动识别标签搜索', async () => {
      const spy = vi.spyOn(searchService, 'searchByTag');
      await searchService.search('#react');
      expect(spy).toHaveBeenCalledWith('#react', {});
    });

    it('应该自动识别内容搜索', async () => {
      const spy = vi.spyOn(searchService, 'searchContent');
      await searchService.search('knowledge');
      expect(spy).toHaveBeenCalledWith('knowledge', {});
    });

    it('应该使用缓存', async () => {
      // 第一次调用
      const results1 = await searchService.search('React');
      
      // 第二次调用（应该使用缓存）
      const results2 = await searchService.search('React');
      
      expect(results1).toEqual(results2);
      expect(mockMetadataService.getMetadata).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchContent - 全文搜索', () => {
    it('应该能够搜索文件内容', async () => {
      const results = await searchService.searchContent('React');
      
      expect(results).toHaveLength(2); // Welcome.md 和 React Guide.md
      expect(results.some(r => r.fileName === 'Welcome')).toBe(true);
      expect(results.some(r => r.fileName === 'React Guide')).toBe(true);
      expect(results[0].matchCount).toBeGreaterThan(0);
      expect(results.some(r => r.matches.some(m => m.content.includes('React')))).toBe(true);
    });

    it('应该能够高亮搜索结果', async () => {
      const results = await searchService.searchContent('knowledge');
      
      expect(results).toHaveLength(2);
      const match = results[0].matches[0];
      expect(match.highlighted).toContain('<span class="search-result-file-matched-text">knowledge</span>');
    });

    it('应该支持不区分大小写的搜索', async () => {
      const results = await searchService.searchContent('REACT');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.matches.some(m => m.content.toLowerCase().includes('react')))).toBe(true);
    });

    it('应该支持区分大小写的搜索', async () => {
      const results = await searchService.searchContent('React', { caseSensitive: true });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.matches.every(m => m.content.includes('React')))).toBe(true);
    });

    it('应该限制搜索结果数量', async () => {
      const results = await searchService.searchContent('e', { maxResults: 1 });
      
      expect(results).toHaveLength(1);
    });

    it('应该限制每个文件的匹配数', async () => {
      const results = await searchService.searchContent('e', { maxMatchesPerFile: 2 });
      
      results.forEach(result => {
        expect(result.matches.length).toBeLessThanOrEqual(2);
      });
    });

    it('应该支持路径前缀过滤', async () => {
      const results = await searchService.searchContent('Guide', { pathPrefix: 'Guides/' });
      
      expect(results).toHaveLength(1);
      expect(results[0].filePath.startsWith('Guides/')).toBe(true);
    });

    it('应该处理搜索失败', async () => {
      (mockMetadataService.getMetadata as Mock).mockRejectedValue(new Error('Metadata error'));
      
      const results = await searchService.searchContent('test');
      expect(results).toEqual([]);
    });
  });

  describe('searchByTag - 标签搜索', () => {
    it('应该能够搜索标签（带 # 前缀）', async () => {
      const results = await searchService.searchByTag('#react');
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.fileName === 'React Guide')).toBe(true);
      expect(results.some(r => r.matches.some(m => m.content.includes('Tag: #react')))).toBe(true);
    });

    it('应该能够搜索标签（不带 # 前缀）', async () => {
      const results = await searchService.searchByTag('helenite');
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.fileName === 'Abilities')).toBe(true);
    });

    it('应该优先使用元数据中的标签', async () => {
      const results = await searchService.searchByTag('welcome');
      
      expect(results).toHaveLength(1);
      expect(results[0].fileName).toBe('Welcome');
      expect(results[0].matches[0].highlighted).toContain('#welcome');
    });

    it('应该在元数据缺失时从文件内容搜索标签', async () => {
      // 模拟元数据中没有标签
      (mockMetadataService.getFileMetadata as Mock).mockResolvedValue({ tags: [] });
      
      const results = await searchService.searchByTag('intro');
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('应该支持路径前缀过滤', async () => {
      const results = await searchService.searchByTag('features', { pathPrefix: 'Features/' });
      
      expect(results).toHaveLength(1);
      expect(results[0].filePath.startsWith('Features/')).toBe(true);
    });

    it('应该处理搜索失败', async () => {
      (mockMetadataService.getMetadata as Mock).mockRejectedValue(new Error('Metadata error'));
      
      const results = await searchService.searchByTag('#test');
      expect(results).toEqual([]);
    });
  });

  describe('getSearchStatistics - 搜索统计', () => {
    it('应该返回搜索统计信息', async () => {
      const stats = await searchService.getSearchStatistics('React');
      
      expect(stats.totalFiles).toBe(3);
      expect(stats.matchedFiles).toBeGreaterThan(0);
      expect(stats.totalMatches).toBeGreaterThan(0);
      expect(stats.searchTime).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.topFolders)).toBe(true);
    });

    it('应该处理统计失败', async () => {
      (mockMetadataService.getMetadata as Mock).mockRejectedValue(new Error('Stats error'));
      
      const stats = await searchService.getSearchStatistics('test');
      expect(stats).toEqual({
        totalFiles: 0,
        matchedFiles: 0,
        totalMatches: 0,
        searchTime: 0,
        topFolders: []
      });
    });
  });

  describe('工具方法', () => {
    it('highlightSearchResults 应该正确高亮文本', () => {
      const content = 'This is a React application';
      const highlighted = searchService.highlightSearchResults(content, 'React');
      
      expect(highlighted).toBe('This is a <span class="search-result-file-matched-text">React</span> application');
    });

    it('highlightSearchResults 应该支持自定义样式类', () => {
      const content = 'React application';
      const highlighted = searchService.highlightSearchResults(content, 'React', 'custom-highlight');
      
      expect(highlighted).toBe('<span class="custom-highlight">React</span> application');
    });

    it('highlightSearchResults 应该处理特殊字符', () => {
      const content = 'Price: $10.99';
      const highlighted = searchService.highlightSearchResults(content, '$10.99');
      
      expect(highlighted).toBe('Price: <span class="search-result-file-matched-text">$10.99</span>');
    });

    it('validateSearchQuery 应该验证查询', () => {
      expect(searchService.validateSearchQuery('valid query')).toBe(true);
      expect(searchService.validateSearchQuery('')).toBe(false);
      expect(searchService.validateSearchQuery('   ')).toBe(false);
      expect(searchService.validateSearchQuery('a'.repeat(101))).toBe(false);
    });

    it('normalizeSearchQuery 应该规范化查询', () => {
      expect(searchService.normalizeSearchQuery('  React  ')).toBe('react');
      expect(searchService.normalizeSearchQuery('REACT')).toBe('react');
    });
  });

  describe('缓存管理', () => {
    it('应该支持刷新缓存', async () => {
      // 先进行一次搜索建立缓存
      await searchService.search('React');
      
      // 刷新缓存
      await searchService.refreshCache();
      
      // 再次搜索应该重新调用服务
      await searchService.search('React');
      
      expect(mockMetadataService.getMetadata).toHaveBeenCalledTimes(2);
    });

    it('应该返回缓存统计信息', async () => {
      const stats = await searchService.getCacheStats();
      
      expect(stats.vaultId).toBe('TestVault');
      expect(typeof stats.searchCacheSize).toBe('number');
      expect(typeof stats.contentCacheSize).toBe('number');
    });
  });

  describe('Vault 管理', () => {
    it('应该支持切换 vault', () => {
      searchService.switchVault('NewVault');
      
      expect(searchService.getCurrentVault()).toEqual({
        id: 'NewVault',
        path: '/vaults/NewVault'
      });
    });

    it('应该返回当前 vault 信息', () => {
      const vaultInfo = searchService.getCurrentVault();
      
      expect(vaultInfo).toEqual({
        id: 'TestVault',
        path: '/vaults/TestVault'
      });
    });

    it('切换 vault 时应该清空缓存', async () => {
      // 建立缓存
      await searchService.search('React');
      expect(mockMetadataService.getMetadata).toHaveBeenCalledTimes(1);
      
      // 切换 vault
      searchService.switchVault('NewVault');
      
      // 再次搜索应该重新调用服务
      await searchService.search('React');
      expect(mockMetadataService.getMetadata).toHaveBeenCalledTimes(2);
    });
  });

  describe('错误处理', () => {
    it('应该处理存储服务错误', async () => {
      (mockStorageService.readFile as Mock).mockRejectedValue(new Error('Storage error'));
      
      const results = await searchService.searchContent('test');
      expect(results).toEqual([]);
    });

    it('应该处理元数据服务错误', async () => {
      (mockMetadataService.getMetadata as Mock).mockRejectedValue(new Error('Metadata error'));
      
      const results = await searchService.search('test');
      expect(results).toEqual([]);
    });

    it('应该处理文件元数据获取错误', async () => {
      (mockMetadataService.getFileMetadata as Mock).mockRejectedValue(new Error('File metadata error'));
      
      const results = await searchService.searchByTag('#test');
      expect(results).toEqual([]);
    });
  });

  describe('边界条件', () => {
    it('应该处理空的元数据', async () => {
      (mockMetadataService.getMetadata as Mock).mockResolvedValue([]);
      
      const results = await searchService.search('test');
      expect(results).toEqual([]);
    });

    it('应该处理空的文件内容', async () => {
      (mockStorageService.readFile as Mock).mockResolvedValue('');
      
      const results = await searchService.searchContent('test');
      expect(results).toEqual([]);
    });

    it('应该处理特殊字符查询', async () => {
      const results = await searchService.searchContent('[.*+?^${}()|\\]');
      expect(results).toEqual([]);
    });

    it('应该处理长查询字符串', async () => {
      const longQuery = 'a'.repeat(1000);
      const results = await searchService.searchContent(longQuery);
      expect(results).toEqual([]);
    });
  });
});