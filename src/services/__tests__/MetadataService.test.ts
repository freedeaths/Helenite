/**
 * MetadataService 单元测试
 */

// 设置 IndexedDB 模拟
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetadataService, getMetadataService, initializeMetadataService, disposeMetadataService } from '../MetadataService.js';
import type { MetadataArray, Metadata, FrontMatter } from '../interfaces/IMetadataService.js';

// Mock 数据 - 基于 metadata-extractor 插件格式
const mockMetadata: MetadataArray = [
  {
    fileName: 'Welcome',
    relativePath: 'Welcome.md',
    tags: ['welcome', 'intro'],
    aliases: ['Home', 'Index'],
    frontmatter: {
      title: 'Welcome to Vault',
      created: '2022-01-01'
    },
    headings: [
      { heading: 'Welcome', level: 1 },
      { heading: 'Getting Started', level: 2 }
    ],
    links: [
      { link: 'About.md', displayText: 'About' }
    ],
    backlinks: []
  },
  {
    fileName: 'About',
    relativePath: 'About.md',
    tags: ['about'],
    links: [],
    backlinks: [
      { fileName: 'Welcome', link: 'Welcome.md', relativePath: 'Welcome.md', displayText: 'Welcome' }
    ]
  },
  {
    fileName: 'Daily',
    relativePath: 'Notes/Daily.md',
    tags: ['daily', 'notes'],
    links: [],
    backlinks: []
  }
];

// 标签数据从 metadata 中提取，不需要单独定义

describe('MetadataService', () => {
  let metadataService: MetadataService;

  beforeEach(async () => {
    // 清理全局实例
    disposeMetadataService();
    
    // 彻底清理所有缓存
    const { getCacheManager } = await import('../CacheManager.js');
    const cacheManager = getCacheManager();
    
    // 清理所有缓存（不传 namespace 参数）
    await cacheManager.clearCache();
    
    // Mock fetch
    global.fetch = vi.fn();
    
    // 创建全新的 MetadataService 实例
    metadataService = new MetadataService('Demo');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    disposeMetadataService();
    
    // 彻底清理所有缓存
    const { getCacheManager } = await import('../CacheManager.js');
    const cacheManager = getCacheManager();
    await cacheManager.clearCache();
  });

  describe('Constructor and Basic Setup', () => {
    it('should create MetadataService with default vault', () => {
      const service = new MetadataService();
      expect(service.getCurrentVault().id).toBe('Demo');
    });

    it('should create MetadataService with specified vault', () => {
      const service = new MetadataService('Publish');
      expect(service.getCurrentVault().id).toBe('Publish');
      expect(service.getCurrentVault().path).toBe('/vaults/Publish');
    });

    it('should get available vaults', () => {
      const vaults = MetadataService.getAvailableVaults();
      expect(vaults).toContain('Demo');
      expect(vaults).toContain('Publish');
    });
  });

  describe('Metadata Loading', () => {
    it('should load metadata from network successfully', async () => {
      // Mock successful fetch
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata
      });

      const metadata = await metadataService.getMetadata();
      
      expect(metadata).toEqual(mockMetadata);
      expect(global.fetch).toHaveBeenCalledWith('/vaults/Demo/.obsidian/plugins/metadata-extractor/metadata.json');
    });

    it('should handle metadata loading failure gracefully', async () => {
      // Mock failed fetch
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const metadata = await metadataService.getMetadata();
      
      expect(metadata).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const metadata = await metadataService.getMetadata();
      
      expect(metadata).toBeNull();
    });

    it('should cache metadata after first load', async () => {
      // Mock successful fetch
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata
      });

      // First call - should fetch
      const metadata1 = await metadataService.getMetadata();
      expect(metadata1).toEqual(mockMetadata);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const metadata2 = await metadataService.getMetadata();
      expect(metadata2).toEqual(mockMetadata);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still only 1 call
    });
  });

  // 移除 Tags Loading 测试 - MetadataService 不直接加载 tags.json
  // 标签数据从 metadata.json 的 tags 字段提取

  describe('File Metadata Queries', () => {
    beforeEach(async () => {
      // Setup mock metadata
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata
      });
    });

    it('should get single file metadata', async () => {
      const fileMetadata = await metadataService.getFileMetadata('Welcome.md');
      
      expect(fileMetadata).toEqual(mockMetadata[0]);
      expect(fileMetadata?.fileName).toBe('Welcome');
      expect(fileMetadata?.tags).toContain('welcome');
    });

    it('should handle file not found', async () => {
      const fileMetadata = await metadataService.getFileMetadata('NonExistent.md');
      
      expect(fileMetadata).toBeNull();
    });

    it('should normalize file paths', async () => {
      // Test with leading slash
      const fileMetadata1 = await metadataService.getFileMetadata('/Welcome.md');
      const fileMetadata2 = await metadataService.getFileMetadata('Welcome.md');
      
      expect(fileMetadata1).toEqual(fileMetadata2);
      expect(fileMetadata1).toEqual(mockMetadata[0]);
    });

    it('should get all files', async () => {
      const allFiles = await metadataService.getAllFiles();
      
      expect(allFiles).toHaveLength(3);
      expect(allFiles.map(f => f.relativePath)).toContain('Welcome.md');
      expect(allFiles.map(f => f.relativePath)).toContain('About.md');
      expect(allFiles.map(f => f.relativePath)).toContain('Notes/Daily.md');
    });

    it('should search files by name in metadata', async () => {
      const results = await metadataService.searchInMetadata('Welcome');
      
      expect(results).toHaveLength(1);
      expect(results[0].relativePath).toBe('Welcome.md');
    });

    it('should search files by tag', async () => {
      const results = await metadataService.searchInMetadata('daily');
      
      expect(results).toHaveLength(1);
      expect(results[0].relativePath).toBe('Notes/Daily.md');
    });

    it('should search files by path', async () => {
      const results = await metadataService.searchInMetadata('Notes');
      
      expect(results).toHaveLength(1);
      expect(results[0].relativePath).toBe('Notes/Daily.md');
    });

    it('should search case-insensitively', async () => {
      const results = await metadataService.searchInMetadata('WELCOME');
      
      expect(results).toHaveLength(1);
      expect(results[0].relativePath).toBe('Welcome.md');
    });
  });

  describe('Tag Management', () => {
    beforeEach(async () => {
      // Setup mock metadata
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata
      });
    });

    it('should get all unique tags', async () => {
      const tags = await metadataService.getAllTags();
      
      expect(tags).toHaveLength(5);
      expect(tags).toContain('welcome');
      expect(tags).toContain('intro');
      expect(tags).toContain('about');
      expect(tags).toContain('daily');
      expect(tags).toContain('notes');
    });


    it('should get files by tag', async () => {
      const files = await metadataService.getFilesByTag('welcome');
      
      expect(files).toHaveLength(1);
      expect(files[0].relativePath).toBe('Welcome.md');
    });

    it('should handle non-existent tag', async () => {
      const files = await metadataService.getFilesByTag('nonexistent');
      
      expect(files).toHaveLength(0);
    });
  });

  describe('Link Analysis', () => {
    beforeEach(async () => {
      // Setup mock metadata
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata
      });
    });

    it('should get file outgoing links', async () => {
      const links = await metadataService.getFileLinks('Welcome.md');
      
      expect(links).toHaveLength(1);
      expect(links[0].link).toBe('About.md');
      expect(links[0].displayText).toBe('About');
    });

    it('should get file backlinks', async () => {
      const backlinks = await metadataService.getFileBacklinks('About.md');
      
      expect(backlinks).toHaveLength(1);
      expect(backlinks[0].link).toBe('Welcome.md');
      expect(backlinks[0].fileName).toBe('Welcome');
    });

    it('should get files linking to target', async () => {
      const linkingFiles = await metadataService.getFilesLinkingTo('About.md');
      
      expect(linkingFiles).toHaveLength(1);
      expect(linkingFiles[0].relativePath).toBe('Welcome.md');
    });
  });

  describe('Vault Switching', () => {
    it('should switch vault', () => {
      expect(metadataService.getCurrentVault().id).toBe('Demo');
      
      metadataService.switchVault('Publish');
      
      expect(metadataService.getCurrentVault().id).toBe('Publish');
      expect(metadataService.getCurrentVault().path).toBe('/vaults/Publish');
    });

    it('should clear cache when switching vault', async () => {
      // Load metadata for Demo vault
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata
      });
      
      await metadataService.getMetadata();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Switch vault
      metadataService.switchVault('Publish');
      
      // Mock new metadata for Publish vault
      const publishMetadata = { ...mockMetadata, timestamp: Date.now() + 1000 };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => publishMetadata
      });
      
      // Should fetch new metadata
      const newMetadata = await metadataService.getMetadata();
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenLastCalledWith('/vaults/Publish/.obsidian/plugins/metadata-extractor/metadata.json');
    });
  });

  describe('Global Instance Management', () => {
    it('should create and get global instance', () => {
      const service1 = getMetadataService();
      const service2 = getMetadataService();
      
      expect(service1).toBe(service2); // Same instance
      expect(service1.getCurrentVault().id).toBe('Demo');
    });

    it('should initialize global instance with vault', () => {
      const service = initializeMetadataService('Publish');
      
      expect(service.getCurrentVault().id).toBe('Publish');
      
      const globalService = getMetadataService();
      expect(globalService).toBe(service);
    });

    it('should dispose global instance', () => {
      const service1 = getMetadataService();
      expect(service1).toBeDefined();
      
      disposeMetadataService();
      
      const service2 = getMetadataService();
      expect(service2).not.toBe(service1); // New instance
    });
  });

  describe('Error Handling', () => {
    it('should handle empty metadata gracefully', async () => {
      // Mock empty metadata array
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const allFiles = await metadataService.getAllFiles();
      const allTags = await metadataService.getAllTags();
      
      expect(allFiles).toHaveLength(0);
      expect(allTags).toHaveLength(0);
    });

    it('should handle malformed JSON gracefully', async () => {
      // Mock malformed JSON response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const metadata = await metadataService.getMetadata();
      expect(metadata).toBeNull();
    });
  });
});