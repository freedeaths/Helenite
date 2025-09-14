/**
 * 新版 Markdown 处理器
 * 
 * 基于 unified 生态系统，通过 VaultService 获取数据
 * 支持完整的 Obsidian 语法和扩展功能
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';

import type { VaultService } from '../../services/VaultService.js';
import { parseFrontMatter, type FrontMatterData } from '../../utils/frontMatterParser.js';

// 导入新的插件
import {
  trackMapsPlugin,
  footprintsPlugin,
  trackMapRenderer,
  mermaidPlugin,
  obsidianLinksPlugin,
  obsidianTagsPlugin,
  obsidianHighlightsPlugin,
  obsidianCalloutsPlugin,
  tableWrapperPlugin,
  externalLinksPlugin,
  type TrackMapsPluginOptions,
  type FootprintsPluginOptions,
  type MermaidPluginOptions,
  type ObsidianLinksPluginOptions,
  type ObsidianTagsOptions,
  type ObsidianHighlightsOptions,
  type ObsidianCalloutsOptions,
  type TableWrapperOptions,
  type ExternalLinksOptions
} from './plugins/index.js';

/**
 * Markdown 处理选项
 */
export interface MarkdownProcessingOptions {
  enableObsidianLinks?: boolean;
  enableObsidianTags?: boolean;
  enableHighlights?: boolean;
  enableCallouts?: boolean;
  enableMath?: boolean;
  enableCodeHighlight?: boolean;
  enableMermaid?: boolean;
  enableTracks?: boolean;
}

/**
 * 默认处理选项
 */
export const DEFAULT_OPTIONS: MarkdownProcessingOptions = {
  enableObsidianLinks: true,
  enableObsidianTags: true,
  enableHighlights: true,
  enableCallouts: true,
  enableMath: true,
  enableCodeHighlight: true,
  enableMermaid: true,
  enableTracks: true,
};

/**
 * 处理结果接口
 */
export interface ProcessedMarkdown {
  html: string;
  metadata: {
    headings: Array<{ level: number; text: string; id: string }>;
    links: Array<{ href: string; text: string }>;
    tags: string[];
  };
  frontMatter: FrontMatterData;
  mermaidDiagrams: Array<{ id: string; code: string; placeholder: string }>;
  trackMaps: Array<{ id: string; code: string; placeholder: string; isFile?: boolean; fileType?: string }>;
}

/**
 * 新版 Markdown 处理器类
 * 通过 VaultService 获取数据，确保一致的缓存和错误处理
 */
export class MarkdownProcessor {
  private processor: any;

  constructor(
    private vaultService: VaultService,
    private options: MarkdownProcessingOptions = DEFAULT_OPTIONS
  ) {
    this.processor = this.createProcessor();
  }

  /**
   * 创建 unified 处理器
   */
  private createProcessor() {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm);

    // 基础插件
    if (this.options.enableMath) {
      processor.use(remarkMath);
    }

    // Mermaid 图表插件
    if (this.options.enableMermaid) {
      const mermaidOptions: MermaidPluginOptions = {};
      processor.use(mermaidPlugin, mermaidOptions);
    }

    // Obsidian 语法插件
    if (this.options.enableObsidianLinks) {
      const linksOptions: ObsidianLinksPluginOptions = {
        baseUrl: '/vault',
        currentFilePath: undefined, // 在处理时动态设置
        metadata: undefined // 从 VaultService 获取
      };
      processor.use(obsidianLinksPlugin, linksOptions);
    }

    if (this.options.enableObsidianTags) {
      const tagsOptions: ObsidianTagsOptions = {};
      processor.use(obsidianTagsPlugin, tagsOptions);
    }

    if (this.options.enableHighlights) {
      const highlightsOptions: ObsidianHighlightsOptions = {};
      processor.use(obsidianHighlightsPlugin, highlightsOptions);
    }

    if (this.options.enableCallouts) {
      const calloutsOptions: ObsidianCalloutsOptions = {};
      processor.use(obsidianCalloutsPlugin, calloutsOptions);
    }

    // 轨迹处理插件
    if (this.options.enableTracks) {
      const trackOptions: TrackMapsPluginOptions = {
        baseUrl: '/vault', // 从 VaultService 获取
        currentFilePath: undefined // 在处理时动态设置
      };

      processor.use(trackMapsPlugin, trackOptions);

      const footprintsOptions: FootprintsPluginOptions = {
        baseUrl: '/vault',
        footprintsService: undefined // TODO: 从构造函数注入
      };

      processor.use(footprintsPlugin, footprintsOptions);
    }

    // 转换为 HTML
    processor.use(remarkRehype, { allowDangerousHtml: true });

    // HTML 处理插件
    if (this.options.enableMath) {
      processor.use(rehypeKatex);
    }

    processor.use(rehypeSlug);

    // 表格包装插件
    const tableOptions: TableWrapperOptions = {};
    processor.use(tableWrapperPlugin, tableOptions);

    // 外部链接插件
    const externalLinksOptions: ExternalLinksOptions = {};
    processor.use(externalLinksPlugin, externalLinksOptions);

    // 轨迹地图渲染插件
    if (this.options.enableTracks) {
      processor.use(trackMapRenderer, {
        baseUrl: '/vault',
        vaultService: this.vaultService
      });
    }

    if (this.options.enableCodeHighlight) {
      processor.use(rehypeHighlight);
    }

    processor.use(rehypeStringify, { allowDangerousHtml: true });

    return processor;
  }

  /**
   * 处理单个文件
   */
  async processFile(filePath: string): Promise<ProcessedMarkdown> {
    // 通过 VaultService 获取文件内容（享受缓存等好处）
    const rawContent = await this.vaultService.getRawDocumentContent(filePath);
    return this.processContent(rawContent, filePath);
  }

  /**
   * 处理原始 Markdown 内容
   */
  async processContent(content: string, currentFilePath?: string): Promise<ProcessedMarkdown> {
    // 解析 frontmatter
    const { frontMatter, content: markdownContent } = parseFrontMatter(content);

    // 用于收集处理过程中的数据
    const mermaidDiagrams: any[] = [];
    const trackMaps: any[] = [];

    // 处理 Markdown
    const ast = this.processor.parse(markdownContent);

    // 提取元数据
    const metadata = {
      headings: [] as Array<{ level: number; text: string; id: string }>,
      links: [] as Array<{ href: string; text: string }>,
      tags: [] as string[]
    };

    // 创建 VFile 用于收集插件数据
    const file = { data: {} };

    // 转换为 HTML
    const transformedAst = await this.processor.run(ast, file);

    // 从文件数据中提取 Mermaid 图表
    if (file.data && (file.data as any).mermaidDiagrams) {
      mermaidDiagrams.push(...(file.data as any).mermaidDiagrams);
    }

    // 从转换后的 AST 中提取 trackMaps 和 metadata
    this.extractTrackMapsFromAst(transformedAst, trackMaps);
    this.extractMetadataFromAst(transformedAst, metadata);

    const html = this.processor.stringify(transformedAst);

    return {
      html,
      metadata,
      frontMatter,
      mermaidDiagrams,
      trackMaps
    };
  }

  /**
   * 从 AST 中提取文档元数据
   */
  private extractMetadataFromAst(ast: any, metadata: any): void {
    const visit = (node: any) => {
      // 提取标题
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        const level = parseInt(node.tagName.charAt(1));
        const text = this.extractTextFromNode(node);
        const id = node.properties?.id || text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        metadata.headings.push({ level, text, id });
      }

      // 提取链接
      if (node.type === 'element' && node.tagName === 'a') {
        const href = node.properties?.href || '';
        const text = this.extractTextFromNode(node);

        metadata.links.push({ href, text });

        // 检查是否为标签链接
        if (href.startsWith('#tag:')) {
          const tag = decodeURIComponent(href.replace('#tag:', ''));
          if (!metadata.tags.includes(tag)) {
            metadata.tags.push(tag);
          }
        }
      }

      // 递归遍历子节点
      if (node.children) {
        node.children.forEach(visit);
      }
    };

    visit(ast);
  }

  /**
   * 从节点中提取纯文本
   */
  private extractTextFromNode(node: any): string {
    if (node.type === 'text') {
      return node.value || '';
    }

    if (node.children) {
      return node.children.map((child: any) => this.extractTextFromNode(child)).join('');
    }

    return '';
  }

  /**
   * 从 AST 中提取 trackMaps 数据
   */
  private extractTrackMapsFromAst(ast: any, trackMaps: any[]): void {
    const visit = (node: any) => {
      if (node.type === 'element' && node.tagName === 'div') {
        if (node.properties?.className?.includes('track-map-component')) {
          // 从 data-props 属性中提取 trackMap 数据
          const propsData = node.properties?.['data-props'];
          if (propsData) {
            try {
              const parsedProps = typeof propsData === 'string' ? JSON.parse(propsData) : propsData;
              trackMaps.push(parsedProps);
            } catch (error) {
              console.warn('Failed to parse track props:', error);
            }
          }
        }
      }

      // 递归遍历子节点
      if (node.children) {
        node.children.forEach(visit);
      }
    };

    visit(ast);
  }

  /**
   * 快速处理（只生成 HTML）
   */
  async processToHTML(content: string): Promise<string> {
    const result = await this.processor.process(content);
    return String(result);
  }
}