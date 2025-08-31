import type { ITagAPI, TagData } from '../../interfaces/ITagAPI';
import { fetchVault } from '../../../utils/fetchWithAuth';

/**
 * 本地标签 API 实现
 * 基于 PHP 版本的标签处理逻辑 (helper.php:505-529)
 * 从 metadata.json 的 tags 字段提取和管理标签数据
 */
export class LocalTagAPI implements ITagAPI {
  private baseUrl: string;
  private metadataCache: any[] | null = null;
  private tagsCache: Map<string, TagData> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取 metadata.json 数据
   */
  private async getMetadata(): Promise<any[]> {
    if (this.metadataCache) {
      return this.metadataCache;
    }

    try {
      const response = await fetchVault(`${this.baseUrl}/metadata.json`);
      if (!response.ok) {
        console.warn('metadata.json not found, no tags available');
        return [];
      }
      
      this.metadataCache = await response.json();
      return this.metadataCache || [];
    } catch (error) {
      console.warn('Failed to load metadata.json:', error);
      return [];
    }
  }

  /**
   * 构建标签缓存，复刻 PHP 图谱生成中的标签处理逻辑
   */
  private async buildTagsCache(): Promise<Map<string, TagData>> {
    if (this.tagsCache) {
      return this.tagsCache;
    }

    const metadata = await this.getMetadata();
    const tagMap = new Map<string, TagData>();

    // 遍历所有文件，提取标签信息 (复刻 PHP helper.php:505-529)
    metadata.forEach(fileInfo => {
      const tags = fileInfo.tags || [];
      const filePath = fileInfo.relativePath;

      // 处理每个标签（复刻 PHP 逻辑）
      tags.forEach((tag: string) => {
        const tagWithHash = `#${tag}`; // 添加 # 前缀，与 PHP 版本保持一致
        
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
      });
    });

    this.tagsCache = tagMap;
    return tagMap;
  }

  /**
   * 获取所有标签
   * 从 metadata.json 的 tags 字段提取所有标签
   */
  async getAllTags(): Promise<TagData[]> {
    const tagMap = await this.buildTagsCache();
    
    // 转换为数组并按使用频率排序
    const tags = Array.from(tagMap.values()).sort((a, b) => {
      // 首先按使用频率排序
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      // 相同频率按字母顺序
      return a.name.localeCompare(b.name);
    });

    return tags;
  }

  /**
   * 获取文件的所有标签
   * @param filePath 文件路径
   * @returns 标签数组（包含 # 前缀）
   */
  async getFileTags(filePath: string): Promise<string[]> {
    const metadata = await this.getMetadata();
    
    // 标准化文件路径 - 移除前导斜杠以匹配 metadata.json 格式
    const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const fileInfo = metadata.find(f => f.relativePath === normalizedPath);
    
    if (!fileInfo) {
      console.warn(`File not found in metadata: ${filePath} (normalized: ${normalizedPath})`);
      return [];
    }

    const tags = fileInfo.tags || [];
    
    // 添加 # 前缀并返回（与 PHP 版本保持一致）
    return tags.map((tag: string) => `#${tag}`).sort();
  }

  /**
   * 根据标签获取文件列表
   * @param tag 标签名（可以包含或不包含 # 前缀）
   * @returns 包含该标签的文件路径数组
   */
  async getFilesByTag(tag: string): Promise<string[]> {
    const tagMap = await this.buildTagsCache();
    
    // 标准化标签名（确保有 # 前缀）
    const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
    
    const tagData = tagMap.get(normalizedTag);
    return tagData ? tagData.files : [];
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.metadataCache = null;
    this.tagsCache = null;
  }
}