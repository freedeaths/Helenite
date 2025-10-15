/**
 * IVaultService - Vault 统一协调器接口
 *
 * 作为整个 Vault 系统的统一入口，协调所有底层服务
 * 提供高层次的业务接口，隐藏底层服务的复杂性
 */

import type { FileTree } from './IFileTreeService.js';
import type { GraphNode, GraphEdge } from './IGraphService.js';
import type { TagData } from './ITagService.js';
import type { FootprintsData } from './IFootprintsService.js';

// ===============================
// 核心类型定义
// ===============================

export interface VaultInfo {
  /** Vault 名称 */
  name: string;
  /** Vault 路径 */
  path: string;
  /** 是否有 metadata.json 支持 */
  hasMetadata: boolean;
  /** 支持的功能特性 */
  supportedFeatures: {
    graphView: boolean;
    tagSearch: boolean;
    advancedSearch: boolean;
    fileLinks: boolean;
    footprints: boolean;
  };
}

export interface VaultStatistics {
  /** 总文档数 */
  totalDocuments: number;
  /** 总文件夹数 */
  totalFolders: number;
  /** 总标签数 */
  totalTags: number;
  /** 总链接数 */
  totalLinks: number;
  /** 图谱节点数 */
  graphNodes: number;
  /** 图谱边数 */
  graphEdges: number;
  /** 轨迹文件数 */
  trackFiles: number;
}

export interface HealthStatus {
  /** 整体健康状态 */
  status: 'healthy' | 'warning' | 'error';
  /** 各服务状态 */
  services: {
    storage: 'healthy' | 'warning' | 'error';
    metadata: 'healthy' | 'warning' | 'error';
    cache: 'healthy' | 'warning' | 'error';
    search: 'healthy' | 'warning' | 'error';
    graph: 'healthy' | 'warning' | 'error';
  };
  /** 状态详情 */
  details: Array<{
    service: string;
    status: 'healthy' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }>;
}

export interface DocumentRef {
  /** 文档路径 */
  path: string;
  /** 文档标题 */
  title?: string;
  /** 文档类型 */
  type: 'markdown' | 'canvas' | 'image' | 'attachment' | 'other';
  /** 最后修改时间 */
  lastModified?: Date;
  /** 文件大小（字节） */
  size?: number;
  /** 文档标签 */
  tags?: string[];
  /** 文档别名 */
  aliases?: string[];
  /** 前置属性 */
  frontmatter?: Record<string, unknown>;
  /** 标题列表 */
  headings?: Array<{ level: number; text: string; id: string }>;
  /** 链接列表 */
  links?: Array<{ path: string; text: string }>;
  /** 反向链接 */
  backlinks?: Array<{
    sourcePath: string;
    sourceTitle?: string;
    context: string;
    line: number;
  }>;
}

// ===============================
// 搜索相关类型
// ===============================

export interface UnifiedSearchOptions {
  /** 搜索类型 */
  type?: 'content' | 'tag' | 'filename' | 'all';
  /** 搜索范围（文件夹路径） */
  scope?: string;
  /** 文件类型过滤 */
  fileTypes?: string[];
  /** 是否包含附件 */
  includeAttachments?: boolean;
  /** 最大结果数 */
  limit?: number;
  /** 结果排序方式 */
  sortBy?: 'relevance' | 'modified' | 'created' | 'alphabetical';
}

export interface UnifiedSearchResult {
  /** 匹配的文档 */
  document: DocumentRef;
  /** 匹配详情 */
  matches: Array<{
    type: 'content' | 'tag' | 'filename' | 'link';
    value: string;
    context?: string;
    line?: number;
    column?: number;
  }>;
  /** 相关性评分 */
  score: number;
}

// ===============================
// 图谱相关类型
// ===============================

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    lastUpdated: Date;
  };
}

export interface LocalGraphOptions {
  /** 中心节点路径 */
  centerPath: string;
  /** 搜索深度 */
  depth?: number;
  /** 包含的链接类型 */
  linkTypes?: ('outgoing' | 'incoming' | 'both')[];
  /** 是否包含标签节点 */
  includeTags?: boolean;
}

// ===============================
// 主接口定义
// ===============================

export interface IVaultService {
  // ===============================
  // 系统管理
  // ===============================

  /**
   * 获取 Vault 基本信息
   */
  getVaultInfo(): Promise<VaultInfo>;

  /**
   * 获取 Vault 统计信息
   */
  getVaultStatistics(): Promise<VaultStatistics>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<HealthStatus>;

  /**
   * 强制刷新所有缓存
   */
  forceRefresh(): Promise<void>;

  // ===============================
  // 文档管理
  // ===============================

  /**
   * 获取文档内容（已处理的 HTML）
   */
  getDocumentContent(path: string): Promise<string>;

  /**
   * 获取文档原始内容
   */
  getRawDocumentContent(path: string): Promise<string>;

  /**
   * 获取文档基本信息
   */
  getDocumentInfo(path: string): Promise<DocumentRef>;

  /**
   * 检查文档是否存在
   */
  documentExists(path: string): Promise<boolean>;

  // ===============================
  // 文件树浏览
  // ===============================

  /**
   * 获取完整文件树
   */
  getFileTree(): Promise<FileTree[]>;

  /**
   * 获取指定文件夹的子项
   */
  getFolderContents(folderPath: string): Promise<FileTree[]>;

  /**
   * 搜索文件名
   */
  searchFiles(query: string): Promise<DocumentRef[]>;

  // ===============================
  // 统一搜索
  // ===============================

  /**
   * 统一搜索接口
   */
  search(query: string, options?: UnifiedSearchOptions): Promise<UnifiedSearchResult[]>;

  /**
   * 按标签搜索
   */
  searchByTag(tag: string): Promise<UnifiedSearchResult[]>;

  /**
   * 获取所有标签
   */
  getAllTags(): Promise<TagData[]>;

  /**
   * 获取标签统计
   */
  getTagStatistics(): Promise<Array<{ tag: string; count: number; files: string[] }>>;

  // ===============================
  // 知识图谱
  // ===============================

  /**
   * 获取全局知识图谱
   */
  getGlobalGraph(): Promise<GraphData>;

  /**
   * 获取局部知识图谱
   */
  getLocalGraph(options: LocalGraphOptions): Promise<GraphData>;

  /**
   * 分析节点连接性
   */
  analyzeNodeConnectivity(nodePath: string): Promise<{
    incomingLinks: number;
    outgoingLinks: number;
    connectedNodes: string[];
    centrality: number;
  }>;

  // ===============================
  // 足迹和地理数据
  // ===============================

  /**
   * 处理轨迹文件
   */
  processTrackFile(filePath: string): Promise<FootprintsData>;

  /**
   * 批量处理轨迹文件
   */
  processMultipleTrackFiles(filePaths: string[]): Promise<FootprintsData>;

  /**
   * 获取所有轨迹文件
   */
  getTrackFiles(): Promise<string[]>;

  // ===============================
  // 内容分析
  // ===============================

  /**
   * 获取文档的反向链接
   */
  getBacklinks(filePath: string): Promise<
    Array<{
      sourcePath: string;
      sourceTitle?: string;
      context: string;
      line: number;
    }>
  >;

  /**
   * 获取文档的前向链接
   */
  getOutgoingLinks(filePath: string): Promise<
    Array<{
      targetPath: string;
      targetTitle?: string;
      linkText: string;
      line: number;
    }>
  >;

  /**
   * 分析文档关键词
   */
  extractKeywords(filePath: string): Promise<
    Array<{
      word: string;
      frequency: number;
      weight: number;
    }>
  >;

  // ===============================
  // 高级功能
  // ===============================

  /**
   * 相似文档推荐
   */
  getSimilarDocuments(
    filePath: string,
    limit?: number
  ): Promise<
    Array<{
      path: string;
      title?: string;
      similarity: number;
      reasons: string[];
    }>
  >;

  /**
   * 内容摘要生成
   */
  generateSummary(
    filePath: string,
    maxLength?: number
  ): Promise<{
    summary: string;
    keyPoints: string[];
    wordCount: number;
  }>;

  /**
   * 检测孤立文档
   */
  findOrphanedDocuments(): Promise<DocumentRef[]>;

  /**
   * 检测断链
   */
  findBrokenLinks(): Promise<
    Array<{
      sourcePath: string;
      brokenLink: string;
      line: number;
      suggestions?: string[];
    }>
  >;
}
