/**
 * 搜索结果项
 */
export interface SearchResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
  score?: number; // 搜索相关性评分
}

export interface SearchMatch {
  line: number;
  content: string;
  highlighted: string; // 高亮后的内容
  context?: string; // 上下文
}

/**
 * 搜索 API 接口
 * 负责处理全文搜索和特定搜索功能
 */
export interface ISearchAPI {
  /**
   * 全文搜索
   * @param query 搜索关键词
   * @param options 搜索选项
   * @returns Promise<SearchResult[]> 搜索结果数组
   */
  searchFiles(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  
  /**
   * 在指定文件中搜索
   * @param filePath 文件路径
   * @param query 搜索关键词
   * @returns Promise<SearchResult[]> 搜索结果（单文件）
   */
  searchInFile(filePath: string, query: string): Promise<SearchResult[]>;
  
  /**
   * 按文件名搜索
   * @param fileName 文件名（支持模糊匹配）
   * @returns Promise<SearchResult[]> 匹配的文件
   */
  searchByFileName(fileName: string): Promise<SearchResult[]>;
  
  /**
   * 获取搜索统计信息
   * @param query 搜索关键词
   * @returns Promise<SearchStats> 搜索统计
   */
  getSearchStats(query: string): Promise<SearchStats>;
}

export interface SearchOptions {
  caseSensitive?: boolean; // 是否区分大小写
  wholeWord?: boolean; // 是否匹配整个单词
  regex?: boolean; // 是否使用正则表达式
  maxResults?: number; // 最大结果数
  includeContent?: boolean; // 是否包含内容片段
  fileTypes?: string[]; // 限制搜索的文件类型
}

export interface SearchStats {
  totalMatches: number;
  filesSearched: number;
  searchTime: number; // 毫秒
  query: string;
}