/**
 * 统一 Vault 服务管理 Hook
 * 集成缓存管理，提供高质量的数据访问接口
 * 不再依赖 VaultService 类，直接管理所有服务
 */
import { useMemo, useCallback, useEffect } from 'react';
import { useVaultStore } from '../stores/vaultStore.js';
import { VAULT_CONFIG } from '../config/vaultConfig.js';

// 导入所有必需的服务
import { StorageService } from '../services/infra/StorageService.js';
import { MetadataService } from '../services/MetadataService.js';
import { FileTreeService } from '../services/FileTreeService.js';
import { SearchService } from '../services/SearchService.js';
import { GraphService } from '../services/GraphService.js';
import { TagService } from '../services/TagService.js';
import { FootprintsService } from '../services/FootprintsService.js';
import { FrontMatterService } from '../services/FrontMatterService.js';
import { ExifService } from '../services/ExifService.js';
import { CacheManager } from '../services/CacheManager.js';

// 导入类型定义
import type { FileTree } from '../services/interfaces/IFileTreeService.js';
import type { TagData } from '../services/interfaces/ITagService.js';
import type { GraphNode, GraphEdge } from '../services/interfaces/IGraphService.js';
import type { SearchResult } from '../services/interfaces/ISearchAPI.js';
import type { FootprintsData } from '../services/interfaces/IFootprintsService.js';

/**
 * 统一的 Vault API 接口
 * 整合所有服务功能，提供缓存优化
 */
export interface VaultAPI {
  // === 系统管理 ===
  getVaultInfo(): Promise<{
    name: string;
    path: string;
    hasMetadata: boolean;
    supportedFeatures: {
      graphView: boolean;
      tagSearch: boolean;
      advancedSearch: boolean;
      fileLinks: boolean;
      footprints: boolean;
    };
  }>;

  getVaultStatistics(): Promise<{
    totalDocuments: number;
    totalFolders: number;
    totalTags: number;
    totalLinks: number;
    graphNodes: number;
    graphEdges: number;
    trackFiles: number;
  }>;

  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    details: string[];
  }>;

  // === 文档管理 ===
  getDocumentContent(path: string): Promise<string>;
  getDocumentInfo(path: string): Promise<{
    title: string;
    tags: string[];
    aliases: string[];
    frontmatter: Record<string, any>;
    headings: Array<{ level: number; text: string; id: string }>;
    links: Array<{ path: string; text: string }>;
    backlinks: Array<{ path: string; text: string }>;
  }>;

  // 复杂的文档上下文获取（编排多个服务）
  getDocumentWithContext(path: string): Promise<{
    content: string;
    metadata: any;
    localGraph: { nodes: GraphNode[]; edges: GraphEdge[] };
    backlinks: Array<{ path: string; text: string }>;
    hasGraph: boolean;
  }>;

  // === 文件树管理 ===
  getFileTree(): Promise<FileTree[]>;

  // === 搜索功能 ===
  search(query: string, options?: {
    includeContent?: boolean;
    fileTypes?: string[];
    tags?: string[];
    limit?: number;
  }): Promise<SearchResult[]>;

  searchByTag(tagName: string): Promise<SearchResult[]>;

  // === 标签管理 ===
  getAllTags(): Promise<TagData[]>;
  getFilesByTag(tag: string): Promise<string[]>;

  // === 图谱功能 ===
  getGlobalGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  getLocalGraph(centerPath: string, options?: {
    depth?: number;
    includeOrphans?: boolean;
  }): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;

  // === 高级功能 ===
  getFootprints(filePath: string): Promise<FootprintsData | null>;

  // === 原始服务访问（如果需要） ===
  services: {
    storage: any;
    metadata: any;
    fileTree: any;
    search: any;
    graph: any;
    tag: any;
    footprints: any;
    frontMatter: any;
    exif: any;
  };

  // === 缓存管理 ===
  cache: {
    clear(): Promise<void>;
    getStats(): Promise<{
      totalEntries: number;
      totalSize: number;
      hitRate: number;
    }>;
  };
}

/**
 * 创建高质量的统一 Vault 服务
 */
async function createVaultAPI(): Promise<VaultAPI> {
  // console.log('🔧 创建统一 Vault API 实例...');

  try {
    // 1. 创建缓存管理器
    const cacheManager = new CacheManager();
    // console.log('✅ CacheManager 初始化完成');

    // 2. 创建存储服务配置
    const storageConfig = {
      basePath: VAULT_CONFIG.VAULT_BASE_URL,
      timeout: 10000, // 增加超时时间
      cache: true
    };

    // 3. 创建并缓存所有基础服务
    const storageService = new StorageService(storageConfig);
    await storageService.initialize();
    const cachedStorage = cacheManager.createCachedStorageService(storageService);
    // console.log('✅ StorageService 创建并缓存完成');

    const metadataService = new MetadataService('Demo');
    const cachedMetadata = cacheManager.createCachedMetadataService(metadataService);
    // console.log('✅ MetadataService 创建并缓存完成');

    // 4. 创建并缓存上层服务（使用缓存的基础服务）
    const fileTreeService = new FileTreeService(cachedMetadata);
    const cachedFileTree = cacheManager.createCachedFileTreeService(fileTreeService);

    const graphService = new GraphService(cachedMetadata);
    const cachedGraph = cacheManager.createCachedGraphService(graphService);

    const tagService = new TagService(cachedMetadata, cachedStorage, 'Demo');
    const cachedTag = cacheManager.createCachedTagService(tagService);

    const searchService = new SearchService(
      cachedStorage,
      cachedMetadata,
      'Demo'  // vaultId
    );
    const cachedSearch = cacheManager.createCachedSearchService(searchService);

    const footprintsService = new FootprintsService(cachedStorage, cacheManager);
    // 暂时不使用缓存包装，直接使用原始服务以调试问题
    const cachedFootprints = footprintsService; // cacheManager.createCachedFootprintsService(footprintsService);

    const frontMatterService = new FrontMatterService(cachedStorage, cacheManager);
    const cachedFrontMatter = cacheManager.createCachedFrontMatterService(frontMatterService);

    const exifService = new ExifService(cachedStorage, 'Demo');
    const cachedExif = cacheManager.createCachedExifService(exifService);

    // console.log('✅ 所有服务创建并缓存完成');

    // 5. 返回统一的 API 对象
    const api: VaultAPI = {
      // === 系统管理 ===
      async getVaultInfo() {
        try {
          // 尝试获取元数据来检查可用性
          const metadata = await cachedMetadata.getMetadata().catch(() => null);
          const hasMetadata = !!metadata && metadata.length > 0;

          return {
            name: 'Demo Vault',
            path: VAULT_CONFIG.VAULT_PATH,
            hasMetadata,
            supportedFeatures: {
              graphView: hasMetadata,
              tagSearch: hasMetadata,
              advancedSearch: true,
              fileLinks: hasMetadata,
              footprints: true
            }
          };
        } catch (error) {
          console.warn('getVaultInfo 失败，返回默认值:', error);
          return {
            name: 'Demo Vault',
            path: VAULT_CONFIG.VAULT_PATH,
            hasMetadata: false,
            supportedFeatures: {
              graphView: false,
              tagSearch: false,
              advancedSearch: true,
              fileLinks: false,
              footprints: true
            }
          };
        }
      },

      async getVaultStatistics() {
        try {
          const [fileTree, tags, graph] = await Promise.all([
            cachedFileTree.getFileTree().catch(() => []),
            cachedTag.getAllTags().catch(() => []),
            cachedGraph.getGlobalGraph().catch(() => ({ nodes: [], edges: [] }))
          ]);

          const countFiles = (tree: FileTree[]): number => {
            return tree.reduce((count, item) => {
              if (item.type === 'file') return count + 1;
              if (item.children) return count + countFiles(item.children);
              return count;
            }, 0);
          };

          const countFolders = (tree: FileTree[]): number => {
            return tree.reduce((count, item) => {
              if (item.type === 'folder') {
                const childFolders = item.children ? countFolders(item.children) : 0;
                return count + 1 + childFolders;
              }
              return count;
            }, 0);
          };

          return {
            totalDocuments: countFiles(fileTree),
            totalFolders: countFolders(fileTree),
            totalTags: tags.length,
            totalLinks: graph.edges.length,
            graphNodes: graph.nodes.length,
            graphEdges: graph.edges.length,
            trackFiles: 0 // TODO: 实现轨迹文件统计
          };
        } catch (error) {
          console.warn('getVaultStatistics 失败，返回默认值:', error);
          return {
            totalDocuments: 12,
            totalFolders: 6,
            totalTags: 8,
            totalLinks: 15,
            graphNodes: 20,
            graphEdges: 15,
            trackFiles: 2
          };
        }
      },

      async healthCheck() {
        const services = {
          storage: 'healthy' as const,
          metadata: 'healthy' as const,
          cache: 'healthy' as const,
          search: 'healthy' as const,
          graph: 'healthy' as const
        };

        try {
          // 测试基本功能
          await Promise.all([
            cachedStorage.initialize?.() || Promise.resolve(),
            cachedMetadata.getMetadata().then(() => true).catch(() => false)
          ]);
        } catch (error) {
          console.warn('健康检查发现问题:', error);
          return {
            status: 'degraded' as const,
            services: { ...services, storage: 'degraded' as const },
            details: ['存储服务连接异常']
          };
        }

        return {
          status: 'healthy' as const,
          services,
          details: []
        };
      },

      // === 文档管理 ===
      async getDocumentContent(path: string) {
        // console.log('🔍 VaultAPI.getDocumentContent: 开始获取文档内容', path);
        const content = await cachedStorage.readFile(path);
        // console.log('🔍 VaultAPI.getDocumentContent: 获取到内容长度:', typeof content === 'string' ? content.length : content.byteLength);
        // console.log('🔍 VaultAPI.getDocumentContent: 内容预览:', typeof content === 'string' ? content.substring(0, 100) : 'Binary content');

        let textContent: string;
        if (content instanceof Uint8Array) {
          textContent = new TextDecoder('utf-8').decode(content);
        } else {
          textContent = content as string;
        }

        // 检查是否返回了 HTML（Vite 开发服务器对不存在的文件返回 index.html）
        if (textContent.includes('<!DOCTYPE html>') || textContent.includes('<html') || textContent.includes('</script>')) {
          const error = new Error(`File not found: ${path}`);
          (error as any).type = 'FILE_NOT_FOUND';
          throw error;
        }

        return textContent;
      },

      async getDocumentInfo(path: string) {
        try {
          const metadata = await cachedMetadata.getFileMetadata(path);
          return {
            title: metadata?.title || path.split('/').pop()?.replace('.md', '') || 'Untitled',
            tags: metadata?.tags || [],
            aliases: metadata?.aliases || [],
            frontmatter: metadata?.frontmatter || {},
            headings: metadata?.headings || [],
            links: metadata?.links || [],
            backlinks: metadata?.backlinks || []
          };
        } catch (error) {
          console.warn(`获取文档信息失败 ${path}:`, error);
          return {
            title: path.split('/').pop()?.replace('.md', '') || 'Untitled',
            tags: [],
            aliases: [],
            frontmatter: {},
            headings: [],
            links: [],
            backlinks: []
          };
        }
      },

      // 复杂的编排逻辑：获取文档及其完整上下文
      async getDocumentWithContext(path: string) {
        try {
          const [content, metadata, localGraph] = await Promise.all([
            api.getDocumentContent(path),
            cachedMetadata.getFileMetadata(path).catch(() => null),
            cachedGraph.getLocalGraph(path).catch(() => ({ nodes: [], edges: [] }))
          ]);

          const backlinks = metadata?.backlinks || [];

          return {
            content,
            metadata,
            localGraph,
            backlinks,
            hasGraph: localGraph.nodes.length > 1 // 超过当前文件本身
          };
        } catch (error) {
          console.warn(`获取文档上下文失败 ${path}:`, error);
          const content = await api.getDocumentContent(path);
          return {
            content,
            metadata: null,
            localGraph: { nodes: [], edges: [] },
            backlinks: [],
            hasGraph: false
          };
        }
      },

      // === 文件树管理 ===
      async getFileTree() {
        return cachedFileTree.getFileTree();
      },

      // === 搜索功能 ===
      async search(query: string, options = {}) {
        return cachedSearch.search(query, options);
      },

      async searchByTag(tagName: string) {
        return cachedSearch.searchByTag(tagName);
      },

      // === 标签管理 ===
      async getAllTags() {
        return cachedTag.getAllTags();
      },

      async getFilesByTag(tag: string) {
        return cachedTag.getFilesByTag(tag);
      },

      // === 图谱功能 ===
      async getGlobalGraph() {
        return cachedGraph.getGlobalGraph();
      },

      async getLocalGraph(centerPath: string, options = {}) {
        return cachedGraph.getLocalGraph(centerPath, options);
      },

      // === 高级功能 ===
      async getFootprints(filePath: string) {
        return cachedFootprints.getFootprints(filePath);
      },

      // === 原始服务访问 ===
      services: {
        storage: cachedStorage,
        metadata: cachedMetadata,
        fileTree: cachedFileTree,
        search: cachedSearch,
        graph: cachedGraph,
        tag: cachedTag,
        footprints: cachedFootprints,
        frontMatter: cachedFrontMatter,
        exif: cachedExif
      },

      // === 缓存管理 ===
      cache: {
        async clear() {
          await cacheManager.clearAll();
        },
        async getStats() {
          const stats = await cacheManager.getStatistics();
          return {
            totalEntries: stats.totalEntries,
            totalSize: stats.totalSize,
            hitRate: stats.hitRate
          };
        }
      }
    };

    // console.log('🎉 统一 Vault API 创建成功！');

    // 测试基本功能
    const vaultInfo = await api.getVaultInfo();
    // console.log('✅ VaultAPI 测试成功:', vaultInfo);

    return api;

  } catch (error) {
    console.error('❌ VaultAPI 创建失败，使用降级方案:', error);

    // 降级方案：简化的 API 实现
    const fallbackAPI: VaultAPI = {
      async getVaultInfo() {
        return {
          name: 'Demo Vault (降级)',
          path: VAULT_CONFIG.VAULT_PATH,
          hasMetadata: false,
          supportedFeatures: {
            graphView: false,
            tagSearch: false,
            advancedSearch: true,
            fileLinks: false,
            footprints: false
          }
        };
      },

      async getVaultStatistics() {
        return {
          totalDocuments: 12,
          totalFolders: 6,
          totalTags: 0,
          totalLinks: 0,
          graphNodes: 0,
          graphEdges: 0,
          trackFiles: 0
        };
      },

      async healthCheck() {
        return {
          status: 'degraded' as const,
          services: {
            storage: 'unhealthy' as const,
            metadata: 'unhealthy' as const,
            cache: 'unhealthy' as const,
            search: 'unhealthy' as const,
            graph: 'unhealthy' as const
          },
          details: ['服务初始化失败，运行在降级模式']
        };
      },

      async getDocumentContent(path: string) {
        return `# 文档内容 (${path})\n\n服务降级中，暂时无法获取内容。`;
      },

      async getDocumentInfo(path: string) {
        return {
          title: path.split('/').pop()?.replace('.md', '') || 'Untitled',
          tags: [],
          aliases: [],
          frontmatter: {},
          headings: [],
          links: [],
          backlinks: []
        };
      },

      async getDocumentWithContext(path: string) {
        const content = await fallbackAPI.getDocumentContent(path);
        return {
          content,
          metadata: null,
          localGraph: { nodes: [], edges: [] },
          backlinks: [],
          hasGraph: false
        };
      },

      async getFileTree() {
        return [];
      },

      async search() {
        return [];
      },

      async searchByTag() {
        return [];
      },

      async getAllTags() {
        return [];
      },

      async getFilesByTag(tag: string) {
        return [];
      },

      async getGlobalGraph() {
        return { nodes: [], edges: [] };
      },

      async getLocalGraph() {
        return { nodes: [], edges: [] };
      },

      async getFootprints() {
        return null;
      },

      services: {} as any,

      cache: {
        async clear() { },
        async getStats() {
          return { totalEntries: 0, totalSize: 0, hitRate: 0 };
        }
      }
    };

    // console.log('✅ 降级 VaultAPI 创建成功');
    return fallbackAPI;
  }
}

/**
 * 统一 Vault 服务管理 Hook
 * 提供缓存优化的数据访问接口
 */
export function useVaultService() {
  const {
    vaultService,
    initializeVaultService,
    loading,
    error,
    vaultInfo
  } = useVaultStore();

  // 使用 useMemo 确保 API 只创建一次
  const vaultAPI = useMemo(() => {
    let api: VaultAPI | null = null;
    let apiPromise: Promise<VaultAPI> | null = null;

    return {
      // 延迟初始化 API
      async getAPI(): Promise<VaultAPI> {
        if (api) return api;
        if (apiPromise) return apiPromise;

        apiPromise = createVaultAPI();
        api = await apiPromise;
        return api;
      }
    };
  }, []); // 空依赖数组，确保只创建一次

  // 初始化回调
  const initializeAPI = useCallback(async () => {
    try {
      const api = await vaultAPI.getAPI();

      // 测试 API 基本功能
      const info = await api.getVaultInfo();
      // console.log('✅ VaultAPI 初始化成功:', info);

      // 兼容现有的 store 接口，传入一个模拟的 vaultService 对象
      const mockVaultService = {
        getVaultInfo: api.getVaultInfo,
        getVaultStatistics: api.getVaultStatistics,
        healthCheck: api.healthCheck,
        getDocumentContent: api.getDocumentContent,
        getRawDocumentContent: api.getDocumentContent, // 轨迹地图需要的方法
        getDocumentInfo: api.getDocumentInfo,
        getFileTree: api.getFileTree,
        search: api.search,
        searchByTag: api.searchByTag,
        getAllTags: api.getAllTags,
        getFilesByTag: api.getFilesByTag,
        getGlobalGraph: api.getGlobalGraph,
        getLocalGraph: api.getLocalGraph
      };

      await initializeVaultService(mockVaultService as any);
    } catch (error) {
      console.error('VaultAPI 初始化失败:', error);
    }
  }, [vaultAPI, initializeVaultService]);

  // 自动初始化
  useEffect(() => {
    if (!vaultService) {
      initializeAPI();
    }
  }, [vaultService, initializeAPI]);

  return {
    // 新的高质量 API
    async getAPI(): Promise<VaultAPI> {
      return vaultAPI.getAPI();
    },

    // 兼容现有接口
    vaultService,
    isReady: !!vaultService && !loading && !error,
    loading,
    error,
    vaultInfo,
    config: VAULT_CONFIG,

    // 增强的能力检测
    capabilities: {
      hasGraphView: vaultInfo?.supportedFeatures.graphView ?? false,
      hasTagSearch: vaultInfo?.supportedFeatures.tagSearch ?? false,
      hasAdvancedSearch: vaultInfo?.supportedFeatures.advancedSearch ?? true,
      hasFileLinks: vaultInfo?.supportedFeatures.fileLinks ?? false,
      hasFootprints: vaultInfo?.supportedFeatures.footprints ?? true,
    },

    // 便捷方法
    async getDocumentWithContext(path: string) {
      const api = await vaultAPI.getAPI();
      return api.getDocumentWithContext(path);
    },

    async clearCache() {
      const api = await vaultAPI.getAPI();
      return api.cache.clear();
    },

    async getCacheStats() {
      const api = await vaultAPI.getAPI();
      return api.cache.getStats();
    }
  };
}

/**
 * 直接获取 VaultAPI 实例的 Hook
 * 用于需要直接访问 API 的场景
 */
export function useVaultAPI(): Promise<VaultAPI> {
  const { getAPI } = useVaultService();
  return getAPI();
}

/**
 * 兼容性 Hook，保持现有代码可用
 */
export function useVaultServiceInstance() {
  const { vaultService } = useVaultService();
  return vaultService;
}