import type { IGraphAPI, GraphData, GraphNode, GraphEdge, GraphStats } from '../../interfaces/IGraphAPI';
import type { FileMetadata } from '../../interfaces/IFileTreeAPI';
import { VAULT_PATH } from '../../../config/vaultConfig';
import { fetchVault } from '../../../utils/fetchWithAuth';

/**
 * 本地图谱 API 实现
 * 复刻 PHP getfullGraph() 函数逻辑
 * 基于 metadata.json 构建知识图谱
 */
export class LocalGraphAPI implements IGraphAPI {
  // baseUrl 参数保留用于接口兼容性，但现在使用 VAULT_PATH
  constructor(baseUrl: string = '/vaults/Demo') {
    // 使用 VAULT_PATH 而不是 baseUrl
    console.log(`LocalGraphAPI initialized with baseUrl: ${baseUrl}, using VAULT_PATH: ${VAULT_PATH}`);
  }

  /**
   * 获取全局知识图谱
   * 复刻 PHP getfullGraph() 的核心逻辑
   */
  async getGlobalGraph(): Promise<GraphData> {
    try {
      console.log('🔄 Loading global graph data from metadata...');
      const metadata = await this.getMetadata();
      
      const graphNodes: GraphNode[] = [];
      const graphEdges: GraphEdge[] = [];
      let nodeID = 0;

      // Step 1: Create file nodes and tag nodes (复刻 PHP 逻辑第一部分)
      for (const node of metadata) {
        const nodePath = this.removeExtension(node.relativePath);
        
        // 模拟 checkArray() 验证 - 在前端环境中，所有 metadata 中的文件都认为是存在的
        if (this.checkNodeExists(nodePath, metadata)) {
          const thisNodeID = nodeID.toString();
          
          // Add file node to graph
          graphNodes.push({
            id: thisNodeID,
            label: node.fileName,
            title: nodePath,
            type: 'file',
            path: node.relativePath  // 添加完整路径（包含 .md）用于导航
          });
          nodeID += 1;

          // Create tag nodes if they don't already exist (复刻 PHP 标签节点创建逻辑)
          if (node.tags && node.tags.length > 0) {
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
        const nodePath = this.removeExtension(node.relativePath);
        
        if (this.checkNodeExists(nodePath, metadata)) {
          // Process outbound links (当前文件引用的其他文件)
          if (node.links && node.links.length > 0) {
            for (const link of node.links) {
              // 过滤掉 Attachments 目录下的文件链接
              if (link.relativePath.includes('Attachments/')) {
                continue;
              }
              
              const source = nodePath;
              const target = this.removeExtension(link.relativePath);

              if (source && target && this.checkNodeExists(target, metadata)) {
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
            }
          }

          // Process backlinks (引用当前文件的其他文件)
          if (node.backlinks && node.backlinks.length > 0) {
            for (const backlink of node.backlinks) {
              // 过滤掉 Attachments 目录下的文件链接
              if (backlink.relativePath.includes('Attachments/')) {
                continue;
              }
              
              const target = nodePath;  // 当前文件作为目标
              const source = this.removeExtension(backlink.relativePath);  // 引用方作为源

              if (source && target && this.checkNodeExists(source, metadata)) {
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

      console.log(`✅ Generated graph with ${graphNodes.length} nodes and ${graphEdges.length} edges`);
      return { nodes: graphNodes, edges: graphEdges };
      
    } catch (error) {
      console.error('Failed to load global graph:', error);
      throw new Error('Unable to load graph data. Please check if metadata.json exists.');
    }
  }

  /**
   * 获取局部图谱（以指定文件为中心）
   */
  async getLocalGraph(filePath: string, depth: number = 1): Promise<GraphData> {
    const globalGraph = await this.getGlobalGraph();
    
    // 解码 URL 编码的文件路径
    const decodedFilePath = decodeURIComponent(filePath);
    const normalizedPath = this.removeExtension(decodedFilePath);
    const fileName = normalizedPath.split('/').pop() || normalizedPath;
    
    console.log('🔍 Looking for node with decoded path:', normalizedPath, 'or fileName:', fileName);
    console.log('🔍 Original path:', filePath, '-> decoded:', decodedFilePath);
    console.log('🔍 Available nodes:', globalGraph.nodes.map(n => ({ id: n.id, label: n.label, title: n.title })));
    
    // Find the center node - try multiple matching strategies with decoded paths
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

    // Collect connected nodes within specified depth
    const connectedNodeIds = new Set<string>([centerNode.id]);
    const relevantEdges: GraphEdge[] = [];

    // BFS to find connected nodes within depth
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
    
    return { nodes: localNodes, edges: relevantEdges };
  }

  /**
   * 根据标签过滤图谱
   */
  async filterByTag(tag: string): Promise<GraphData> {
    const globalGraph = await this.getGlobalGraph();
    const tagLabel = tag.startsWith('#') ? tag : '#' + tag;
    
    // Find the tag node
    const tagNode = globalGraph.nodes.find(node => node.label === tagLabel);
    if (!tagNode) {
      return { nodes: [], edges: [] };
    }

    // Find all nodes connected to this tag
    const connectedNodeIds = new Set<string>([tagNode.id]);
    const relevantEdges: GraphEdge[] = [];

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
    
    return { nodes: filteredNodes, edges: relevantEdges };
  }

  /**
   * 获取图谱统计信息
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

  /**
   * 获取 metadata.json 数据
   */
  private async getMetadata(): Promise<FileMetadata[]> {
    const response = await fetchVault(`${VAULT_PATH}/metadata.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }
    return response.json();
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
   * 在前端环境中，简化为检查 metadata 中是否存在该文件
   */
  private checkNodeExists(nodePath: string, metadata: FileMetadata[]): boolean {
    return metadata.some(item => this.removeExtension(item.relativePath) === nodePath);
  }
}