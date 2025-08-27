import { create } from 'zustand';
import type { FileTree, FileMetadata, SearchResult, GraphNode, GraphEdge } from '../types/vault';

interface VaultState {
  // File system state
  files: FileTree[];
  activeFile: string | null;
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
  setActiveFile: (path: string | null) => void;
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

export const useVaultStore = create<VaultState>((set) => ({
  // Initial state
  files: [],
  activeFile: null,
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
  setActiveFile: (path) => set({ activeFile: path }),
  setFiles: (files) => set({ files }),
  setMetadata: (metadata) => set({ metadata }),
  setCurrentDocumentMetadata: (metadata) => set({ currentDocumentMetadata: metadata }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearching: (searching) => set({ isSearching: searching }),
  setGraphData: (nodes, edges) => set({ graphNodes: nodes, graphEdges: edges }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));