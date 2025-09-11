/**
 * GraphService 接口定义
 *
 * 基于 MetadataService 构建知识图谱，提供图谱相关的操作
 * 复刻 LocalGraphAPI 的功能，但作为独立的服务层
 */

// ===============================
// 图谱数据结构
// ===============================

/**
 * 图谱节点
 */
export interface GraphNode {
  /** 节点唯一标识符 */
  id: string;
  /** 节点显示标签 */
  label: string;
  /** 节点标题（用于匹配和查找） */
  title: string;
  /** 节点类型 */
  type: 'file' | 'tag';
  /** 节点连接数（影响显示大小） */
  size?: number;
  /** 文件路径（仅文件节点有） */
  path?: string;
}

/**
 * 图谱边
 */
export interface GraphEdge {
  /** 源节点ID */
  from: string;
  /** 目标节点ID */
  to: string;
  /** 边类型 */
  type: 'link' | 'tag';
}

/**
 * 图谱数据
 */
export interface GraphData {
  /** 节点列表 */
  nodes: GraphNode[];
  /** 边列表 */
  edges: GraphEdge[];
}

/**
 * 图谱统计信息
 */
export interface GraphStats {
  /** 总节点数 */
  totalNodes: number;
  /** 总边数 */
  totalEdges: number;
  /** 标签节点数 */
  totalTags: number;
  /** 孤立节点数（无连接） */
  orphanedNodes: number;
  /** 平均连接数 */
  averageConnections: number;
}

/**
 * 图谱选项
 */
export interface GraphOptions {
  /** 是否包含标签节点 */
  includeTags?: boolean;
  /** 是否包含孤立节点 */
  includeOrphanedNodes?: boolean;
  /** 最大节点数限制 */
  maxNodes?: number;
  /** 文件类型过滤 */
  fileTypeFilter?: string[];
}

/**
 * 局部图谱选项
 */
export interface LocalGraphOptions extends GraphOptions {
  /** 深度级别（默认1） */
  depth?: number;
}

// ===============================
// GraphService 接口
// ===============================

/**
 * GraphService 接口
 * 提供完整的知识图谱操作功能
 */
export interface IGraphService {
  // ===============================
  // 核心图谱操作
  // ===============================
  
  /**
   * 获取全局知识图谱
   * 复刻 LocalGraphAPI.getGlobalGraph 的逻辑
   */
  getGlobalGraph(options?: GraphOptions): Promise<GraphData>;
  
  /**
   * 获取局部图谱（以指定文件为中心）
   * 复刻 LocalGraphAPI.getLocalGraph 的逻辑
   */
  getLocalGraph(filePath: string, options?: LocalGraphOptions): Promise<GraphData>;
  
  /**
   * 根据标签过滤图谱
   * 复刻 LocalGraphAPI.filterByTag 的逻辑
   */
  filterByTag(tag: string, options?: GraphOptions): Promise<GraphData>;
  
  /**
   * 获取图谱统计信息
   * 复刻 LocalGraphAPI.getGraphStats 的逻辑
   */
  getGraphStats(): Promise<GraphStats>;

  // ===============================
  // 图谱查询操作
  // ===============================
  
  /**
   * 查找节点
   */
  findNode(identifier: string): Promise<GraphNode | null>;
  
  /**
   * 获取节点的邻居
   */
  getNodeNeighbors(nodeId: string, depth?: number): Promise<GraphNode[]>;
  
  /**
   * 获取两个节点之间的路径
   */
  getPathBetweenNodes(fromId: string, toId: string): Promise<GraphNode[]>;
  
  /**
   * 获取最连接的节点（Hub 节点）
   */
  getMostConnectedNodes(limit?: number): Promise<GraphNode[]>;

  // ===============================
  // 图谱分析操作
  // ===============================
  
  /**
   * 获取所有标签节点
   */
  getAllTagNodes(): Promise<GraphNode[]>;
  
  /**
   * 获取所有文件节点
   */
  getAllFileNodes(): Promise<GraphNode[]>;
  
  /**
   * 获取孤立节点（无连接的节点）
   */
  getOrphanedNodes(): Promise<GraphNode[]>;
  
  /**
   * 分析节点连接度
   */
  analyzeNodeConnectivity(nodeId: string): Promise<{
    inDegree: number;
    outDegree: number;
    totalDegree: number;
    connectedTags: string[];
    connectedFiles: string[];
  }>;

  // ===============================
  // 缓存管理
  // ===============================
  
  /**
   * 刷新图谱缓存
   */
  refreshCache(): Promise<void>;
  
  /**
   * 获取缓存统计
   */
  getCacheStats(): Promise<Record<string, unknown>>;

  // ===============================
  // Vault 管理
  // ===============================
  
  /**
   * 切换到不同的 vault
   */
  switchVault(vaultId: string): void;
  
  /**
   * 获取当前 vault 信息
   */
  getCurrentVault(): { id: string; path: string };
}