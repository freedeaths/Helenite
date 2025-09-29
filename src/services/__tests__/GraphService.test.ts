/**
 * GraphService 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GraphService } from '../GraphService';
import type { IMetadataService, MetadataArray } from '../interfaces/IMetadataService';
import type { GraphOptions, LocalGraphOptions, GraphNode } from '../interfaces/IGraphService';

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
  },
  {
    fileName: 'Graph-Test',
    relativePath: 'Graph-Test.md',
    tags: ['test', 'graph'],
    headings: [
      { heading: 'Graph Testing', level: 1 }
    ],
    links: [
      { link: 'Welcome', relativePath: 'Welcome.md' },
      { link: 'Abilities', relativePath: 'FolderA/SubFolder/Abilities.md' }
    ],
    backlinks: []
  }
];

describe('GraphService', () => {
  let mockMetadataService: IMetadataService;
  let graphService: GraphService;

  beforeEach(() => {
    mockMetadataService = createMockMetadataService();
    vi.mocked(mockMetadataService.getMetadata).mockResolvedValue(mockMetadata);
    graphService = new GraphService(mockMetadataService, 'Demo');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor and Basic Setup', () => {
    it('should create GraphService with default vault', () => {
      const service = new GraphService(mockMetadataService);
      expect(service).toBeInstanceOf(GraphService);

      const vault = service.getCurrentVault();
      expect(vault.id).toBe('Demo'); // default vault
    });

    it('should create GraphService with specified vault', () => {
      const service = new GraphService(mockMetadataService, 'Publish');
      expect(service).toBeInstanceOf(GraphService);

      const vault = service.getCurrentVault();
      expect(vault.id).toBe('Publish');
    });
  });

  describe('Global Graph Construction', () => {
    it('should build global graph from metadata', async () => {
      const graph = await graphService.getGlobalGraph();

      expect(graph).toBeDefined();
      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);

      // 验证节点：4个文件节点 + 标签节点
      const fileNodes = graph.nodes.filter(node => node.type === 'file');
      const tagNodes = graph.nodes.filter(node => node.type === 'tag');

      expect(fileNodes.length).toBe(4); // Welcome, Abilities, README, Graph-Test
      expect(tagNodes.length).toBeGreaterThan(0); // 应该有标签节点

      // 验证边：文件间链接 + 标签链接
      const linkEdges = graph.edges.filter(edge => edge.type === 'link');
      const tagEdges = graph.edges.filter(edge => edge.type === 'tag');

      expect(linkEdges.length).toBeGreaterThan(0);
      expect(tagEdges.length).toBeGreaterThan(0);

    });

    it('should handle empty metadata gracefully', async () => {
      vi.mocked(mockMetadataService.getMetadata).mockResolvedValue([]);

      const graph = await graphService.getGlobalGraph();
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });

    it('should handle metadata loading failure', async () => {
      vi.mocked(mockMetadataService.getMetadata).mockResolvedValue(null);

      const graph = await graphService.getGlobalGraph();
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });

    it('should handle metadata service errors gracefully', async () => {
      vi.mocked(mockMetadataService.getMetadata).mockRejectedValue(new Error('Network error'));

      const graph = await graphService.getGlobalGraph();
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });
  });

  describe('Graph Options', () => {
    it('should exclude tags when includeTags is false', async () => {
      const options: GraphOptions = {
        includeTags: false
      };

      const graph = await graphService.getGlobalGraph(options);
      const tagNodes = graph.nodes.filter(node => node.type === 'tag');
      const tagEdges = graph.edges.filter(edge => edge.type === 'tag');

      expect(tagNodes.length).toBe(0);
      expect(tagEdges.length).toBe(0);
    });

    it('should exclude orphaned nodes when includeOrphanedNodes is false', async () => {
      const options: GraphOptions = {
        includeOrphanedNodes: false
      };

      const graph = await graphService.getGlobalGraph(options);

      // 验证所有节点都有连接
      const connectedNodeIds = new Set<string>();
      for (const edge of graph.edges) {
        connectedNodeIds.add(edge.from);
        connectedNodeIds.add(edge.to);
      }

      expect(graph.nodes.every(node => connectedNodeIds.has(node.id))).toBe(true);
    });

    it('should limit nodes when maxNodes is specified', async () => {
      const options: GraphOptions = {
        maxNodes: 2
      };

      const graph = await graphService.getGlobalGraph(options);
      expect(graph.nodes.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Local Graph Construction', () => {
    it('should build local graph centered on specific file', async () => {
      const graph = await graphService.getLocalGraph('Welcome.md');

      expect(graph).toBeDefined();
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      // 应该包含中心节点 Welcome
      const centerNode = graph.nodes.find(node => node.title === 'Welcome');
      expect(centerNode).toBeDefined();
      expect(centerNode?.type).toBe('file');

    });

    it('should handle URL-encoded file paths', async () => {
      const encodedPath = encodeURIComponent('FolderA/SubFolder/Abilities.md');
      const graph = await graphService.getLocalGraph(encodedPath);

      expect(graph.nodes.length).toBeGreaterThan(0);

      // 应该找到 Abilities 节点
      const centerNode = graph.nodes.find(node =>
        node.title === 'FolderA/SubFolder/Abilities' ||
        node.title === 'Abilities'
      );
      expect(centerNode).toBeDefined();
    });

    it('should respect depth parameter', async () => {
      const options: LocalGraphOptions = {
        depth: 2
      };

      const graph1 = await graphService.getLocalGraph('Welcome.md', { depth: 1 });
      const graph2 = await graphService.getLocalGraph('Welcome.md', options);

      // 深度2应该包含更多节点（或至少相同数量）
      expect(graph2.nodes.length).toBeGreaterThanOrEqual(graph1.nodes.length);
    });

    it('should return empty graph for non-existent file', async () => {
      const graph = await graphService.getLocalGraph('NonExistent.md');

      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });
  });

  describe('Tag Filtering', () => {
    it('should filter graph by tag', async () => {
      const graph = await graphService.filterByTag('welcome');

      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      // 应该包含 #welcome 标签节点
      const tagNode = graph.nodes.find(node => node.label === '#welcome');
      expect(tagNode).toBeDefined();
      expect(tagNode?.type).toBe('tag');

      // 应该包含标记了 welcome 的文件
      const welcomeFileNode = graph.nodes.find(node =>
        node.type === 'file' && node.title === 'Welcome'
      );
      expect(welcomeFileNode).toBeDefined();

    });

    it('should handle tag with # prefix', async () => {
      const graph = await graphService.filterByTag('#welcome');

      expect(graph.nodes.length).toBeGreaterThan(0);

      const tagNode = graph.nodes.find(node => node.label === '#welcome');
      expect(tagNode).toBeDefined();
    });

    it('should return empty graph for non-existent tag', async () => {
      const graph = await graphService.filterByTag('nonexistent');

      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });
  });

  describe('Graph Statistics', () => {
    it('should calculate graph statistics', async () => {
      const stats = await graphService.getGraphStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalNodes).toBe('number');
      expect(typeof stats.totalEdges).toBe('number');
      expect(typeof stats.totalTags).toBe('number');
      expect(typeof stats.orphanedNodes).toBe('number');
      expect(typeof stats.averageConnections).toBe('number');

      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.totalEdges).toBeGreaterThan(0);
      expect(stats.totalTags).toBeGreaterThan(0);
      expect(stats.averageConnections).toBeGreaterThan(0);

    });

    it('should handle empty graph statistics', async () => {
      vi.mocked(mockMetadataService.getMetadata).mockResolvedValue([]);

      const stats = await graphService.getGraphStats();

      expect(stats.totalNodes).toBe(0);
      expect(stats.totalEdges).toBe(0);
      expect(stats.totalTags).toBe(0);
      expect(stats.orphanedNodes).toBe(0);
      expect(stats.averageConnections).toBe(0);
    });
  });

  describe('Node Query Operations', () => {
    it('should find node by identifier', async () => {
      const node = await graphService.findNode('Welcome');

      expect(node).not.toBeNull();
      expect(node?.title).toBe('Welcome');
      expect(node?.type).toBe('file');
    });

    it('should find node by path', async () => {
      const node = await graphService.findNode('Welcome.md');

      expect(node).not.toBeNull();
      expect(node?.title).toBe('Welcome');
    });

    it('should return null for non-existent node', async () => {
      const node = await graphService.findNode('NonExistent');
      expect(node).toBeNull();
    });

    it('should get node neighbors', async () => {
      // 首先找到一个节点
      const centerNode = await graphService.findNode('Welcome');
      expect(centerNode).not.toBeNull();

      const neighbors = await graphService.getNodeNeighbors(centerNode!.id);

      expect(Array.isArray(neighbors)).toBe(true);
      expect(neighbors.length).toBeGreaterThan(0);

    });

    it('should respect depth in neighbor search', async () => {
      const centerNode = await graphService.findNode('Welcome');
      expect(centerNode).not.toBeNull();

      const neighbors1 = await graphService.getNodeNeighbors(centerNode!.id, 1);
      const neighbors2 = await graphService.getNodeNeighbors(centerNode!.id, 2);

      expect(neighbors2.length).toBeGreaterThanOrEqual(neighbors1.length);
    });

    it('should find path between nodes', async () => {
      const node1 = await graphService.findNode('Welcome');
      const node2 = await graphService.findNode('Abilities');

      expect(node1).not.toBeNull();
      expect(node2).not.toBeNull();

      const path = await graphService.getPathBetweenNodes(node1!.id, node2!.id);

      expect(Array.isArray(path)).toBe(true);
      expect(path.length).toBeGreaterThan(0);
      expect(path[0].id).toBe(node1!.id);
      expect(path[path.length - 1].id).toBe(node2!.id);

    });

    it('should return direct path for same node', async () => {
      const node = await graphService.findNode('Welcome');
      expect(node).not.toBeNull();

      const path = await graphService.getPathBetweenNodes(node!.id, node!.id);

      expect(path.length).toBe(1);
      expect(path[0].id).toBe(node!.id);
    });

    it('should return empty path for unconnected nodes', async () => {
      // 创建一个没有连接的节点场景
      const isolatedMetadata = [
        {
          fileName: 'Isolated',
          relativePath: 'Isolated.md',
          tags: [],
          headings: [],
          links: [],
          backlinks: []
        },
        ...mockMetadata
      ];

      vi.mocked(mockMetadataService.getMetadata).mockResolvedValue(isolatedMetadata);

      const isolatedNode = await graphService.findNode('Isolated');
      const welcomeNode = await graphService.findNode('Welcome');

      expect(isolatedNode).not.toBeNull();
      expect(welcomeNode).not.toBeNull();

      const path = await graphService.getPathBetweenNodes(isolatedNode!.id, welcomeNode!.id);
      expect(path).toEqual([]);
    });

    it('should get most connected nodes', async () => {
      const hubs = await graphService.getMostConnectedNodes(3);

      expect(Array.isArray(hubs)).toBe(true);
      expect(hubs.length).toBeLessThanOrEqual(3);
      expect(hubs.length).toBeGreaterThan(0);

      // 验证按连接数排序
      for (let i = 1; i < hubs.length; i++) {
        const current = hubs[i] as GraphNode & { connectionCount: number };
        const previous = hubs[i - 1] as GraphNode & { connectionCount: number };
        expect(current.connectionCount).toBeLessThanOrEqual(previous.connectionCount);
      }
    });
  });

  describe('Graph Analysis Operations', () => {
    it('should get all tag nodes', async () => {
      const tagNodes = await graphService.getAllTagNodes();

      expect(Array.isArray(tagNodes)).toBe(true);
      expect(tagNodes.length).toBeGreaterThan(0);
      expect(tagNodes.every(node => node.type === 'tag')).toBe(true);
      expect(tagNodes.every(node => node.label.startsWith('#'))).toBe(true);

    });

    it('should get all file nodes', async () => {
      const fileNodes = await graphService.getAllFileNodes();

      expect(Array.isArray(fileNodes)).toBe(true);
      expect(fileNodes.length).toBeGreaterThan(0);
      expect(fileNodes.every(node => node.type === 'file')).toBe(true);

    });

    it('should get orphaned nodes', async () => {
      const orphanedNodes = await graphService.getOrphanedNodes();

      expect(Array.isArray(orphanedNodes)).toBe(true);
    });

    it('should analyze node connectivity', async () => {
      const node = await graphService.findNode('Welcome');
      expect(node).not.toBeNull();

      const connectivity = await graphService.analyzeNodeConnectivity(node!.id);

      expect(connectivity).toBeDefined();
      expect(typeof connectivity.inDegree).toBe('number');
      expect(typeof connectivity.outDegree).toBe('number');
      expect(typeof connectivity.totalDegree).toBe('number');
      expect(Array.isArray(connectivity.connectedTags)).toBe(true);
      expect(Array.isArray(connectivity.connectedFiles)).toBe(true);

      expect(connectivity.totalDegree).toBe(connectivity.inDegree + connectivity.outDegree);
      expect(connectivity.totalDegree).toBeGreaterThan(0);

    });
  });

  describe('Cache Management', () => {
    it('should refresh cache', async () => {
      await graphService.refreshCache();

      expect(mockMetadataService.refreshCache).toHaveBeenCalled();
    });

    it('should get cache stats', async () => {
      vi.mocked(mockMetadataService.getCacheStats).mockResolvedValue({
        vaultId: 'Demo',
        fileCount: 4
      });

      const stats = await graphService.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats.vaultId).toBe('Demo');
      expect(stats.totalNodes).toBeDefined();
      expect(stats.totalEdges).toBeDefined();
      expect(stats.totalTags).toBeDefined();
      expect(stats.metadataStats).toBeDefined();

    });
  });

  describe('Vault Switching', () => {
    it('should switch vault', () => {
      graphService.switchVault('Publish');

      const vault = graphService.getCurrentVault();
      expect(vault.id).toBe('Publish');
      expect(mockMetadataService.switchVault).toHaveBeenCalledWith('Publish');
    });

    it('should get current vault info', () => {
      const vault = graphService.getCurrentVault();

      expect(vault).toBeDefined();
      expect(vault.id).toBe('Demo');
      expect(vault.path).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle search with empty results', async () => {
      const node = await graphService.findNode('NonExistentNode');
      expect(node).toBeNull();

      const neighbors = await graphService.getNodeNeighbors('non-existent-id');
      expect(neighbors).toEqual([]);

      const path = await graphService.getPathBetweenNodes('id1', 'id2');
      expect(path).toEqual([]);
    });

    it('should handle graph operations on empty data', async () => {
      vi.mocked(mockMetadataService.getMetadata).mockResolvedValue([]);

      const tagNodes = await graphService.getAllTagNodes();
      expect(tagNodes).toEqual([]);

      const fileNodes = await graphService.getAllFileNodes();
      expect(fileNodes).toEqual([]);

      const orphanedNodes = await graphService.getOrphanedNodes();
      expect(orphanedNodes).toEqual([]);

      const hubs = await graphService.getMostConnectedNodes();
      expect(hubs).toEqual([]);
    });
  });
});