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
import rehypeReact from 'rehype-react';
import React from 'react';
import * as prod from 'react/jsx-runtime';

import type { IVaultService } from '../../services/interfaces/IVaultService.js';
import { parseFrontMatter, type FrontMatterData } from '../../utils/frontMatterParser.js';
import { MermaidDiagram } from '../../newComponents/MermaidDiagram.js';
import { TrackMap } from '../../newComponents/TrackMap/TrackMap.js';

// 导入新的插件
import {
  trackMapsPlugin,
  footprintsPlugin,
  trackMapRenderer,
  mermaidPlugin,
  mermaidRenderer,
  obsidianLinksPlugin,
  obsidianTagsPlugin,
  obsidianHighlightsPlugin,
  obsidianCalloutsPlugin,
  tableWrapperPlugin,
  externalLinksPlugin,
  type TrackMapsPluginOptions,
  type FootprintsPluginOptions,
  type MermaidPluginOptions,
  type MermaidRendererOptions,
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
  content: React.ReactElement;
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
    private vaultService: IVaultService,
    private options: MarkdownProcessingOptions = DEFAULT_OPTIONS
  ) {
    this.processor = this.createProcessor();
  }

  /**
   * 创建 unified 处理器 - 完整的插件管道
   */
  private createProcessor() {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm) // GitHub Flavored Markdown (表格、checkbox、引用等)
      .use(remarkMath) // 数学公式支持

    // 添加 Obsidian 插件（remark 阶段 - 处理 markdown AST）
    if (this.options.enableObsidianLinks) {
      processor.use(obsidianLinksPlugin, {
        baseUrl: '/vaults/Demo',
        currentFilePath: ''
      } as ObsidianLinksPluginOptions);
    }

    if (this.options.enableObsidianTags) {
      processor.use(obsidianTagsPlugin, {} as ObsidianTagsOptions);
    }

    if (this.options.enableHighlights) {
      processor.use(obsidianHighlightsPlugin, {} as ObsidianHighlightsOptions);
    }

    if (this.options.enableCallouts) {
      processor.use(obsidianCalloutsPlugin, {} as ObsidianCalloutsOptions);
    }

    if (this.options.enableTracks) {
      processor.use(trackMapsPlugin, {
        baseUrl: '/vaults/Demo',
        currentFilePath: ''
      } as TrackMapsPluginOptions);
    }

    if (this.options.enableMermaid) {
      processor.use(mermaidPlugin, {} as MermaidPluginOptions);
    }

    // 转换为 HTML AST
    processor.use(remarkRehype, {
      allowDangerousHtml: true
    });

    // 添加 rehype 插件（处理 HTML AST）
    processor.use(rehypeSlug); // 为标题添加 ID（TOC 跳转需要）

    if (this.options.enableMath) {
      processor.use(rehypeKatex); // 渲染数学公式
    }

    if (this.options.enableCodeHighlight) {
      processor.use(rehypeHighlight); // 代码高亮
    }

    // Track map 渲染器（rehype 阶段）
    if (this.options.enableTracks) {
      processor.use(trackMapRenderer);
    }

    // Mermaid 渲染器（rehype 阶段）
    if (this.options.enableMermaid) {
      processor.use(mermaidRenderer);
    }

    // 表格包装器（为表格添加样式和响应式支持）
    processor.use(tableWrapperPlugin, {} as TableWrapperOptions);

    // 外部链接处理（为外部链接添加样式和 target="_blank"）
    processor.use(externalLinksPlugin, {} as ExternalLinksOptions);

    // 最终渲染为 React 元素
    processor.use(rehypeReact, {
      Fragment: prod.Fragment,
      jsx: prod.jsx,
      jsxs: prod.jsxs,
      passKeys: true,
      components: {
        // 修复 void 元素
        hr: (props: any) => {
          const { children, dangerouslySetInnerHTML, ...restProps } = props;
          return React.createElement('hr', restProps);
        },
        br: (props: any) => {
          const { children, dangerouslySetInnerHTML, ...restProps } = props;
          return React.createElement('br', restProps);
        },
        img: (props: any) => {
          const { children, dangerouslySetInnerHTML, ...restProps } = props;
          return React.createElement('img', restProps);
        },
        input: (props: any) => {
          const { children, dangerouslySetInnerHTML, ...restProps } = props;
          return React.createElement('input', restProps);
        },
        // 处理 TrackMap 组件 - 直接映射
        TrackMap: TrackMap,
        // 处理 MermaidDiagram 组件 - 直接映射
        MermaidDiagram: MermaidDiagram
      }
    });

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

    // 提取元数据
    const metadata = {
      headings: [] as Array<{ level: number; text: string; id: string }>,
      links: [] as Array<{ href: string; text: string }>,
      tags: [] as string[]
    };

    // 处理 Markdown - 使用 process() 一次性完成所有处理
    const file = await this.processor.process(markdownContent);

    const reactContent = file.result as React.ReactElement;

    // 从文件数据中提取 mermaid diagrams
    if (file.data && (file.data as any).mermaidDiagrams) {
      mermaidDiagrams.push(...(file.data as any).mermaidDiagrams);
    }

    // 从文件数据中提取 trackMaps (插件应该在 file.data 中存储这些)
    if (file.data && (file.data as any).trackMaps) {
      trackMaps.push(...(file.data as any).trackMaps);
    }

    // 从 file.data 中提取 metadata (如果插件正确设置了的话)
    if (file.data) {
      const data = file.data as any;
      if (data.headings) metadata.headings = data.headings;
      if (data.links) metadata.links = data.links;
      if (data.tags) metadata.tags = data.tags;
    }

    // 如果 metadata 为空，我们需要从 AST 中提取
    if (metadata.headings.length === 0) {
      const ast = this.processor.parse(markdownContent);
      const transformedAst = await this.processor.run(ast, { data: {} });
      this.extractMetadataFromAst(transformedAst, metadata);
    }

    return {
      content: reactContent,
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
   * 快速处理（只生成 React 元素）
   */
  async processToReact(content: string): Promise<React.ReactElement> {
    const result = await this.processor.process(content);
    return result.result as React.ReactElement;
  }
}