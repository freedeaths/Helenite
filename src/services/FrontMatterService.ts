/**
 * FrontMatterService - Front Matter 数据管理服务
 * 
 * 基于 MetadataService 提供的元数据，专门处理 Front Matter 字段
 * - UUID 管理：支持基于 UUID 的评论功能
 * - 发布状态：管理文件的发布状态
 * - 元数据字段：作者、描述、CSS类、日期等
 * - 高级查询：支持复杂过滤和搜索
 * - 统计分析：提供 Front Matter 使用分析
 */

import { createVaultConfig } from '../newConfig/newVaultConfig.js';
import type { VaultPaths } from '../newConfig/newVaultConfig.js';
import type { IMetadataService, FrontMatter } from './interfaces/IMetadataService.js';
import type { 
  IFrontMatterService, 
  FrontMatterQueryOptions, 
  FrontMatterStatistics 
} from './interfaces/IFrontMatterService.js';

// ===============================
// FrontMatterService 实现
// ===============================

export class FrontMatterService implements IFrontMatterService {
  private vaultConfig: VaultPaths;
  private metadataService: IMetadataService;
  private frontMatterCache = new Map<string, FrontMatter | null>();

  constructor(
    metadataService: IMetadataService,
    vaultId?: string
  ) {
    this.vaultConfig = createVaultConfig(vaultId || 'Demo');
    this.metadataService = metadataService;
  }

  // ===============================
  // 核心数据获取
  // ===============================

  async getFrontMatter(filePath: string): Promise<FrontMatter | null> {
    try {
      // 检查缓存
      if (this.frontMatterCache.has(filePath)) {
        return this.frontMatterCache.get(filePath)!;
      }

      // 从 MetadataService 获取文件元数据
      const metadata = await this.metadataService.getFileMetadata(filePath);
      const frontMatter = metadata?.frontmatter || null;

      // 缓存结果
      this.frontMatterCache.set(filePath, frontMatter);
      return frontMatter;
    } catch (error) {
      console.error(`❌ Failed to get front matter for ${filePath}:`, error);
      return null;
    }
  }

  async getAllFrontMatter(): Promise<Array<{ filePath: string; frontMatter: FrontMatter }>> {
    try {
      const metadata = await this.metadataService.getMetadata();
      if (!metadata) return [];

      const results: Array<{ filePath: string; frontMatter: FrontMatter }> = [];

      for (const fileData of metadata) {
        if (fileData.frontmatter) {
          results.push({
            filePath: fileData.relativePath,
            frontMatter: fileData.frontmatter
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Failed to get all front matter:', error);
      return [];
    }
  }

  // ===============================
  // UUID 管理 (评论功能依赖)
  // ===============================

  async getUuid(filePath: string): Promise<string | null> {
    try {
      const frontMatter = await this.getFrontMatter(filePath);
      return frontMatter?.uuid || null;
    } catch (error) {
      console.error(`❌ Failed to get UUID for ${filePath}:`, error);
      return null;
    }
  }

  async getFileByUuid(uuid: string): Promise<string | null> {
    try {
      const metadata = await this.metadataService.getMetadata();
      if (!metadata) return null;

      for (const fileData of metadata) {
        if (fileData.frontmatter?.uuid === uuid) {
          return fileData.relativePath;
        }
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to find file by UUID ${uuid}:`, error);
      return null;
    }
  }

  async getAllUuids(): Promise<Record<string, string>> {
    try {
      const metadata = await this.metadataService.getMetadata();
      if (!metadata) return {};

      const uuidMap: Record<string, string> = {};

      for (const fileData of metadata) {
        if (fileData.frontmatter?.uuid) {
          uuidMap[fileData.frontmatter.uuid] = fileData.relativePath;
        }
      }

      return uuidMap;
    } catch (error) {
      console.error('❌ Failed to get all UUIDs:', error);
      return {};
    }
  }

  async hasUuid(uuid: string): Promise<boolean> {
    try {
      const filePath = await this.getFileByUuid(uuid);
      return filePath !== null;
    } catch (error) {
      console.error(`❌ Failed to check UUID existence ${uuid}:`, error);
      return false;
    }
  }

  // ===============================
  // Front Matter 字段查询
  // ===============================

  async isPublished(filePath: string): Promise<boolean | null> {
    try {
      const frontMatter = await this.getFrontMatter(filePath);
      return frontMatter?.publish ?? null;
    } catch (error) {
      console.error(`❌ Failed to get publish status for ${filePath}:`, error);
      return null;
    }
  }

  async getPublishedFiles(): Promise<string[]> {
    try {
      const allFrontMatter = await this.getAllFrontMatter();
      return allFrontMatter
        .filter(({ frontMatter }) => frontMatter.publish === true)
        .map(({ filePath }) => filePath);
    } catch (error) {
      console.error('❌ Failed to get published files:', error);
      return [];
    }
  }

  async getUnpublishedFiles(): Promise<string[]> {
    try {
      const allFrontMatter = await this.getAllFrontMatter();
      return allFrontMatter
        .filter(({ frontMatter }) => frontMatter.publish === false || frontMatter.publish === undefined)
        .map(({ filePath }) => filePath);
    } catch (error) {
      console.error('❌ Failed to get unpublished files:', error);
      return [];
    }
  }

  async getAuthor(filePath: string): Promise<string | null> {
    try {
      const frontMatter = await this.getFrontMatter(filePath);
      return frontMatter?.author || null;
    } catch (error) {
      console.error(`❌ Failed to get author for ${filePath}:`, error);
      return null;
    }
  }

  async getFilesByAuthor(author: string): Promise<string[]> {
    try {
      const allFrontMatter = await this.getAllFrontMatter();
      return allFrontMatter
        .filter(({ frontMatter }) => frontMatter.author === author)
        .map(({ filePath }) => filePath);
    } catch (error) {
      console.error(`❌ Failed to get files by author ${author}:`, error);
      return [];
    }
  }

  async getAllAuthors(): Promise<string[]> {
    try {
      const allFrontMatter = await this.getAllFrontMatter();
      const authors = new Set<string>();

      for (const { frontMatter } of allFrontMatter) {
        if (frontMatter.author) {
          authors.add(frontMatter.author);
        }
      }

      return Array.from(authors).sort();
    } catch (error) {
      console.error('❌ Failed to get all authors:', error);
      return [];
    }
  }

  async getDescription(filePath: string): Promise<string | null> {
    try {
      const frontMatter = await this.getFrontMatter(filePath);
      return frontMatter?.description || null;
    } catch (error) {
      console.error(`❌ Failed to get description for ${filePath}:`, error);
      return null;
    }
  }

  async getCssClass(filePath: string): Promise<string | null> {
    try {
      const frontMatter = await this.getFrontMatter(filePath);
      return frontMatter?.cssclass || null;
    } catch (error) {
      console.error(`❌ Failed to get CSS class for ${filePath}:`, error);
      return null;
    }
  }

  async getFilesByCssClass(cssClass: string): Promise<string[]> {
    try {
      const allFrontMatter = await this.getAllFrontMatter();
      return allFrontMatter
        .filter(({ frontMatter }) => frontMatter.cssclass === cssClass)
        .map(({ filePath }) => filePath);
    } catch (error) {
      console.error(`❌ Failed to get files by CSS class ${cssClass}:`, error);
      return [];
    }
  }

  async getCreatedDate(filePath: string): Promise<Date | null> {
    try {
      const frontMatter = await this.getFrontMatter(filePath);
      if (!frontMatter?.created) return null;

      const date = new Date(frontMatter.created);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.error(`❌ Failed to get created date for ${filePath}:`, error);
      return null;
    }
  }

  async getModifiedDate(filePath: string): Promise<Date | null> {
    try {
      const frontMatter = await this.getFrontMatter(filePath);
      if (!frontMatter?.modified) return null;

      const date = new Date(frontMatter.modified);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.error(`❌ Failed to get modified date for ${filePath}:`, error);
      return null;
    }
  }

  // ===============================
  // 高级查询
  // ===============================

  async queryFiles(options: FrontMatterQueryOptions): Promise<string[]> {
    try {
      const allFrontMatter = await this.getAllFrontMatter();
      let filteredFiles = allFrontMatter;

      // 发布状态过滤
      if (options.includePublished !== undefined || options.includeUnpublished !== undefined) {
        filteredFiles = filteredFiles.filter(({ frontMatter }) => {
          const isPublished = frontMatter.publish === true;
          const isUnpublished = frontMatter.publish === false || frontMatter.publish === undefined;

          return (options.includePublished && isPublished) || 
                 (options.includeUnpublished && isUnpublished);
        });
      }

      // 作者过滤
      if (options.author) {
        filteredFiles = filteredFiles.filter(({ frontMatter }) => 
          frontMatter.author === options.author
        );
      }

      // 日期范围过滤
      if (options.dateRange) {
        const { field, start, end } = options.dateRange;
        filteredFiles = filteredFiles.filter(({ frontMatter }) => {
          const dateStr = frontMatter[field];
          if (!dateStr) return false;

          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return false;

          if (start && date < start) return false;
          if (end && date > end) return false;

          return true;
        });
      }

      // CSS 类过滤
      if (options.cssClass) {
        filteredFiles = filteredFiles.filter(({ frontMatter }) => 
          frontMatter.cssclass === options.cssClass
        );
      }

      // 自定义字段过滤
      if (options.customFields) {
        filteredFiles = filteredFiles.filter(({ frontMatter }) => {
          return Object.entries(options.customFields!).every(([key, value]) => 
            frontMatter[key] === value
          );
        });
      }

      return filteredFiles.map(({ filePath }) => filePath);
    } catch (error) {
      console.error('❌ Failed to query files:', error);
      return [];
    }
  }

  async searchFrontMatter(query: string, fields?: string[]): Promise<Array<{
    filePath: string;
    matches: Array<{ field: string; value: unknown }>;
  }>> {
    try {
      // Return empty results for empty query
      if (!query || query.trim() === '') {
        return [];
      }

      const allFrontMatter = await this.getAllFrontMatter();
      const results: Array<{
        filePath: string;
        matches: Array<{ field: string; value: unknown }>;
      }> = [];

      const searchPattern = new RegExp(query, 'i');

      for (const { filePath, frontMatter } of allFrontMatter) {
        const matches: Array<{ field: string; value: unknown }> = [];

        // 确定要搜索的字段
        const fieldsToSearch = fields || Object.keys(frontMatter);

        for (const field of fieldsToSearch) {
          const value = frontMatter[field];
          if (value === undefined || value === null) continue;

          // 搜索字符串值
          if (typeof value === 'string' && searchPattern.test(value)) {
            matches.push({ field, value });
          }
          // 搜索数组值
          else if (Array.isArray(value)) {
            const matchingItems = value.filter(item => 
              typeof item === 'string' && searchPattern.test(item)
            );
            if (matchingItems.length > 0) {
              matches.push({ field, value: matchingItems });
            }
          }
        }

        if (matches.length > 0) {
          results.push({ filePath, matches });
        }
      }

      return results;
    } catch (error) {
      console.error(`❌ Failed to search front matter for "${query}":`, error);
      return [];
    }
  }

  async getCustomField(filePath: string, fieldName: string): Promise<unknown> {
    try {
      const frontMatter = await this.getFrontMatter(filePath);
      return frontMatter?.[fieldName] ?? null;
    } catch (error) {
      console.error(`❌ Failed to get custom field ${fieldName} for ${filePath}:`, error);
      return null;
    }
  }

  async getFilesByCustomField(fieldName: string, value?: unknown): Promise<string[]> {
    try {
      const allFrontMatter = await this.getAllFrontMatter();
      return allFrontMatter
        .filter(({ frontMatter }) => {
          const fieldValue = frontMatter[fieldName];
          if (value === undefined) {
            return fieldValue !== undefined && fieldValue !== null;
          }
          return fieldValue === value;
        })
        .map(({ filePath }) => filePath);
    } catch (error) {
      console.error(`❌ Failed to get files by custom field ${fieldName}:`, error);
      return [];
    }
  }

  async getAllCustomFields(): Promise<string[]> {
    try {
      const allFrontMatter = await this.getAllFrontMatter();
      const allFields = new Set<string>();

      // 标准字段列表
      const standardFields = new Set([
        'uuid', 'publish', 'created', 'modified', 
        'author', 'description', 'cssclass'
      ]);

      for (const { frontMatter } of allFrontMatter) {
        Object.keys(frontMatter).forEach(field => {
          if (!standardFields.has(field)) {
            allFields.add(field);
          }
        });
      }

      return Array.from(allFields).sort();
    } catch (error) {
      console.error('❌ Failed to get all custom fields:', error);
      return [];
    }
  }

  // ===============================
  // 统计和分析
  // ===============================

  async getStatistics(): Promise<FrontMatterStatistics> {
    try {
      const allFrontMatter = await this.getAllFrontMatter();
      const metadata = await this.metadataService.getMetadata();
      const totalFiles = metadata?.length || 0;

      // 基础统计
      let filesWithUuid = 0;
      let publishedFiles = 0;
      let unpublishedFiles = 0;

      // 作者和 CSS 类统计
      const authorCounts = new Map<string, number>();
      const cssClassCounts = new Map<string, number>();
      const customFieldStats = new Map<string, Set<unknown>>();

      for (const { frontMatter } of allFrontMatter) {
        // UUID 统计
        if (frontMatter.uuid) filesWithUuid++;

        // 发布状态统计
        if (frontMatter.publish === true) {
          publishedFiles++;
        } else {
          unpublishedFiles++;
        }

        // 作者统计
        if (frontMatter.author) {
          authorCounts.set(frontMatter.author, (authorCounts.get(frontMatter.author) || 0) + 1);
        }

        // CSS 类统计
        if (frontMatter.cssclass) {
          cssClassCounts.set(frontMatter.cssclass, (cssClassCounts.get(frontMatter.cssclass) || 0) + 1);
        }

        // 自定义字段统计
        const standardFields = ['uuid', 'publish', 'created', 'modified', 'author', 'description', 'cssclass'];
        Object.entries(frontMatter).forEach(([field, value]) => {
          if (!standardFields.includes(field) && value !== undefined && value !== null) {
            if (!customFieldStats.has(field)) {
              customFieldStats.set(field, new Set());
            }
            customFieldStats.get(field)!.add(value);
          }
        });
      }

      // 生成 TOP 列表
      const topAuthors = Array.from(authorCounts.entries())
        .map(([author, count]) => ({ author, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topCssClasses = Array.from(cssClassCounts.entries())
        .map(([cssClass, count]) => ({ cssClass, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // 自定义字段统计
      const customFieldStatsResult: Record<string, { count: number; uniqueValues: number }> = {};
      customFieldStats.forEach((values, field) => {
        customFieldStatsResult[field] = {
          count: values.size,
          uniqueValues: values.size
        };
      });

      return {
        totalFiles,
        filesWithUuid,
        publishedFiles,
        unpublishedFiles,
        topAuthors,
        topCssClasses,
        customFieldStats: customFieldStatsResult
      };
    } catch (error) {
      console.error('❌ Failed to get front matter statistics:', error);
      return {
        totalFiles: 0,
        filesWithUuid: 0,
        publishedFiles: 0,
        unpublishedFiles: 0,
        topAuthors: [],
        topCssClasses: [],
        customFieldStats: {}
      };
    }
  }

  async analyzeFrontMatterPatterns(): Promise<{
    commonFields: Array<{ field: string; usage: number }>;
    fieldValueDistribution: Record<string, Record<string, number>>;
    recommendedFields: string[];
  }> {
    try {
      const allFrontMatter = await this.getAllFrontMatter();
      const fieldUsage = new Map<string, number>();
      const fieldValueDistribution: Record<string, Record<string, number>> = {};

      // 分析字段使用频率
      for (const { frontMatter } of allFrontMatter) {
        Object.keys(frontMatter).forEach(field => {
          fieldUsage.set(field, (fieldUsage.get(field) || 0) + 1);

          // 分析字段值分布
          if (!fieldValueDistribution[field]) {
            fieldValueDistribution[field] = {};
          }

          const value = frontMatter[field];
          const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
          fieldValueDistribution[field][valueStr] = (fieldValueDistribution[field][valueStr] || 0) + 1;
        });
      }

      // 生成常用字段列表
      const commonFields = Array.from(fieldUsage.entries())
        .map(([field, usage]) => ({ field, usage }))
        .sort((a, b) => b.usage - a.usage);

      // 推荐字段（使用率低但可能有用的标准字段）
      const standardFields = ['uuid', 'publish', 'created', 'modified', 'author', 'description', 'cssclass'];
      const recommendedFields = standardFields.filter(field => 
        (fieldUsage.get(field) || 0) < allFrontMatter.length * 0.5
      );

      return {
        commonFields,
        fieldValueDistribution,
        recommendedFields
      };
    } catch (error) {
      console.error('❌ Failed to analyze front matter patterns:', error);
      return {
        commonFields: [],
        fieldValueDistribution: {},
        recommendedFields: []
      };
    }
  }

  // ===============================
  // 缓存管理
  // ===============================

  async refreshCache(): Promise<void> {
    this.frontMatterCache.clear();
    await this.metadataService.refreshCache();
  }

  async getCacheStats(): Promise<Record<string, unknown>> {
    try {
      const stats = await this.getStatistics();
      return {
        vaultId: this.vaultConfig.id,
        frontMatterCacheSize: this.frontMatterCache.size,
        ...stats
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      return {
        vaultId: this.vaultConfig.id,
        frontMatterCacheSize: this.frontMatterCache.size
      };
    }
  }

  // ===============================
  // Vault 管理
  // ===============================

  switchVault(vaultId: string): void {
    this.vaultConfig = createVaultConfig(vaultId);
    this.refreshCache();
    this.metadataService.switchVault(vaultId);
  }

  getCurrentVault(): { id: string; path: string } {
    return {
      id: this.vaultConfig.id,
      path: this.vaultConfig.path
    };
  }
}

// ===============================
// 全局实例管理
// ===============================

let _globalFrontMatterService: FrontMatterService | null = null;

/**
 * 获取全局 FrontMatterService 实例
 */
export function getFrontMatterService(): FrontMatterService | null {
  return _globalFrontMatterService;
}

/**
 * 初始化全局 FrontMatterService
 */
export function initializeFrontMatterService(
  metadataService: IMetadataService,
  vaultId?: string
): FrontMatterService {
  _globalFrontMatterService = new FrontMatterService(metadataService, vaultId);
  return _globalFrontMatterService;
}

/**
 * 销毁全局 FrontMatterService
 */
export function disposeFrontMatterService(): void {
  if (_globalFrontMatterService) {
    _globalFrontMatterService.refreshCache();
  }
  _globalFrontMatterService = null;
}