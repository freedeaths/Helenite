/**
 * VaultService 集成测试
 * 
 * 测试 VaultService 作为统一协调器的核心功能
 * 使用 Mock 服务来模拟真实的服务交互，专注于测试协调逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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

// 创建更复杂的模拟数据来测试协调逻辑
const createRealisticMockServices = () => {
  const mockStorageService: IStorageService = {
    readFile: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/Welcome.md') return '# Welcome to Test Vault\n\nThis is a test document.';
      if (path === '/FolderA/SubFolder/Abilities.md') return '# Abilities\n\nTest content with [[links]].';
      throw new Error(`File not found: ${path}`);
    }),
    getFileInfo: vi.fn().mockImplementation(async (path: string) => {
      if (path.includes('Welcome.md') || path.includes('Abilities.md')) {
        return {
          size: 1024,
          lastModified: new Date('2024-01-01'),
          isDirectory: false
        };
      }
      throw new Error(`File not found: ${path}`);
    }),
    exists: vi.fn().mockImplementation(async (path: string) => {
      return path.includes('Welcome.md') || path.includes('Abilities.md');
    }),
    readFileWithInfo: vi.fn()
  };

  const mockMetadataService: IMetadataService = {
    getMetadata: vi.fn().mockResolvedValue({
      success: true,
      data: {
        files: {
          'Welcome.md': { fileName: 'Welcome', relativePath: '/Welcome.md' },
          'FolderA/SubFolder/Abilities.md': { fileName: 'Abilities', relativePath: '/FolderA/SubFolder/Abilities.md' }
        },
        tags: {
          'test': { count: 2, files: ['Welcome.md', 'Abilities.md'] },
          'react': { count: 1, files: ['Abilities.md'] }
        }
      }
    }),
    getFileMetadata: vi.fn(),
    getAllTags: vi.fn().mockResolvedValue([
      { tag: 'test', count: 2, files: [] },
      { tag: 'react', count: 1, files: [] }
    ]),
    searchInMetadata: vi.fn(),
    getFilesByTag: vi.fn(),
    refreshMetadata: vi.fn()
  };

  const mockFileTreeService: IFileTreeService = {
    getFileTree: vi.fn().mockResolvedValue([
      { name: 'Welcome.md', type: 'file' as const, path: '/Welcome.md' },
      { 
        name: 'FolderA', 
        type: 'folder' as const, 
        path: '/FolderA',
        children: [
          {
            name: 'SubFolder',
            type: 'folder' as const,
            path: '/FolderA/SubFolder',
            children: [
              { name: 'Abilities.md', type: 'file' as const, path: '/FolderA/SubFolder/Abilities.md' }
            ]
          }
        ]
      }
    ]),
    getChildren: vi.fn(),
    findNode: vi.fn(),
    getFolderStats: vi.fn(),
    getAllFolders: vi.fn(),
    getAllFiles: vi.fn(),
    getFilesByFolder: vi.fn(),
    searchFiles: vi.fn(),
    refreshCache: vi.fn()
  };

  const mockSearchService: ISearchAPI = {
    searchFiles: vi.fn().mockResolvedValue([
      {
        file: '/Welcome.md',
        matches: [
          {
            line: 1,
            content: 'Welcome to Test Vault',
            highlighted: '<mark>Welcome</mark> to Test Vault'
          }
        ]
      }
    ]),
    searchContent: vi.fn(),
    searchByTag: vi.fn(),
    getSearchStatistics: vi.fn()
  };

  const mockGraphService: IGraphService = {
    getGlobalGraph: vi.fn().mockResolvedValue({
      nodes: [
        { id: '/Welcome.md', title: 'Welcome', type: 'file' },
        { id: '/FolderA/SubFolder/Abilities.md', title: 'Abilities', type: 'file' },
        { id: 'test', title: 'test', type: 'tag' }
      ],
      edges: [
        { source: '/Welcome.md', target: 'test', type: 'tagged' },
        { source: '/FolderA/SubFolder/Abilities.md', target: 'test', type: 'tagged' }
      ]
    }),
    getLocalGraph: vi.fn(),
    filterByTag: vi.fn(),
    getGraphStats: vi.fn(),
    findNode: vi.fn(),
    getNodeNeighbors: vi.fn().mockResolvedValue([
      { id: 'neighbor1', title: 'Neighbor 1', type: 'file' },
      { id: 'neighbor2', title: 'Neighbor 2', type: 'file' }
    ]),
    getPathBetweenNodes: vi.fn(),
    getMostConnectedNodes: vi.fn(),
    getAllTagNodes: vi.fn(),
    getAllFileNodes: vi.fn(),
    getOrphanedNodes: vi.fn(),
    analyzeNodeConnectivity: vi.fn().mockResolvedValue({
      incomingConnections: 1,
      outgoingConnections: 2,
      centralityScore: 0.8
    }),
    refreshCache: vi.fn()
  };

  const mockTagService: ITagService = {
    getAllTags: vi.fn().mockResolvedValue([
      { tag: 'test', count: 2, files: [] },
      { tag: 'react', count: 1, files: [] }
    ]),
    getFileTags: vi.fn(),
    getFilesByTag: vi.fn().mockImplementation(async (tag: string) => {
      if (tag === 'test') return ['/Welcome.md', '/FolderA/SubFolder/Abilities.md'];
      if (tag === 'react') return ['/FolderA/SubFolder/Abilities.md'];
      return [];
    }),
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
  };

  const mockFootprintsService: IFootprintsService = {
    parseSingleTrack: vi.fn(),
    parseMultipleTracks: vi.fn(),
    aggregateFootprints: vi.fn(),
    scanTrackFiles: vi.fn().mockResolvedValue(['track1.gpx', 'track2.kml']),
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
  };

  const mockFrontMatterService: IFrontMatterService = {
    getFrontMatter: vi.fn().mockImplementation(async (path: string) => {
      if (path.includes('Abilities.md')) {
        return {
          title: 'Welcome to Helenite',
          tags: ['test', 'react']
        };
      }
      return null;
    }),
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
  };

  const mockExifService: IExifService = {
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
  };

  return {
    mockStorageService,
    mockMetadataService,
    mockFileTreeService,
    mockSearchService,
    mockGraphService,
    mockTagService,
    mockFootprintsService,
    mockFrontMatterService,
    mockExifService
  };
};

describe('VaultService Integration Tests', () => {
  let vaultService: VaultService;
  let mockServices: ReturnType<typeof createRealisticMockServices>;

  const TEST_VAULT_PATH = '/test/vault';

  beforeEach(() => {
    mockServices = createRealisticMockServices();
    
    vaultService = new VaultService(
      mockServices.mockStorageService,
      mockServices.mockMetadataService,
      mockServices.mockFileTreeService,
      mockServices.mockSearchService,
      mockServices.mockGraphService,
      mockServices.mockTagService,
      mockServices.mockFootprintsService,
      mockServices.mockFrontMatterService,
      mockServices.mockExifService,
      TEST_VAULT_PATH
    );

    vi.clearAllMocks();
  });

  // ===============================
  // 统一协调器功能测试
  // ===============================

  describe('Service Coordination', () => {
    it('should coordinate services to get vault info', async () => {
      const vaultInfo = await vaultService.getVaultInfo();

      expect(vaultInfo).toMatchObject({
        name: 'vault',
        path: TEST_VAULT_PATH,
        hasMetadata: true,
        supportedFeatures: {
          graphView: true,
          tagSearch: true,
          advancedSearch: true,
          fileLinks: true,
          footprints: true
        }
      });

      // 验证调用了 metadata 服务
      expect(mockServices.mockMetadataService.getMetadata).toHaveBeenCalled();
    });

    it('should coordinate multiple services for vault statistics', async () => {
      const statistics = await vaultService.getVaultStatistics();

      expect(statistics).toEqual({
        totalDocuments: 2, // Welcome.md + Abilities.md
        totalFolders: 2,   // FolderA + SubFolder
        totalTags: 2,      // test + react
        totalLinks: 2,     // graph edges
        graphNodes: 3,     // 2 files + 1 tag
        graphEdges: 2,     // connections
        trackFiles: 2      // track1.gpx + track2.kml
      });

      // 验证协调了所有相关服务
      expect(mockServices.mockFileTreeService.getFileTree).toHaveBeenCalled();
      expect(mockServices.mockTagService.getAllTags).toHaveBeenCalled();
      expect(mockServices.mockGraphService.getGlobalGraph).toHaveBeenCalled();
      expect(mockServices.mockFootprintsService.scanTrackFiles).toHaveBeenCalled();
    });

    it('should coordinate document operations', async () => {
      const content = await vaultService.getDocumentContent('/Welcome.md');
      expect(content).toBe('# Welcome to Test Vault\n\nThis is a test document.');
      expect(mockServices.mockStorageService.readFile).toHaveBeenCalledWith('/Welcome.md');

      const docInfo = await vaultService.getDocumentInfo('/FolderA/SubFolder/Abilities.md');
      expect(docInfo).toMatchObject({
        path: '/FolderA/SubFolder/Abilities.md',
        title: 'Welcome to Helenite',
        type: 'markdown',
        lastModified: new Date('2024-01-01'),
        size: 1024
      });

      // 验证协调了 storage 和 frontmatter 服务
      expect(mockServices.mockStorageService.getFileInfo).toHaveBeenCalled();
      expect(mockServices.mockFrontMatterService.getFrontMatter).toHaveBeenCalled();
    });

    it('should coordinate search operations', async () => {
      const searchResults = await vaultService.search('Welcome');
      
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0]).toMatchObject({
        document: {
          path: '/Welcome.md',
          title: 'Welcome',
          type: 'markdown'
        },
        matches: [{
          type: 'content',
          value: 'Welcome to Test Vault',
          context: '<mark>Welcome</mark> to Test Vault',
          line: 1
        }],
        score: expect.any(Number)
      });

      expect(mockServices.mockSearchService.searchFiles).toHaveBeenCalledWith('Welcome');
    });

    it('should coordinate tag search operations', async () => {
      const tagResults = await vaultService.searchByTag('test');
      
      expect(tagResults).toHaveLength(2);
      expect(tagResults[0]).toMatchObject({
        document: {
          path: '/Welcome.md',
          title: 'Welcome',
          type: 'markdown'
        },
        matches: [{
          type: 'tag',
          value: 'test'
        }],
        score: 1.0
      });

      expect(mockServices.mockTagService.getFilesByTag).toHaveBeenCalledWith('test');
    });

    it('should coordinate graph operations', async () => {
      const graphData = await vaultService.getGlobalGraph();
      
      expect(graphData).toMatchObject({
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: '/Welcome.md', title: 'Welcome', type: 'file' })
        ]),
        edges: expect.arrayContaining([
          expect.objectContaining({ source: '/Welcome.md', target: 'test', type: 'tagged' })
        ]),
        metadata: {
          totalNodes: 3,
          totalEdges: 2,
          lastUpdated: expect.any(Date)
        }
      });

      expect(mockServices.mockGraphService.getGlobalGraph).toHaveBeenCalled();
    });

    it('should coordinate connectivity analysis', async () => {
      const connectivity = await vaultService.analyzeNodeConnectivity('/Welcome.md');
      
      expect(connectivity).toEqual({
        incomingLinks: 1,
        outgoingLinks: 2,
        connectedNodes: ['neighbor1', 'neighbor2'], // 从 mock 数据提取 id
        centrality: 0.8
      });

      expect(mockServices.mockGraphService.analyzeNodeConnectivity).toHaveBeenCalledWith('/Welcome.md');
      expect(mockServices.mockGraphService.getNodeNeighbors).toHaveBeenCalledWith('/Welcome.md');
    });
  });

  // ===============================
  // 错误处理与优雅降级测试
  // ===============================

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle metadata service failures gracefully', async () => {
      // 模拟 metadata 服务失败
      mockServices.mockMetadataService.getMetadata.mockRejectedValue(new Error('Metadata error'));
      
      const vaultInfo = await vaultService.getVaultInfo();
      
      expect(vaultInfo.hasMetadata).toBe(false);
      expect(vaultInfo.supportedFeatures.graphView).toBe(false);
      expect(vaultInfo.supportedFeatures.tagSearch).toBe(false);
    });

    it('should provide fallback statistics when services fail', async () => {
      // 模拟所有服务失败
      mockServices.mockFileTreeService.getFileTree.mockRejectedValue(new Error('FileTree error'));
      mockServices.mockTagService.getAllTags.mockRejectedValue(new Error('Tags error'));
      mockServices.mockGraphService.getGlobalGraph.mockRejectedValue(new Error('Graph error'));
      mockServices.mockFootprintsService.scanTrackFiles.mockRejectedValue(new Error('Tracks error'));

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

    it('should handle document not found errors properly', async () => {
      await expect(vaultService.getDocumentContent('/nonexistent.md'))
        .rejects.toThrow('Document not found: /nonexistent.md');
        
      const exists = await vaultService.documentExists('/nonexistent.md');
      expect(exists).toBe(false);
    });

    it('should perform health checks on all coordinated services', async () => {
      const healthStatus = await vaultService.healthCheck();

      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.services).toEqual({
        storage: 'healthy',
        metadata: 'healthy',
        cache: 'healthy',
        search: 'healthy',
        graph: 'healthy'
      });
      expect(healthStatus.details).toHaveLength(5);

      // 验证调用了各个服务的健康检查
      expect(mockServices.mockStorageService.exists).toHaveBeenCalled();
      expect(mockServices.mockMetadataService.getMetadata).toHaveBeenCalled();
      expect(mockServices.mockSearchService.searchFiles).toHaveBeenCalled();
    });
  });

  // ===============================
  // 性能与并发协调测试
  // ===============================

  describe('Performance and Concurrency Coordination', () => {
    it('should handle concurrent operations efficiently', async () => {
      const promises = [
        vaultService.getVaultInfo(),
        vaultService.getFileTree(),
        vaultService.getAllTags(),
        vaultService.search('test'),
        vaultService.getGlobalGraph()
      ];

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successCount).toBe(5); // 所有操作都应成功
    });

    it('should maintain consistency in concurrent calls', async () => {
      const [info1, info2, info3] = await Promise.all([
        vaultService.getVaultInfo(),
        vaultService.getVaultInfo(),
        vaultService.getVaultInfo()
      ]);

      expect(info1).toEqual(info2);
      expect(info2).toEqual(info3);
    });

    it('should coordinate refresh operations across services', async () => {
      await vaultService.forceRefresh();

      // 验证调用了各个服务的刷新方法（如果存在）
      expect(mockServices.mockFileTreeService.refreshCache).toHaveBeenCalled();
      expect(mockServices.mockGraphService.refreshCache).toHaveBeenCalled();
      expect(mockServices.mockTagService.refreshCache).toHaveBeenCalled();
    });
  });
});