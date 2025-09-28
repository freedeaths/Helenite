/**
 * MetadataService - 元数据管理服务
 *
 * 负责从 Obsidian metadata-extractor 插件生成的 metadata.json 加载原始元数据
 * 基于 metadata-extractor 的接口规范，与缓存系统集成，支持多 vault 环境
 *
 * 架构设计：MetadataService 本身可以通过 CacheManager 创建缓存代理，实现透明缓存
 */

import { createVaultConfig, AVAILABLE_VAULTS } from '../config/vaultConfig.js';
import type { VaultPaths, VaultId } from '../config/vaultConfig.js';
import type {
  IMetadataService,
  MetadataArray,
  Metadata,
  HeadingData,
  Link,
  Backlink,
  FrontMatter,
} from './interfaces/IMetadataService.js';

// ===============================
// MetadataService 实现
// ===============================

export class MetadataService implements IMetadataService {
  private vaultConfig: VaultPaths;
  private cachedMetadata: MetadataArray | null = null;
  private baseUrl?: string;

  constructor(vaultId?: string, baseUrl?: string) {
    this.vaultConfig = createVaultConfig(vaultId || 'Demo');
    this.baseUrl = baseUrl;
  }

  // ===============================
  // 核心数据加载
  // ===============================

  /**
   * 解析URL - 支持测试环境的完整URL构建
   */
  private resolveUrl(relativePath: string): string {
    if (this.baseUrl) {
      // 测试环境：构建完整URL
      const basePath = this.baseUrl.replace(/\/+$/, ''); // 移除尾部斜杠
      const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
      return `${basePath}${normalizedPath}`;
    }
    // 生产环境：使用相对路径
    return relativePath;
  }

  /**
   * 获取元数据数组 - 从网络加载 metadata.json
   * 注意：这个方法可以通过 CacheManager 创建缓存代理来实现透明缓存
   */
  async getMetadata(): Promise<MetadataArray | null> {
    try {
      // 如果已有缓存的数据，直接返回
      if (this.cachedMetadata) {
        return this.cachedMetadata;
      }

      // 直接从网络加载 metadata.json
      const metadataUrl = this.resolveUrl(this.vaultConfig.getMetadataUrl());
      // console.log('🌐 Loading metadata from network...');
      // console.log('🔍 MetadataService URL:', metadataUrl);
      const response = await fetch(metadataUrl);

      if (!response.ok) {
        console.warn(`⚠️ Metadata not found for vault ${this.vaultConfig.id}`);
        return null;
      }

      const metadata = await response.json() as MetadataArray;

      this.cachedMetadata = metadata;
      // console.log(`✅ Metadata loaded: ${metadata.length} files`);

      return metadata;
    } catch (error) {
      console.error('❌ Failed to load metadata:', error);
      return null;
    }
  }

  // ===============================
  // 基础查询方法
  // ===============================

  /**
   * 获取单个文件的元数据
   */
  async getFileMetadata(filePath: string): Promise<Metadata | null> {
    const metadata = await this.getMetadata();
    if (!metadata) {
      return null;
    }

    // 标准化路径（移除开头的斜杠）
    const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

    return metadata.find(file => file.relativePath === normalizedPath) || null;
  }

  /**
   * 获取所有文件的元数据
   */
  async getAllFiles(): Promise<MetadataArray> {
    const metadata = await this.getMetadata();
    return metadata || [];
  }

  /**
   * 根据文件名查找文件（不含扩展名）
   */
  async getFileByName(fileName: string): Promise<Metadata | null> {
    const metadata = await this.getMetadata();
    if (!metadata) {
      return null;
    }

    return metadata.find(file => file.fileName === fileName) || null;
  }

  /**
   * 获取具有指定标签的所有文件
   */
  async getFilesByTag(tag: string): Promise<MetadataArray> {
    const metadata = await this.getMetadata();
    if (!metadata) {
      return [];
    }

    return metadata.filter(file =>
      file.tags?.includes(tag)
    );
  }

  /**
   * 获取所有唯一标签
   */
  async getAllTags(): Promise<string[]> {
    const metadata = await this.getMetadata();
    if (!metadata) {
      return [];
    }

    const tagSet = new Set<string>();
    metadata.forEach(file => {
      file.tags?.forEach(tag => tagSet.add(tag));
    });

    return Array.from(tagSet).sort();
  }


  /**
   * 获取文件的出链
   */
  async getFileLinks(filePath: string): Promise<Link[]> {
    const fileMetadata = await this.getFileMetadata(filePath);
    return fileMetadata?.links || [];
  }

  /**
   * 获取文件的入链
   */
  async getFileBacklinks(filePath: string): Promise<Backlink[]> {
    const fileMetadata = await this.getFileMetadata(filePath);
    return fileMetadata?.backlinks || [];
  }

  /**
   * 获取文件的标题结构
   */
  async getFileHeadings(filePath: string): Promise<HeadingData[]> {
    const fileMetadata = await this.getFileMetadata(filePath);
    return fileMetadata?.headings || [];
  }

  /**
   * 获取文件的别名
   */
  async getFileAliases(filePath: string): Promise<string[]> {
    const fileMetadata = await this.getFileMetadata(filePath);
    return fileMetadata?.aliases || [];
  }

  /**
   * 获取文件的前言数据
   */
  async getFileFrontMatter(filePath: string): Promise<FrontMatter | null> {
    const fileMetadata = await this.getFileMetadata(filePath);
    return fileMetadata?.frontmatter || null;
  }

  // ===============================
  // 实用查询方法
  // ===============================

  /**
   * 检查文件是否存在于元数据中
   */
  async hasFile(filePath: string): Promise<boolean> {
    const fileMetadata = await this.getFileMetadata(filePath);
    return fileMetadata !== null;
  }

  /**
   * 获取链接到指定文件的所有文件
   */
  async getFilesLinkingTo(targetPath: string): Promise<MetadataArray> {
    const metadata = await this.getMetadata();
    if (!metadata) {
      return [];
    }

    const normalizedTarget = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;

    return metadata.filter(file =>
      file.links?.some(link =>
        link.relativePath === normalizedTarget ||
        link.cleanLink === normalizedTarget ||
        link.link.includes(normalizedTarget)
      )
    );
  }

  /**
   * 搜索包含指定文本的文件（基于元数据）
   */
  async searchInMetadata(query: string): Promise<MetadataArray> {
    const metadata = await this.getMetadata();
    if (!metadata) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    return metadata.filter(file => {
      // 文件名匹配
      if (file.fileName.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // 路径匹配
      if (file.relativePath.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // 标签匹配
      if (file.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        return true;
      }

      // 别名匹配
      if (file.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery))) {
        return true;
      }

      // 标题匹配
      if (file.headings?.some(heading => heading.heading.toLowerCase().includes(lowerQuery))) {
        return true;
      }

      // 前言数据匹配
      if (file.frontmatter) {
        const frontmatterText = JSON.stringify(file.frontmatter).toLowerCase();
        if (frontmatterText.includes(lowerQuery)) {
          return true;
        }
      }

      return false;
    });
  }

  // ===============================
  // 缓存管理
  // ===============================

  /**
   * 刷新缓存 - 清理内存缓存并重新加载
   * 注意：如果使用了 CacheManager 的缓存代理，需要通过 CacheManager 清理缓存
   */
  async refreshCache(): Promise<void> {
    // 清理本地缓存
    this.cachedMetadata = null;

    // 重新加载
    await this.getMetadata();

    // console.log('🔄 Metadata cache refreshed');
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<Record<string, unknown>> {
    return {
      vaultId: this.vaultConfig.id,
      hasLocalCache: this.cachedMetadata !== null,
      fileCount: this.cachedMetadata?.length || 0
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
    this.cachedMetadata = null;
    // console.log(`🔄 Switched to vault: ${vaultId}`);
  }

  /**
   * 获取当前 vault 信息
   */
  getCurrentVault(): { id: string, path: string } {
    return {
      id: this.vaultConfig.id,
      path: this.vaultConfig.path
    };
  }

  /**
   * 获取可用的 vault 列表
   */
  static getAvailableVaults(): readonly VaultId[] {
    return AVAILABLE_VAULTS;
  }
}

// ===============================
// 全局实例管理（可以通过 CacheManager 创建缓存代理）
// ===============================

let _globalMetadataService: MetadataService | null = null;

/**
 * 获取全局元数据服务实例
 */
export function getMetadataService(): MetadataService {
  if (!_globalMetadataService) {
    _globalMetadataService = new MetadataService();
  }
  return _globalMetadataService;
}

/**
 * 初始化全局元数据服务
 */
export function initializeMetadataService(vaultId?: string): MetadataService {
  _globalMetadataService = new MetadataService(vaultId);
  // console.log(`✅ MetadataService initialized for vault: ${vaultId || 'Demo'}`);
  return _globalMetadataService;
}

/**
 * 销毁全局元数据服务
 */
export function disposeMetadataService(): void {
  _globalMetadataService = null;
  // console.log('🗑️ MetadataService disposed');
}