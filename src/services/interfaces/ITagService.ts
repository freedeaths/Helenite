/**
 * TagService 接口定义
 *
 * 基于 LocalTagAPI 功能，但优化为服务层架构
 * 全局标签从 tags.json 读取，局部标签从 metadata 计算
 */

// ===============================
// 标签数据结构
// ===============================

/**
 * 标签数据
 */
export interface TagData {
  /** 标签名称（包含 # 前缀） */
  name: string;
  /** 使用该标签的文件数量 */
  count: number;
  /** 包含该标签的文件路径列表 */
  files: string[];
}

/**
 * 标签统计信息
 */
export interface TagStats {
  /** 总标签数 */
  totalTags: number;
  /** 总文件数（有标签的） */
  totalFiles: number;
  /** 平均每个文件的标签数 */
  averageTagsPerFile: number;
  /** 平均每个标签的文件数 */
  averageFilesPerTag: number;
  /** 最常用的标签 */
  mostUsedTag?: TagData;
  /** 使用频率分布 */
  frequencyDistribution: {
    /** 使用次数区间 */
    range: string;
    /** 该区间的标签数量 */
    count: number;
  }[];
}

/**
 * 标签搜索选项
 */
export interface TagSearchOptions {
  /** 是否区分大小写 */
  caseSensitive?: boolean;
  /** 最大返回结果数 */
  limit?: number;
  /** 排序方式 */
  sortBy?: 'name' | 'count' | 'frequency';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 标签过滤选项
 */
export interface TagFilterOptions {
  /** 最小使用次数过滤 */
  minCount?: number;
  /** 最大使用次数过滤 */
  maxCount?: number;
  /** 文件路径前缀过滤 */
  pathPrefix?: string;
  /** 排除的标签列表 */
  excludeTags?: string[];
}

// ===============================
// ITagService 接口
// ===============================

/**
 * TagService 接口
 * 提供完整的标签管理功能
 */
export interface ITagService {
  // ===============================
  // 核心标签操作
  // ===============================
  
  /**
   * 获取所有标签（全局）
   * 从 tags.json 直接读取，性能优化
   */
  getAllTags(options?: TagSearchOptions): Promise<TagData[]>;
  
  /**
   * 获取文件的所有标签
   * 从 metadata 读取指定文件的标签
   */
  getFileTags(filePath: string): Promise<string[]>;
  
  /**
   * 根据标签获取文件列表
   * 支持全局和局部查找
   */
  getFilesByTag(tag: string): Promise<string[]>;
  
  /**
   * 获取标签统计信息
   */
  getTagStats(): Promise<TagStats>;

  // ===============================
  // 标签查询操作
  // ===============================
  
  /**
   * 搜索标签
   * 支持模糊匹配和各种排序选项
   */
  searchTags(query: string, options?: TagSearchOptions): Promise<TagData[]>;
  
  /**
   * 过滤标签
   * 按使用频率、路径等条件过滤
   */
  filterTags(options: TagFilterOptions): Promise<TagData[]>;
  
  /**
   * 获取标签详情
   * 获取单个标签的完整信息
   */
  getTagDetails(tag: string): Promise<TagData | null>;
  
  /**
   * 检查标签是否存在
   */
  hasTag(tag: string): Promise<boolean>;

  // ===============================
  // 标签分析操作
  // ===============================
  
  /**
   * 获取最常用的标签
   */
  getMostUsedTags(limit?: number): Promise<TagData[]>;
  
  /**
   * 获取最少用的标签
   */
  getLeastUsedTags(limit?: number): Promise<TagData[]>;
  
  /**
   * 获取孤立标签（只被一个文件使用）
   */
  getOrphanTags(): Promise<TagData[]>;
  
  /**
   * 获取相关标签
   * 基于共同出现的文件计算标签相关性
   */
  getRelatedTags(tag: string, limit?: number): Promise<TagData[]>;
  
  /**
   * 分析文件的标签使用模式
   */
  analyzeFileTagPattern(filePath: string): Promise<{
    totalTags: number;
    uniqueTags: string[];
    commonTags: string[];
    rareTags: string[];
  }>;

  // ===============================
  // 标签关系分析
  // ===============================
  
  /**
   * 获取标签共现关系
   * 分析哪些标签经常一起出现
   */
  getTagCooccurrence(tag: string): Promise<{
    tag: string;
    cooccurredTags: Array<{
      tag: string;
      count: number;
      files: string[];
    }>;
  }>;
  
  /**
   * 获取文件夹的标签分布
   */
  getFolderTagDistribution(folderPath?: string): Promise<{
    folder: string;
    totalFiles: number;
    tagDistribution: TagData[];
  }>;
  
  /**
   * 建议标签
   * 基于文件内容和现有标签模式建议新标签
   */
  suggestTags(filePath: string, limit?: number): Promise<string[]>;

  // ===============================
  // 缓存管理
  // ===============================
  
  /**
   * 刷新标签缓存
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