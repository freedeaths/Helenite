/**
 * StorageService 接口定义
 *
 * 只读存储抽象层，支持本地静态服务、CDN、远程 HTTP 存储
 * 包含文件类型识别、MIME 检测等功能
 */

import type { FileInfo, ReadOptions, StorageConfig, ReadResult, FileContent } from '../types/StorageTypes.js';

export interface IStorageService {
  /** 服务配置 */
  readonly config: StorageConfig;

  // ===============================
  // 核心文件操作 (只读)
  // ===============================
  
  /**
   * 读取文件内容
   * @param path 文件路径
   * @param options 读取选项
   * @returns 文件内容 (文本或二进制)
   */
  readFile(path: string, options?: ReadOptions): Promise<FileContent>;

  /**
   * 读取文件并返回完整信息
   * @param path 文件路径
   * @param options 读取选项
   * @returns 文件信息和内容
   */
  readFileWithInfo(path: string, options?: ReadOptions): Promise<ReadResult>;

  /**
   * 检查文件是否存在
   * @param path 文件路径
   * @returns 是否存在
   */
  exists(path: string): Promise<boolean>;

  /**
   * 获取文件信息
   * @param path 文件路径
   * @returns 文件信息
   */
  getFileInfo(path: string): Promise<FileInfo>;

  /**
   * 列出目录内容 (仅本地静态服务支持，浏览器环境返回空数组)
   * @param dirPath 目录路径
   * @param recursive 是否递归
   * @returns 文件路径列表
   */
  listFiles(dirPath: string, recursive?: boolean): Promise<string[]>;

  // ===============================
  // 路径和 URL 处理
  // ===============================

  /**
   * 规范化路径
   * @param path 原始路径
   * @returns 规范化后的路径
   */
  normalizePath(path: string): string;

  /**
   * 解析为完整路径或 URL
   * @param path 相对路径
   * @returns 完整路径或 URL
   */
  resolvePath(path: string): string;

  /**
   * 检查路径是否有效
   * @param path 文件路径
   * @returns 是否有效
   */
  isValidPath(path: string): boolean;

  // ===============================
  // MIME 类型检测 (原 AttachmentService 功能)
  // ===============================

  /**
   * 检测文件 MIME 类型
   * @param path 文件路径
   * @returns MIME 类型
   */
  getMimeType(path: string): string;

  /**
   * 检查是否为图片文件
   * @param path 文件路径
   * @returns 是否为图片
   */
  isImageFile(path: string): boolean;

  /**
   * 检查是否为轨迹文件 (GPX/KML)
   * @param path 文件路径  
   * @returns 是否为轨迹文件
   */
  isTrackFile(path: string): boolean;

  /**
   * 检查是否为 Markdown 文件
   * @param path 文件路径
   * @returns 是否为 Markdown
   */
  isMarkdownFile(path: string): boolean;

  // ===============================
  // 缓存和性能
  // ===============================

  /**
   * 清除缓存
   * @param path 可选的特定文件路径
   */
  clearCache(path?: string): Promise<void>;

  /**
   * 预热缓存 (预加载常用文件)
   * @param paths 文件路径列表
   */
  preloadFiles(paths: string[]): Promise<void>;

  // ===============================
  // 服务管理
  // ===============================

  /**
   * 初始化服务
   */
  initialize(): Promise<void>;

  /**
   * 销毁服务，清理资源
   */
  dispose(): Promise<void>;

  /**
   * 健康检查
   * @returns 服务是否健康
   */
  healthCheck(): Promise<boolean>;
}