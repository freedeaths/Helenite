/**
 * MetadataService 接口定义
 *
 * 基于 Obsidian metadata-extractor 插件的接口规范
 */

// ===============================
// metadata-extractor 插件接口定义
// ===============================

/**
 * 元数据数组 - metadata-extractor 插件导出格式
 * JSON export: Metadata[]
 */
export type MetadataArray = Metadata[];

/**
 * 单个文件的元数据 - 基于 metadata-extractor 插件接口
 */
export interface Metadata {
  /** 文件名（不含扩展名） */
  fileName: string;
  /** 文件相对路径 */
  relativePath: string;
  /** 标签列表 */
  tags?: string[];
  /** 标题列表 */
  headings?: HeadingData[];
  /** 别名列表 */
  aliases?: string[];
  /** 出链列表 */
  links?: Link[];
  /** 入链列表 */
  backlinks?: Backlink[];
  /** 前言数据 */
  frontmatter?: FrontMatter;
}

/**
 * 标题数据
 */
export interface HeadingData {
  /** 标题文本 */
  heading: string;
  /** 标题级别 1-6 */
  level: number;
}

/**
 * 出链数据
 */
export interface Link {
  /** 原始链接 */
  link: string;
  /** 相对路径 */
  relativePath?: string;
  /** 清理后的链接 */
  cleanLink?: string;
  /** 显示文本 */
  displayText?: string;
}

/**
 * 入链数据
 */
export interface Backlink {
  /** 源文件名 */
  fileName: string;
  /** 链接 */
  link: string;
  /** 源文件相对路径 */
  relativePath: string;
  /** 清理后的链接 */
  cleanLink?: string;
  /** 显示文本 */
  displayText?: string;
}

/**
 * 前言数据
 */
export interface FrontMatter {
  /** 文件唯一标识 */
  uuid?: string;
  /** 是否发布 */
  publish?: boolean;
  /** 创建日期 */
  created?: string;
  /** 修改日期 */
  modified?: string;
  /** 作者 */
  author?: string;
  /** 描述 */
  description?: string;
  /** CSS 类 */
  cssclass?: string;
  /** 其他常见字段 */
  [key: string]: string | number | boolean | string[] | undefined;
}


// ===============================
// MetadataService 接口
// ===============================

/**
 * 元数据服务接口
 */
export interface IMetadataService {
  // ===============================
  // 核心数据加载
  // ===============================

  /**
   * 获取元数据数组
   */
  getMetadata(): Promise<MetadataArray | null>;

  // ===============================
  // 基础查询方法
  // ===============================

  /**
   * 获取单个文件的元数据
   */
  getFileMetadata(filePath: string): Promise<Metadata | null>;

  /**
   * 获取所有文件的元数据
   */
  getAllFiles(): Promise<MetadataArray>;

  /**
   * 根据文件名查找文件（不含扩展名）
   */
  getFileByName(fileName: string): Promise<Metadata | null>;

  /**
   * 获取具有指定标签的所有文件
   */
  getFilesByTag(tag: string): Promise<MetadataArray>;

  /**
   * 获取所有唯一标签
   */
  getAllTags(): Promise<string[]>;


  /**
   * 获取文件的出链
   */
  getFileLinks(filePath: string): Promise<Link[]>;

  /**
   * 获取文件的入链
   */
  getFileBacklinks(filePath: string): Promise<Backlink[]>;

  /**
   * 获取文件的标题结构
   */
  getFileHeadings(filePath: string): Promise<HeadingData[]>;

  /**
   * 获取文件的别名
   */
  getFileAliases(filePath: string): Promise<string[]>;

  /**
   * 获取文件的前言数据
   */
  getFileFrontMatter(filePath: string): Promise<FrontMatter | null>;

  // ===============================
  // 实用查询方法
  // ===============================

  /**
   * 检查文件是否存在于元数据中
   */
  hasFile(filePath: string): Promise<boolean>;

  /**
   * 获取链接到指定文件的所有文件
   */
  getFilesLinkingTo(targetPath: string): Promise<MetadataArray>;

  /**
   * 搜索包含指定文本的文件（基于元数据）
   */
  searchInMetadata(query: string): Promise<MetadataArray>;

  // ===============================
  // 缓存管理
  // ===============================

  /**
   * 刷新缓存
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