/**
 * FrontMatterService 接口定义
 * 
 * 负责处理 Markdown 文件的 Front Matter 数据
 * - 基于 MetadataService 提供的元数据
 * - 支持 UUID 管理 (评论功能依赖)
 * - 提供 Front Matter 字段的 CRUD 操作
 * - 支持按字段查询和过滤
 */

import type { FrontMatter } from './IMetadataService.js';

// ===============================
// FrontMatter 查询选项
// ===============================

export interface FrontMatterQueryOptions {
  /** 是否包含发布的文件 */
  includePublished?: boolean;
  /** 是否包含未发布的文件 */
  includeUnpublished?: boolean;
  /** 作者过滤 */
  author?: string;
  /** 日期范围过滤 */
  dateRange?: {
    field: 'created' | 'modified';
    start?: Date;
    end?: Date;
  };
  /** CSS 类过滤 */
  cssClass?: string;
  /** 自定义字段过滤 */
  customFields?: Record<string, unknown>;
}

export interface FrontMatterStatistics {
  /** 总文件数 */
  totalFiles: number;
  /** 有 UUID 的文件数 */
  filesWithUuid: number;
  /** 已发布文件数 */
  publishedFiles: number;
  /** 未发布文件数 */
  unpublishedFiles: number;
  /** 常用作者列表 */
  topAuthors: Array<{ author: string; count: number }>;
  /** 常用 CSS 类 */
  topCssClasses: Array<{ cssClass: string; count: number }>;
  /** 自定义字段统计 */
  customFieldStats: Record<string, { count: number; uniqueValues: number }>;
}

// ===============================
// IFrontMatterService 接口
// ===============================

export interface IFrontMatterService {
  // ===============================
  // 核心数据获取
  // ===============================

  /**
   * 获取文件的 Front Matter 数据
   */
  getFrontMatter(filePath: string): Promise<FrontMatter | null>;

  /**
   * 获取所有文件的 Front Matter 数据
   */
  getAllFrontMatter(): Promise<Array<{ filePath: string; frontMatter: FrontMatter }>>;

  // ===============================
  // UUID 管理 (评论功能依赖)
  // ===============================

  /**
   * 获取文件的 UUID
   * @param filePath 文件路径
   * @returns UUID 或 null (如果文件没有 UUID)
   */
  getUuid(filePath: string): Promise<string | null>;

  /**
   * 根据 UUID 查找文件
   * @param uuid UUID 字符串
   * @returns 文件路径或 null
   */
  getFileByUuid(uuid: string): Promise<string | null>;

  /**
   * 获取所有有 UUID 的文件
   * @returns UUID 到文件路径的映射
   */
  getAllUuids(): Promise<Record<string, string>>;

  /**
   * 检查 UUID 是否存在
   */
  hasUuid(uuid: string): Promise<boolean>;

  // ===============================
  // Front Matter 字段查询
  // ===============================

  /**
   * 获取文件的发布状态
   */
  isPublished(filePath: string): Promise<boolean | null>;

  /**
   * 获取所有已发布的文件
   */
  getPublishedFiles(): Promise<string[]>;

  /**
   * 获取所有未发布的文件
   */
  getUnpublishedFiles(): Promise<string[]>;

  /**
   * 获取文件的作者
   */
  getAuthor(filePath: string): Promise<string | null>;

  /**
   * 根据作者查找文件
   */
  getFilesByAuthor(author: string): Promise<string[]>;

  /**
   * 获取所有唯一作者列表
   */
  getAllAuthors(): Promise<string[]>;

  /**
   * 获取文件的描述
   */
  getDescription(filePath: string): Promise<string | null>;

  /**
   * 获取文件的 CSS 类
   */
  getCssClass(filePath: string): Promise<string | null>;

  /**
   * 根据 CSS 类查找文件
   */
  getFilesByCssClass(cssClass: string): Promise<string[]>;

  /**
   * 获取文件的创建时间
   */
  getCreatedDate(filePath: string): Promise<Date | null>;

  /**
   * 获取文件的修改时间
   */
  getModifiedDate(filePath: string): Promise<Date | null>;

  // ===============================
  // 高级查询
  // ===============================

  /**
   * 根据查询选项过滤文件
   */
  queryFiles(options: FrontMatterQueryOptions): Promise<string[]>;

  /**
   * 搜索 Front Matter 字段
   */
  searchFrontMatter(query: string, fields?: string[]): Promise<Array<{
    filePath: string;
    matches: Array<{ field: string; value: unknown }>;
  }>>;

  /**
   * 获取自定义字段值
   */
  getCustomField(filePath: string, fieldName: string): Promise<unknown>;

  /**
   * 获取所有包含指定自定义字段的文件
   */
  getFilesByCustomField(fieldName: string, value?: unknown): Promise<string[]>;

  /**
   * 获取所有自定义字段名
   */
  getAllCustomFields(): Promise<string[]>;

  // ===============================
  // 统计和分析
  // ===============================

  /**
   * 获取 Front Matter 统计信息
   */
  getStatistics(): Promise<FrontMatterStatistics>;

  /**
   * 分析 Front Matter 使用模式
   */
  analyzeFrontMatterPatterns(): Promise<{
    commonFields: Array<{ field: string; usage: number }>;
    fieldValueDistribution: Record<string, Record<string, number>>;
    recommendedFields: string[];
  }>;

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