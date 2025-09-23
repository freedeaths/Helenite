/**
 * TagService - 标签服务
 * 
 * 基于 LocalTagAPI 重构，作为独立的服务层
 * 关键优化：全局标签从 tags.json 直接读取，局部标签从 metadata 计算
 * 
 * 架构设计：TagService 依赖 MetadataService 和 StorageService
 */

import { createVaultConfig } from '../config/vaultConfig.js';
import type { VaultPaths } from '../config/vaultConfig.js';
import type { 
  ITagService,
  TagData,
  TagStats,
  TagSearchOptions,
  TagFilterOptions,
} from './interfaces/ITagService.js';
import type { IMetadataService, MetadataArray } from './interfaces/IMetadataService.js';
import type { IStorageService } from './interfaces/IStorageService.js';

// ===============================
// tags.json 数据结构
// ===============================

interface TagsJsonEntry {
  tag: string;
  tagCount: number;
  relativePaths: string[];
}

// ===============================
// TagService 实现
// ===============================

export class TagService implements ITagService {
  private vaultConfig: VaultPaths;
  private metadataService: IMetadataService;
  private storageService: IStorageService;

  constructor(
    metadataService: IMetadataService,
    storageService: IStorageService,
    vaultId?: string
  ) {
    this.vaultConfig = createVaultConfig(vaultId || 'Demo');
    this.metadataService = metadataService;
    this.storageService = storageService;
  }

  // ===============================
  // 核心标签操作
  // ===============================

  /**
   * 获取所有标签（全局）
   * 从 tags.json 直接读取，性能优化
   */
  async getAllTags(options: TagSearchOptions = {}): Promise<TagData[]> {
    try {
      console.log('🔄 Loading global tags from tags.json...');
      const tagsJson = await this.getTagsFromJson();
      
      if (!tagsJson || tagsJson.length === 0) {
        console.warn('⚠️ tags.json is empty, falling back to metadata calculation');
        return this.calculateTagsFromMetadata(options);
      }

      // 转换 tags.json 格式到 TagData 格式
      let tags: TagData[] = tagsJson.map(entry => ({
        name: `#${entry.tag}`, // 添加 # 前缀保持一致性
        count: entry.tagCount,
        files: entry.relativePaths
      }));

      // 应用排序和限制
      tags = this.applySortingAndLimit(tags, options);

      console.log(`✅ Loaded ${tags.length} global tags from tags.json`);
      return tags;
    } catch (error) {
      console.error('❌ Failed to load tags from tags.json:', error);
      console.log('🔄 Falling back to metadata calculation...');
      return this.calculateTagsFromMetadata(options);
    }
  }

  /**
   * 获取文件的所有标签
   * 从 metadata 读取指定文件的标签
   */
  async getFileTags(filePath: string): Promise<string[]> {
    try {
      // 标准化文件路径
      const normalizedPath = this.normalizePath(filePath);
      
      const fileMetadata = await this.metadataService.getFileMetadata(normalizedPath);
      if (!fileMetadata) {
        console.warn(`❌ File not found in metadata: ${filePath}`);
        return [];
      }

      const tags = fileMetadata.tags || [];
      
      // 添加 # 前缀并排序
      const formattedTags = tags.map(tag => `#${tag}`).sort();
      
      console.log(`📄 File ${normalizedPath} has ${formattedTags.length} tags`);
      return formattedTags;
    } catch (error) {
      console.error(`❌ Failed to get tags for file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * 根据标签获取文件列表
   * 优先从全局 tags.json 查找，找不到再从 metadata 计算
   */
  async getFilesByTag(tag: string): Promise<string[]> {
    try {
      const normalizedTag = tag.startsWith('#') ? tag.slice(1) : tag;
      
      // 首先尝试从 tags.json 获取
      const tagsJson = await this.getTagsFromJson();
      if (tagsJson && tagsJson.length > 0) {
        const tagEntry = tagsJson.find(entry => entry.tag === normalizedTag);
        if (tagEntry) {
          console.log(`📄 Found ${tagEntry.relativePaths.length} files for tag '${tag}' from tags.json`);
          return tagEntry.relativePaths;
        }
      }

      // 降级到从 metadata 计算
      console.log(`🔄 Tag '${tag}' not found in tags.json, calculating from metadata...`);
      const files = await this.metadataService.getFilesByTag(normalizedTag);
      const filePaths = files.map(file => file.relativePath);
      
      console.log(`📄 Found ${filePaths.length} files for tag '${tag}' from metadata`);
      return filePaths;
    } catch (error) {
      console.error(`❌ Failed to get files for tag ${tag}:`, error);
      return [];
    }
  }

  /**
   * 获取标签统计信息
   */
  async getTagStats(): Promise<TagStats> {
    try {
      const allTags = await this.getAllTags();
      const metadata = await this.metadataService.getMetadata();
      
      if (!metadata || metadata.length === 0) {
        return this.getEmptyTagStats();
      }

      const totalTags = allTags.length;
      const filesWithTags = metadata.filter(file => file.tags && file.tags.length > 0);
      const totalFiles = filesWithTags.length;
      
      // 计算平均值
      const totalTagUsages = allTags.reduce((sum, tag) => sum + tag.count, 0);
      const averageTagsPerFile = totalFiles > 0 ? totalTagUsages / totalFiles : 0;
      const averageFilesPerTag = totalTags > 0 ? totalTagUsages / totalTags : 0;
      
      // 找到最常用标签
      const mostUsedTag = allTags.length > 0 ? allTags[0] : undefined;
      
      // 计算频率分布
      const frequencyDistribution = this.calculateFrequencyDistribution(allTags);

      const stats: TagStats = {
        totalTags,
        totalFiles,
        averageTagsPerFile: Number(averageTagsPerFile.toFixed(2)),
        averageFilesPerTag: Number(averageFilesPerTag.toFixed(2)),
        mostUsedTag,
        frequencyDistribution
      };

      console.log(`📊 Tag statistics: ${totalTags} tags, ${totalFiles} files`);
      return stats;
    } catch (error) {
      console.error('❌ Failed to calculate tag stats:', error);
      return this.getEmptyTagStats();
    }
  }

  // ===============================
  // 标签查询操作
  // ===============================

  /**
   * 搜索标签
   */
  async searchTags(query: string, options: TagSearchOptions = {}): Promise<TagData[]> {
    try {
      const allTags = await this.getAllTags();
      const { caseSensitive = false } = options;
      
      // 标准化查询字符串
      const normalizedQuery = caseSensitive ? query : query.toLowerCase();
      const searchQuery = normalizedQuery.startsWith('#') ? normalizedQuery : `#${normalizedQuery}`;
      
      // 过滤匹配的标签
      let matchedTags = allTags.filter(tag => {
        const tagName = caseSensitive ? tag.name : tag.name.toLowerCase();
        return tagName.includes(searchQuery);
      });

      // 应用排序和限制
      matchedTags = this.applySortingAndLimit(matchedTags, options);
      
      console.log(`🔍 Search '${query}' found ${matchedTags.length} tags`);
      return matchedTags;
    } catch (error) {
      console.error(`❌ Failed to search tags with query '${query}':`, error);
      return [];
    }
  }

  /**
   * 过滤标签
   */
  async filterTags(options: TagFilterOptions): Promise<TagData[]> {
    try {
      const allTags = await this.getAllTags();
      const { minCount, maxCount, pathPrefix, excludeTags = [] } = options;
      
      let filteredTags = allTags.filter(tag => {
        // 使用次数过滤
        if (minCount !== undefined && tag.count < minCount) return false;
        if (maxCount !== undefined && tag.count > maxCount) return false;
        
        // 排除标签过滤
        if (excludeTags.includes(tag.name)) return false;
        
        // 路径前缀过滤
        if (pathPrefix) {
          const hasMatchingFiles = tag.files.some(file => file.startsWith(pathPrefix));
          if (!hasMatchingFiles) return false;
        }
        
        return true;
      });

      console.log(`🔍 Filter applied: ${filteredTags.length} tags match criteria`);
      return filteredTags;
    } catch (error) {
      console.error('❌ Failed to filter tags:', error);
      return [];
    }
  }

  /**
   * 获取标签详情
   */
  async getTagDetails(tag: string): Promise<TagData | null> {
    try {
      const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
      const allTags = await this.getAllTags();
      
      const tagData = allTags.find(t => t.name === normalizedTag);
      
      if (tagData) {
        console.log(`📋 Tag '${tag}' details: ${tagData.count} files`);
      } else {
        console.warn(`❌ Tag '${tag}' not found`);
      }
      
      return tagData || null;
    } catch (error) {
      console.error(`❌ Failed to get tag details for '${tag}':`, error);
      return null;
    }
  }

  /**
   * 检查标签是否存在
   */
  async hasTag(tag: string): Promise<boolean> {
    try {
      const tagData = await this.getTagDetails(tag);
      return tagData !== null;
    } catch (error) {
      console.error(`❌ Failed to check tag existence '${tag}':`, error);
      return false;
    }
  }

  // ===============================
  // 标签分析操作
  // ===============================

  /**
   * 获取最常用的标签
   */
  async getMostUsedTags(limit: number = 10): Promise<TagData[]> {
    try {
      const allTags = await this.getAllTags({ sortBy: 'count', sortOrder: 'desc', limit });
      console.log(`🔝 Top ${allTags.length} most used tags`);
      return allTags;
    } catch (error) {
      console.error('❌ Failed to get most used tags:', error);
      return [];
    }
  }

  /**
   * 获取最少用的标签
   */
  async getLeastUsedTags(limit: number = 10): Promise<TagData[]> {
    try {
      const allTags = await this.getAllTags({ sortBy: 'count', sortOrder: 'asc', limit });
      console.log(`🔻 Bottom ${allTags.length} least used tags`);
      return allTags;
    } catch (error) {
      console.error('❌ Failed to get least used tags:', error);
      return [];
    }
  }

  /**
   * 获取孤立标签（只被一个文件使用）
   */
  async getOrphanTags(): Promise<TagData[]> {
    try {
      const orphanTags = await this.filterTags({ minCount: 1, maxCount: 1 });
      console.log(`🏝️ Found ${orphanTags.length} orphan tags`);
      return orphanTags;
    } catch (error) {
      console.error('❌ Failed to get orphan tags:', error);
      return [];
    }
  }

  /**
   * 获取相关标签
   */
  async getRelatedTags(tag: string, limit: number = 5): Promise<TagData[]> {
    try {
      const files = await this.getFilesByTag(tag);
      if (files.length === 0) {
        return [];
      }

      // 统计与目标标签共现的其他标签
      const tagCooccurrence = new Map<string, number>();
      
      for (const filePath of files) {
        const fileTags = await this.getFileTags(filePath);
        const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
        
        for (const fileTag of fileTags) {
          if (fileTag !== normalizedTag) {
            tagCooccurrence.set(fileTag, (tagCooccurrence.get(fileTag) || 0) + 1);
          }
        }
      }

      // 获取相关标签的详细信息
      const allTags = await this.getAllTags();
      const relatedTags = Array.from(tagCooccurrence.entries())
        .map(([tagName, cooccurrenceCount]) => {
          const tagData = allTags.find(t => t.name === tagName);
          return tagData ? { ...tagData, cooccurrenceCount } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b!.cooccurrenceCount - a!.cooccurrenceCount)
        .slice(0, limit)
        .map(tagData => {
          const { cooccurrenceCount, ...rest } = tagData!;
          return rest;
        });

      console.log(`🔗 Found ${relatedTags.length} related tags for '${tag}'`);
      return relatedTags;
    } catch (error) {
      console.error(`❌ Failed to get related tags for '${tag}':`, error);
      return [];
    }
  }

  /**
   * 分析文件的标签使用模式
   */
  async analyzeFileTagPattern(filePath: string): Promise<{
    totalTags: number;
    uniqueTags: string[];
    commonTags: string[];
    rareTags: string[];
  }> {
    try {
      const fileTags = await this.getFileTags(filePath);
      const allTags = await this.getAllTags();
      
      // 创建标签使用频率映射
      const tagFrequencyMap = new Map<string, number>();
      for (const tagData of allTags) {
        tagFrequencyMap.set(tagData.name, tagData.count);
      }

      // 分类标签
      const commonTags: string[] = [];
      const rareTags: string[] = [];
      
      for (const tag of fileTags) {
        const frequency = tagFrequencyMap.get(tag) || 0;
        if (frequency >= 5) { // 被5个或更多文件使用
          commonTags.push(tag);
        } else if (frequency <= 2) { // 被2个或更少文件使用
          rareTags.push(tag);
        }
      }

      const result = {
        totalTags: fileTags.length,
        uniqueTags: fileTags,
        commonTags,
        rareTags
      };

      console.log(`📊 File '${filePath}' tag pattern: ${result.totalTags} total, ${commonTags.length} common, ${rareTags.length} rare`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to analyze tag pattern for '${filePath}':`, error);
      return {
        totalTags: 0,
        uniqueTags: [],
        commonTags: [],
        rareTags: []
      };
    }
  }

  // ===============================
  // 标签关系分析
  // ===============================

  /**
   * 获取标签共现关系
   */
  async getTagCooccurrence(tag: string): Promise<{
    tag: string;
    cooccurredTags: Array<{
      tag: string;
      count: number;
      files: string[];
    }>;
  }> {
    try {
      const files = await this.getFilesByTag(tag);
      const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
      const cooccurrenceMap = new Map<string, { count: number; files: string[] }>();

      for (const filePath of files) {
        const fileTags = await this.getFileTags(filePath);
        
        for (const fileTag of fileTags) {
          if (fileTag !== normalizedTag) {
            if (!cooccurrenceMap.has(fileTag)) {
              cooccurrenceMap.set(fileTag, { count: 0, files: [] });
            }
            const data = cooccurrenceMap.get(fileTag)!;
            data.count++;
            if (!data.files.includes(filePath)) {
              data.files.push(filePath);
            }
          }
        }
      }

      const cooccurredTags = Array.from(cooccurrenceMap.entries())
        .map(([tagName, data]) => ({
          tag: tagName,
          count: data.count,
          files: data.files
        }))
        .sort((a, b) => b.count - a.count);

      const result = {
        tag: normalizedTag,
        cooccurredTags
      };

      console.log(`🔗 Tag '${tag}' co-occurs with ${cooccurredTags.length} other tags`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to get tag co-occurrence for '${tag}':`, error);
      return { tag: tag.startsWith('#') ? tag : `#${tag}`, cooccurredTags: [] };
    }
  }

  /**
   * 获取文件夹的标签分布
   */
  async getFolderTagDistribution(folderPath: string = ''): Promise<{
    folder: string;
    totalFiles: number;
    tagDistribution: TagData[];
  }> {
    try {
      const metadata = await this.metadataService.getMetadata();
      if (!metadata) {
        return { folder: folderPath, totalFiles: 0, tagDistribution: [] };
      }

      // 过滤指定文件夹下的文件
      const folderFiles = metadata.filter(file => {
        if (!folderPath) return true; // 根目录包含所有文件
        return file.relativePath.startsWith(folderPath);
      });

      // 统计文件夹内的标签分布
      const tagMap = new Map<string, TagData>();
      
      for (const file of folderFiles) {
        const tags = file.tags || [];
        for (const tag of tags) {
          const tagWithHash = `#${tag}`;
          if (!tagMap.has(tagWithHash)) {
            tagMap.set(tagWithHash, {
              name: tagWithHash,
              count: 0,
              files: []
            });
          }
          const tagData = tagMap.get(tagWithHash)!;
          tagData.count++;
          if (!tagData.files.includes(file.relativePath)) {
            tagData.files.push(file.relativePath);
          }
        }
      }

      const tagDistribution = Array.from(tagMap.values())
        .sort((a, b) => b.count - a.count);

      const result = {
        folder: folderPath || 'root',
        totalFiles: folderFiles.length,
        tagDistribution
      };

      console.log(`📁 Folder '${folderPath || 'root'}' has ${tagDistribution.length} unique tags across ${folderFiles.length} files`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to get folder tag distribution for '${folderPath}':`, error);
      return { folder: folderPath, totalFiles: 0, tagDistribution: [] };
    }
  }

  /**
   * 建议标签
   */
  async suggestTags(filePath: string, limit: number = 5): Promise<string[]> {
    try {
      // 获取文件所在文件夹的标签分布
      const folderPath = this.getParentPath(filePath);
      const folderDistribution = await this.getFolderTagDistribution(folderPath || '');
      
      // 获取文件现有标签
      const existingTags = await this.getFileTags(filePath);
      const existingTagSet = new Set(existingTags);
      
      // 从文件夹常用标签中建议
      const suggestions = folderDistribution.tagDistribution
        .filter(tagData => !existingTagSet.has(tagData.name))
        .slice(0, limit)
        .map(tagData => tagData.name);

      console.log(`💡 Suggested ${suggestions.length} tags for '${filePath}'`);
      return suggestions;
    } catch (error) {
      console.error(`❌ Failed to suggest tags for '${filePath}':`, error);
      return [];
    }
  }

  // ===============================
  // 缓存管理
  // ===============================

  /**
   * 刷新标签缓存
   */
  async refreshCache(): Promise<void> {
    // 通过底层服务刷新缓存
    await this.metadataService.refreshCache();
    console.log('🔄 Tag cache refreshed');
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<Record<string, unknown>> {
    const metadataStats = await this.metadataService.getCacheStats();
    const tagStats = await this.getTagStats();

    return {
      vaultId: this.vaultConfig.id,
      ...tagStats,
      metadataStats
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
    this.metadataService.switchVault(vaultId);
    console.log(`🔄 TagService switched to vault: ${vaultId}`);
  }

  /**
   * 获取当前 vault 信息
   */
  getCurrentVault(): { id: string; path: string } {
    return {
      id: this.vaultConfig.id,
      path: this.vaultConfig.path
    };
  }

  // ===============================
  // 私有辅助方法
  // ===============================

  /**
   * 从 tags.json 读取标签数据
   */
  private async getTagsFromJson(): Promise<TagsJsonEntry[] | null> {
    try {
      const tagsJsonPath = '.obsidian/plugins/metadata-extractor/tags.json';
      const content = await this.storageService.readFile(tagsJsonPath);
      
      if (typeof content !== 'string') {
        console.warn('⚠️ tags.json content is not string');
        return null;
      }

      const tagsJson: TagsJsonEntry[] = JSON.parse(content);
      return Array.isArray(tagsJson) ? tagsJson : null;
    } catch (error) {
      console.warn('⚠️ Failed to read tags.json:', error);
      return null;
    }
  }

  /**
   * 从 metadata 计算标签（降级方案）
   */
  private async calculateTagsFromMetadata(options: TagSearchOptions = {}): Promise<TagData[]> {
    try {
      const metadata = await this.metadataService.getMetadata();
      if (!metadata) {
        return [];
      }

      const tagMap = new Map<string, TagData>();

      // 遍历所有文件，提取标签信息
      for (const fileInfo of metadata) {
        const tags = fileInfo.tags || [];
        const filePath = fileInfo.relativePath;

        for (const tag of tags) {
          const tagWithHash = `#${tag}`;
          
          if (!tagMap.has(tagWithHash)) {
            tagMap.set(tagWithHash, {
              name: tagWithHash,
              count: 0,
              files: []
            });
          }

          const tagData = tagMap.get(tagWithHash)!;
          tagData.count++;
          if (!tagData.files.includes(filePath)) {
            tagData.files.push(filePath);
          }
        }
      }

      let tags = Array.from(tagMap.values());
      tags = this.applySortingAndLimit(tags, options);

      console.log(`✅ Calculated ${tags.length} tags from metadata`);
      return tags;
    } catch (error) {
      console.error('❌ Failed to calculate tags from metadata:', error);
      return [];
    }
  }

  /**
   * 应用排序和限制选项
   */
  private applySortingAndLimit(tags: TagData[], options: TagSearchOptions): TagData[] {
    const { sortBy = 'count', sortOrder = 'desc', limit } = options;

    // 排序
    tags.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'count':
        case 'frequency':
          comparison = a.count - b.count;
          break;
        default:
          comparison = a.count - b.count;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 限制数量
    if (limit && limit > 0) {
      tags = tags.slice(0, limit);
    }

    return tags;
  }

  /**
   * 计算频率分布
   */
  private calculateFrequencyDistribution(tags: TagData[]): Array<{ range: string; count: number }> {
    const ranges = [
      { min: 1, max: 1, label: '1' },
      { min: 2, max: 5, label: '2-5' },
      { min: 6, max: 10, label: '6-10' },
      { min: 11, max: 20, label: '11-20' },
      { min: 21, max: Infinity, label: '20+' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: tags.filter(tag => tag.count >= range.min && tag.count <= range.max).length
    }));
  }

  /**
   * 获取空的标签统计信息
   */
  private getEmptyTagStats(): TagStats {
    return {
      totalTags: 0,
      totalFiles: 0,
      averageTagsPerFile: 0,
      averageFilesPerTag: 0,
      frequencyDistribution: []
    };
  }

  /**
   * 标准化路径
   */
  private normalizePath(path: string): string {
    return path.startsWith('/') ? path.slice(1) : path;
  }

  /**
   * 获取父路径
   */
  private getParentPath(filePath: string): string | null {
    const normalizedPath = this.normalizePath(filePath);
    const lastSlash = normalizedPath.lastIndexOf('/');
    return lastSlash > 0 ? normalizedPath.substring(0, lastSlash) : null;
  }
}

// ===============================
// 全局实例管理
// ===============================

let _globalTagService: TagService | null = null;

/**
 * 获取全局标签服务实例
 */
export function getTagService(): TagService | null {
  return _globalTagService;
}

/**
 * 初始化全局标签服务
 */
export function initializeTagService(
  metadataService: IMetadataService,
  storageService: IStorageService,
  vaultId?: string
): TagService {
  _globalTagService = new TagService(metadataService, storageService, vaultId);
  console.log(`✅ TagService initialized for vault: ${vaultId || 'Demo'}`);
  return _globalTagService;
}

/**
 * 销毁全局标签服务
 */
export function disposeTagService(): void {
  _globalTagService = null;
  console.log('🗑️ TagService disposed');
}