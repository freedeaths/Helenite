/**
 * 新版 Markdown 处理器
 *
 * 基于 unified 生态系统，通过 VaultService 获取数据
 * 支持完整的 Obsidian 语法和扩展功能
 */

import { unified } from 'unified';
import type { Processor } from 'unified';
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
import type { Node } from 'unist';

import type { IVaultService } from '../../services/interfaces/IVaultService.js';
import { VAULT_PATH } from '../../config/vaultConfig.js';
import { MermaidDiagram } from '../../components/MermaidDiagram.js';
import { TrackMap } from '../../components/TrackMap/TrackMap.js';
import { parseFrontMatter, type FrontMatterData } from './utils/frontMatterParser.js';

// 导入新的插件
import {
  trackMapsPlugin,
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
  type ObsidianLinksPluginOptions,
  type ObsidianTagsOptions,
  type ObsidianHighlightsOptions,
  type ObsidianCalloutsOptions,
  type TableWrapperOptions
} from './plugins/index.js';

// 导入TrackData类型（由于TypeScript模块系统限制，需要单独导入）
import type { TrackData } from './plugins/remark/trackMapsPlugin.js';

// MermaidData 类型定义
interface MermaidData {
  id: string;
  code: string;
  placeholder: string;
}

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
  trackMaps: TrackData[];
}

/**
 * 新版 Markdown 处理器类
 * 通过 VaultService 获取数据，确保一致的缓存和错误处理
 */
export class MarkdownProcessor {
  private processor: Processor;
  private vaultService: IVaultService;
  private options: MarkdownProcessingOptions;

  constructor(
    vaultService: IVaultService,
    options: MarkdownProcessingOptions = DEFAULT_OPTIONS
  ) {
    this.vaultService = vaultService;
    this.options = options;
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
        baseUrl: mergedOptions.baseUrl || VAULT_PATH,
        currentFilePath: mergedOptions.currentFilePath || ''
      } as TrackMapsPluginOptions);
    }

    if (mergedOptions.enableObsidianLinks) {
      processor.use(obsidianLinksPlugin, {
        baseUrl: mergedOptions.baseUrl || VAULT_PATH,
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
      processor.use(mermaidPlugin, {});
    }

    // 转换为 HTML AST
    processor.use(remarkRehype, {
      allowDangerousHtml: true,
      // 添加自定义节点处理器
      handlers: {
        // 处理 PDF 嵌入
        pdfEmbed: (_state: unknown, node: Node & { data?: { hProperties?: Record<string, unknown> } }) => {
          // 直接返回 HAST 节点
          return {
            type: 'element',
            tagName: 'div',
            properties: node.data?.hProperties || {},
            children: []
          };
        },
        // 处理视频嵌入
        videoEmbed: (_state: unknown, node: Node & { data?: { hProperties?: Record<string, unknown> } }) => {
          // 直接返回 HAST 节点
          return {
            type: 'element',
            tagName: 'div',
            properties: node.data?.hProperties || {},
            children: []
          };
        },
        // 处理音频嵌入
        audioEmbed: (_state: unknown, node: Node & { data?: { hProperties?: Record<string, unknown> } }) => {
          // 直接返回 HAST 节点
          return {
            type: 'element',
            tagName: 'div',
            properties: node.data?.hProperties || {},
            children: []
          };
        }
        // 移除了 image handler - 让 rehype-react 自动处理标准 image 节点
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
    processor.use(externalLinksPlugin, {});

    // 最终渲染为 React 元素
    processor.use(rehypeReact, {
      Fragment: prod.Fragment,
      jsx: prod.jsx,
      jsxs: prod.jsxs,
      passKeys: true,
      components: {
        // PDF Viewer 组件
        PDFViewer: (props: { url: string }) => {
          const PDFViewer = React.lazy(() => import('../../components/PDFViewer/PDFViewer.js').then(module => ({
            default: module.PDFViewer
          })));
          return React.createElement(React.Suspense, {
            fallback: React.createElement('div', { style: { padding: '2rem', textAlign: 'center' } }, '正在加载 PDF...')
          }, React.createElement(PDFViewer, props));
        },
        // 修复 void 元素
        hr: (props: React.HTMLAttributes<HTMLHRElement>) => {
          const { children: _children, dangerouslySetInnerHTML: _dangerouslySetInnerHTML, ...restProps } = props;
          return React.createElement('hr', restProps);
        },
        br: (props: React.HTMLAttributes<HTMLBRElement>) => {
          const { children: _children, dangerouslySetInnerHTML: _dangerouslySetInnerHTML, ...restProps } = props;
          return React.createElement('br', restProps);
        },
        img: (props: React.ImgHTMLAttributes<HTMLImageElement> & Record<string, unknown>) => {
          const { children: _children, dangerouslySetInnerHTML: _dangerouslySetInnerHTML, ...restProps } = props;
          // 使用延迟加载的 ImageWithZoom 组件
          const ImageWithZoom = React.lazy(() => import('../../components/ImageWithZoom/ImageWithZoom.js').then(module => ({
            default: module.ImageWithZoom
          })));
          return React.createElement(React.Suspense, {
            fallback: React.createElement('img', restProps)
          }, React.createElement(ImageWithZoom, { ...restProps, src: restProps.src || '' }));
        },
        input: (props: React.InputHTMLAttributes<HTMLInputElement>) => {
          const { children: _children, dangerouslySetInnerHTML: _dangerouslySetInnerHTML, ...restProps } = props;
          return React.createElement('input', restProps);
        },
        // 处理标签渲染
        span: (props: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode; 'data-tag'?: string }) => {
          const { children, className, ...restProps } = props;
          const tagName = restProps['data-tag'];
          // 检查是否是标签
          if (className && className.includes('tag') && tagName) {
            // 渲染为可点击的标签
            return React.createElement('span', {
              ...restProps,
              className: `${className} cursor-pointer hover:bg-[var(--background-modifier-hover)] px-1 rounded`,
              onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                // 触发标签搜索
                const tagSearchEvent = new CustomEvent('searchByTag', {
                  detail: { tag: tagName }
                });
                window.dispatchEvent(tagSearchEvent);
              }
            }, children);
          }
          // 其他 span 元素正常渲染
          return React.createElement('span', props);
        },
        // 处理内部链接的点击事件
        a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { 'data-file-path'?: string }) => {
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
    const mermaidDiagrams: MermaidData[] = [];
    const trackMaps: TrackData[] = [];

    // 提取元数据
    const metadata = {
      headings: [] as Array<{ level: number; text: string; id: string }>,
      links: [] as Array<{ href: string; text: string }>,
      tags: [] as string[]
    };

    // 如果有 currentFilePath，创建一个新的 processor 实例，传递正确的路径
    const processor = currentFilePath ? this.createProcessor({ ...this.options, currentFilePath }) : this.processor;

    // 处理 Markdown - 使用 process() 一次性完成所有处理
    // 先解析为 markdown AST
    const markdownAst = processor.parse(markdownContent);
    this.logImageNodes(markdownAst, 'Markdown AST');

    // 转换为 HTML AST
    const htmlAst = await processor.run(markdownAst);
    this.logImageNodes(htmlAst, 'HTML AST');

    // 最终处理为 React
    const file = await processor.process(markdownContent);

    const reactContent = file.result as React.ReactElement;

    // 从文件数据中提取 mermaid diagrams
    const fileData = file.data as {
      mermaidDiagrams?: MermaidData[];
      trackMaps?: TrackData[];
      headings?: Array<{ level: number; text: string; id: string }>;
      links?: Array<{ href: string; text: string }>;
      tags?: string[];
    };
    if (fileData && fileData.mermaidDiagrams) {
      mermaidDiagrams.push(...fileData.mermaidDiagrams);
    }

    // 从文件数据中提取 trackMaps (插件应该在 file.data 中存储这些)
    if (fileData && fileData.trackMaps) {
      trackMaps.push(...fileData.trackMaps);
    }

    // 从 file.data 中提取 metadata (如果插件正确设置了的话)
    if (fileData) {
      if (fileData.headings) metadata.headings = fileData.headings;
      if (fileData.links) metadata.links = fileData.links;
      if (fileData.tags) metadata.tags = fileData.tags;
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
  private extractMetadataFromAst(ast: Node, metadata: { headings: Array<{ level: number; text: string; id: string }>; links: Array<{ href: string; text: string }>; tags: string[] }): void {
    const visit = (node: Node & { type?: string; tagName?: string; properties?: Record<string, unknown>; children?: Node[] }) => {
      // 提取标题
      if (node.type === 'element' && node.tagName && /^h[1-6]$/.test(node.tagName)) {
        const level = parseInt(node.tagName.charAt(1));
        const text = this.extractTextFromNode(node);
        const id = String(node.properties?.id || '') || text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        metadata.headings.push({ level, text, id });
      }

      // 提取链接
      if (node.type === 'element' && node.tagName === 'a') {
        const href = String(node.properties?.href || '');
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
  private extractTextFromNode(node: Node & { type?: string; value?: string; children?: Node[] }): string {
    if (node.type === 'text') {
      return node.value || '';
    }

    if (node.children) {
      return node.children.map((child) => this.extractTextFromNode(child as Node & { type?: string; value?: string; children?: Node[] })).join('');
    }

    return '';
  }

  /**
   * 调试用：在 AST 中查找并记录 image 节点
   */
  private logImageNodes(ast: Node, _stage: string): void {
    const imageNodes: Array<{type: string; url?: string; alt?: string; data?: unknown}> = [];

    const visit = (node: Node & {type: string; url?: string; alt?: string; data?: unknown; children?: Node[]}) => {
      if (node.type === 'image') {
        imageNodes.push({
          type: node.type,
          url: node.url,
          alt: node.alt,
          data: node.data
        });
      }

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