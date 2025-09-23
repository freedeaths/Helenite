/**
 * 新架构 Vault 状态管理
 * 基于新的 VaultAPI 的统一状态管理
 */
import { create } from 'zustand';
import type {
  NewVaultState,
  NewUIState,
  NewRouteState,
  VaultInfo,
  FileTree,
  TagData,
  UnifiedSearchResult,
  GraphData
} from '../newTypes/newVaultTypes.js';
import { navigateToFile as routeNavigateToFile, navigateToWelcome as routeNavigateToWelcome, navigateToGlobalGraph as routeNavigateToGlobalGraph } from '../newHooks/routeUtils';

// 通用的 Vault 服务接口（兼容旧的 VaultService 和新的 VaultAPI）
interface IVaultService {
  getVaultInfo(): Promise<VaultInfo>;
  getVaultStatistics(): Promise<any>;
  healthCheck(): Promise<any>;
  getDocumentContent(path: string): Promise<string>;
  getDocumentInfo(path: string): Promise<any>;
  getFileTree(): Promise<FileTree[]>;
  search(query: string, options?: any): Promise<any[]>;
  searchByTag(tagName: string): Promise<any[]>;
  getAllTags(): Promise<TagData[]>;
  getFilesByTag(tag: string): Promise<string[]>;
  getGlobalGraph(): Promise<GraphData>;
  getLocalGraph(centerPath: string, options?: any): Promise<GraphData>;
}

// 组合的应用状态
interface NewAppState extends NewVaultState, NewUIState, NewRouteState {
  // VaultService 初始化（兼容新旧接口）
  initializeVaultService: (vaultService: IVaultService) => Promise<void>;

  // 数据加载方法
  loadVaultInfo: () => Promise<void>;
  loadFileTree: () => Promise<void>;
  loadAllTags: () => Promise<void>;

  // 文档操作
  loadDocument: (filePath: string) => Promise<void>;
  getRawDocumentContent: (filePath: string) => Promise<string>;
  setActiveFile: (filePath: string | null) => void;
  setCurrentDocument: (document: any) => void;

  // 搜索操作
  performSearch: (query: string) => Promise<void>;
  searchByTag: (tagName: string) => Promise<void>;
  clearSearch: () => void;

  // 图谱操作
  loadGlobalGraph: () => Promise<void>;
  loadLocalGraph: (centerPath: string, depth?: number) => Promise<void>;

  // UI 操作
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // 路由操作
  navigateToFile: (filePath: string, anchor?: string) => void;
  navigateToSearch: (query: string) => void;
  navigateToTag: (tagName: string) => void;
  navigateToGraph: () => void;
  navigateToWelcome: () => void;

  // 错误处理
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useNewVaultStore = create<NewAppState>((set, get) => ({
  // VaultService 状态
  vaultService: null,
  vaultInfo: null,
  fileTree: [],
  allTags: [],
  currentDocument: null,
  searchResults: [],
  globalGraph: null,
  localGraph: null,

  // UI 状态 - 复制原版逻辑
  leftSidebarOpen: true,
  rightSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  leftSidebarWidth: 320,
  rightSidebarWidth: 280,
  theme: 'light',
  activeFile: null,
  activeView: 'welcome',
  loading: false,
  error: null,
  isLoadingFileTree: false,

  // 路由状态
  type: 'welcome',

  // VaultService 初始化
  initializeVaultService: async (vaultService: IVaultService) => {
    set({ vaultService, loading: true });

    try {
      // 并行加载基础数据
      await Promise.all([
        get().loadVaultInfo(),
        get().loadFileTree(),
        get().loadAllTags()
      ]);

      console.log('🚀 新架构 VaultService 初始化完成');
    } catch (error) {
      console.error('VaultService 初始化失败:', error);
      set({ error: error instanceof Error ? error.message : '初始化失败' });
    } finally {
      set({ loading: false });
    }
  },

  // 数据加载方法
  loadVaultInfo: async () => {
    const { vaultService } = get();
    if (!vaultService) return;

    try {
      const vaultInfo = await vaultService.getVaultInfo();
      set({ vaultInfo });
    } catch (error) {
      console.error('加载 Vault 信息失败:', error);
    }
  },

  loadFileTree: async () => {
    const { vaultService } = get();
    if (!vaultService) return;

    set({ isLoadingFileTree: true });
    try {
      const fileTree = await vaultService.getFileTree();
      set({ fileTree });
    } catch (error) {
      console.error('加载文件树失败:', error);
    } finally {
      set({ isLoadingFileTree: false });
    }
  },

  loadAllTags: async () => {
    const { vaultService } = get();
    if (!vaultService) return;

    try {
      const allTags = await vaultService.getAllTags();
      set({ allTags });
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  },

  // 文档操作
  loadDocument: async (filePath: string) => {
    const { vaultService } = get();
    if (!vaultService) return;

    set({ loading: true });
    try {
      const [content, info] = await Promise.all([
        vaultService.getDocumentContent(filePath),
        vaultService.getDocumentInfo(filePath)
      ]);

      set({
        currentDocument: {
          path: filePath,
          content,
          metadata: info
        },
        activeFile: filePath
      });
    } catch (error) {
      console.error('加载文档失败:', error);
      set({ error: error instanceof Error ? error.message : '加载文档失败' });
    } finally {
      set({ loading: false });
    }
  },

  getRawDocumentContent: async (filePath: string) => {
    const { vaultService } = get();
    if (!vaultService) {
      throw new Error('VaultService not initialized');
    }
    return await vaultService.getRawDocumentContent(filePath);
  },

  setActiveFile: (filePath: string | null) => {
    set({ activeFile: filePath });
  },

  setCurrentDocument: (document: any) => {
    set({ currentDocument: document });
  },

  // 搜索操作
  performSearch: async (query: string) => {
    const { vaultService } = get();
    if (!vaultService || !query.trim()) return;

    set({ loading: true });
    try {
      const searchResults = await vaultService.search(query);
      set({ searchResults, activeView: 'search' });
    } catch (error) {
      console.error('搜索失败:', error);
      set({ error: error instanceof Error ? error.message : '搜索失败' });
    } finally {
      set({ loading: false });
    }
  },

  searchByTag: async (tagName: string) => {
    const { vaultService } = get();
    if (!vaultService) return;

    set({ loading: true });
    try {
      const searchResults = await vaultService.searchByTag(tagName);
      set({ searchResults, activeView: 'search' });
    } catch (error) {
      console.error('标签搜索失败:', error);
      set({ error: error instanceof Error ? error.message : '标签搜索失败' });
    } finally {
      set({ loading: false });
    }
  },

  clearSearch: () => {
    set({ searchResults: [] });
  },

  // 图谱操作
  loadGlobalGraph: async () => {
    const { vaultService } = get();
    if (!vaultService) return;

    set({ loading: true });
    try {
      const globalGraph = await vaultService.getGlobalGraph();
      set({ globalGraph, activeView: 'graph' });
    } catch (error) {
      console.error('加载全局图谱失败:', error);
      set({ error: error instanceof Error ? error.message : '加载图谱失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadLocalGraph: async (centerPath: string, depth = 2) => {
    const { vaultService } = get();
    if (!vaultService) return;

    set({ loading: true });
    try {
      const localGraph = await vaultService.getLocalGraph({ centerPath, depth });
      set({ localGraph });
    } catch (error) {
      console.error('加载局部图谱失败:', error);
      set({ error: error instanceof Error ? error.message : '加载局部图谱失败' });
    } finally {
      set({ loading: false });
    }
  },

  // UI 操作
  toggleLeftSidebar: () => {
    set(state => ({ leftSidebarOpen: !state.leftSidebarOpen }));
  },

  toggleRightSidebar: () => {
    set(state => ({ rightSidebarOpen: !state.rightSidebarOpen }));
  },

  setLeftSidebarWidth: (width: number) => {
    set({ leftSidebarWidth: width });
  },

  setRightSidebarWidth: (width: number) => {
    set({ rightSidebarWidth: width });
  },

  setTheme: (theme: 'light' | 'dark') => {
    set({ theme });
  },

  // 路由操作
  navigateToFile: (filePath: string, anchor?: string) => {
    // 使用原版路由工具函数更新 URL 哈希
    // 这样会触发 hashchange 事件，然后 useNewHashRouter 会处理状态更新
    routeNavigateToFile(filePath, anchor);
  },

  navigateToSearch: (query: string) => {
    set({ type: 'search', searchQuery: query });
    get().performSearch(query);
  },

  navigateToTag: (tagName: string) => {
    set({ type: 'tag', tagName });
    get().searchByTag(tagName);
  },

  navigateToGraph: () => {
    // 使用原版路由工具函数更新 URL 哈希到 global-graph
    // 这样会触发 hashchange 事件，然后 useNewHashRouter 会处理状态更新
    routeNavigateToGlobalGraph();
  },

  navigateToWelcome: () => {
    // 使用原版路由工具函数更新 URL 哈希到 welcome
    // 这样会触发 hashchange 事件，然后 useNewHashRouter 会处理状态更新
    routeNavigateToWelcome();
  },

  // 错误处理
  setError: (error: string | null) => {
    set({ error });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  }
}));