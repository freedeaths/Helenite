/**
 * SearchService - 搜索服务
 *
 * 基于现有的 ISearchAPI 接口，提供搜索功能，支持：
 * - 全文搜索
 * - 标签搜索
 * - 统一搜索入口
 * - 缓存支持
 */

import { createVaultConfig } from '../config/vaultConfig.js';
import type { VaultPaths } from '../config/vaultConfig.js';
import type { IStorageService } from './interfaces/IStorageService.js';
import type { IMetadataService } from './interfaces/IMetadataService.js';
import type { SearchResult, SearchMatch } from './interfaces/ISearchAPI.js';

// ===============================
// 搜索选项接口
// ===============================

export interface SearchOptions {
  /** 是否包含内容搜索 */
  includeContent?: boolean;
  /** 文件类型过滤 */
  fileTypes?: string[];
  /** 标签过滤 */
  tags?: string[];
  /** 最大结果数量 */
  limit?: number;
  /** 最大结果数量（向后兼容） */
  maxResults?: number;
  /** 每个文件的最大匹配数 */
  maxMatchesPerFile?: number;
  /** 是否区分大小写 */
  caseSensitive?: boolean;
  /** 是否包含文件路径在搜索范围内 */
  includeFilePath?: boolean;
  /** 文件路径前缀过滤 */
  pathPrefix?: string;
}

/**
 * 搜索统计信息
 */
export interface SearchStatistics {
  /** 总搜索文件数 */
  totalFiles: number;
  /** 包含匹配的文件数 */
  matchedFiles: number;
  /** 总匹配数 */
  totalMatches: number;
  /** 搜索耗时（毫秒） */
  searchTime: number;
  /** 最常匹配的文件夹 */
  topFolders: Array<{
    folder: string;
    count: number;
  }>;
}

// ===============================
// SearchService 实现
// ===============================

export class SearchService {
  private vaultConfig: VaultPaths;
  private storageService: IStorageService;
  private metadataService: IMetadataService;
  private contentCache = new Map<string, string>();
  private searchCache = new Map<string, SearchResult[]>();

  constructor(
    storageService: IStorageService,
    metadataService: IMetadataService,
    vaultId?: string
  ) {
    this.vaultConfig = createVaultConfig(vaultId || 'Demo');
    this.storageService = storageService;
    this.metadataService = metadataService;
  }

  // ===============================
  // 核心搜索操作
  // ===============================

  /**
   * 统一搜索入口
   * 自动识别标签搜索（# 开头）和全文搜索
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      // 检查缓存
      const cacheKey = this.getCacheKey('search', query, options);
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey)!;
      }

      let results: SearchResult[];

      // 检查是否为标签搜索（以 # 开头）
      if (query.startsWith('#')) {
        results = await this.searchByTag(query, options);
      } else {
        results = await this.searchContent(query, options);
      }

      // 缓存结果
      this.searchCache.set(cacheKey, results);
      return results;
    } catch {
      return [];
    }
  }

  /**
   * 全文搜索
   * 在文件内容中搜索关键词
   */
  async searchContent(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      // 检查缓存
      const cacheKey = this.getCacheKey('content', query, options);
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey)!;
      }

      // 获取所有文件的元数据
      const metadata = await this.metadataService.getMetadata();
      if (!metadata) {
        this.searchCache.set(cacheKey, []);
        return [];
      }

      const results: SearchResult[] = [];

      for (const fileInfo of metadata) {
        try {
          const fileName = this.getFileNameWithoutExtension(fileInfo.relativePath);
          const relativePath = fileInfo.relativePath;

          // 应用路径前缀过滤
          if (options.pathPrefix && !relativePath.startsWith(options.pathPrefix)) {
            continue;
          }

          // 获取文件内容
          let content = await this.getFileContent(relativePath);

          // 如果包含文件路径在搜索范围内
          if (options.includeFilePath !== false) {
            content = content + '\n' + relativePath;
          }

          // 执行搜索
          const matches = this.findMatchesInContent(content, query, options);

          if (matches.length > 0) {
            const maxMatches = options.maxMatchesPerFile || 10;
            results.push({
              filePath: relativePath,
              fileName,
              matches: matches.slice(0, maxMatches),
              matchCount: matches.length,
            });
          }
        } catch {
          // 忽略单个文件搜索失败，继续处理其他文件
        }
      }

      // 限制搜索结果总数并排序
      const maxResults = options.maxResults || 50;
      const sortedResults = results
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, maxResults);

      // 缓存结果
      this.searchCache.set(cacheKey, sortedResults);

      return sortedResults;
    } catch {
      return [];
    }
  }

  /**
   * 标签搜索
   * 搜索包含指定标签的文件
   */
  async searchByTag(tag: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      // 检查缓存
      const cacheKey = this.getCacheKey('tag', tag, options);
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey)!;
      }

      // 移除 # 前缀进行搜索
      const tagName = tag.startsWith('#') ? tag.substring(1) : tag;
      const metadata = await this.metadataService.getMetadata();
      if (!metadata) {
        this.searchCache.set(cacheKey, []);
        return [];
      }

      const results: SearchResult[] = [];

      // 只从 metadata 中查找包含指定标签的文件，不搜索文件内容
      for (const fileInfo of metadata) {
        try {
          const fileName = this.getFileNameWithoutExtension(fileInfo.relativePath);
          const relativePath = fileInfo.relativePath;

          // 应用路径前缀过滤
          if (options.pathPrefix && !relativePath.startsWith(options.pathPrefix)) {
            continue;
          }

          // 只检查 metadata 中的标签，不搜索文件内容
          const fileTags = fileInfo.tags || [];
          if (fileTags.includes(tagName)) {
            const matches: SearchMatch[] = [
              {
                content: `Tag: #${tagName}`,
                highlighted: `Tag: <span class="search-result-file-matched-text">#${tagName}</span>`,
                lineNumber: 0,
              },
            ];

            results.push({
              filePath: relativePath,
              fileName,
              matches,
              matchCount: 1,
            });
          }
        } catch {
          // 忽略单个文件搜索失败，继续处理其他文件
        }
      }

      // 限制搜索结果总数
      const maxResults = options.maxResults || 50;
      const limitedResults = results.slice(0, maxResults);

      // 缓存结果
      this.searchCache.set(cacheKey, limitedResults);

      return limitedResults;
    } catch {
      return [];
    }
  }

  // ===============================
  // 搜索分析操作
  // ===============================

  /**
   * 获取搜索统计信息
   */
  async getSearchStatistics(query: string, options: SearchOptions = {}): Promise<SearchStatistics> {
    try {
      const startTime = Date.now();
      const results = await this.search(query, options);
      const searchTime = Date.now() - startTime;

      // 统计文件夹分布
      const folderMap = new Map<string, number>();
      for (const result of results) {
        if (result && result.filePath) {
          const folder = this.getFolderFromPath(result.filePath);
          folderMap.set(folder, (folderMap.get(folder) || 0) + 1);
        }
      }

      const topFolders = Array.from(folderMap.entries())
        .map(([folder, count]) => ({ folder, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const totalMatches = results.reduce((sum, result) => sum + result.matchCount, 0);

      const metadata = await this.metadataService.getMetadata();
      return {
        totalFiles: metadata ? metadata.length : 0,
        matchedFiles: results.length,
        totalMatches,
        searchTime,
        topFolders,
      };
    } catch {
      return {
        totalFiles: 0,
        matchedFiles: 0,
        totalMatches: 0,
        searchTime: 0,
        topFolders: [],
      };
    }
  }

  // ===============================
  // 工具方法
  // ===============================

  /**
   * 高亮搜索结果
   */
  highlightSearchResults(
    content: string,
    query: string,
    className = 'search-result-file-matched-text'
  ): string {
    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQuery, 'gi');
      return content.replace(regex, `<span class="${className}">$&</span>`);
    } catch {
      return content;
    }
  }

  /**
   * 验证搜索查询
   */
  validateSearchQuery(query: string): boolean {
    return query.trim().length > 0 && query.length <= 100;
  }

  /**
   * 规范化搜索关键词
   */
  normalizeSearchQuery(query: string): string {
    return query.trim().toLowerCase();
  }

  // ===============================
  // 缓存管理
  // ===============================

  /**
   * 刷新搜索缓存
   */
  async refreshCache(): Promise<void> {
    this.searchCache.clear();
    this.contentCache.clear();
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<Record<string, unknown>> {
    const stats = await this.getSearchStatistics('cache-stats');
    return {
      vaultId: this.vaultConfig.id,
      searchCacheSize: this.searchCache.size,
      contentCacheSize: this.contentCache.size,
      ...stats,
    };
  }

  // ===============================
  // Vault 管理
  // ===============================

  /**
   * 切换到不同的 vault
   */
  switchVault(vaultId: string): void {
    this.vaultConfig = createVaultConfig(vaultId);
    this.refreshCache();
  }

  /**
   * 获取当前 vault 信息
   */
  getCurrentVault(): { id: string; path: string } {
    return {
      id: this.vaultConfig.id,
      path: this.vaultConfig.path,
    };
  }

  // ===============================
  // 私有辅助方法
  // ===============================

  /**
   * 获取文件内容（带缓存）
   */
  private async getFileContent(filePath: string): Promise<string> {
    if (this.contentCache.has(filePath)) {
      return this.contentCache.get(filePath)!;
    }

    try {
      const content = await this.storageService.readFile(filePath);
      const stringContent =
        typeof content === 'string' ? content : new TextDecoder().decode(content);
      this.contentCache.set(filePath, stringContent);
      return stringContent;
    } catch {
      return '';
    }
  }

  /**
   * 在内容中查找匹配项
   */
  private findMatchesInContent(
    content: string,
    query: string,
    options: SearchOptions = {}
  ): SearchMatch[] {
    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = options.caseSensitive ? 'gm' : 'gmi';
      const pattern = new RegExp(`^.*${escapedQuery}.*$`, flags);

      const lines = content.split('\n');
      const matches: SearchMatch[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
          const highlighted = this.highlightSearchResults(line, query);

          matches.push({
            content: line,
            highlighted,
            lineNumber: i + 1,
          });
        }
      }

      return matches;
    } catch {
      return [];
    }
  }

  /**
   * 从文件路径获取文件名（不含扩展名）
   */
  private getFileNameWithoutExtension(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    return fileName.replace(/\.[^/.]+$/, '');
  }

  /**
   * 从文件路径获取文件夹路径
   */
  private getFolderFromPath(filePath: string): string {
    const parts = filePath.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(type: string, query: string, options: SearchOptions): string {
    return `${type}:${query}:${JSON.stringify(options)}`;
  }
}

// ===============================
// 全局实例管理
// ===============================

let _globalSearchService: SearchService | null = null;

/**
 * 获取全局搜索服务实例
 */
export function getSearchService(): SearchService | null {
  return _globalSearchService;
}

/**
 * 初始化全局搜索服务
 */
export function initializeSearchService(
  storageService: IStorageService,
  metadataService: IMetadataService,
  vaultId?: string
): SearchService {
  _globalSearchService = new SearchService(storageService, metadataService, vaultId);
  return _globalSearchService;
}

/**
 * 销毁全局搜索服务
 */
export function disposeSearchService(): void {
  if (_globalSearchService) {
    _globalSearchService.refreshCache();
  }
  _globalSearchService = null;
}
