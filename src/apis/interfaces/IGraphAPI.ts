export interface GraphNode {
  id: number;
  label: string;
  title: string;
  group?: string; // 用于区分文件节点和标签节点
  value?: number; // 连接数，影响节点大小
}

export interface GraphEdge {
  from: number;
  to: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * 图谱 API 接口
 * 负责处理知识图谱相关的操作
 */
export interface IGraphAPI {
  /**
   * 获取全局知识图谱
   * @returns Promise<GraphData> 包含所有节点和边的图谱数据
   */
  getGlobalGraph(): Promise<GraphData>;
  
  /**
   * 获取以指定文件为中心的局部图谱
   * @param filePath 文件路径
   * @param depth 关联深度（默认为1）
   * @returns Promise<GraphData> 局部图谱数据
   */
  getLocalGraph(filePath: string, depth?: number): Promise<GraphData>;
  
  /**
   * 根据标签过滤图谱
   * @param tag 标签名
   * @returns Promise<GraphData> 包含指定标签的图谱数据
   */
  filterByTag(tag: string): Promise<GraphData>;
  
  /**
   * 获取图谱统计信息
   * @returns Promise<GraphStats> 图谱统计
   */
  getGraphStats(): Promise<GraphStats>;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  totalTags: number;
  orphanedNodes: number; // 孤立节点数
  averageConnections: number;
}