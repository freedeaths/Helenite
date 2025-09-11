/**
 * GraphService - 知识图谱服务
 * 
 * 基于 MetadataService 构建知识图谱，提供高效的图谱操作
 * 复刻 LocalGraphAPI 的逻辑，但作为独立的服务层
 * 
 * 架构设计：GraphService 通过 CacheManager 实现透明缓存
 */

import { VaultPaths, createVaultConfig } from '../config/vaultConfig.js';
import type { 
  IGraphService,
  GraphNode,
  GraphEdge,
  GraphData,
  GraphStats,
  GraphOptions,
  LocalGraphOptions
} from './interfaces/IGraphService.js';
import type { IMetadataService, MetadataArray, Metadata } from './interfaces/IMetadataService.js';

// ===============================
// GraphService 实现
// ===============================

export class GraphService implements IGraphService {
  private vaultConfig: VaultPaths;
  private metadataService: IMetadataService;

  constructor(metadataService: IMetadataService, vaultId?: string) {
    this.vaultConfig = createVaultConfig(vaultId || 'Demo');
    this.metadataService = metadataService;
  }

  // ===============================
  // 核心图谱操作
  // ===============================

  /**
   * 获取全局知识图谱
   * 复刻 LocalGraphAPI.getGlobalGraph 的核心逻辑
   */
  async getGlobalGraph(options: GraphOptions = {}): Promise<GraphData> {
    try {
      console.log('🔄 Loading global graph data from metadata...');
      const metadata = await this.metadataService.getMetadata();
      
      if (!metadata || metadata.length === 0) {
        return { nodes: [], edges: [] };
      }

      return this.buildGraphFromMetadata(metadata, options);
    } catch (error) {
      console.error('❌ Failed to build global graph:', error);
      return { nodes: [], edges: [] };
    }
  }

  /**
   * 获取局部图谱（以指定文件为中心）
   * 复刻 LocalGraphAPI.getLocalGraph 的逻辑
   */
  async getLocalGraph(filePath: string, options: LocalGraphOptions = {}): Promise<GraphData> {
    const globalGraph = await this.getGlobalGraph(options);
    const depth = options.depth || 1;
    
    // 解码 URL 编码的文件路径
    const decodedFilePath = decodeURIComponent(filePath);
    const normalizedPath = this.removeExtension(decodedFilePath);
    const fileName = normalizedPath.split('/').pop() || normalizedPath;
    
    console.log('🔍 Looking for center node:', { filePath, decodedFilePath, normalizedPath, fileName });
    
    // Find the center node - try multiple matching strategies
    const centerNode = globalGraph.nodes.find(node => 
      node.title === normalizedPath ||           // 完整路径匹配
      node.title === fileName ||                 // 文件名匹配
      node.label === fileName ||                 // 标签匹配
      node.title === decodedFilePath ||          // 解码后的原始路径匹配
      node.title === this.removeExtension(decodedFilePath) // 解码后去扩展名匹配
    );
    
    if (!centerNode) {
      console.warn('❌ Center node not found for:', filePath);
      return { nodes: [], edges: [] };
    }
    
    console.log('✅ Found center node:', centerNode);

    // Collect connected nodes within specified depth using BFS
    const connectedNodeIds = new Set<string>([centerNode.id]);
    const relevantEdges: GraphEdge[] = [];

    let currentLevel = [centerNode.id];
    for (let d = 0; d < depth; d++) {
      const nextLevel: string[] = [];
      
      for (const nodeId of currentLevel) {
        for (const edge of globalGraph.edges) {
          if (edge.from === nodeId && !connectedNodeIds.has(edge.to)) {
            connectedNodeIds.add(edge.to);
            nextLevel.push(edge.to);
            relevantEdges.push(edge);
          } else if (edge.to === nodeId && !connectedNodeIds.has(edge.from)) {
            connectedNodeIds.add(edge.from);
            nextLevel.push(edge.from);
            relevantEdges.push(edge);
          } else if (connectedNodeIds.has(edge.from) && connectedNodeIds.has(edge.to)) {
            // Edge between already included nodes
            if (!relevantEdges.some(e => 
              (e.from === edge.from && e.to === edge.to) ||
              (e.from === edge.to && e.to === edge.from)
            )) {
              relevantEdges.push(edge);
            }
          }
        }
      }
      
      currentLevel = nextLevel;
    }

    // Filter nodes and edges
    const localNodes = globalGraph.nodes.filter(node => connectedNodeIds.has(node.id));
    
    console.log(`📊 Local graph: ${localNodes.length} nodes, ${relevantEdges.length} edges`);
    return { nodes: localNodes, edges: relevantEdges };
  }

  /**
   * 根据标签过滤图谱
   * 复刻 LocalGraphAPI.filterByTag 的逻辑
   */
  async filterByTag(tag: string, options: GraphOptions = {}): Promise<GraphData> {
    const globalGraph = await this.getGlobalGraph(options);
    const tagLabel = tag.startsWith('#') ? tag : '#' + tag;
    
    // Find the tag node
    const tagNode = globalGraph.nodes.find(node => node.label === tagLabel);
    if (!tagNode) {
      console.warn('❌ Tag node not found:', tagLabel);
      return { nodes: [], edges: [] };
    }

    // Find all nodes connected to this tag
    const connectedNodeIds = new Set<string>([tagNode.id]);
    const relevantEdges: GraphEdge[] = [];

    // Add all nodes connected to the tag
    for (const edge of globalGraph.edges) {
      if (edge.from === tagNode.id) {
        connectedNodeIds.add(edge.to);
        relevantEdges.push(edge);
      } else if (edge.to === tagNode.id) {
        connectedNodeIds.add(edge.from);
        relevantEdges.push(edge);
      }
    }

    // Include edges between connected file nodes
    for (const edge of globalGraph.edges) {
      if (connectedNodeIds.has(edge.from) && connectedNodeIds.has(edge.to)) {
        const sourceNode = globalGraph.nodes.find(n => n.id === edge.from);
        const targetNode = globalGraph.nodes.find(n => n.id === edge.to);
        
        // Only include if both are file nodes (not tags)
        if (sourceNode?.type !== 'tag' && targetNode?.type !== 'tag') {
          if (!relevantEdges.some(e => 
            (e.from === edge.from && e.to === edge.to) ||
            (e.from === edge.to && e.to === edge.from)
          )) {
            relevantEdges.push(edge);
          }
        }
      }
    }

    const filteredNodes = globalGraph.nodes.filter(node => connectedNodeIds.has(node.id));
    
    console.log(`📊 Tag filtered graph: ${filteredNodes.length} nodes, ${relevantEdges.length} edges`);
    return { nodes: filteredNodes, edges: relevantEdges };
  }

  /**
   * 获取图谱统计信息
   * 复刻 LocalGraphAPI.getGraphStats 的逻辑
   */
  async getGraphStats(): Promise<GraphStats> {
    const graph = await this.getGlobalGraph();
    
    const totalNodes = graph.nodes.length;
    const totalEdges = graph.edges.length;
    const totalTags = graph.nodes.filter(node => node.type === 'tag').length;
    
    // Calculate orphaned nodes (nodes with no connections)
    const connectedNodeIds = new Set<string>();
    for (const edge of graph.edges) {
      connectedNodeIds.add(edge.from);
      connectedNodeIds.add(edge.to);
    }
    const orphanedNodes = totalNodes - connectedNodeIds.size;
    
    // Calculate average connections
    const averageConnections = totalNodes > 0 ? (totalEdges * 2) / totalNodes : 0;
    
    return {
      totalNodes,
      totalEdges,
      totalTags,
      orphanedNodes,
      averageConnections: Number(averageConnections.toFixed(2))
    };
  }

  // ===============================
  // 图谱查询操作
  // ===============================

  /**
   * 查找节点
   */
  async findNode(identifier: string): Promise<GraphNode | null> {
    const graph = await this.getGlobalGraph();
    
    return graph.nodes.find(node =>
      node.id === identifier ||
      node.label === identifier ||
      node.title === identifier ||
      node.title === this.removeExtension(identifier)
    ) || null;
  }

  /**
   * 获取节点的邻居
   */
  async getNodeNeighbors(nodeId: string, depth: number = 1): Promise<GraphNode[]> {
    const graph = await this.getGlobalGraph();
    const visited = new Set<string>([nodeId]);
    const neighbors: GraphNode[] = [];

    let currentLevel = [nodeId];
    for (let d = 0; d < depth; d++) {
      const nextLevel: string[] = [];
      
      for (const currentNodeId of currentLevel) {
        for (const edge of graph.edges) {
          let neighborId: string | null = null;
          
          if (edge.from === currentNodeId && !visited.has(edge.to)) {
            neighborId = edge.to;
          } else if (edge.to === currentNodeId && !visited.has(edge.from)) {
            neighborId = edge.from;
          }
          
          if (neighborId) {
            visited.add(neighborId);
            nextLevel.push(neighborId);
            
            const neighborNode = graph.nodes.find(n => n.id === neighborId);
            if (neighborNode) {
              neighbors.push(neighborNode);
            }
          }
        }
      }
      
      currentLevel = nextLevel;
    }

    return neighbors;
  }

  /**
   * 获取两个节点之间的路径（使用 BFS）
   */
  async getPathBetweenNodes(fromId: string, toId: string): Promise<GraphNode[]> {
    const graph = await this.getGlobalGraph();
    
    if (fromId === toId) {
      const node = graph.nodes.find(n => n.id === fromId);
      return node ? [node] : [];
    }

    // BFS to find shortest path
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: fromId, path: [fromId] }];
    const visited = new Set<string>([fromId]);

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      
      // Find neighbors
      for (const edge of graph.edges) {
        let neighborId: string | null = null;
        
        if (edge.from === nodeId) {
          neighborId = edge.to;
        } else if (edge.to === nodeId) {
          neighborId = edge.from;
        }
        
        if (neighborId && !visited.has(neighborId)) {
          const newPath = [...path, neighborId];
          
          if (neighborId === toId) {
            // Found path, convert IDs to nodes
            return newPath.map(id => graph.nodes.find(n => n.id === id)!).filter(Boolean);
          }
          
          visited.add(neighborId);
          queue.push({ nodeId: neighborId, path: newPath });
        }
      }
    }

    return []; // No path found
  }

  /**
   * 获取最连接的节点（Hub 节点）
   */
  async getMostConnectedNodes(limit: number = 10): Promise<GraphNode[]> {
    const graph = await this.getGlobalGraph();
    
    // Calculate connection count for each node
    const connectionCounts = new Map<string, number>();
    
    for (const edge of graph.edges) {
      connectionCounts.set(edge.from, (connectionCounts.get(edge.from) || 0) + 1);
      connectionCounts.set(edge.to, (connectionCounts.get(edge.to) || 0) + 1);
    }

    // Sort nodes by connection count
    const sortedNodes = graph.nodes
      .map(node => ({
        ...node,
        connectionCount: connectionCounts.get(node.id) || 0
      }))
      .sort((a, b) => b.connectionCount - a.connectionCount)
      .slice(0, limit);

    return sortedNodes;
  }

  // ===============================
  // 图谱分析操作
  // ===============================

  /**
   * 获取所有标签节点
   */
  async getAllTagNodes(): Promise<GraphNode[]> {
    const graph = await this.getGlobalGraph();
    return graph.nodes.filter(node => node.type === 'tag');
  }

  /**
   * 获取所有文件节点
   */
  async getAllFileNodes(): Promise<GraphNode[]> {
    const graph = await this.getGlobalGraph();
    return graph.nodes.filter(node => node.type === 'file');
  }

  /**
   * 获取孤立节点（无连接的节点）
   */
  async getOrphanedNodes(): Promise<GraphNode[]> {
    const graph = await this.getGlobalGraph();
    
    const connectedNodeIds = new Set<string>();
    for (const edge of graph.edges) {
      connectedNodeIds.add(edge.from);
      connectedNodeIds.add(edge.to);
    }

    return graph.nodes.filter(node => !connectedNodeIds.has(node.id));
  }

  /**
   * 分析节点连接度
   */
  async analyzeNodeConnectivity(nodeId: string): Promise<{
    inDegree: number;
    outDegree: number;
    totalDegree: number;
    connectedTags: string[];
    connectedFiles: string[];
  }> {
    const graph = await this.getGlobalGraph();
    
    let inDegree = 0;
    let outDegree = 0;
    const connectedTags: string[] = [];
    const connectedFiles: string[] = [];

    for (const edge of graph.edges) {
      if (edge.from === nodeId) {
        outDegree++;
        const targetNode = graph.nodes.find(n => n.id === edge.to);
        if (targetNode) {
          if (targetNode.type === 'tag') {
            connectedTags.push(targetNode.label);
          } else {
            connectedFiles.push(targetNode.label);
          }
        }
      }
      
      if (edge.to === nodeId) {
        inDegree++;
        const sourceNode = graph.nodes.find(n => n.id === edge.from);
        if (sourceNode) {
          if (sourceNode.type === 'tag') {
            connectedTags.push(sourceNode.label);
          } else {
            connectedFiles.push(sourceNode.label);
          }
        }
      }
    }

    return {
      inDegree,
      outDegree,
      totalDegree: inDegree + outDegree,
      connectedTags: [...new Set(connectedTags)],
      connectedFiles: [...new Set(connectedFiles)]
    };
  }

  // ===============================
  // 缓存管理
  // ===============================

  /**
   * 刷新图谱缓存
   */
  async refreshCache(): Promise<void> {
    // 通过 MetadataService 刷新底层缓存
    await this.metadataService.refreshCache();
    console.log('🔄 Graph cache refreshed');
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<Record<string, unknown>> {
    const metadataStats = await this.metadataService.getCacheStats();
    const graphStats = await this.getGraphStats();

    return {
      vaultId: this.vaultConfig.id,
      ...graphStats,
      metadataStats
    };
  }

  // ===============================
  // Vault 管理
  // ===============================

  /**
   * 切换到不同的 vault
   */
  switchVault(vaultId: string): void {
    this.vaultConfig = createVaultConfig(vaultId);
    this.metadataService.switchVault(vaultId);
    console.log(`🔄 GraphService switched to vault: ${vaultId}`);
  }

  /**
   * 获取当前 vault 信息
   */
  getCurrentVault(): { id: string; path: string } {
    return {
      id: this.vaultConfig.id,
      path: this.vaultConfig.path
    };
  }

  // ===============================
  // 私有方法 - 复刻 LocalGraphAPI 逻辑
  // ===============================

  /**
   * 从 metadata 构建图谱
   * 复刻 LocalGraphAPI.getGlobalGraph 的核心逻辑
   */
  private buildGraphFromMetadata(metadata: MetadataArray, options: GraphOptions = {}): GraphData {
    const graphNodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];
    let nodeID = 0;

    console.log(`🔄 Building graph from ${metadata.length} metadata entries...`);

    // Step 1: Create file nodes and tag nodes (复刻 PHP 逻辑第一部分)
    for (const node of metadata) {
      if (!node.relativePath) continue;
      
      const nodePath = this.removeExtension(node.relativePath);
      
      // 验证节点存在（在服务层中，所有 metadata 中的文件都认为是存在的）
      if (this.checkNodeExists(nodePath, metadata)) {
        const thisNodeID = nodeID.toString();
        
        // Add file node to graph
        graphNodes.push({
          id: thisNodeID,
          label: node.fileName || nodePath.split('/').pop() || nodePath,
          title: nodePath,
          type: 'file',
          path: node.relativePath  // 添加完整路径（包含 .md）用于导航
        });
        nodeID += 1;

        // Create tag nodes if they don't already exist (复刻 PHP 标签节点创建逻辑)
        if (options.includeTags !== false && node.tags && node.tags.length > 0) {
          for (const tag of node.tags) {
            const tagLabel = '#' + tag;
            
            // Check if tag node already exists
            let tagID = '';
            let tagExists = false;
            
            for (const graphNode of graphNodes) {
              if (graphNode.label === tagLabel) {
                tagID = graphNode.id;
                tagExists = true;
                break;
              }
            }

            // Create new tag node if it doesn't exist
            if (!tagExists) {
              tagID = nodeID.toString();
              graphNodes.push({
                id: tagID,
                label: tagLabel,
                title: tagLabel,
                type: 'tag'
                // 标签节点不需要 path 字段
              });
              nodeID += 1;
            }

            // Create edge between file and tag
            graphEdges.push({ from: thisNodeID, to: tagID, type: 'tag' });
          }
        }
      }
    }

    // Step 2: Create links between nodes (复刻 PHP 逻辑第二部分)
    for (const node of metadata) {
      if (!node.relativePath) continue;
      
      const nodePath = this.removeExtension(node.relativePath);
      
      if (this.checkNodeExists(nodePath, metadata)) {
        // Process outbound links (当前文件引用的其他文件)
        if (node.links && node.links.length > 0) {
          for (const link of node.links) {
            // 检查 relativePath 是否存在
            if (!link.relativePath) {
              continue;
            }
            
            // 过滤掉 Attachments 目录下的文件链接
            if (link.relativePath.includes('Attachments/')) {
              continue;
            }
            
            const source = nodePath;
            const target = this.removeExtension(link.relativePath);

            if (source && target && this.checkNodeExists(target, metadata)) {
              this.addLinkEdge(graphNodes, graphEdges, source, target);
            }
          }
        }

        // Process backlinks (引用当前文件的其他文件)
        if (node.backlinks && node.backlinks.length > 0) {
          for (const backlink of node.backlinks) {
            // 检查 relativePath 是否存在
            if (!backlink.relativePath) {
              continue;
            }
            
            // 过滤掉 Attachments 目录下的文件链接
            if (backlink.relativePath.includes('Attachments/')) {
              continue;
            }
            
            const target = nodePath;  // 当前文件作为目标
            const source = this.removeExtension(backlink.relativePath);  // 引用方作为源

            if (source && target && this.checkNodeExists(source, metadata)) {
              this.addLinkEdge(graphNodes, graphEdges, source, target);
            }
          }
        }
      }
    }

    // Step 3: Calculate node sizes based on connections (复刻 PHP 连接计数逻辑)
    for (const edge of graphEdges) {
      for (const node of graphNodes) {
        if (edge.from === node.id || edge.to === node.id) {
          node.size = (node.size || 0) + 1;
        }
      }
    }

    // Apply additional filters
    let filteredNodes = graphNodes;
    let filteredEdges = graphEdges;

    // Remove orphaned nodes if requested
    if (options.includeOrphanedNodes === false) {
      const connectedNodeIds = new Set<string>();
      for (const edge of graphEdges) {
        connectedNodeIds.add(edge.from);
        connectedNodeIds.add(edge.to);
      }
      filteredNodes = graphNodes.filter(node => connectedNodeIds.has(node.id));
    }

    // Apply max nodes limit
    if (options.maxNodes && filteredNodes.length > options.maxNodes) {
      // Keep most connected nodes
      const sortedNodes = filteredNodes
        .sort((a, b) => (b.size || 0) - (a.size || 0))
        .slice(0, options.maxNodes);
      
      const keptNodeIds = new Set(sortedNodes.map(n => n.id));
      filteredNodes = sortedNodes;
      filteredEdges = graphEdges.filter(edge => 
        keptNodeIds.has(edge.from) && keptNodeIds.has(edge.to)
      );
    }

    console.log(`✅ Generated graph with ${filteredNodes.length} nodes and ${filteredEdges.length} edges`);
    return { nodes: filteredNodes, edges: filteredEdges };
  }

  /**
   * 添加链接边（避免重复）
   */
  private addLinkEdge(graphNodes: GraphNode[], graphEdges: GraphEdge[], source: string, target: string): void {
    // Find source and target node IDs
    let sourceId = '';
    let targetId = '';

    for (const graphNode of graphNodes) {
      if (graphNode.title === source) {
        sourceId = graphNode.id;
      }
      if (graphNode.title === target) {
        targetId = graphNode.id;
      }
    }

    // Check if edge already exists (双向检查)
    if (sourceId && targetId) {
      const edgeExists = graphEdges.some(edge => 
        (edge.from === sourceId && edge.to === targetId) ||
        (edge.from === targetId && edge.to === sourceId)
      );

      if (!edgeExists) {
        graphEdges.push({ from: sourceId, to: targetId, type: 'link' });
      }
    }
  }

  /**
   * 移除文件扩展名（复刻 PHP removeExtension 函数）
   */
  private removeExtension(path: string): string {
    if (path.endsWith('.md')) {
      return path.slice(0, -3);
    }
    return path;
  }

  /**
   * 检查节点是否存在（复刻 PHP checkArray 函数逻辑）
   * 在服务层中，简化为检查 metadata 中是否存在该文件
   */
  private checkNodeExists(nodePath: string, metadata: MetadataArray): boolean {
    return metadata.some(item => 
      item.relativePath && this.removeExtension(item.relativePath) === nodePath
    );
  }
}

// ===============================
// 全局实例管理（可以通过 CacheManager 创建缓存代理）
// ===============================

let _globalGraphService: GraphService | null = null;

/**
 * 获取全局图谱服务实例
 * 注意：需要先设置 MetadataService
 */
export function getGraphService(): GraphService | null {
  return _globalGraphService;
}

/**
 * 初始化全局图谱服务
 */
export function initializeGraphService(metadataService: IMetadataService, vaultId?: string): GraphService {
  _globalGraphService = new GraphService(metadataService, vaultId);
  console.log(`✅ GraphService initialized for vault: ${vaultId || 'Demo'}`);
  return _globalGraphService;
}

/**
 * 销毁全局图谱服务
 */
export function disposeGraphService(): void {
  _globalGraphService = null;
  console.log('🗑️ GraphService disposed');
}