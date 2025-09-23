/**
 * StorageService 类型定义
 * 专为 Helenite 只读文件系统设计
 */

// 文件内容类型 - 浏览器环境兼容版本
export type FileContent = string | ArrayBuffer | Uint8Array;

export interface StorageConfig {
  /** 基础路径，支持本地静态服务路径或CDN路径 */
  basePath: string;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 缓存控制 */
  cache?: boolean;
  /** 认证头 (用于私有存储) */
  headers?: Record<string, string>;
}

// 添加运行时导出以确保 Vite 能正确处理
export const FileContentType = {
  isString: (content: FileContent): content is string => typeof content === 'string',
  isArrayBuffer: (content: FileContent): content is ArrayBuffer => content instanceof ArrayBuffer,
  isUint8Array: (content: FileContent): content is Uint8Array => content instanceof Uint8Array
};

/** 读取结果，包含文件信息和内容 */
export interface ReadResult {
  /** 文件信息 */
  info: FileInfo;
  /** 文件内容 */
  content: FileContent;
}

export interface FileInfo {
  /** 文件路径 */
  path: string;
  /** 文件大小 (字节) */
  size: number;
  /** MIME 类型 */
  mimeType: string;
  /** 最后修改时间 */
  lastModified: Date;
  /** 是否存在 */
  exists: boolean;
  /** ETag 哈希值 (用于缓存验证) */
  etag?: string;
}

export interface ReadOptions {
  /** 是否返回二进制数据 */
  binary?: boolean;
  /** 缓存控制 */
  cache?: boolean;
  /** 编码格式，仅文本模式使用，默认 'utf-8' */
  encoding?: 'utf-8' | 'utf8' | 'ascii' | 'base64' | 'hex' | 'binary' | 'latin1';
}

/** 支持的存储类型 */
export enum StorageType {
  /** 本地静态文件服务 (如 Vite dev server, nginx) */
  LOCAL_STATIC = 'local_static',
  /** CDN 存储 */
  CDN = 'cdn', 
  /** 远程 HTTP 存储 */
  REMOTE_HTTP = 'remote_http'
}

/** 存储错误类型 */
export enum StorageErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_PATH = 'INVALID_PATH'
}

export class StorageError extends Error {
  constructor(
    message: string,
    public type: StorageErrorType,
    public path?: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}