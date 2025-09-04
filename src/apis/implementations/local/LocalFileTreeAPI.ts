import type { IFileTreeAPI, FileTree, FileMetadata, FolderStats } from '../../interfaces';
import { getVaultConfig, isFolderExcluded, isFileExcluded, isPathInExcludedFolder } from '../../../config/vaultConfig';
import { VAULT_PATH } from '../../../config/env';
import { fetchVault } from '../../../utils/fetchWithAuth';

/**
 * 基于 metadata.json 的文件树 API 实现
 * 复刻 PHP 版本的 menu() 函数逻辑
 */
export class LocalFileTreeAPI implements IFileTreeAPI {
  // baseUrl 参数保留用于接口兼容性，但现在使用 VAULT_PATH
  constructor(baseUrl: string = '/vault') {
    // 使用 VAULT_PATH 而不是 baseUrl
    console.log(`LocalFileTreeAPI initialized with baseUrl: ${baseUrl}, using VAULT_PATH: ${VAULT_PATH}`);
  }
  
  /**
   * 获取完整的文件树结构
   * 基于 metadata.json 构建，按 PHP 版本的排序规则
   */
  async getFileTree(): Promise<FileTree[]> {
    try {
      const metadata = await this.getMetadata();
      return await this.buildTreeFromMetadata(metadata);
    } catch (error) {
      console.error('Failed to load file tree from metadata:', error);
      throw new Error('Unable to load file tree. Please check if metadata.json exists.');
    }
  }
  
  /**
   * 选择文件（触发文件选中事件）
   */
  async selectFile(path: string): Promise<void> {
    // TODO: 可以在这里触发全局事件或更新状态
    console.log('File selected:', path);
    
    // 可以使用事件系统或者直接调用 vaultStore
    // eventBus.emit('file-selected', path);
  }
  
  /**
   * 展开文件夹（当前实现不需要懒加载，直接返回子项）
   */
  async expandFolder(path: string): Promise<FileTree[]> {
    const tree = await this.getFileTree();
    const folder = this.findFolderByPath(tree, path);
    return folder?.children || [];
  }
  
  /**
   * 获取文件夹统计信息
   */
  async getFolderStats(path?: string): Promise<FolderStats> {
    const tree = await this.getFileTree();
    const targetFolder = path ? this.findFolderByPath(tree, path) : null;
    const items = targetFolder?.children || tree;
    
    const stats = this.calculateFolderStats(items);
    return stats;
  }
  
  // ==================== 私有方法 ====================
  
  /**
   * 获取 metadata.json 数据
   */
  private async getMetadata(): Promise<any[]> {
    const response = await fetchVault(`${VAULT_PATH}/metadata.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }
    return response.json();
  }
  
  /**
   * 从 metadata.json 构建文件树
   * 复刻 PHP menu() 函数的逻辑，应用文件夹过滤
   */
  private async buildTreeFromMetadata(metadata: any[]): Promise<FileTree[]> {
    const config = getVaultConfig();
    
    // 1. 提取所有路径并构建路径映射
    const pathMap = new Map<string, FileMetadata>();
    const allPaths = new Set<string>();
    
    // 添加 metadata.json 中的 markdown 文件
    metadata.forEach(item => {
      if (item.relativePath) {
        const path = this.normalizePath(item.relativePath);
        
        // 检查文件路径是否在被排除的文件夹中
        if (isPathInExcludedFolder(path, config)) {
          console.log(`🚫 Filtering file in excluded folder: ${path}`);
          return; // 跳过此文件
        }
        
        // 检查文件是否被排除
        if (isFileExcluded(item.fileName || '', config)) {
          console.log(`🚫 Filtering excluded file: ${item.fileName}`);
          return; // 跳过此文件
        }
        
        pathMap.set(path, this.convertMetadata(item));
        allPaths.add(path);
        
        // 添加父目录路径（但排除被过滤的文件夹）
        this.addParentPaths(path, allPaths, config);
      }
    });

    console.log(`📁 File tree: processed ${allPaths.size} paths (excluded folders: ${config.excludedFolders.join(', ')})`);
    
    // 注意: 不再扫描附件文件，因为 Attachments 文件夹已被默认排除
    // 如果用户需要显示特定附件，可以从 excludedFolders 中移除 'Attachments'
    
    // 2. 构建树状结构
    const root: FileTree[] = [];
    const folderMap = new Map<string, FileTree>();
    
    // 按路径深度排序，确保父文件夹先创建
    const sortedPaths = Array.from(allPaths).sort((a, b) => {
      const depthA = (a.match(/\//g) || []).length;
      const depthB = (b.match(/\//g) || []).length;
      if (depthA !== depthB) return depthA - depthB;
      
      // 同深度时使用 PHP 的自定义排序（下划线优先）
      return this.phpCustomSort(a, b);
    });
    
    sortedPaths.forEach(path => {
      const isFile = pathMap.has(path);
      const parentPath = this.getParentPath(path);
      const name = this.getFileName(path);
      
      const node: FileTree = {
        name: isFile ? name.replace(/\\.md$/, '') : name, // 移除 .md 扩展名
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
    
    return root;
  }
  
  /**
   * 转换 metadata 格式
   */
  private convertMetadata(item: any): FileMetadata {
    return {
      fileName: item.fileName || '',
      relativePath: item.relativePath || '',
      title: item.fileName,
      tags: item.tags || [],
      aliases: item.aliases || [],
      frontmatter: item.frontmatter || {},
      headings: item.headings || [],
      links: item.links || [],
      backlinks: item.backlinks || []
    };
  }
  
  /**
   * PHP 自定义排序：下划线优先
   * 复刻 PHP cmp() 函数
   */
  private phpCustomSort(a: string, b: string): number {
    const aTemp = a.replace(/_/g, '0');
    const bTemp = b.replace(/_/g, '0');
    return aTemp.localeCompare(bTemp, undefined, { numeric: true, caseFirst: 'lower' });
  }
  
  /**
   * 标准化路径（移除开头的斜杠）
   */
  private normalizePath(path: string): string {
    return path.replace(/^\/+/, '');
  }
  
  /**
   * 添加父目录路径到集合中，排除被过滤的文件夹
   */
  private addParentPaths(path: string, pathSet: Set<string>, config = getVaultConfig()): void {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join('/');
      if (parentPath) {
        // 检查父目录是否在排除列表中
        const folderName = parts[i - 1];
        if (!isFolderExcluded(folderName, config)) {
          pathSet.add(parentPath);
        } else {
          console.log(`🚫 Filtering excluded parent folder: ${folderName} in path ${parentPath}`);
        }
      }
    }
  }
  
  /**
   * 获取父目录路径
   */
  private getParentPath(path: string): string | null {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash > 0 ? path.substring(0, lastSlash) : null;
  }
  
  /**
   * 获取文件/文件夹名
   */
  private getFileName(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
  }
  
  /**
   * 在文件树中查找指定路径的文件夹
   */
  private findFolderByPath(tree: FileTree[], path: string): FileTree | null {
    for (const node of tree) {
      if (node.path === path && node.type === 'folder') {
        return node;
      }
      if (node.children) {
        const found = this.findFolderByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }
  

  /**
   * 计算文件夹统计信息
   */
  private calculateFolderStats(items: FileTree[]): FolderStats {
    let totalFiles = 0;
    let totalFolders = 0;
    
    const countItems = (nodes: FileTree[]) => {
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
      lastModified: new Date().toISOString() // 暂时使用当前时间
    };
  }
}