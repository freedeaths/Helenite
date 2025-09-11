/**
 * FileTreeService - 文件树服务
 * 
 * 基于 MetadataService 构建文件树结构，提供高效的文件树操作
 * 复刻 LocalFileTreeAPI 的逻辑，但作为独立的服务层
 * 
 * 架构设计：FileTreeService 通过 CacheManager 实现透明缓存
 */

import { VaultPaths, createVaultConfig, VaultId, getVaultConfig, isFolderExcluded, isFileExcluded, isPathInExcludedFolder } from '../config/vaultConfig.js';
import type { 
  IFileTreeService, 
  FileTreeNode, 
  FileNodeMetadata, 
  FolderStats, 
  FileTreeOptions 
} from './interfaces/IFileTreeService.js';
import type { IMetadataService, MetadataArray, Metadata } from './interfaces/IMetadataService.js';

// ===============================
// FileTreeService 实现
// ===============================

export class FileTreeService implements IFileTreeService {
  private vaultConfig: VaultPaths;
  private metadataService: IMetadataService;

  constructor(metadataService: IMetadataService, vaultId?: string) {
    this.vaultConfig = createVaultConfig(vaultId || 'Demo');
    this.metadataService = metadataService;
  }

  // ===============================
  // 核心文件树操作
  // ===============================

  /**
   * 获取完整的文件树结构
   * 复刻 LocalFileTreeAPI.buildTreeFromMetadata 的逻辑
   */
  async getFileTree(options: FileTreeOptions = {}): Promise<FileTreeNode[]> {
    try {
      const metadata = await this.metadataService.getMetadata();
      if (!metadata) {
        return [];
      }

      return this.buildTreeFromMetadata(metadata, options);
    } catch (error) {
      console.error('❌ Failed to build file tree:', error);
      return [];
    }
  }

  /**
   * 获取指定路径的子节点
   */
  async getChildren(path: string): Promise<FileTreeNode[]> {
    const tree = await this.getFileTree();
    const node = this.findNodeInTree(tree, path);
    return node?.children || [];
  }

  /**
   * 查找指定路径的节点
   */
  async findNode(path: string): Promise<FileTreeNode | null> {
    const tree = await this.getFileTree();
    return this.findNodeInTree(tree, path);
  }

  /**
   * 检查路径是否存在
   */
  async pathExists(path: string): Promise<boolean> {
    const node = await this.findNode(path);
    return node !== null;
  }

  // ===============================
  // 文件夹操作
  // ===============================

  /**
   * 获取文件夹统计信息
   */
  async getFolderStats(path?: string): Promise<FolderStats> {
    const tree = await this.getFileTree();
    const targetNode = path ? this.findNodeInTree(tree, path) : null;
    const items = targetNode?.children || tree;

    return this.calculateFolderStats(items);
  }

  /**
   * 获取所有文件夹路径
   */
  async getAllFolders(): Promise<string[]> {
    const tree = await this.getFileTree();
    const folders: string[] = [];
    
    this.collectFolders(tree, folders);
    return folders.sort();
  }

  /**
   * 获取根级文件夹
   */
  async getRootFolders(): Promise<FileTreeNode[]> {
    const tree = await this.getFileTree();
    return tree.filter(node => node.type === 'folder');
  }

  // ===============================
  // 文件操作
  // ===============================

  /**
   * 获取所有文件路径
   */
  async getAllFiles(): Promise<string[]> {
    const tree = await this.getFileTree();
    const files: string[] = [];
    
    this.collectFiles(tree, files);
    return files.sort();
  }

  /**
   * 按文件夹分组获取文件
   */
  async getFilesByFolder(folderPath?: string): Promise<FileTreeNode[]> {
    const tree = await this.getFileTree();
    
    if (!folderPath) {
      // 返回根级文件
      return tree.filter(node => node.type === 'file');
    }

    const folder = this.findNodeInTree(tree, folderPath);
    if (!folder || folder.type !== 'folder') {
      return [];
    }

    return folder.children?.filter(node => node.type === 'file') || [];
  }

  /**
   * 搜索文件名（支持模糊匹配）
   */
  async searchFiles(query: string): Promise<FileTreeNode[]> {
    const allFiles = await this.getAllFiles();
    const tree = await this.getFileTree();
    const results: FileTreeNode[] = [];
    const lowerQuery = query.toLowerCase();

    for (const filePath of allFiles) {
      const node = this.findNodeInTree(tree, filePath);
      if (node && node.type === 'file') {
        // 搜索文件名和路径
        if (node.name.toLowerCase().includes(lowerQuery) || 
            node.path.toLowerCase().includes(lowerQuery)) {
          results.push(node);
        }
        
        // 搜索标签和别名
        if (node.metadata) {
          const matchesTags = node.metadata.tags?.some(tag => 
            tag.toLowerCase().includes(lowerQuery)
          );
          const matchesAliases = node.metadata.aliases?.some(alias => 
            alias.toLowerCase().includes(lowerQuery)
          );
          
          if (matchesTags || matchesAliases) {
            results.push(node);
          }
        }
      }
    }

    // 去重并返回
    return Array.from(new Map(results.map(node => [node.path, node])).values());
  }

  // ===============================
  // 实用方法
  // ===============================

  /**
   * 标准化路径
   */
  normalizePath(path: string): string {
    return path.replace(/^\/+/, '');
  }

  /**
   * 获取父路径
   */
  getParentPath(path: string): string | null {
    const normalized = this.normalizePath(path);
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash > 0 ? normalized.substring(0, lastSlash) : null;
  }

  /**
   * 获取文件/文件夹名
   */
  getNodeName(path: string): string {
    const normalized = this.normalizePath(path);
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
  }

  /**
   * 检查是否为文件路径（以.md结尾）
   */
  isFilePath(path: string): boolean {
    return path.toLowerCase().endsWith('.md');
  }

  // ===============================
  // 缓存管理
  // ===============================

  /**
   * 刷新文件树缓存
   */
  async refreshCache(): Promise<void> {
    // 通过 MetadataService 刷新底层缓存
    await this.metadataService.refreshCache();
    console.log('🔄 FileTree cache refreshed');
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<Record<string, unknown>> {
    const metadataStats = await this.metadataService.getCacheStats();
    const tree = await this.getFileTree();
    const stats = this.calculateFolderStats(tree);

    return {
      vaultId: this.vaultConfig.id,
      ...stats,
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
    console.log(`🔄 FileTreeService switched to vault: ${vaultId}`);
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
  // 私有方法 - 复刻 LocalFileTreeAPI 逻辑
  // ===============================

  /**
   * 从 metadata 构建文件树
   * 复刻 LocalFileTreeAPI.buildTreeFromMetadata 的核心逻辑
   */
  private buildTreeFromMetadata(metadata: MetadataArray, options: FileTreeOptions = {}): FileTreeNode[] {
    const config = getVaultConfig();
    
    // 1. 提取所有路径并构建路径映射
    const pathMap = new Map<string, FileNodeMetadata>();
    const allPaths = new Set<string>();
    
    // 添加 metadata.json 中的 markdown 文件
    metadata.forEach(item => {
      if (item.relativePath) {
        const path = this.normalizePath(item.relativePath);
        
        // 应用过滤规则（如果启用）
        if (options.applyFolderFilters !== false) {
          if (isPathInExcludedFolder(path, config)) {
            return; // 跳过被排除文件夹中的文件
          }
          
          if (isFileExcluded(item.fileName || '', config)) {
            return; // 跳过被排除的文件
          }
        }
        
        pathMap.set(path, this.convertMetadata(item));
        allPaths.add(path);
        
        // 添加父目录路径（但排除被过滤的文件夹）
        this.addParentPaths(path, allPaths, config, options);
      }
    });

    console.log(`📁 FileTreeService: processed ${allPaths.size} paths`);
    
    // 2. 构建树状结构
    const root: FileTreeNode[] = [];
    const folderMap = new Map<string, FileTreeNode>();
    
    // 按路径深度排序，确保父文件夹先创建
    const sortedPaths = Array.from(allPaths).sort((a, b) => {
      const depthA = (a.match(/\//g) || []).length;
      const depthB = (b.match(/\//g) || []).length;
      if (depthA !== depthB) return depthA - depthB;
      
      // 同深度时使用自定义排序或 PHP 排序
      return options.customSort ? 
        options.customSort(
          { name: a, path: a, type: 'file' }, 
          { name: b, path: b, type: 'file' }
        ) : 
        this.phpCustomSort(a, b);
    });
    
    sortedPaths.forEach(path => {
      const isFile = pathMap.has(path);
      const parentPath = this.getParentPath(path);
      const name = this.getNodeName(path);
      
      const node: FileTreeNode = {
        name: isFile ? name.replace(/\.md$/, '') : name, // 移除 .md 扩展名
        path: `/${path}`,
        type: isFile ? 'file' : 'folder',
        metadata: pathMap.get(path),
        children: isFile ? undefined : []
      };
      
      if (parentPath) {
        // 添加到父文件夹
        const parentFolder = folderMap.get(parentPath);
        if (parentFolder) {
          parentFolder.children!.push(node);
        }
      } else {
        // 根级项目
        root.push(node);
      }
      
      if (!isFile) {
        folderMap.set(path, node);
      }
    });
    
    // 3. 如果不包含空文件夹，过滤掉空文件夹
    if (options.includeEmptyFolders === false) {
      this.removeEmptyFolders(root);
    }
    
    return root;
  }

  /**
   * 转换 metadata 格式为 FileNodeMetadata
   */
  private convertMetadata(item: Metadata): FileNodeMetadata {
    return {
      fileName: item.fileName || '',
      relativePath: item.relativePath || '',
      tags: item.tags || [],
      aliases: item.aliases || [],
      headingCount: item.headings?.length || 0,
      linkCount: item.links?.length || 0,
      backlinkCount: item.backlinks?.length || 0
    };
  }

  /**
   * PHP 自定义排序：下划线优先
   * 复刻 LocalFileTreeAPI.phpCustomSort
   */
  private phpCustomSort(a: string, b: string): number {
    const aTemp = a.replace(/_/g, '0');
    const bTemp = b.replace(/_/g, '0');
    return aTemp.localeCompare(bTemp, undefined, { numeric: true, caseFirst: 'lower' });
  }

  /**
   * 添加父目录路径到集合中
   * 复刻 LocalFileTreeAPI.addParentPaths
   */
  private addParentPaths(
    path: string, 
    pathSet: Set<string>, 
    config = getVaultConfig(), 
    options: FileTreeOptions = {}
  ): void {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join('/');
      if (parentPath) {
        // 应用过滤规则（如果启用）
        if (options.applyFolderFilters !== false) {
          const folderName = parts[i - 1];
          if (isFolderExcluded(folderName, config)) {
            continue; // 跳过被排除的文件夹
          }
        }
        pathSet.add(parentPath);
      }
    }
  }

  /**
   * 在文件树中查找指定路径的节点
   */
  private findNodeInTree(tree: FileTreeNode[], path: string): FileTreeNode | null {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    for (const node of tree) {
      if (node.path === normalizedPath) {
        return node;
      }
      if (node.children) {
        const found = this.findNodeInTree(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 计算文件夹统计信息
   */
  private calculateFolderStats(items: FileTreeNode[]): FolderStats {
    let totalFiles = 0;
    let totalFolders = 0;
    
    const countItems = (nodes: FileTreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'file') {
          totalFiles++;
        } else if (node.type === 'folder') {
          totalFolders++;
          if (node.children) {
            countItems(node.children);
          }
        }
      });
    };
    
    countItems(items);
    
    return {
      totalFiles,
      totalFolders,
      lastModified: new Date().toISOString()
    };
  }

  /**
   * 收集所有文件夹路径
   */
  private collectFolders(tree: FileTreeNode[], folders: string[]): void {
    tree.forEach(node => {
      if (node.type === 'folder') {
        folders.push(node.path);
        if (node.children) {
          this.collectFolders(node.children, folders);
        }
      }
    });
  }

  /**
   * 收集所有文件路径
   */
  private collectFiles(tree: FileTreeNode[], files: string[]): void {
    tree.forEach(node => {
      if (node.type === 'file') {
        files.push(node.path);
      } else if (node.children) {
        this.collectFiles(node.children, files);
      }
    });
  }

  /**
   * 移除空文件夹
   */
  private removeEmptyFolders(tree: FileTreeNode[]): void {
    for (let i = tree.length - 1; i >= 0; i--) {
      const node = tree[i];
      if (node.type === 'folder' && node.children) {
        // 递归处理子文件夹
        this.removeEmptyFolders(node.children);
        
        // 如果没有子项，移除此文件夹
        if (node.children.length === 0) {
          tree.splice(i, 1);
        }
      }
    }
  }
}

// ===============================
// 全局实例管理（可以通过 CacheManager 创建缓存代理）
// ===============================

let _globalFileTreeService: FileTreeService | null = null;

/**
 * 获取全局文件树服务实例
 * 注意：需要先设置 MetadataService
 */
export function getFileTreeService(): FileTreeService | null {
  return _globalFileTreeService;
}

/**
 * 初始化全局文件树服务
 */
export function initializeFileTreeService(metadataService: IMetadataService, vaultId?: string): FileTreeService {
  _globalFileTreeService = new FileTreeService(metadataService, vaultId);
  console.log(`✅ FileTreeService initialized for vault: ${vaultId || 'Demo'}`);
  return _globalFileTreeService;
}

/**
 * 销毁全局文件树服务
 */
export function disposeFileTreeService(): void {
  _globalFileTreeService = null;
  console.log('🗑️ FileTreeService disposed');
}