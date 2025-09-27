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
import { PDFViewer } from '../../newComponents/PDFViewer/PDFViewer.js';

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
  mediaEmbedRenderer,
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
  enableFootprints?: boolean;
  baseUrl?: string;
  currentFilePath?: string;
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
  private createProcessor(options?: MarkdownProcessingOptions) {
    // 确保使用完整的默认选项，然后合并实例选项和传入的选项
    const mergedOptions = { ...DEFAULT_OPTIONS, ...this.options, ...options };
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm) // GitHub Flavored Markdown (表格、checkbox、引用等)
      .use(remarkMath) // 数学公式支持

    // 添加 Obsidian 插件（remark 阶段 - 处理 markdown AST）
    // IMPORTANT: trackMapsPlugin must run BEFORE obsidianLinksPlugin
    // so that [[*.gpx]] and [[*.kml]] files are converted to track maps
    if (mergedOptions.enableTracks) {
      processor.use(trackMapsPlugin, {
        baseUrl: mergedOptions.baseUrl || '/vaults/Demo',
        currentFilePath: mergedOptions.currentFilePath || ''
      } as TrackMapsPluginOptions);
    }

    if (mergedOptions.enableObsidianLinks) {
      processor.use(obsidianLinksPlugin, {
        baseUrl: mergedOptions.baseUrl || '/vaults/Demo',
        currentFilePath: mergedOptions.currentFilePath || ''
      } as ObsidianLinksPluginOptions);
    }

    if (mergedOptions.enableObsidianTags) {
      processor.use(obsidianTagsPlugin, {} as ObsidianTagsOptions);
    }

    if (mergedOptions.enableHighlights) {
      processor.use(obsidianHighlightsPlugin, {} as ObsidianHighlightsOptions);
    }

    if (mergedOptions.enableCallouts) {
      processor.use(obsidianCalloutsPlugin, {} as ObsidianCalloutsOptions);
    }

    if (mergedOptions.enableMermaid) {
      processor.use(mermaidPlugin, {} as MermaidPluginOptions);
    }

    // 转换为 HTML AST
    processor.use(remarkRehype, {
      allowDangerousHtml: true,
      // 添加自定义节点处理器
      handlers: {
        // 处理 PDF 嵌入
        pdfEmbed: (state: any, node: any) => {
          // 直接返回 HAST 节点
          return {
            type: 'element',
            tagName: 'div',
            properties: node.data?.hProperties || {},
            children: []
          };
        },
        // 处理视频嵌入
        videoEmbed: (state: any, node: any) => {
          // 直接返回 HAST 节点
          return {
            type: 'element',
            tagName: 'div',
            properties: node.data?.hProperties || {},
            children: []
          };
        },
        // 处理音频嵌入
        audioEmbed: (state: any, node: any) => {
          // 直接返回 HAST 节点
          return {
            type: 'element',
            tagName: 'div',
            properties: node.data?.hProperties || {},
            children: []
          };
        }
      }
    });

    // 添加 rehype 插件（处理 HTML AST）
    processor.use(rehypeSlug); // 为标题添加 ID（TOC 跳转需要）

    if (mergedOptions.enableMath) {
      processor.use(rehypeKatex); // 渲染数学公式
    }

    if (mergedOptions.enableCodeHighlight) {
      processor.use(rehypeHighlight); // 代码高亮
    }

    // Track map 渲染器（rehype 阶段）
    if (mergedOptions.enableTracks) {
      processor.use(trackMapRenderer);
    }

    // Mermaid 渲染器（rehype 阶段）
    if (mergedOptions.enableMermaid) {
      processor.use(mermaidRenderer);
    }

    // 媒体嵌入渲染器（PDF、视频、音频）
    processor.use(mediaEmbedRenderer);

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
          // 使用延迟加载的 ImageWithZoom 组件
          const ImageWithZoom = React.lazy(() => import('../../newComponents/ImageWithZoom/ImageWithZoom.js').then(module => ({
            default: module.ImageWithZoom
          })));
          return React.createElement(React.Suspense, {
            fallback: React.createElement('img', restProps)
          }, React.createElement(ImageWithZoom, restProps));
        },
        input: (props: any) => {
          const { children, dangerouslySetInnerHTML, ...restProps } = props;
          return React.createElement('input', restProps);
        },
        // 处理标签渲染
        span: (props: any) => {
          const { children, className, ...restProps } = props;
          // 检查是否是标签
          if (className && className.includes('tag')) {
            // 渲染为非链接的标签
            return React.createElement('span', {
              ...restProps,
              className,
              style: { cursor: 'default' }
            }, children);
          }
          // 其他 span 元素正常渲染
          return React.createElement('span', props);
        },
        // 处理内部链接的点击事件
        a: (props: any) => {
          const { children, href, className, ...restProps } = props;
          // 检查是否是内部链接
          const isInternalLink = className && className.includes('internal-link');
          const filePath = restProps['data-file-path'];

          // 检查是否是脚注链接
          const isFootnoteLink = href && (
            href.startsWith('#user-content-fn-') ||
            href.startsWith('#user-content-fnref-')
          );

          if (isFootnoteLink) {
            // 脚注链接使用自定义滚动行为
            return React.createElement('a', {
              ...props,
              onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                // 获取目标元素 ID
                const targetId = href.replace('#', '');
                const targetElement = document.getElementById(targetId);
                if (!targetElement) return;

                // 使用类似 TOC 的方法查找滚动容器
                const findScrollContainer = (element: HTMLElement): HTMLElement | null => {
                  let currentElement = element.parentElement;
                  while (currentElement && currentElement !== document.body) {
                    const computedStyle = window.getComputedStyle(currentElement);
                    const hasScroll = computedStyle.overflowY === 'auto' ||
                                     computedStyle.overflowY === 'scroll' ||
                                     computedStyle.overflow === 'auto' ||
                                     computedStyle.overflow === 'scroll';

                    if (hasScroll && currentElement.scrollHeight > currentElement.clientHeight) {
                      return currentElement;
                    }
                    currentElement = currentElement.parentElement;
                  }
                  return null;
                };

                const scrollContainer = findScrollContainer(targetElement);
                if (!scrollContainer) return;

                // 使用 requestAnimationFrame 确保 DOM 更新后再计算
                requestAnimationFrame(() => {
                  const containerRect = scrollContainer.getBoundingClientRect();
                  const elementRect = targetElement.getBoundingClientRect();

                  // 计算相对位置，类似 TOC 的实现
                  const elementRelativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
                  const scrollOffset = 10; // 留一点间距，不要紧贴顶部
                  const targetScrollTop = Math.max(0, elementRelativeTop - scrollOffset);

                  // 先使用 instant 滚动到位置，然后再使用 smooth
                  scrollContainer.scrollTo({
                    top: targetScrollTop,
                    behavior: 'instant'
                  });

                  // 再次使用 requestAnimationFrame 确保第一次滚动完成
                  requestAnimationFrame(() => {
                    scrollContainer.scrollTo({
                      top: targetScrollTop,
                      behavior: 'smooth'
                    });
                  });
                });
              }
            }, children);
          }

          if (isInternalLink && filePath) {
            // 内部链接使用自定义处理
            return React.createElement('a', {
              ...restProps,
              href,
              className,
              onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                // 触发导航到文件
                const navigateEvent = new CustomEvent('navigateToFile', {
                  detail: { filePath }
                });
                window.dispatchEvent(navigateEvent);
              }
            }, children);
          }

          // 外部链接保持默认行为
          return React.createElement('a', { ...props }, children);
        },
        // 处理 TrackMap 组件 - 直接映射
        TrackMap: TrackMap,
        // 处理 MermaidDiagram 组件 - 直接映射
        MermaidDiagram: MermaidDiagram,
        // 处理 PDFViewer 组件 - 直接映射
        PDFViewer: PDFViewer
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

    // 如果有 currentFilePath，创建一个新的 processor 实例，传递正确的路径
    const processor = currentFilePath ? this.createProcessor({ ...this.options, currentFilePath }) : this.processor;

    // 处理 Markdown - 使用 process() 一次性完成所有处理
    const file = await processor.process(markdownContent);

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