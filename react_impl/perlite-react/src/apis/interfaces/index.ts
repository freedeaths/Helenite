// API 接口导出
export * from './IFileTreeAPI';
export * from './IGraphAPI';
export * from './IFileAPI';
export * from './ISearchAPI';
export * from './ITagAPI';

// 统一类型导出，避免重复定义
export type { FileTree, FileMetadata, HeadingData, LinkData } from './IFileTreeAPI';
export type { GraphNode, GraphEdge, GraphData } from './IGraphAPI';
export type { TOCItem } from './IFileAPI';
export type { SearchResult, SearchMatch, SearchOptions } from './ISearchAPI';
export type { TagData } from './ITagAPI';