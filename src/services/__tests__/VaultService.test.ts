/**
 * VaultService 单元测试
 * 
 * 测试 Vault 统一协调器的核心功能：
 * - 系统管理：vault 信息、统计、健康检查、缓存刷新
 * - 文档管理：内容获取、文档信息、存在性检查
 * - 文件树浏览：文件树、文件夹内容、文件搜索
 * - 统一搜索：内容搜索、标签搜索、标签管理
 * - 知识图谱：全局图谱、局部图谱、连接性分析
 * - 足迹数据：轨迹处理、文件管理
 * - 内容分析：链接分析、关键词提取等高级功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultService } from '../VaultService.js';
import type { IStorageService } from '../interfaces/IStorageService.js';
import type { IMetadataService } from '../interfaces/IMetadataService.js';
import type { IFileTreeService } from '../interfaces/IFileTreeService.js';
import type { ISearchAPI } from '../interfaces/ISearchAPI.js';
import type { IGraphService } from '../interfaces/IGraphService.js';
import type { ITagService } from '../interfaces/ITagService.js';
import type { IFootprintsService } from '../interfaces/IFootprintsService.js';
import type { IFrontMatterService } from '../interfaces/IFrontMatterService.js';
import type { IExifService } from '../interfaces/IExifService.js';

// Mock services
const createMockStorageService = (): IStorageService => ({
  readFile: vi.fn(),
  getFileInfo: vi.fn(),
  exists: vi.fn(),
  readFileWithInfo: vi.fn()
});

const createMockMetadataService = (): IMetadataService => ({
  getMetadata: vi.fn(),
  getFileMetadata: vi.fn(),
  getAllTags: vi.fn(),
  searchInMetadata: vi.fn(),
  getFilesByTag: vi.fn(),
  refreshMetadata: vi.fn()
});

const createMockFileTreeService = (): IFileTreeService => ({
  getFileTree: vi.fn(),
  getChildren: vi.fn(),
  findNode: vi.fn(),
  getFolderStats: vi.fn(),
  getAllFolders: vi.fn(),
  getAllFiles: vi.fn(),
  getFilesByFolder: vi.fn(),
  searchFiles: vi.fn(),
  refreshCache: vi.fn()
});

const createMockSearchService = (): ISearchAPI => ({
  searchFiles: vi.fn(),
  searchContent: vi.fn(),
  searchByTag: vi.fn(),
  getSearchStatistics: vi.fn()
});

const createMockGraphService = (): IGraphService => ({
  getGlobalGraph: vi.fn(),
  getLocalGraph: vi.fn(),
  filterByTag: vi.fn(),
  getGraphStats: vi.fn(),
  findNode: vi.fn(),
  getNodeNeighbors: vi.fn(),
  getPathBetweenNodes: vi.fn(),
  getMostConnectedNodes: vi.fn(),
  getAllTagNodes: vi.fn(),
  getAllFileNodes: vi.fn(),
  getOrphanedNodes: vi.fn(),
  analyzeNodeConnectivity: vi.fn(),
  refreshCache: vi.fn()
});

const createMockTagService = (): ITagService => ({
  getAllTags: vi.fn(),
  getFileTags: vi.fn(),
  getFilesByTag: vi.fn(),
  getTagStats: vi.fn(),
  searchTags: vi.fn(),
  filterTags: vi.fn(),
  getTagDetails: vi.fn(),
  hasTag: vi.fn(),
  getMostUsedTags: vi.fn(),
  getLeastUsedTags: vi.fn(),
  getOrphanTags: vi.fn(),
  getRelatedTags: vi.fn(),
  analyzeFileTagPattern: vi.fn(),
  getTagCooccurrence: vi.fn(),
  getFolderTagDistribution: vi.fn(),
  suggestTags: vi.fn(),
  refreshCache: vi.fn()
});

const createMockFootprintsService = (): IFootprintsService => ({
  parseSingleTrack: vi.fn(),
  parseMultipleTracks: vi.fn(),
  aggregateFootprints: vi.fn(),
  scanTrackFiles: vi.fn(),
  detectProvider: vi.fn(),
  validateTrackFile: vi.fn(),
  processUserInputs: vi.fn(),
  processPhotoExif: vi.fn(),
  geocodeLocation: vi.fn(),
  calculateTracksBounds: vi.fn(),
  calculateLocationsBounds: vi.fn(),
  mergeBounds: vi.fn(),
  getTrackStatistics: vi.fn(),
  refreshCache: vi.fn(),
  getCacheStats: vi.fn(),
  switchVault: vi.fn(),
  getCurrentVault: vi.fn()
});

const createMockFrontMatterService = (): IFrontMatterService => ({
  getFrontMatter: vi.fn(),
  getAllFrontMatter: vi.fn(),
  getUuid: vi.fn(),
  getFileByUuid: vi.fn(),
  getAllUuids: vi.fn(),
  hasUuid: vi.fn(),
  isPublished: vi.fn(),
  getPublishedFiles: vi.fn(),
  getUnpublishedFiles: vi.fn(),
  getAuthor: vi.fn(),
  getFilesByAuthor: vi.fn(),
  getAllAuthors: vi.fn(),
  getDescription: vi.fn(),
  getCssClass: vi.fn(),
  getFilesByCssClass: vi.fn(),
  getCreatedDate: vi.fn(),
  getModifiedDate: vi.fn(),
  queryFiles: vi.fn(),
  searchFrontMatter: vi.fn(),
  getCustomField: vi.fn(),
  getFilesByCustomField: vi.fn(),
  getAllCustomFields: vi.fn(),
  getStatistics: vi.fn(),
  analyzeFrontMatterPatterns: vi.fn()
});

const createMockExifService = (): IExifService => ({
  parseExif: vi.fn(),
  parseMultipleExif: vi.fn(),
  scanDirectoryForExif: vi.fn(),
  getGpsCoordinates: vi.fn(),
  getCameraInfo: vi.fn(),
  getShootingParams: vi.fn(),
  getDateTimeInfo: vi.fn(),
  searchImagesWithGps: vi.fn(),
  searchImagesByCamera: vi.fn(),
  searchImagesByDateRange: vi.fn(),
  searchImagesByGeoBounds: vi.fn(),
  searchExif: vi.fn(),
  getExifStatistics: vi.fn(),
  getAllCameraMakes: vi.fn(),
  getAllCameraModels: vi.fn(),
  getDateTimeRange: vi.fn(),
  getGpsBounds: vi.fn()
});

describe('VaultService', () => {
  let vaultService: VaultService;
  let mockStorageService: IStorageService;
  let mockMetadataService: IMetadataService;
  let mockFileTreeService: IFileTreeService;
  let mockSearchService: ISearchAPI;
  let mockGraphService: IGraphService;
  let mockTagService: ITagService;
  let mockFootprintsService: IFootprintsService;
  let mockFrontMatterService: IFrontMatterService;
  let mockExifService: IExifService;

  beforeEach(() => {
    mockStorageService = createMockStorageService();
    mockMetadataService = createMockMetadataService();
    mockFileTreeService = createMockFileTreeService();
    mockSearchService = createMockSearchService();
    mockGraphService = createMockGraphService();
    mockTagService = createMockTagService();
    mockFootprintsService = createMockFootprintsService();
    mockFrontMatterService = createMockFrontMatterService();
    mockExifService = createMockExifService();

    vaultService = new VaultService(
      mockStorageService,
      mockMetadataService,
      mockFileTreeService,
      mockSearchService,
      mockGraphService,
      mockTagService,
      mockFootprintsService,
      mockFrontMatterService,
      mockExifService,
      '/test/vault'
    );

    vi.clearAllMocks();
  });

  // ===============================
  // 系统管理测试
  // ===============================

  describe('getVaultInfo', () => {
    it('should return vault info with metadata support', async () => {
      (mockMetadataService.getMetadata as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { files: {}, tags: {} }
      });

      const vaultInfo = await vaultService.getVaultInfo();

      expect(vaultInfo).toMatchObject({
        name: 'vault',
        path: '/test/vault',
        hasMetadata: true,
        supportedFeatures: {
          graphView: true,
          tagSearch: true,
          advancedSearch: true,
          fileLinks: true,
          footprints: true
        }
      });

      expect(mockMetadataService.getMetadata).toHaveBeenCalled();
    });

    it('should return vault info without metadata support', async () => {
      (mockMetadataService.getMetadata as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false
      });

      const vaultInfo = await vaultService.getVaultInfo();

      expect(vaultInfo).toMatchObject({
        name: 'vault',
        path: '/test/vault',
        hasMetadata: false,
        supportedFeatures: {
          graphView: false,
          tagSearch: false,
          advancedSearch: true,
          fileLinks: false,
          footprints: true
        }
      });
    });

    it('should handle metadata check errors gracefully', async () => {
      (mockMetadataService.getMetadata as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Metadata error'));

      const vaultInfo = await vaultService.getVaultInfo();

      expect(vaultInfo.hasMetadata).toBe(false);
      expect(vaultInfo.name).toBe('vault'); // 从 /test/vault 路径提取
    });
  });

  describe('getVaultStatistics', () => {
    it('should return comprehensive vault statistics', async () => {
      const mockFileTree = [
        { name: 'file1.md', type: 'file' as const, path: '/file1.md' },
        { 
          name: 'folder1', 
          type: 'folder' as const, 
          path: '/folder1',
          children: [
            { name: 'file2.md', type: 'file' as const, path: '/folder1/file2.md' }
          ]
        }
      ];

      const mockTags = [
        { tag: 'react', count: 5, files: [] },
        { tag: 'typescript', count: 3, files: [] }
      ];

      const mockGraphData = {
        nodes: [{ id: 'node1' }, { id: 'node2' }],
        edges: [{ source: 'node1', target: 'node2' }]
      };

      const mockTrackFiles = ['track1.gpx', 'track2.kml'];

      (mockFileTreeService.getFileTree as ReturnType<typeof vi.fn>).mockResolvedValue(mockFileTree);
      (mockTagService.getAllTags as ReturnType<typeof vi.fn>).mockResolvedValue(mockTags);
      (mockGraphService.getGlobalGraph as ReturnType<typeof vi.fn>).mockResolvedValue(mockGraphData);
      (mockFootprintsService.scanTrackFiles as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrackFiles);

      const statistics = await vaultService.getVaultStatistics();

      expect(statistics).toEqual({
        totalDocuments: 2,
        totalFolders: 1,
        totalTags: 2,
        totalLinks: 1,
        graphNodes: 2,
        graphEdges: 1,
        trackFiles: 2
      });
    });

    it('should handle service failures gracefully', async () => {
      (mockFileTreeService.getFileTree as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('FileTree error'));
      (mockTagService.getAllTags as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Tags error'));
      (mockGraphService.getGlobalGraph as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Graph error'));
      (mockFootprintsService.scanTrackFiles as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Tracks error'));

      const statistics = await vaultService.getVaultStatistics();

      expect(statistics).toEqual({
        totalDocuments: 0,
        totalFolders: 0,
        totalTags: 0,
        totalLinks: 0,
        graphNodes: 0,
        graphEdges: 0,
        trackFiles: 0
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are working', async () => {
      // Mock all health checks to succeed
      (mockStorageService.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (mockMetadataService.getMetadata as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (mockSearchService.searchFiles as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockGraphService.getGraphStats as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const health = await vaultService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.services.storage).toBe('healthy');
      expect(health.services.metadata).toBe('healthy');
      expect(health.services.search).toBe('healthy');
      expect(health.services.graph).toBe('healthy');
      expect(health.details).toHaveLength(5);
    });

    it('should return error status when services fail', async () => {
      // Mock services to fail
      (mockStorageService.exists as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Storage error'));
      (mockMetadataService.getMetadata as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false });
      (mockSearchService.searchFiles as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Search error'));
      (mockGraphService.getGraphStats as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Graph error'));

      const health = await vaultService.healthCheck();

      expect(health.status).toBe('error');
      expect(health.services.storage).toBe('error');
      expect(health.services.metadata).toBe('warning');
      expect(health.services.search).toBe('error');
    });
  });

  describe('forceRefresh', () => {
    it('should call refresh methods on all services', async () => {
      await vaultService.forceRefresh();

      expect(mockMetadataService.refreshMetadata).toHaveBeenCalled();
      expect(mockFileTreeService.refreshCache).toHaveBeenCalled();
      expect(mockGraphService.refreshCache).toHaveBeenCalled();
      expect(mockTagService.refreshCache).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      (mockMetadataService.refreshMetadata as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Refresh error'));

      // forceRefresh 使用 Promise.allSettled，即使部分服务失败也不会抛出错误
      await expect(vaultService.forceRefresh()).resolves.not.toThrow();
    });
  });

  // ===============================
  // 文档管理测试
  // ===============================

  describe('getDocumentContent', () => {
    it('should return document content for markdown files', async () => {
      const mockContent = '# Test Document\n\nThis is a test.';
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockContent);

      const content = await vaultService.getDocumentContent('/test.md');

      expect(content).toBe(mockContent);
      expect(mockStorageService.readFile).toHaveBeenCalledWith('/test.md');
    });

    it('should handle missing documents', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('File not found'));

      await expect(vaultService.getDocumentContent('/missing.md')).rejects.toThrow('Document not found: /missing.md');
    });
  });

  describe('getRawDocumentContent', () => {
    it('should return raw document content', async () => {
      const mockContent = 'Raw content';
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockContent);

      const content = await vaultService.getRawDocumentContent('/test.txt');

      expect(content).toBe(mockContent);
      expect(mockStorageService.readFile).toHaveBeenCalledWith('/test.txt');
    });
  });

  describe('getDocumentInfo', () => {
    it('should return document info with metadata', async () => {
      const mockFileInfo = {
        size: 1024,
        lastModified: new Date('2024-01-01'),
        isDirectory: false
      };

      const mockFrontMatter = {
        title: 'Test Document',
        tags: ['test']
      };

      (mockStorageService.getFileInfo as ReturnType<typeof vi.fn>).mockResolvedValue(mockFileInfo);
      (mockFrontMatterService.getFrontMatter as ReturnType<typeof vi.fn>).mockResolvedValue(mockFrontMatter);

      const docInfo = await vaultService.getDocumentInfo('/test.md');

      expect(docInfo).toMatchObject({
        path: '/test.md',
        title: 'Test Document',
        type: 'markdown',
        lastModified: mockFileInfo.lastModified,
        size: mockFileInfo.size
      });
    });

    it('should extract title from path when frontmatter is not available', async () => {
      const mockFileInfo = {
        size: 1024,
        lastModified: new Date('2024-01-01'),
        isDirectory: false
      };

      (mockStorageService.getFileInfo as ReturnType<typeof vi.fn>).mockResolvedValue(mockFileInfo);
      (mockFrontMatterService.getFrontMatter as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('No frontmatter'));

      const docInfo = await vaultService.getDocumentInfo('/folder/test-document.md');

      expect(docInfo.title).toBe('test-document');
      expect(docInfo.type).toBe('markdown');
    });
  });

  describe('documentExists', () => {
    it('should return true for existing documents', async () => {
      (mockStorageService.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const exists = await vaultService.documentExists('/test.md');

      expect(exists).toBe(true);
      expect(mockStorageService.exists).toHaveBeenCalledWith('/test.md');
    });

    it('should return false for non-existing documents', async () => {
      (mockStorageService.exists as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const exists = await vaultService.documentExists('/missing.md');

      expect(exists).toBe(false);
    });

    it('should handle existence check errors', async () => {
      (mockStorageService.exists as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Check error'));

      const exists = await vaultService.documentExists('/error.md');

      expect(exists).toBe(false);
    });
  });

  // ===============================
  // 文件树浏览测试
  // ===============================

  describe('getFileTree', () => {
    it('should return file tree structure', async () => {
      const mockFileTree = [
        { name: 'file1.md', type: 'file' as const, path: '/file1.md' },
        { name: 'folder1', type: 'folder' as const, path: '/folder1', children: [] }
      ];

      (mockFileTreeService.getFileTree as ReturnType<typeof vi.fn>).mockResolvedValue(mockFileTree);

      const fileTree = await vaultService.getFileTree();

      expect(fileTree).toEqual(mockFileTree);
      expect(mockFileTreeService.getFileTree).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      (mockFileTreeService.getFileTree as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('FileTree error'));

      const fileTree = await vaultService.getFileTree();

      expect(fileTree).toEqual([]);
    });
  });

  describe('getFolderContents', () => {
    it('should return folder contents', async () => {
      const mockContents = [
        { name: 'subfolder', type: 'folder' as const, path: '/folder/subfolder' },
        { name: 'file.md', type: 'file' as const, path: '/folder/file.md' }
      ];

      (mockFileTreeService.getChildren as ReturnType<typeof vi.fn>).mockResolvedValue(mockContents);

      const contents = await vaultService.getFolderContents('/folder');

      expect(contents).toEqual(mockContents);
      expect(mockFileTreeService.getChildren).toHaveBeenCalledWith('/folder');
    });
  });

  describe('searchFiles', () => {
    it('should search files and convert results', async () => {
      const mockSearchResults = [
        {
          path: '/test.md',
          name: 'test.md',
          lastModified: new Date('2024-01-01'),
          size: 1024
        }
      ];

      (mockFileTreeService.searchFiles as ReturnType<typeof vi.fn>).mockResolvedValue(mockSearchResults);

      const results = await vaultService.searchFiles('test');

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        path: '/test.md',
        title: 'test.md',
        type: 'markdown',
        lastModified: mockSearchResults[0].lastModified,
        size: mockSearchResults[0].size
      });
    });
  });

  // ===============================
  // 统一搜索测试
  // ===============================

  describe('search', () => {
    it('should perform unified search and return formatted results', async () => {
      const mockSearchResults = [
        {
          file: '/test.md',
          matches: [
            {
              line: 1,
              content: 'Test content',
              highlighted: '<mark>Test</mark> content'
            }
          ]
        }
      ];

      (mockSearchService.searchFiles as ReturnType<typeof vi.fn>).mockResolvedValue(mockSearchResults);

      const results = await vaultService.search('test');

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        document: {
          path: '/test.md',
          title: 'test',
          type: 'markdown'
        },
        matches: [
          {
            type: 'content',
            value: 'Test content',
            context: '<mark>Test</mark> content',
            line: 1
          }
        ],
        score: expect.any(Number) as number
      });
    });
  });

  describe('searchByTag', () => {
    it('should search files by tag', async () => {
      const mockTaggedFiles = ['/file1.md', '/file2.md'];

      (mockTagService.getFilesByTag as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaggedFiles);

      const results = await vaultService.searchByTag('react');

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        document: {
          path: '/file1.md',
          title: 'file1',
          type: 'markdown'
        },
        matches: [
          {
            type: 'tag',
            value: 'react'
          }
        ],
        score: 1.0
      });
    });
  });

  describe('getAllTags', () => {
    it('should return all tags', async () => {
      const mockTags = [
        { tag: 'react', count: 5, files: [] },
        { tag: 'typescript', count: 3, files: [] }
      ];

      (mockTagService.getAllTags as ReturnType<typeof vi.fn>).mockResolvedValue(mockTags);

      const tags = await vaultService.getAllTags();

      expect(tags).toEqual(mockTags);
      expect(mockTagService.getAllTags).toHaveBeenCalled();
    });
  });

  describe('getTagStatistics', () => {
    it('should return tag statistics with file counts', async () => {
      const mockTags = [
        { tag: 'react', count: 2, files: [] },
        { tag: 'vue', count: 1, files: [] }
      ];

      (mockTagService.getAllTags as ReturnType<typeof vi.fn>).mockResolvedValue(mockTags);
      (mockTagService.getFilesByTag as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(['/file1.md', '/file2.md'])
        .mockResolvedValueOnce(['/file3.md']);

      const statistics = await vaultService.getTagStatistics();

      expect(statistics).toHaveLength(2);
      expect(statistics[0]).toMatchObject({
        tag: 'react',
        count: 2,
        files: ['/file1.md', '/file2.md']
      });
      expect(statistics[1]).toMatchObject({
        tag: 'vue',
        count: 1,
        files: ['/file3.md']
      });
    });
  });

  // ===============================
  // 知识图谱测试
  // ===============================

  describe('getGlobalGraph', () => {
    it('should return global graph data', async () => {
      const mockGraphData = {
        nodes: [{ id: 'node1', title: 'Node 1' }],
        edges: [{ source: 'node1', target: 'node2' }]
      };

      (mockGraphService.getGlobalGraph as ReturnType<typeof vi.fn>).mockResolvedValue(mockGraphData);

      const graphData = await vaultService.getGlobalGraph();

      expect(graphData.nodes).toEqual(mockGraphData.nodes);
      expect(graphData.edges).toEqual(mockGraphData.edges);
      expect(graphData.metadata).toMatchObject({
        totalNodes: 1,
        totalEdges: 1,
        lastUpdated: expect.any(Date) as Date
      });
    });
  });

  describe('getLocalGraph', () => {
    it('should return local graph data', async () => {
      const mockGraphData = {
        nodes: [{ id: 'center', title: 'Center Node' }],
        edges: []
      };

      (mockGraphService.getLocalGraph as ReturnType<typeof vi.fn>).mockResolvedValue(mockGraphData);

      const graphData = await vaultService.getLocalGraph({
        centerPath: '/center.md',
        depth: 2
      });

      expect(graphData.nodes).toEqual(mockGraphData.nodes);
      expect(mockGraphService.getLocalGraph).toHaveBeenCalledWith('/center.md', { depth: 2 });
    });
  });

  describe('analyzeNodeConnectivity', () => {
    it('should analyze node connectivity', async () => {
      const mockConnectivity = {
        incomingConnections: 3,
        outgoingConnections: 2,
        centralityScore: 0.8
      };

      const mockNeighbors = [
        { id: 'neighbor1', title: 'Neighbor 1' },
        { id: 'neighbor2', title: 'Neighbor 2' }
      ];

      (mockGraphService.analyzeNodeConnectivity as ReturnType<typeof vi.fn>).mockResolvedValue(mockConnectivity);
      (mockGraphService.getNodeNeighbors as ReturnType<typeof vi.fn>).mockResolvedValue(mockNeighbors);

      const analysis = await vaultService.analyzeNodeConnectivity('/test.md');

      expect(analysis).toEqual({
        incomingLinks: 3,
        outgoingLinks: 2,
        connectedNodes: ['neighbor1', 'neighbor2'],
        centrality: 0.8
      });
    });
  });

  // ===============================
  // 足迹和地理数据测试
  // ===============================

  describe('processTrackFile', () => {
    it('should process single track file', async () => {
      const mockTrackData = {
        tracks: [{ id: 'track1', name: 'Test Track' }],
        locations: [],
        metadata: { totalTracks: 1, totalLocations: 0, processingTime: 100, errors: [] }
      };

      (mockFootprintsService.parseSingleTrack as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrackData);

      const result = await vaultService.processTrackFile('/test.gpx');

      expect(result).toEqual(mockTrackData);
      expect(mockFootprintsService.parseSingleTrack).toHaveBeenCalledWith('/test.gpx');
    });
  });

  describe('processMultipleTrackFiles', () => {
    it('should process multiple track files', async () => {
      const mockTrackData = {
        tracks: [
          { id: 'track1', name: 'Track 1' },
          { id: 'track2', name: 'Track 2' }
        ],
        locations: [],
        metadata: { totalTracks: 2, totalLocations: 0, processingTime: 200, errors: [] }
      };

      (mockFootprintsService.parseMultipleTracks as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrackData);

      const result = await vaultService.processMultipleTrackFiles(['/track1.gpx', '/track2.gpx']);

      expect(result).toEqual(mockTrackData);
      expect(mockFootprintsService.parseMultipleTracks).toHaveBeenCalledWith(['/track1.gpx', '/track2.gpx']);
    });
  });

  describe('getTrackFiles', () => {
    it('should return list of track files', async () => {
      const mockTrackFiles = ['track1.gpx', 'track2.kml'];

      (mockFootprintsService.scanTrackFiles as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrackFiles);

      const trackFiles = await vaultService.getTrackFiles();

      expect(trackFiles).toEqual(mockTrackFiles);
      expect(mockFootprintsService.scanTrackFiles).toHaveBeenCalledWith('Attachments');
    });
  });

  // ===============================
  // 内容分析测试
  // ===============================

  describe('getBacklinks', () => {
    it('should return backlinks for a document', async () => {
      const mockNode = { id: '/test.md', title: 'Test Document', type: 'file' };
      const mockNeighbors = [
        { id: '/source1.md', title: 'Source 1', type: 'file' },
        { id: '/source2.md', title: 'Source 2', type: 'file' }
      ];

      (mockGraphService.findNode as ReturnType<typeof vi.fn>).mockResolvedValue(mockNode);
      (mockGraphService.getNodeNeighbors as ReturnType<typeof vi.fn>).mockResolvedValue(mockNeighbors);

      const backlinks = await vaultService.getBacklinks('/test.md');

      expect(backlinks).toHaveLength(2);
      expect(backlinks[0]).toMatchObject({
        sourcePath: '/source1.md',
        sourceTitle: 'Source 1',
        context: 'Links to /test.md',
        line: 0
      });
    });

    it('should return empty array when node is not found', async () => {
      (mockGraphService.findNode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const backlinks = await vaultService.getBacklinks('/missing.md');

      expect(backlinks).toEqual([]);
    });
  });

  describe('generateSummary', () => {
    it('should generate document summary', async () => {
      const mockContent = 'This is a long document with many words. '.repeat(10);
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockContent);

      const summary = await vaultService.generateSummary('/test.md', 100);

      expect(summary.summary).toHaveLength(103); // 100 chars + '...'
      expect(summary.wordCount).toBe(81); // 8 words * 10 repetitions + 1 extra from trailing space
      expect(summary.keyPoints).toEqual([]);
    });
  });

  describe('findOrphanedDocuments', () => {
    it('should find orphaned documents', async () => {
      const mockOrphanedNodes = [
        { id: '/orphan1.md', title: 'Orphan 1', type: 'file' },
        { id: '/orphan2.md', title: 'Orphan 2', type: 'file' },
        { id: 'tag-node', title: 'Tag Node', type: 'tag' } // Should be filtered out
      ];

      (mockGraphService.getOrphanedNodes as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrphanedNodes);

      const orphaned = await vaultService.findOrphanedDocuments();

      expect(orphaned).toHaveLength(2);
      expect(orphaned[0]).toMatchObject({
        path: '/orphan1.md',
        title: 'Orphan 1',
        type: 'markdown'
      });
    });
  });

  // ===============================
  // 高级功能测试
  // ===============================

  describe('getSimilarDocuments', () => {
    it('should return empty array for basic implementation', async () => {
      const similar = await vaultService.getSimilarDocuments('/test.md');

      expect(similar).toEqual([]);
    });
  });

  describe('getOutgoingLinks', () => {
    it('should return empty array for basic implementation', async () => {
      const outgoing = await vaultService.getOutgoingLinks('/test.md');

      expect(outgoing).toEqual([]);
    });
  });

  describe('extractKeywords', () => {
    it('should return empty array for basic implementation', async () => {
      const keywords = await vaultService.extractKeywords('/test.md');

      expect(keywords).toEqual([]);
    });
  });

  describe('findBrokenLinks', () => {
    it('should return empty array for basic implementation', async () => {
      const brokenLinks = await vaultService.findBrokenLinks();

      expect(brokenLinks).toEqual([]);
    });
  });
});