/**
 * 新架构类型定义
 * 基于 VaultService 接口的前端类型映射
 */

// 需要导入 IVaultService
import type {
  IVaultService,
  VaultInfo,
  VaultStatistics,
  HealthStatus,
  DocumentRef,
  UnifiedSearchOptions,
  UnifiedSearchResult,
  GraphData,
  LocalGraphOptions,
} from '../services/interfaces/IVaultService.js';

import type { FileTree } from '../services/interfaces/IFileTreeService.js';

export type { SearchResult } from '../services/interfaces/ISearchAPI.js';

export type { GraphNode, GraphEdge } from '../services/interfaces/IGraphService.js';

import type { TagData } from '../services/interfaces/ITagService.js';

// 重新导出所有导入的类型
export type {
  VaultInfo,
  VaultStatistics,
  HealthStatus,
  DocumentRef,
  UnifiedSearchOptions,
  UnifiedSearchResult,
  GraphData,
  LocalGraphOptions,
  FileTree,
  TagData,
};

export type { FootprintsData } from '../services/interfaces/IFootprintsService.js';

// 新架构特有的 UI 状态类型
export interface UIState {
  // 布局状态
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;

  // 主题和样式
  theme: 'light' | 'dark';

  // 当前活动状态
  activeFile: string | null;
  activeView: 'file' | 'graph' | 'search' | 'welcome';

  // 加载状态
  loading: boolean;
  error: string | null;
  isLoadingFileTree: boolean;
}

// 新架构的路由状态
export interface RouteState {
  type: 'welcome' | 'file' | 'search' | 'graph' | 'tag';
  filePath?: string;
  searchQuery?: string;
  tagName?: string;
  anchor?: string;
}

export interface TOCHeading {
  id: string;
  level: number;
  text: string;
}

interface DocumentMetadata {
  title?: string;
  tags?: string[];
  aliases?: string[];
  created?: string;
  modified?: string;
  frontmatter?: Record<string, unknown>;
  // 补全缺失的属性（从 build 错误看到需要的）
  backlinks?: Array<{
    sourcePath: string;
    sourceTitle?: string;
    context: string;
    line: number;
  }>;
  headings?: TOCHeading[];
}

// VaultService 状态容器
export interface VaultState {
  // 服务实例
  vaultService: IVaultService | null;

  // 基础数据
  vaultInfo: VaultInfo | null;
  fileTree: FileTree[];
  allTags: TagData[];

  // 当前文档数据
  currentDocument: {
    path: string;
    content: string;
    metadata: DocumentMetadata;
  } | null;

  // 搜索结果
  searchResults: UnifiedSearchResult[];

  // 图谱数据
  globalGraph: GraphData | null;
  localGraph: GraphData | null;
}

// 组件 Props 类型
export interface ComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

// 事件处理类型
export interface VaultEventHandlers {
  onFileSelect: (filePath: string) => void;
  onSearch: (query: string) => void;
  onTagClick: (tagName: string) => void;
  onGraphNodeClick: (nodeId: string) => void;
}
