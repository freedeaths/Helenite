import { create } from 'zustand';
import { VaultService } from '../services/VaultService.js';
import { fetchVault } from '../utils/fetchWithAuth.js';
import type {
  FileTree,
  FileMetadata,
  SearchResult,
  GraphNode,
  GraphEdge
} from '../apis/interfaces';

interface NewVaultState {
  // VaultService 实例
  vaultService: VaultService | null;

  // 临时文件访问方法 (在 VaultService 完全初始化之前使用)
  getRawDocumentContent: ((path: string) => Promise<string>) | null;

  // File system state
  files: FileTree[];
  activeFile: string | null;
  activeAnchor: string | null;
  metadata: Record<string, FileMetadata>;

  // Current document metadata (from markdown processor)
  currentDocumentMetadata: {
    headings: Array<{ level: number; text: string; id: string }>;
    links: Array<{ href: string; text: string }>;
    tags: string[];
  } | null;

  // Search state
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;

  // Graph data
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  initializeVaultService: (vaultService: VaultService) => void;
  setTemporaryFileAccess: (getRawDocumentContent: (path: string) => Promise<string>) => void;
  setActiveFile: (path: string | null, anchor?: string | null) => void;
  setActiveAnchor: (anchor: string | null) => void;
  setFiles: (files: FileTree[]) => void;
  setMetadata: (metadata: Record<string, FileMetadata>) => void;
  setCurrentDocumentMetadata: (metadata: {
    headings: Array<{ level: number; text: string; id: string }>;
    links: Array<{ href: string; text: string }>;
    tags: string[];
  } | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSearching: (searching: boolean) => void;
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useNewVaultStore = create<NewVaultState>((set, get) => ({
  // Initial state
  vaultService: null,
  getRawDocumentContent: null,
  files: [],
  activeFile: null,
  activeAnchor: null,
  metadata: {},
  currentDocumentMetadata: null,
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  graphNodes: [],
  graphEdges: [],
  isLoading: false,
  error: null,

  // Actions
  initializeVaultService: (vaultService: VaultService) => {
    set({ vaultService });
  },

  setTemporaryFileAccess: (getRawDocumentContent: (path: string) => Promise<string>) => {
    set({ getRawDocumentContent });
  },

  setActiveFile: (path: string | null, anchor?: string | null) =>
    set({ activeFile: path, activeAnchor: anchor || null }),

  setActiveAnchor: (anchor: string | null) =>
    set({ activeAnchor: anchor }),

  setFiles: (files: FileTree[]) =>
    set({ files }),

  setMetadata: (metadata: Record<string, FileMetadata>) =>
    set({ metadata }),

  setCurrentDocumentMetadata: (metadata) =>
    set({ currentDocumentMetadata: metadata }),

  setSearchQuery: (query: string) =>
    set({ searchQuery: query }),

  setSearchResults: (results: SearchResult[]) =>
    set({ searchResults: results }),

  setSearching: (searching: boolean) =>
    set({ isSearching: searching }),

  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) =>
    set({ graphNodes: nodes, graphEdges: edges }),

  setLoading: (loading: boolean) =>
    set({ isLoading: loading }),

  setError: (error: string | null) =>
    set({ error })
}));

// 临时初始化文件访问（使用 fetchVault）
const initializeTemporaryFileAccess = () => {
  const store = useNewVaultStore.getState();
  if (!store.vaultService && !store.getRawDocumentContent) {
    const tempFileAccess = async (path: string): Promise<string> => {
      // 确保路径正确，处理 Attachments/ 前缀
      let normalizedPath = path;
      if (!path.startsWith('/') && !path.startsWith('Attachments/')) {
        normalizedPath = `Attachments/${path}`;
      }

      const fullPath = normalizedPath.startsWith('/') ?
        `/vaults/Demo${normalizedPath}` :
        `/vaults/Demo/${normalizedPath}`;

      const response = await fetchVault(fullPath);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status}`);
      }
      return response.text();
    };

    store.setTemporaryFileAccess(tempFileAccess);
  }
};

// 自动初始化
initializeTemporaryFileAccess();