/**
 * GraphService 集成测试
 *
 * 使用真实的 metadata.json 数据进行测试
 */

// 设置 IndexedDB 模拟
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { GraphService } from '../GraphService.js';
import { MetadataService } from '../MetadataService.js';
import { CacheManager } from '../CacheManager.js';
import type { IGraphService, GraphNode } from '../interfaces/IGraphService.js';
import fetch from 'node-fetch';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('GraphService Integration Tests', () => {
  let metadataService: MetadataService;
  let graphService: GraphService;
  let cacheManager: CacheManager;
  let cachedGraphService: IGraphService;
  let viteProcess: ChildProcess | null = null;
  const serverUrl = 'http://localhost:5173'; // Vite 默认开发服务器端口

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
        throw new Error('❌ 启动开发服务器超时');
      }
    }
  });

  afterAll(async () => {
    if (viteProcess) {
      viteProcess.kill('SIGTERM');

      // 等待进程关闭
      await new Promise<void>((resolve) => {
        viteProcess!.on('exit', () => {
          resolve();
        });

        // 强制关闭超时
        setTimeout(() => {
          if (viteProcess && !viteProcess.killed) {
            viteProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    }
  });

  beforeEach(async () => {
    // 创建服务实例链，传入完整的服务器URL作为baseUrl
    metadataService = new MetadataService('Demo', serverUrl);
    graphService = new GraphService(metadataService, 'Demo');
    cacheManager = new CacheManager();
    cachedGraphService = cacheManager.createCachedGraphService(graphService);
  });

  afterEach(() => {
    if (cacheManager && typeof cacheManager.dispose === 'function') {
      cacheManager.dispose();
    }
  });

  describe('Real Data Graph Construction', () => {
    it('should build global graph from real metadata', async () => {
      // 调试：检查 GraphService 使用的数据源
      await metadataService.getMetadata();

      const graph = await graphService.getGlobalGraph();

      expect(graph).toBeTruthy();
      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      // 验证文件节点和标签节点
      const fileNodes = graph.nodes.filter(node => node.type === 'file');
      const tagNodes = graph.nodes.filter(node => node.type === 'tag');

      expect(fileNodes.length).toBe(12); // 基于实际 vault 文件数量
      expect(tagNodes.length).toBeGreaterThan(0); // 应该有标签

      // 验证边类型
      const linkEdges = graph.edges.filter(edge => edge.type === 'link');
      const tagEdges = graph.edges.filter(edge => edge.type === 'tag');

      expect(linkEdges.length).toBeGreaterThan(0);
      expect(tagEdges.length).toBeGreaterThan(0);

    });

    it('should find specific files in graph nodes', async () => {
      const graph = await graphService.getGlobalGraph();

      // 验证特定文件节点存在
      const fileNodes = graph.nodes.filter(node => node.type === 'file');
      const fileNames = fileNodes.map(node => node.label);

      expect(fileNames).toContain('services-architecture');
      expect(fileNames).toContain('Welcome');
      expect(fileNames).toContain('Abilities');
      expect(fileNames).toContain('README');

    });

    it('should find specific tag nodes in graph', async () => {
      const graph = await graphService.getGlobalGraph();

      // 验证特定标签节点存在
      const tagNodes = graph.nodes.filter(node => node.type === 'tag');
      const tagLabels = tagNodes.map(node => node.label);

      expect(tagLabels).toContain('#helenite');
      expect(tagLabels).toContain('#test');
      expect(tagLabels).toContain('#react');
      expect(tagLabels).toContain('#markdown');

    });

    it('should verify link relationships in real graph', async () => {
      const graph = await graphService.getGlobalGraph();

      // 验证链接边存在
      const linkEdges = graph.edges.filter(edge => edge.type === 'link');
      expect(linkEdges.length).toBeGreaterThan(0);

      // 查找特定的链接关系（Abilities 链接到 Welcome）
      const abilitiesNode = graph.nodes.find(node =>
        node.type === 'file' && node.label === 'Abilities'
      );
      const welcomeNode = graph.nodes.find(node =>
        node.type === 'file' && node.label === 'Welcome'
      );

      expect(abilitiesNode).toBeDefined();
      expect(welcomeNode).toBeDefined();

      const linkExists = linkEdges.some(edge =>
        (edge.from === abilitiesNode!.id && edge.to === welcomeNode!.id) ||
        (edge.from === welcomeNode!.id && edge.to === abilitiesNode!.id)
      );

      expect(linkExists).toBe(true);

    });
  });

  describe('Local Graph Operations', () => {
    it('should build local graph for specific file', async () => {
      const localGraph = await graphService.getLocalGraph('Welcome.md');

      expect(localGraph.nodes.length).toBeGreaterThan(0);
      expect(localGraph.edges.length).toBeGreaterThan(0);

      // 验证中心节点存在
      const centerNode = localGraph.nodes.find(node =>
        node.title === 'Welcome' || node.label === 'Welcome'
      );
      expect(centerNode).toBeDefined();
      expect(centerNode?.type).toBe('file');

    });

    it('should build local graph for nested file path', async () => {
      const localGraph = await graphService.getLocalGraph('FolderA/SubFolder/Abilities.md');

      expect(localGraph.nodes.length).toBeGreaterThan(0);

      // 验证中心节点存在
      const centerNode = localGraph.nodes.find(node =>
        node.title.includes('Abilities') || node.label === 'Abilities'
      );
      expect(centerNode).toBeDefined();

    });

    it('should respect depth parameter in local graph', async () => {
      const depth1Graph = await graphService.getLocalGraph('Welcome.md', { depth: 1 });
      const depth2Graph = await graphService.getLocalGraph('Welcome.md', { depth: 2 });

      // 深度2应该包含相同或更多节点
      expect(depth2Graph.nodes.length).toBeGreaterThanOrEqual(depth1Graph.nodes.length);

    });

    it('should handle URL-encoded paths correctly', async () => {
      const originalPath = 'FolderA/SubFolder/Abilities.md';
      const encodedPath = encodeURIComponent(originalPath);

      const graph1 = await graphService.getLocalGraph(originalPath);
      const graph2 = await graphService.getLocalGraph(encodedPath);

      // 两种路径应该产生相同的结果
      expect(graph1.nodes.length).toBe(graph2.nodes.length);
      expect(graph1.edges.length).toBe(graph2.edges.length);

    });
  });

  describe('Tag Filtering Operations', () => {
    it('should filter graph by existing tag', async () => {
      const tagGraph = await graphService.filterByTag('helenite');

      expect(tagGraph.nodes.length).toBeGreaterThan(0);
      expect(tagGraph.edges.length).toBeGreaterThan(0);

      // 验证标签节点存在
      const tagNode = tagGraph.nodes.find(node => node.label === '#helenite');
      expect(tagNode).toBeDefined();
      expect(tagNode?.type).toBe('tag');

      // 验证相关文件节点存在
      const servicesArchNode = tagGraph.nodes.find(node =>
        node.type === 'file' && node.label === 'services-architecture'
      );
      expect(servicesArchNode).toBeDefined();

    });

    it('should filter graph by tag with # prefix', async () => {
      const tagGraph = await graphService.filterByTag('#react');

      expect(tagGraph.nodes.length).toBeGreaterThan(0);

      // 验证标签节点存在
      const tagNode = tagGraph.nodes.find(node => node.label === '#react');
      expect(tagNode).toBeDefined();

    });

    it('should return empty graph for non-existent tag', async () => {
      const tagGraph = await graphService.filterByTag('nonexistent');

      expect(tagGraph.nodes).toEqual([]);
      expect(tagGraph.edges).toEqual([]);
    });
  });

  describe('Graph Statistics', () => {
    it('should calculate accurate graph statistics', async () => {
      const stats = await graphService.getGraphStats();

      expect(stats).toBeDefined();
      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.totalEdges).toBeGreaterThan(0);
      expect(stats.totalTags).toBeGreaterThan(0);
      expect(stats.averageConnections).toBeGreaterThan(0);
      expect(typeof stats.orphanedNodes).toBe('number');

      // 验证统计的合理性
      expect(stats.totalNodes).toBeGreaterThan(stats.totalTags);
      expect(stats.averageConnections).toBe(Number(((stats.totalEdges * 2) / stats.totalNodes).toFixed(2)));

    });
  });

  describe('Node Query Operations', () => {
    it('should find nodes by different identifiers', async () => {
      // 通过文件名查找
      const node1 = await graphService.findNode('Welcome');
      expect(node1).not.toBeNull();
      expect(node1?.type).toBe('file');

      // 通过完整路径查找
      const node2 = await graphService.findNode('Welcome.md');
      expect(node2).not.toBeNull();

      // 应该返回同一个节点
      expect(node1?.id).toBe(node2?.id);

    });

    it('should get node neighbors correctly', async () => {
      const welcomeNode = await graphService.findNode('Welcome');
      expect(welcomeNode).not.toBeNull();

      const neighbors = await graphService.getNodeNeighbors(welcomeNode!.id);

      expect(Array.isArray(neighbors)).toBe(true);
      expect(neighbors.length).toBeGreaterThan(0);

    });

    it('should find path between connected nodes', async () => {
      const welcomeNode = await graphService.findNode('Welcome');
      const abilitiesNode = await graphService.findNode('Abilities');

      expect(welcomeNode).not.toBeNull();
      expect(abilitiesNode).not.toBeNull();

      const path = await graphService.getPathBetweenNodes(welcomeNode!.id, abilitiesNode!.id);

      expect(Array.isArray(path)).toBe(true);
      if (path.length > 0) {
        expect(path[0].id).toBe(welcomeNode!.id);
        expect(path[path.length - 1].id).toBe(abilitiesNode!.id);
      }
    });

    it('should get most connected nodes', async () => {
      const hubs = await graphService.getMostConnectedNodes(5);

      expect(Array.isArray(hubs)).toBe(true);
      expect(hubs.length).toBeGreaterThan(0);
      expect(hubs.length).toBeLessThanOrEqual(5);

      // 验证按连接数排序
      for (let i = 1; i < hubs.length; i++) {
        const current = hubs[i] as GraphNode & { connectionCount: number };
        const previous = hubs[i - 1] as GraphNode & { connectionCount: number };
        expect(current.connectionCount).toBeLessThanOrEqual(previous.connectionCount);
      }
    });
  });

  describe('Graph Analysis Operations', () => {
    it('should get all tag and file nodes separately', async () => {
      const tagNodes = await graphService.getAllTagNodes();
      const fileNodes = await graphService.getAllFileNodes();

      expect(Array.isArray(tagNodes)).toBe(true);
      expect(Array.isArray(fileNodes)).toBe(true);
      expect(tagNodes.length).toBeGreaterThan(0);
      expect(fileNodes.length).toBeGreaterThan(0);

      // 验证节点类型
      expect(tagNodes.every(node => node.type === 'tag')).toBe(true);
      expect(fileNodes.every(node => node.type === 'file')).toBe(true);

    });

    it('should analyze node connectivity', async () => {
      const welcomeNode = await graphService.findNode('Welcome');
      expect(welcomeNode).not.toBeNull();

      const connectivity = await graphService.analyzeNodeConnectivity(welcomeNode!.id);

      expect(connectivity).toBeDefined();
      expect(typeof connectivity.inDegree).toBe('number');
      expect(typeof connectivity.outDegree).toBe('number');
      expect(connectivity.totalDegree).toBe(connectivity.inDegree + connectivity.outDegree);
      expect(Array.isArray(connectivity.connectedTags)).toBe(true);
      expect(Array.isArray(connectivity.connectedFiles)).toBe(true);

    });

    it('should identify orphaned nodes if any', async () => {
      const orphanedNodes = await graphService.getOrphanedNodes();

      expect(Array.isArray(orphanedNodes)).toBe(true);
    });
  });

  describe('Caching Integration', () => {
    it('should demonstrate caching performance with real graph data', async () => {

      // 第一次调用 - 从网络加载
      const graph1 = await cachedGraphService.getGlobalGraph();

      // 第二次调用 - 从缓存加载
      const graph2 = await cachedGraphService.getGlobalGraph();

      // 验证数据一致性
      expect(graph1.nodes.length).toBe(graph2.nodes.length);
      expect(graph1.edges.length).toBe(graph2.edges.length);

      // 获取缓存统计
      const stats = await cacheManager.getStatistics();
      expect(stats.totalEntries).toBeGreaterThan(0);

    });

    it('should cache local graph results', async () => {
      // 测试局部图谱的缓存
      const localGraph1 = await cachedGraphService.getLocalGraph('Welcome.md');

      const localGraph2 = await cachedGraphService.getLocalGraph('Welcome.md');

      expect(localGraph1.nodes.length).toBe(localGraph2.nodes.length);
      expect(localGraph1.edges.length).toBe(localGraph2.edges.length);

    });

    it('should cache graph statistics and queries', async () => {
      // 测试统计信息的缓存
      const stats1 = await cachedGraphService.getGraphStats();

      const stats2 = await cachedGraphService.getGraphStats();

      expect(stats1).toEqual(stats2);

      // 测试节点查询的缓存
      const node1 = await cachedGraphService.findNode('Welcome');

      const node2 = await cachedGraphService.findNode('Welcome');

      expect(node1).toEqual(node2);

    });
  });

  describe('Graph Operations Integration', () => {
    it('should perform complex graph analysis workflow', async () => {

      // 1. 获取全局统计
      await graphService.getGraphStats();

      // 2. 找到最连接的节点
      const hubs = await graphService.getMostConnectedNodes(3);

      // 3. 分析最连接节点的连通性
      if (hubs.length > 0) {
        await graphService.analyzeNodeConnectivity(hubs[0].id);

        // 4. 获取该节点的邻居
        await graphService.getNodeNeighbors(hubs[0].id, 2);
      }

      // 5. 获取所有标签并过滤其中一个
      const allTags = await graphService.getAllTagNodes();
      if (allTags.length > 0) {
        const tagName = allTags[0].label.replace('#', '');
        await graphService.filterByTag(tagName);
      }

    });

    it('should handle mixed graph operations efficiently', async () => {
      // 并行执行多个图谱操作
      const [globalGraph, tagNodes, fileNodes, stats] = await Promise.all([
        graphService.getGlobalGraph(),
        graphService.getAllTagNodes(),
        graphService.getAllFileNodes(),
        graphService.getGraphStats()
      ]);

      // 验证并行操作结果一致性
      expect(globalGraph.nodes.filter(n => n.type === 'tag').length).toBe(tagNodes.length);
      expect(globalGraph.nodes.filter(n => n.type === 'file').length).toBe(fileNodes.length);
      expect(globalGraph.nodes.length).toBe(stats.totalNodes);
      expect(globalGraph.edges.length).toBe(stats.totalEdges);

    });
  });

  describe('Error Handling with Real Data', () => {
    it('should handle non-existent file paths gracefully', async () => {
      const localGraph = await graphService.getLocalGraph('non-existent-file.md');
      expect(localGraph.nodes).toEqual([]);
      expect(localGraph.edges).toEqual([]);
    });

    it('should handle non-existent node queries gracefully', async () => {
      const node = await graphService.findNode('non-existent-node');
      expect(node).toBeNull();

      const neighbors = await graphService.getNodeNeighbors('non-existent-id');
      expect(neighbors).toEqual([]);

      const path = await graphService.getPathBetweenNodes('id1', 'id2');
      expect(path).toEqual([]);
    });

    it('should handle invalid connectivity analysis gracefully', async () => {
      const connectivity = await graphService.analyzeNodeConnectivity('non-existent-id');

      expect(connectivity.inDegree).toBe(0);
      expect(connectivity.outDegree).toBe(0);
      expect(connectivity.totalDegree).toBe(0);
      expect(connectivity.connectedTags).toEqual([]);
      expect(connectivity.connectedFiles).toEqual([]);
    });
  });
});