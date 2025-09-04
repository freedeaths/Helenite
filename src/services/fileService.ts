import type { FileTree, FileMetadata } from '../types/vault';
import { VAULT_PATH } from '../config/env';
import { fetchVault } from '../utils/fetchWithAuth';

export class FileService {
  // 基础路径 - 使用配置的 Vault 目录
  private static readonly BASE_PATH = VAULT_PATH;
  
  /**
   * 获取文件树结构
   */
  static async loadVaultStructure(): Promise<FileTree[]> {
    try {
      // 先返回模拟数据，后续可以通过 API 动态获取
      const mockFileTree: FileTree[] = [
        {
          name: 'Welcome.md',
          path: '/Welcome.md',
          type: 'file',
          metadata: {
            title: '欢迎',
            created: '2024-08-25',
            modified: '2024-08-25'
          }
        },
        {
          name: 'Trips',
          path: '/Trips',
          type: 'folder',
          children: [
            {
              name: 'Dream-Destinations.md',
              path: '/Trips/Dream-Destinations.md',
              type: 'file',
              metadata: {
                title: '梦想目的地',
                tags: ['旅行', '日本', '中国'],
                created: '2024-08-25',
                modified: '2024-08-25'
              }
            },
            {
              name: 'Visited-Places.md',
              path: '/Trips/Visited-Places.md',
              type: 'file',
              metadata: {
                title: '已访问地点',
                tags: ['旅行'],
                created: '2024-08-25',
                modified: '2024-08-25'
              }
            },
            {
              name: 'Plans',
              path: '/Trips/Plans',
              type: 'folder',
              children: [
                {
                  name: '春岚樱语——北九州初体验.md',
                  path: '/Trips/Plans/春岚樱语——北九州初体验.md',
                  type: 'file',
                  metadata: {
                    title: '春岚樱语——北九州初体验',
                    tags: ['旅行', '日本', '樱花'],
                    created: '2024-08-25',
                    modified: '2024-08-25'
                  }
                },
                {
                  name: '本应慵懒的河口湖--完美逆富士之旅.md',
                  path: '/Trips/Plans/本应慵懒的河口湖--完美逆富士之旅.md',
                  type: 'file',
                  metadata: {
                    title: '本应慵懒的河口湖--完美逆富士之旅',
                    tags: ['旅行', '日本', '富士山'],
                    created: '2024-08-25',
                    modified: '2024-08-25'
                  }
                }
              ]
            }
          ]
        },
        {
          name: 'LLM',
          path: '/LLM',
          type: 'folder',
          children: [
            {
              name: 'Multi-agent-Voyager-Play-Minecraft.md',
              path: '/LLM/Multi-agent-Voyager-Play-Minecraft.md',
              type: 'file',
              metadata: {
                title: 'Multi-agent Voyager Play Minecraft',
                tags: ['AI', 'LLM', 'Multi-agent'],
                created: '2024-08-25',
                modified: '2024-08-25'
              }
            }
          ]
        }
      ];
      
      return mockFileTree;
    } catch (error) {
      console.error('Failed to load vault structure:', error);
      throw new Error('无法加载文件结构');
    }
  }
  
  /**
   * 获取文件内容
   */
  static async getFileContent(path: string): Promise<string> {
    try {
      // 移除开头的斜杠，构建实际的文件路径
      const cleanPath = path.replace(/^\//, '');
      const fullPath = `${this.BASE_PATH}/${cleanPath}`;
      
      console.log('Loading file from:', fullPath);
      
      // 使用 fetch 获取文件内容
      const response = await fetchVault(fullPath);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`文件未找到: ${path}`);
        }
        throw new Error(`加载文件失败: ${response.statusText}`);
      }
      
      const content = await response.text();
      
      // 检查是否返回了HTML页面而不是Markdown文件
      if (content.includes('<!doctype html>') || content.includes('<html')) {
        throw new Error(`服务器返回了HTML页面而不是文件内容，请检查文件路径: ${fullPath}`);
      }
      
      return content;
    } catch (error) {
      console.error(`Failed to load file: ${path}`, error);
      throw error;
    }
  }
  
  /**
   * 获取文件元数据
   */
  static async getMetadata(): Promise<Record<string, FileMetadata>> {
    try {
      const response = await fetchVault(`${this.BASE_PATH}/metadata.json`);
      
      if (!response.ok) {
        console.warn('Metadata file not found, using fallback');
        return {};
      }
      
      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.warn('Failed to load metadata:', error);
      return {};
    }
  }
  
  /**
   * 搜索文件
   */
  static async searchFiles(_query: string): Promise<any[]> {
    // TODO: 实现搜索功能
    return [];
  }
}