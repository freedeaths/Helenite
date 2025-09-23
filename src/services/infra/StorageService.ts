/**
 * StorageService 实现
 * 
 * 只读存储抽象层，支持本地静态服务、CDN、远程 HTTP 存储
 * 包含文件类型识别、MIME 检测等功能
 */

import type { IStorageService } from '../interfaces/IStorageService.js';
import type {
  FileContent,
  FileInfo,
  ReadOptions,
  StorageConfig,
  ReadResult
} from '../types/StorageTypes.js';
import {
  StorageError,
  StorageErrorType,
  StorageType
} from '../types/StorageTypes.js';

export class StorageService implements IStorageService {
  private _config: StorageConfig;
  private _storageType: StorageType;
  private _cache = new Map<string, { data: FileContent; timestamp: number; etag?: string }>();
  private _initialized = false;

  constructor(config: StorageConfig) {
    this._config = {
      timeout: 30000,
      cache: true,
      ...config
    };
    
    // 检测存储类型
    if (config.basePath.startsWith('http://') || config.basePath.startsWith('https://')) {
      this._storageType = config.basePath.includes('cdn') ? StorageType.CDN : StorageType.REMOTE_HTTP;
    } else {
      this._storageType = StorageType.LOCAL_STATIC;
    }
  }

  get config(): StorageConfig {
    return this._config;
  }

  // ===============================
  // 核心文件操作
  // ===============================

  async readFile(path: string, options: ReadOptions = {}): Promise<FileContent> {
    this._ensureInitialized();
    
    const normalizedPath = this.normalizePath(path);
    if (!this.isValidPath(normalizedPath)) {
      throw new StorageError(`Invalid path: ${path}`, StorageErrorType.INVALID_PATH, path);
    }

    // 检查缓存
    if (options.cache !== false && this._config.cache) {
      const cached = this._cache.get(normalizedPath);
      if (cached && Date.now() - cached.timestamp < 60000) { // 1分钟缓存
        return cached.data;
      }
    }

    try {
      let content: FileContent;
      
      if (this._storageType === StorageType.LOCAL_STATIC) {
        content = await this._readRemoteFile(normalizedPath, options); // 本地静态也通过HTTP访问
      } else {
        content = await this._readRemoteFile(normalizedPath, options);
      }

      // 缓存结果
      if (this._config.cache && options.cache !== false) {
        this._cache.set(normalizedPath, {
          data: content,
          timestamp: Date.now()
        });
      }

      return content;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        StorageErrorType.NETWORK_ERROR,
        path
      );
    }
  }

  async readFileWithInfo(path: string, options: ReadOptions = {}): Promise<ReadResult> {
    this._ensureInitialized();
    
    const [content, info] = await Promise.all([
      this.readFile(path, options),
      this.getFileInfo(path)
    ]);

    return {
      content,
      info
    };
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.getFileInfo(path);
      return true;
    } catch (error) {
      if (error instanceof StorageError && error.type === StorageErrorType.FILE_NOT_FOUND) {
        return false;
      }
      throw error;
    }
  }

  async getFileInfo(path: string): Promise<FileInfo> {
    this._ensureInitialized();
    
    const normalizedPath = this.normalizePath(path);
    const url = this.resolvePath(normalizedPath);

    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: this._config.headers,
        signal: AbortSignal.timeout(this._config.timeout!)
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new StorageError(`File not found: ${path}`, StorageErrorType.FILE_NOT_FOUND, path);
        }
        throw new StorageError(`HTTP ${response.status}: ${response.statusText}`, StorageErrorType.NETWORK_ERROR, path);
      }

      return {
        path: normalizedPath,
        size: parseInt(response.headers.get('content-length') || '0'),
        mimeType: response.headers.get('content-type') || this.getMimeType(path),
        lastModified: new Date(response.headers.get('last-modified') || Date.now()),
        exists: true,
        etag: response.headers.get('etag') || undefined
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        StorageErrorType.NETWORK_ERROR,
        path
      );
    }
  }

  async listFiles(dirPath: string, recursive = false): Promise<string[]> {
    if (this._storageType !== StorageType.LOCAL_STATIC) {
      throw new StorageError('Directory listing only supported for local static storage', StorageErrorType.PERMISSION_DENIED);
    }
    
    // 浏览器环境不支持目录列举，返回空数组
    // 实际应用中，可能需要通过预生成的文件索引来实现
    return [];
  }

  // ===============================
  // 路径和 URL 处理
  // ===============================

  normalizePath(path: string): string {
    // 移除开头的 /，统一使用相对路径
    const normalized = path.replace(/^\/+/, '');
    
    // 处理 . 和 .. 
    const parts = normalized.split('/').filter(part => part && part !== '.');
    const result: string[] = [];
    
    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else {
        result.push(part);
      }
    }
    
    return result.join('/');
  }

  resolvePath(path: string): string {
    const normalizedPath = this.normalizePath(path);
    const basePath = this._config.basePath.replace(/\/+$/, ''); // 移除尾部斜杠
    
    // URL编码路径中的空格等特殊字符
    const encodedPath = normalizedPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    
    return `${basePath}/${encodedPath}`;
  }

  isValidPath(path: string): boolean {
    if (!path || path.length === 0) return false;
    
    // 检查危险字符
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(path)) return false;
    
    // 检查路径遍历攻击
    if (path.includes('../') || path.includes('..\\')) return false;
    
    return true;
  }

  // ===============================
  // MIME 类型检测
  // ===============================

  getMimeType(path: string): string {
    const ext = path.toLowerCase().split('.').pop();
    
    const mimeTypes: Record<string, string> = {
      // 文档
      'md': 'text/markdown',
      'txt': 'text/plain',
      'json': 'application/json',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      
      // 图片
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      
      // 轨迹文件
      'gpx': 'application/gpx+xml',
      'kml': 'application/vnd.google-earth.kml+xml',
      
      // 其他
      'pdf': 'application/pdf',
      'zip': 'application/zip'
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  isImageFile(path: string): boolean {
    const mimeType = this.getMimeType(path);
    return mimeType.startsWith('image/');
  }

  isTrackFile(path: string): boolean {
    const ext = path.toLowerCase().split('.').pop();
    return ext === 'gpx' || ext === 'kml';
  }

  isMarkdownFile(path: string): boolean {
    const ext = path.toLowerCase().split('.').pop();
    return ext === 'md' || ext === 'markdown';
  }

  // ===============================
  // 缓存和性能
  // ===============================

  async clearCache(path?: string): Promise<void> {
    if (path) {
      const normalizedPath = this.normalizePath(path);
      this._cache.delete(normalizedPath);
    } else {
      this._cache.clear();
    }
  }

  async preloadFiles(paths: string[]): Promise<void> {
    const promises = paths.map(path => 
      this.readFile(path).catch(error => {
        console.warn(`Failed to preload file ${path}:`, error);
      })
    );
    
    await Promise.allSettled(promises);
  }

  // ===============================
  // 服务管理
  // ===============================

  async initialize(): Promise<void> {
    if (this._initialized) return;
    
    // 测试连接
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      throw new StorageError('Failed to initialize storage service', StorageErrorType.NETWORK_ERROR);
    }
    
    this._initialized = true;
  }

  async dispose(): Promise<void> {
    this._cache.clear();
    this._initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testUrl = this.resolvePath('');
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5秒超时
      });
      return response.ok || response.status === 404; // 404 也算正常，说明服务可达
    } catch {
      return false;
    }
  }

  // ===============================
  // 私有方法
  // ===============================

  private _ensureInitialized(): void {
    if (!this._initialized) {
      throw new StorageError('StorageService not initialized', StorageErrorType.PERMISSION_DENIED);
    }
  }

  private async _readLocalFile(path: string, options: ReadOptions): Promise<string | Buffer> {
    // 在浏览器环境中，本地文件读取实际上还是通过 HTTP
    return this._readRemoteFile(path, options);
  }

  private async _readRemoteFile(path: string, options: ReadOptions): Promise<FileContent> {
    const url = this.resolvePath(path);
    console.log('🔍 StorageService._readRemoteFile: Fetching URL:', url, 'from path:', path, 'basePath:', this._config.basePath);

    // Force bypass cache for debugging
    const response = await fetch(url, {
      cache: 'no-cache',
      headers: this._config.headers,
      signal: AbortSignal.timeout(this._config.timeout!)
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new StorageError(`File not found: ${path}`, StorageErrorType.FILE_NOT_FOUND, path);
      }
      throw new StorageError(`HTTP ${response.status}: ${response.statusText}`, StorageErrorType.NETWORK_ERROR, path);
    }

    if (options.binary) {
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } else {
      return await response.text();
    }
  }
}