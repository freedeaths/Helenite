/**
 * VaultService - Vault 统一协调器
 * 
 * 作为整个 Vault 系统的统一入口，协调所有底层服务
 * 提供高层次的业务接口，隐藏底层服务的复杂性
 * 
 * 设计理念：
 * - 零业务逻辑：纯粹的协调器，将请求分发到相应的底层服务
 * - 统一接口：为 UI 层提供简洁一致的 API
 * - 错误处理：统一的错误处理和降级策略
 * - 性能优化：跨服务的智能缓存和并发优化
 */

import type {
  IVaultService,
  VaultInfo,
  VaultStatistics,
  HealthStatus,
  DocumentRef,
  UnifiedSearchOptions,
  UnifiedSearchResult,
  GraphData,
  LocalGraphOptions
} from './interfaces/IVaultService.js';

import type { IStorageService } from './interfaces/IStorageService.js';
import type { IMetadataService } from './interfaces/IMetadataService.js';
import type { IFileTreeService, FileTree } from './interfaces/IFileTreeService.js';
import type { ISearchAPI, SearchResult } from './interfaces/ISearchAPI.js';
import type { IGraphService, GraphNode, GraphEdge } from './interfaces/IGraphService.js';
import type { ITagService, TagData } from './interfaces/ITagService.js';
import type { IFootprintsService, FootprintsData } from './interfaces/IFootprintsService.js';
import type { IFrontMatterService } from './interfaces/IFrontMatterService.js';
import type { IExifService } from './interfaces/IExifService.js';

export class VaultService implements IVaultService {
  constructor(
    private storageService: IStorageService,
    private metadataService: IMetadataService,
    private fileTreeService: IFileTreeService,
    private searchService: ISearchAPI,
    private graphService: IGraphService,
    private tagService: ITagService,
    private footprintsService: IFootprintsService,
    private frontMatterService: IFrontMatterService,
    private exifService: IExifService,
    private vaultPath: string = ''
  ) {}

  // ===============================
  // 系统管理
  // ===============================

  async getVaultInfo(): Promise<VaultInfo> {
    try {
      // 检查 metadata.json 可用性
      const hasMetadata = await this.checkMetadataAvailability();
      
      // 提取 Vault 名称
      const name = this.extractVaultName();
      
      return {
        name,
        path: this.vaultPath,
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
      console.error('Failed to get vault info:', error);
      return {
        name: 'Unknown Vault',
        path: this.vaultPath,
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
  }

  async getVaultStatistics(): Promise<VaultStatistics> {
    try {
      // 并发获取各项统计信息
      const [
        fileTree,
        tags,
        graphData,
        trackFiles
      ] = await Promise.allSettled([
        this.fileTreeService.getFileTree(),
        this.tagService.getAllTags(),
        this.safeGetGlobalGraph(),
        this.safeGetTrackFiles()
      ]);

      const resolvedFileTree = fileTree.status === 'fulfilled' ? fileTree.value : [];
      const resolvedTags = tags.status === 'fulfilled' ? tags.value : [];
      const resolvedGraphData = graphData.status === 'fulfilled' ? graphData.value : null;
      const resolvedTrackFiles = trackFiles.status === 'fulfilled' ? trackFiles.value : [];

      // 统计文档和文件夹数量
      const { totalDocuments, totalFolders } = this.countTreeItems(resolvedFileTree);

      return {
        totalDocuments,
        totalFolders,
        totalTags: resolvedTags.length,
        totalLinks: resolvedGraphData ? resolvedGraphData.edges.length : 0,
        graphNodes: resolvedGraphData ? resolvedGraphData.nodes.length : 0,
        graphEdges: resolvedGraphData ? resolvedGraphData.edges.length : 0,
        trackFiles: resolvedTrackFiles.length
      };
    } catch (error) {
      console.error('Failed to get vault statistics:', error);
      return {
        totalDocuments: 0,
        totalFolders: 0,
        totalTags: 0,
        totalLinks: 0,
        graphNodes: 0,
        graphEdges: 0,
        trackFiles: 0
      };
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkStorageHealth(),
      this.checkMetadataHealth(),
      this.checkCacheHealth(),
      this.checkSearchHealth(),
      this.checkGraphHealth()
    ]);

    const services = {
      storage: checks[0].status === 'fulfilled' ? checks[0].value : 'error' as const,
      metadata: checks[1].status === 'fulfilled' ? checks[1].value : 'error' as const,
      cache: checks[2].status === 'fulfilled' ? checks[2].value : 'error' as const,
      search: checks[3].status === 'fulfilled' ? checks[3].value : 'error' as const,
      graph: checks[4].status === 'fulfilled' ? checks[4].value : 'error' as const
    };

    const details = Object.entries(services).map(([service, status]) => ({
      service,
      status,
      message: status === 'healthy' ? 'Service is running normally' : 
               status === 'warning' ? 'Service has minor issues' : 
               'Service is not responding',
      timestamp: Date.now()
    }));

    const errorCount = Object.values(services).filter(s => s === 'error').length;
    const warningCount = Object.values(services).filter(s => s === 'warning').length;

    const overallStatus = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'healthy';

    return {
      status: overallStatus,
      services,
      details
    };
  }

  async forceRefresh(): Promise<void> {
    try {
      // 刷新所有可刷新的服务
      await Promise.allSettled([
        this.metadataService.refreshMetadata?.(),
        this.fileTreeService.refreshCache?.(),
        this.graphService.refreshCache?.(),
        this.tagService.refreshCache?.()
      ]);
    } catch (error) {
      console.error('Failed to force refresh:', error);
      throw new Error('Failed to refresh vault data');
    }
  }

  // ===============================
  // 文档管理
  // ===============================

  async getDocumentContent(path: string): Promise<string> {
    try {
      const content = await this.storageService.readFile(path);
      
      // 如果是 Markdown 文件，这里可以添加处理逻辑
      if (path.endsWith('.md')) {
        // TODO: 集成 markdownProcessor 进行内容处理
        return content;
      }
      
      return content;
    } catch (error) {
      console.error(`Failed to get document content for ${path}:`, error);
      throw new Error(`Document not found: ${path}`);
    }
  }

  async getRawDocumentContent(path: string): Promise<string> {
    try {
      return await this.storageService.readFile(path);
    } catch (error) {
      console.error(`Failed to get raw document content for ${path}:`, error);
      throw new Error(`Document not found: ${path}`);
    }
  }

  async getDocumentInfo(path: string): Promise<DocumentRef> {
    try {
      const [fileInfo, frontMatter] = await Promise.allSettled([
        this.storageService.getFileInfo(path),
        this.frontMatterService.getFrontMatter(path).catch(() => null)
      ]);

      const resolvedFileInfo = fileInfo.status === 'fulfilled' ? fileInfo.value : null;
      const resolvedFrontMatter = frontMatter.status === 'fulfilled' ? frontMatter.value : null;

      return {
        path,
        title: resolvedFrontMatter?.title || this.extractTitleFromPath(path),
        type: this.determineFileType(path),
        lastModified: resolvedFileInfo?.lastModified,
        size: resolvedFileInfo?.size
      };
    } catch (error) {
      console.error(`Failed to get document info for ${path}:`, error);
      throw new Error(`Failed to get document info: ${path}`);
    }
  }

  async documentExists(path: string): Promise<boolean> {
    try {
      return await this.storageService.exists(path);
    } catch (error) {
      console.error(`Failed to check document existence for ${path}:`, error);
      return false;
    }
  }

  // ===============================
  // 文件树浏览
  // ===============================

  async getFileTree(): Promise<FileTree[]> {
    try {
      return await this.fileTreeService.getFileTree();
    } catch (error) {
      console.error('Failed to get file tree:', error);
      return [];
    }
  }

  async getFolderContents(folderPath: string): Promise<FileTree[]> {
    try {
      return await this.fileTreeService.getChildren(folderPath);
    } catch (error) {
      console.error(`Failed to get folder contents for ${folderPath}:`, error);
      return [];
    }
  }

  async searchFiles(query: string): Promise<DocumentRef[]> {
    try {
      const results = await this.fileTreeService.searchFiles(query);
      return results.map(result => ({
        path: result.path,
        title: result.name,
        type: this.determineFileType(result.path),
        lastModified: result.lastModified,
        size: result.size
      }));
    } catch (error) {
      console.error(`Failed to search files with query "${query}":`, error);
      return [];
    }
  }

  // ===============================
  // 统一搜索
  // ===============================

  async search(query: string, options: UnifiedSearchOptions = {}): Promise<UnifiedSearchResult[]> {
    try {
      const searchResults = await this.searchService.searchFiles(query);
      
      return searchResults.map(result => ({
        document: {
          path: result.file,
          title: this.extractTitleFromPath(result.file),
          type: this.determineFileType(result.file)
        },
        matches: result.matches.map(match => ({
          type: 'content' as const,
          value: match.content,
          context: match.highlighted,
          line: match.line
        })),
        score: this.calculateRelevanceScore(result, query)
      }));
    } catch (error) {
      console.error(`Failed to search with query "${query}":`, error);
      return [];
    }
  }

  async searchByTag(tag: string): Promise<UnifiedSearchResult[]> {
    try {
      const taggedFiles = await this.tagService.getFilesByTag(tag);
      
      return taggedFiles.map(filePath => ({
        document: {
          path: filePath,
          title: this.extractTitleFromPath(filePath),
          type: this.determineFileType(filePath)
        },
        matches: [{
          type: 'tag' as const,
          value: tag
        }],
        score: 1.0
      }));
    } catch (error) {
      console.error(`Failed to search by tag "${tag}":`, error);
      return [];
    }
  }

  async getAllTags(): Promise<TagData[]> {
    try {
      return await this.tagService.getAllTags();
    } catch (error) {
      console.error('Failed to get all tags:', error);
      return [];
    }
  }

  async getTagStatistics(): Promise<Array<{ tag: string; count: number; files: string[] }>> {
    try {
      const tags = await this.tagService.getAllTags();
      const statistics = await Promise.all(
        tags.map(async (tagData) => {
          const files = await this.tagService.getFilesByTag(tagData.tag);
          return {
            tag: tagData.tag,
            count: files.length,
            files
          };
        })
      );
      
      return statistics.sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Failed to get tag statistics:', error);
      return [];
    }
  }

  // ===============================
  // 知识图谱
  // ===============================

  async getGlobalGraph(): Promise<GraphData> {
    try {
      const { nodes, edges } = await this.graphService.getGlobalGraph();
      
      return {
        nodes,
        edges,
        metadata: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Failed to get global graph:', error);
      return {
        nodes: [],
        edges: [],
        metadata: {
          totalNodes: 0,
          totalEdges: 0,
          lastUpdated: new Date()
        }
      };
    }
  }

  async getLocalGraph(options: LocalGraphOptions): Promise<GraphData> {
    try {
      const { nodes, edges } = await this.graphService.getLocalGraph(
        options.centerPath,
        { depth: options.depth }
      );
      
      return {
        nodes,
        edges,
        metadata: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error(`Failed to get local graph for ${options.centerPath}:`, error);
      return {
        nodes: [],
        edges: [],
        metadata: {
          totalNodes: 0,
          totalEdges: 0,
          lastUpdated: new Date()
        }
      };
    }
  }

  async analyzeNodeConnectivity(nodePath: string): Promise<{
    incomingLinks: number;
    outgoingLinks: number;
    connectedNodes: string[];
    centrality: number;
  }> {
    try {
      const connectivity = await this.graphService.analyzeNodeConnectivity(nodePath);
      const neighbors = await this.graphService.getNodeNeighbors(nodePath);
      
      return {
        incomingLinks: connectivity.incomingConnections,
        outgoingLinks: connectivity.outgoingConnections,
        connectedNodes: neighbors.map(n => n.id),
        centrality: connectivity.centralityScore
      };
    } catch (error) {
      console.error(`Failed to analyze connectivity for ${nodePath}:`, error);
      return {
        incomingLinks: 0,
        outgoingLinks: 0,
        connectedNodes: [],
        centrality: 0
      };
    }
  }

  // ===============================
  // 足迹和地理数据
  // ===============================

  async processTrackFile(filePath: string): Promise<FootprintsData> {
    try {
      return await this.footprintsService.parseSingleTrack(filePath);
    } catch (error) {
      console.error(`Failed to process track file ${filePath}:`, error);
      throw new Error(`Failed to process track file: ${filePath}`);
    }
  }

  async processMultipleTrackFiles(filePaths: string[]): Promise<FootprintsData> {
    try {
      return await this.footprintsService.parseMultipleTracks(filePaths);
    } catch (error) {
      console.error('Failed to process multiple track files:', error);
      throw new Error('Failed to process track files');
    }
  }

  async getTrackFiles(): Promise<string[]> {
    try {
      // 扫描 Attachments 目录查找轨迹文件
      return await this.footprintsService.scanTrackFiles('Attachments');
    } catch (error) {
      console.error('Failed to get track files:', error);
      return [];
    }
  }

  // ===============================
  // 内容分析 - 基础实现
  // ===============================

  async getBacklinks(filePath: string): Promise<Array<{
    sourcePath: string;
    sourceTitle?: string;
    context: string;
    line: number;
  }>> {
    try {
      const node = await this.graphService.findNode(filePath);
      if (!node) return [];

      const backlinks = await this.graphService.getNodeNeighbors(node.id, 1);
      return backlinks
        .filter(neighbor => neighbor.type === 'file')
        .map(neighbor => ({
          sourcePath: neighbor.id,
          sourceTitle: neighbor.title,
          context: `Links to ${filePath}`, // 简化实现
          line: 0
        }));
    } catch (error) {
      console.error(`Failed to get backlinks for ${filePath}:`, error);
      return [];
    }
  }

  async getOutgoingLinks(filePath: string): Promise<Array<{
    targetPath: string;
    targetTitle?: string;
    linkText: string;
    line: number;
  }>> {
    // 基础实现，返回空数组
    // 在实际项目中可以通过解析文档内容获取链接
    return [];
  }

  async extractKeywords(filePath: string): Promise<Array<{
    word: string;
    frequency: number;
    weight: number;
  }>> {
    // 基础实现，返回空数组
    // 在实际项目中可以通过 NLP 库进行关键词提取
    return [];
  }

  // ===============================
  // 高级功能 - 基础实现
  // ===============================

  async getSimilarDocuments(filePath: string, limit = 5): Promise<Array<{
    path: string;
    title?: string;
    similarity: number;
    reasons: string[];
  }>> {
    // 基础实现，返回空数组
    // 在实际项目中可以基于标签、链接关系等计算相似度
    return [];
  }

  async generateSummary(filePath: string, maxLength = 200): Promise<{
    summary: string;
    keyPoints: string[];
    wordCount: number;
  }> {
    try {
      const content = await this.getRawDocumentContent(filePath);
      const wordCount = content.split(/\s+/).length;
      
      // 简化实现：截取前 maxLength 个字符作为摘要
      const summary = content.length > maxLength 
        ? content.substring(0, maxLength) + '...'
        : content;

      return {
        summary,
        keyPoints: [], // 基础实现
        wordCount
      };
    } catch (error) {
      console.error(`Failed to generate summary for ${filePath}:`, error);
      return {
        summary: '',
        keyPoints: [],
        wordCount: 0
      };
    }
  }

  async findOrphanedDocuments(): Promise<DocumentRef[]> {
    try {
      const orphanedNodes = await this.graphService.getOrphanedNodes();
      return orphanedNodes
        .filter(node => node.type === 'file')
        .map(node => ({
          path: node.id,
          title: node.title,
          type: this.determineFileType(node.id)
        }));
    } catch (error) {
      console.error('Failed to find orphaned documents:', error);
      return [];
    }
  }

  async findBrokenLinks(): Promise<Array<{
    sourcePath: string;
    brokenLink: string;
    line: number;
    suggestions?: string[];
  }>> {
    // 基础实现，返回空数组
    // 在实际项目中可以通过解析文档内容检测断链
    return [];
  }

  // ===============================
  // 私有辅助方法
  // ===============================

  private async checkMetadataAvailability(): Promise<boolean> {
    try {
      const metadata = await this.metadataService.getMetadata();
      return metadata.success;
    } catch {
      return false;
    }
  }

  private extractVaultName(): string {
    const pathParts = this.vaultPath.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || 'Vault';
  }

  private countTreeItems(tree: FileTree[]): { totalDocuments: number; totalFolders: number } {
    let totalDocuments = 0;
    let totalFolders = 0;

    const traverse = (items: FileTree[]) => {
      for (const item of items) {
        if (item.type === 'file') {
          totalDocuments++;
        } else if (item.type === 'folder') {
          totalFolders++;
          if (item.children) {
            traverse(item.children);
          }
        }
      }
    };

    traverse(tree);
    return { totalDocuments, totalFolders };
  }

  private async safeGetGlobalGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] } | null> {
    try {
      return await this.graphService.getGlobalGraph();
    } catch {
      return null;
    }
  }

  private async safeGetTrackFiles(): Promise<string[]> {
    try {
      return await this.footprintsService.scanTrackFiles('Attachments');
    } catch {
      return [];
    }
  }

  private async checkStorageHealth(): Promise<'healthy' | 'warning' | 'error'> {
    try {
      await this.storageService.exists('');
      return 'healthy';
    } catch {
      return 'error';
    }
  }

  private async checkMetadataHealth(): Promise<'healthy' | 'warning' | 'error'> {
    try {
      const result = await this.metadataService.getMetadata();
      return result.success ? 'healthy' : 'warning';
    } catch {
      return 'error';
    }
  }

  private async checkCacheHealth(): Promise<'healthy' | 'warning' | 'error'> {
    // 假设缓存总是健康的，实际实现中可以检查缓存服务状态
    return 'healthy';
  }

  private async checkSearchHealth(): Promise<'healthy' | 'warning' | 'error'> {
    try {
      await this.searchService.searchFiles('test');
      return 'healthy';
    } catch {
      return 'error';
    }
  }

  private async checkGraphHealth(): Promise<'healthy' | 'warning' | 'error'> {
    try {
      await this.graphService.getGraphStats();
      return 'healthy';
    } catch {
      return 'warning';
    }
  }

  private extractTitleFromPath(path: string): string {
    const fileName = path.split('/').pop() || '';
    return fileName.replace(/\.[^/.]+$/, ''); // 移除文件扩展名
  }

  private determineFileType(path: string): DocumentRef['type'] {
    const extension = path.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'md':
        return 'markdown';
      case 'canvas':
        return 'canvas';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return 'image';
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'gpx':
      case 'kml':
        return 'attachment';
      default:
        return 'other';
    }
  }

  private calculateRelevanceScore(result: SearchResult, query: string): number {
    // 简化的相关性评分算法
    const matchCount = result.matches.length;
    const queryLength = query.length;
    
    // 基于匹配数量和查询长度计算评分
    return Math.min(1.0, (matchCount * queryLength) / 100);
  }
}