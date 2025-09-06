import type { IFileAPI, TOCItem, LinkData } from '../../interfaces/IFileAPI';
import type { FileMetadata } from '../../interfaces/IFileTreeAPI';
import { VAULT_PATH } from '../../../config/vaultConfig';
import { fetchVault } from '../../../utils/fetchWithAuth';

/**
 * 本地文件 API 实现
 * 负责从静态文件服务器加载 markdown 文件内容和处理相关操作
 */
export class LocalFileAPI implements IFileAPI {
  // baseUrl 参数保留用于接口兼容性，但现在使用 VAULT_PATH
  constructor(baseUrl: string = '/vaults/Demo') {
    // 使用 VAULT_PATH 而不是 baseUrl
    // TODO: 将来可能使用 baseUrl 参数实现多 vault 支持
    console.log(`LocalFileAPI initialized with baseUrl: ${baseUrl}, using VAULT_PATH: ${VAULT_PATH}`);
  }

  /**
   * 获取文件内容
   */
  async getFileContent(path: string): Promise<string> {
    const cleanPath = this.normalizePath(path);
    // VAULT_PATH 已经包含了完整路径，直接拼接清理后的路径即可
    const fullPath = cleanPath.startsWith('/') 
      ? `${VAULT_PATH}${cleanPath}`
      : `${VAULT_PATH}/${cleanPath}`;
    
    try {
      console.log(`📄 Loading file content: ${fullPath}`);
      const response = await fetchVault(fullPath);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      
      const content = await response.text();
      console.log(`✅ File loaded successfully: ${cleanPath} (${content.length} chars)`);
      return content;
      
    } catch (error) {
      console.error('❌ Failed to load file content:', error);
      throw new Error(`Unable to load file: ${cleanPath}`);
    }
  }

  /**
   * 获取文件元数据
   */
  async getFileMetadata(path: string): Promise<FileMetadata> {
    try {
      console.log(`📊 Loading metadata for: ${path}`);
      
      // 加载 metadata.json
      const response = await fetchVault(`${VAULT_PATH}/metadata.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }
      
      const allMetadata: any[] = await response.json();
      const cleanPath = this.normalizePath(path);
      
      // 查找对应的元数据
      const metadata = allMetadata.find(item => 
        this.normalizePath(item.relativePath) === cleanPath ||
        this.normalizePath(item.relativePath) === cleanPath + '.md'
      );
      
      if (!metadata) {
        throw new Error(`Metadata not found for file: ${cleanPath}`);
      }
      
      console.log(`✅ Metadata loaded for: ${cleanPath}`);
      return this.convertMetadata(metadata);
      
    } catch (error) {
      console.error('❌ Failed to load file metadata:', error);
      throw new Error(`Unable to load metadata for: ${path}`);
    }
  }

  /**
   * 获取附件文件的 URL
   */
  getAttachmentUrl(path: string): string {
    // 对于附件，不应该添加 .md 扩展名
    let cleanPath = path.replace(/^\/+/, '');
    
    // 如果路径已包含 Attachments，则直接使用
    if (cleanPath.toLowerCase().includes('attachments/')) {
      // 提取 Attachments/ 之后的部分
      const parts = cleanPath.split(/attachments\//i);
      if (parts.length > 1) {
        cleanPath = parts[1];
      }
    }
    
    return `${VAULT_PATH}/Attachments/${cleanPath}`;
  }

  /**
   * 获取图片文件的 URL
   */
  getImageUrl(path: string): string {
    // 图片也在 Attachments 文件夹中
    return this.getAttachmentUrl(path);
  }

  /**
   * 从 Markdown 内容中提取目录结构
   */
  async extractTOC(content: string): Promise<TOCItem[]> {
    const toc: TOCItem[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        const id = this.generateId(title);
        
        toc.push({
          id,
          title,
          level
        });
      }
    }
    
    // 构建层次结构
    return this.buildTOCHierarchy(toc);
  }

  /**
   * 从 Markdown 内容中提取链接
   */
  async extractLinks(content: string): Promise<LinkData[]> {
    const links: LinkData[] = [];
    
    // 匹配 [[链接]] 格式的内部链接
    const internalLinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    
    while ((match = internalLinkRegex.exec(content)) !== null) {
      const linkText = match[1];
      links.push({
        link: linkText,
        relativePath: linkText + '.md' // 假设都是 markdown 文件
      });
    }
    
    // 匹配 [文本](链接) 格式的外部链接
    const externalLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = externalLinkRegex.exec(content)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];
      
      // 只处理内部链接（相对路径）
      if (!linkUrl.startsWith('http') && !linkUrl.startsWith('mailto:')) {
        links.push({
          link: linkText,
          relativePath: linkUrl
        });
      }
    }
    
    return links;
  }

  /**
   * 从 Markdown 内容中提取标签
   */
  async extractTags(content: string): Promise<string[]> {
    const tags: string[] = [];
    
    // 匹配 #标签 格式
    const tagRegex = /#([^\s#]+)/g;
    let match;
    
    while ((match = tagRegex.exec(content)) !== null) {
      const tag = match[1];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  /**
   * 检查文件是否存在
   */
  async exists(path: string): Promise<boolean> {
    try {
      const cleanPath = this.normalizePath(path);
      // VAULT_PATH 已经包含了完整路径，直接拼接清理后的路径即可
      const fullPath = cleanPath.startsWith('/') 
        ? `${VAULT_PATH}${cleanPath}`
        : `${VAULT_PATH}/${cleanPath}`;
      
      const response = await fetchVault(fullPath, { method: 'HEAD' });
      return response.ok;
      
    } catch {
      return false;
    }
  }

  /**
   * 标准化文件路径
   */
  private normalizePath(path: string): string {
    // 移除开头的斜杠
    let cleanPath = path.replace(/^\/+/, '');
    
    // 只在没有任何扩展名时添加 .md
    // 检查是否已有扩展名（包括 .md, .png, .jpg, .gpx 等）
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(cleanPath);
    if (!hasExtension) {
      cleanPath += '.md';
    }
    
    return cleanPath;
  }

  /**
   * 转换元数据格式
   */
  private convertMetadata(item: any): FileMetadata {
    return {
      fileName: item.fileName || '',
      relativePath: item.relativePath || '',
      tags: item.tags || [],
      frontmatter: item.frontmatter || {},
      aliases: item.aliases || [],
      headings: item.headings ? item.headings.map((h: any) => ({
        heading: h.heading,
        level: h.level
      })) : [],
      links: item.links ? item.links.map((l: any) => ({
        link: l.link,
        relativePath: l.relativePath
      })) : [],
      backlinks: item.backlinks ? item.backlinks.map((b: any) => ({
        fileName: b.fileName,
        link: b.link,
        relativePath: b.relativePath
      })) : []
    };
  }

  /**
   * 生成 ID（用于目录锚点）
   */
  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, '') // 保留中文、英文、数字、空格、横线
      .replace(/\s+/g, '-')
      .trim();
  }

  /**
   * 构建目录层次结构
   */
  private buildTOCHierarchy(flatTOC: TOCItem[]): TOCItem[] {
    if (flatTOC.length === 0) return [];
    
    const result: TOCItem[] = [];
    const stack: TOCItem[] = [];
    
    for (const item of flatTOC) {
      // 找到当前项应该插入的位置
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop();
      }
      
      if (stack.length === 0) {
        // 顶级项
        result.push(item);
      } else {
        // 子项
        const parent = stack[stack.length - 1];
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item);
      }
      
      stack.push(item);
    }
    
    return result;
  }
}