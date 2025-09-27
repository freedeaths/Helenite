import type { ISearchAPI, SearchResult, SearchMatch } from '../../interfaces/ISearchAPI';
import { getVaultConfig, isPathInExcludedFolder, isFileExcluded, getMetadataUrl } from '../../../config/vaultConfig';
import { fetchVault } from '../../../utils/fetchWithAuth';

/**
 * 本地搜索 API 实现
 * 复刻 PHP 版本的搜索功能 (helper.php:284-359)
 * 
 * 核心逻辑：
 * 1. 全文搜索：递归遍历所有 .md 文件，使用正则表达式匹配
 * 2. 标签搜索：对 # 开头的搜索词，先解析 frontmatter，然后搜索
 * 3. 高亮显示：使用 <span class="search-result-file-matched-text"> 包装匹配内容
 */
export class LocalSearchAPI implements ISearchAPI {
  private baseUrl: string;
  private metadataCache: any[] | null = null;
  private contentCache = new Map<string, string>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取 metadata.json 数据
   */
  private async getMetadata(): Promise<any[]> {
    if (this.metadataCache) {
      return this.metadataCache;
    }

    try {
      const response = await fetchVault(getMetadataUrl());
      if (!response.ok) {
        console.warn('metadata.json not found, falling back to file system search');
        return [];
      }
      
      this.metadataCache = await response.json();
      return this.metadataCache || [];
    } catch (error) {
      console.warn('Failed to load metadata.json:', error);
      return [];
    }
  }

  /**
   * 获取文件内容（带缓存）
   */
  private async getFileContent(filePath: string): Promise<string> {
    // 规范化路径
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    
    if (this.contentCache.has(normalizedPath)) {
      return this.contentCache.get(normalizedPath)!;
    }

    try {
      const response = await fetchVault(`${this.baseUrl}${normalizedPath}`);
      if (!response.ok) {
        return '';
      }
      
      const content = await response.text();
      this.contentCache.set(normalizedPath, content);
      return content;
    } catch (error) {
      console.warn(`Failed to load file content: ${normalizedPath}`, error);
      return '';
    }
  }

  /**
   * 统一搜索入口，复刻 PHP doSearch() 函数
   */
  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    // 检查是否为标签搜索（以 # 开头）
    if (query.startsWith('#')) {
      return this.searchByTag(query);
    } else {
      return this.searchContent(query);
    }
  }

  /**
   * 全文搜索，复刻 PHP search() 函数，应用文件夹过滤
   */
  async searchContent(query: string): Promise<SearchResult[]> {
    try {
      const config = getVaultConfig();
      const metadata = await this.getMetadata();
      const results: SearchResult[] = [];

      for (const fileInfo of metadata) {
        try {
          const fileName = fileInfo.fileName || '';
          const relativePath = fileInfo.relativePath;
          
          // 应用文件夹过滤
          if (isPathInExcludedFolder(relativePath, config)) {
            console.log(`🚫 Search: filtering file in excluded folder: ${relativePath}`);
            continue; // 跳过被排除文件夹中的文件
          }
          
          if (isFileExcluded(fileName, config)) {
            console.log(`🚫 Search: filtering excluded file: ${fileName}`);
            continue; // 跳过被排除的文件
          }
          
          let content = await this.getFileContent(relativePath);
          
          // 重要：将文件路径添加到搜索内容中 (复刻 PHP: $contents = $contents . $pathClean)
          content = content + '\n' + relativePath;

          // 执行搜索 (复刻 PHP 正则逻辑: /^.*$pattern.*$/mi)
          const matches = this.findMatchesInContent(content, query);

          if (matches.length > 0) {
            results.push({
              filePath: relativePath,
              fileName,
              matches: matches.slice(0, config.search.maxMatchesPerFile), // 限制每个文件的匹配数
              matchCount: matches.length
            });
          }
        } catch (error) {
          console.warn(`Error searching file ${fileInfo.relativePath}:`, error);
        }
      }

      // 限制搜索结果总数
      const limitedResults = results.slice(0, config.search.maxResults);
      console.log(`🔍 Search completed: found ${results.length} results, showing ${limitedResults.length} (excluded folders: ${config.excludedFolders.join(', ')})`);
      
      return limitedResults;
    } catch (error) {
      console.error('搜索失败:', error);
      return [];
    }
  }

  /**
   * 标签搜索，复刻 PHP 中标签搜索逻辑，应用文件夹过滤 (helper.php:316-321)
   */
  async searchByTag(tag: string): Promise<SearchResult[]> {
    try {
      const config = getVaultConfig();
      // 移除 # 前缀进行搜索
      const tagName = tag.startsWith('#') ? tag.substring(1) : tag;
      const metadata = await this.getMetadata();
      const results: SearchResult[] = [];

      for (const fileInfo of metadata) {
        try {
          const fileName = fileInfo.fileName || '';
          const relativePath = fileInfo.relativePath;
          
          // 应用文件夹过滤
          if (isPathInExcludedFolder(relativePath, config)) {
            console.log(`🚫 Tag search: filtering file in excluded folder: ${relativePath}`);
            continue; // 跳过被排除文件夹中的文件
          }
          
          if (isFileExcluded(fileName, config)) {
            console.log(`🚫 Tag search: filtering excluded file: ${fileName}`);
            continue; // 跳过被排除的文件
          }
          
          // 检查 metadata 中的 tags 字段
          if (fileInfo.tags && fileInfo.tags.includes(tagName)) {
            const matches: SearchMatch[] = [{
              content: `Tag: #${tagName}`,
              highlighted: `Tag: <span class="search-result-file-matched-text">#${tagName}</span>`,
              lineNumber: 0
            }];

            results.push({
              filePath: relativePath,
              fileName,
              matches,
              matchCount: 1
            });
            continue;
          }

          // 如果 metadata 中没有，尝试从文件内容搜索 (复刻 PHP 标签搜索逻辑)
          let content = await this.getFileContent(relativePath);
          
          // 对标签搜索，需要解析 frontmatter (复刻 PHP Parsedown + strip_tags 逻辑)
          content = this.processFrontmatterForTagSearch(content);
          content = content + '\n' + relativePath;

          const matches = this.findMatchesInContent(content, tagName);
          if (matches.length > 0) {
            results.push({
              filePath: relativePath,
              fileName,
              matches: matches.slice(0, config.search.maxMatchesPerFile),
              matchCount: matches.length
            });
          }
        } catch (error) {
          console.warn(`Error searching tags in file ${fileInfo.relativePath}:`, error);
        }
      }

      // 限制搜索结果总数
      const limitedResults = results.slice(0, config.search.maxResults);
      console.log(`🏷️ Tag search completed: found ${results.length} results for tag "${tagName}", showing ${limitedResults.length} (excluded folders: ${config.excludedFolders.join(', ')})`);

      return limitedResults;
    } catch (error) {
      console.error('标签搜索失败:', error);
      return [];
    }
  }

  /**
   * 在内容中查找匹配项，复刻 PHP 正则表达式逻辑
   */
  private findMatchesInContent(content: string, query: string): SearchMatch[] {
    try {
      // 转义特殊字符（复刻 PHP preg_quote 逻辑）
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 创建正则表达式匹配整行 (复刻 PHP: "/^.*$pattern.*$/mi")
      const pattern = new RegExp(`^.*${escapedQuery}.*$`, 'gmi');
      
      // 按行分割内容
      const lines = content.split('\n');
      const matches: SearchMatch[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
          // 创建高亮版本（复刻 PHP str_ireplace 逻辑）
          const highlighted = line.replace(
            new RegExp(escapedQuery, 'gi'),
            '<span class="search-result-file-matched-text">$&</span>'
          );
          
          matches.push({
            content: line,
            highlighted,
            lineNumber: i + 1
          });
        }
      }
      
      return matches;
    } catch (error) {
      console.error('搜索执行失败:', error);
      return [];
    }
  }

  /**
   * 处理 frontmatter 用于标签搜索
   * 复刻 PHP 中的 Parsedown + strip_tags 逻辑
   */
  private processFrontmatterForTagSearch(content: string): string {
    // 简化实现：提取 frontmatter 中的 tags 字段
    // 实际应该使用 markdown 解析器，但这里简化处理
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return content;
    }

    const frontmatter = frontmatterMatch[1];
    const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/s) || frontmatter.match(/tags:(.*)/);
    
    if (tagsMatch) {
      // 提取标签并添加到内容中
      const tagText = tagsMatch[1];
      content = content + '\n' + tagText;
    }

    return content;
  }

}