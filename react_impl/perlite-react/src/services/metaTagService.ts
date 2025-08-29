/**
 * 动态Meta标签管理服务
 * 用于根据当前文章内容更新页面的meta标签，支持微信、Twitter等平台的分享
 */

export interface MetaTagsData {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

export class MetaTagService {
  /**
   * 更新页面的meta标签
   */
  static updateMetaTags(data: MetaTagsData): void {
    const { title, description, image, url } = data;

    // 更新页面标题
    document.title = title;
    this.updateMetaElement('page-title', 'textContent', title);

    // 更新描述
    this.updateMetaElement('meta-description', 'content', description);

    // 更新Open Graph标签
    this.updateMetaElement('og-title', 'content', title);
    this.updateMetaElement('og-description', 'content', description);
    
    if (image) {
      this.updateMetaElement('og-image', 'content', image);
    }
    
    if (url) {
      this.updateMetaElement('og-url', 'content', url);
    }

    // 更新Twitter Card标签
    this.updateMetaElement('twitter-title', 'content', title);
    this.updateMetaElement('twitter-description', 'content', description);
    
    if (image) {
      this.updateMetaElement('twitter-image', 'content', image);
    }
  }

  /**
   * 根据Markdown文件内容生成meta标签数据
   */
  static generateMetaFromContent(fileName: string, content: string): MetaTagsData {
    // 提取文件标题（移除.md后缀）
    const title = fileName.replace(/\.md$/, '').replace(/_/g, ' ');
    
    // 提取描述（取前200个字符的纯文本）
    const description = this.extractDescription(content);
    
    // 获取当前URL，确保是完整的HTTPS URL
    const url = this.getCanonicalUrl();
    
    // 提取第一张图片作为分享图（如果有的话）
    const image = this.extractFirstImage(content) || this.generateDefaultShareImage(title);
    
    return {
      title: `${title} - Helenite`,
      description,
      url,
      image
    };
  }

  /**
   * 从Markdown内容中提取描述文本
   */
  private static extractDescription(content: string): string {
    // 移除YAML前言
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, '');
    
    // 移除Markdown语法
    const plainText = withoutFrontmatter
      .replace(/#{1,6}\s+/g, '') // 移除标题标记
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗体
      .replace(/\*([^*]+)\*/g, '$1') // 移除斜体
      .replace(/`([^`]+)`/g, '$1') // 移除行内代码
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
      .replace(/\n+/g, ' ') // 将换行替换为空格
      .trim();
    
    // 截取前200个字符
    const maxLength = 200;
    if (plainText.length <= maxLength) {
      return plainText || 'Modern Obsidian Vault Viewer - 现代化的 Obsidian 知识库浏览器';
    }
    
    return plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }

  /**
   * 更新指定的meta元素
   */
  private static updateMetaElement(id: string, attribute: string, value: string): void {
    const element = document.getElementById(id);
    if (element) {
      if (attribute === 'textContent') {
        element.textContent = value;
      } else {
        element.setAttribute(attribute, value);
      }
    }
  }

  /**
   * 从Markdown内容中提取第一张图片
   */
  private static extractFirstImage(content: string): string | null {
    // 匹配Markdown图片语法: ![alt](url)
    const imageRegex = /!\[.*?\]\((.*?)\)/;
    const match = content.match(imageRegex);
    
    if (match && match[1]) {
      const imageUrl = match[1];
      // 如果是相对路径，转换为绝对路径
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      } else if (imageUrl.startsWith('/')) {
        return `${window.location.origin}${imageUrl}`;
      } else {
        // 相对于当前页面的路径
        const currentPath = window.location.pathname;
        const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        return `${window.location.origin}${basePath}/${imageUrl}`;
      }
    }
    
    return null;
  }

  /**
   * 获取规范化的分享URL
   */
  private static getCanonicalUrl(): string {
    // 确保URL是完整的HTTPS格式，微信抓取需要
    const currentUrl = window.location.href;
    
    // 如果是localhost或IP地址，可能需要替换为实际域名
    if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1') || /^\d+\.\d+\.\d+\.\d+/.test(currentUrl)) {
      console.warn('检测到本地URL，微信可能无法抓取。建议使用HTTPS域名。');
    }
    
    return currentUrl;
  }

  /**
   * 生成默认分享图片（可以是动态生成的或固定的logo）
   */
  private static generateDefaultShareImage(title: string): string {
    // 可以返回一个动态生成的图片URL，或者默认logo
    // 这里先返回一个默认图片
    return `${window.location.origin}/vite.svg`;
  }

  /**
   * 重置meta标签为默认值
   */
  static resetToDefaults(): void {
    this.updateMetaTags({
      title: 'Helenite',
      description: 'Modern Obsidian Vault Viewer - 现代化的 Obsidian 知识库浏览器',
      url: window.location.origin
    });
  }
}