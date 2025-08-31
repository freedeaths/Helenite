/**
 * Unified Markdown Processing Pipeline
 * 
 * This service handles markdown parsing and rendering using the unified ecosystem
 * with support for Obsidian-specific syntax extensions.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { VAULT_PATH } from '../config/env';
import { fetchVault } from '../utils/fetchWithAuth';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { obsidianLinksPlugin } from './plugins/obsidianLinksPlugin';
import { externalLinksPlugin } from './plugins/externalLinksPlugin';
import { parseFrontMatter, type FrontMatterData } from '../utils/frontMatterParser';
import { visit } from 'unist-util-visit';
import type { Root as MdastRoot, Node as MdastNode } from 'mdast';
import type { Root as HastRoot, Element as HastElement } from 'hast';

/**
 * Rehype plugin to wrap tables in responsive containers
 */
function wrapTablesPlugin() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: HastElement, index, parent) => {
      if (node.tagName === 'table' && parent && typeof index === 'number') {
        // Create wrapper div with responsive class
        const wrapper: HastElement = {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['table-container']
          },
          children: [node]
        };
        
        // Replace table with wrapped table
        parent.children[index] = wrapper;
      }
    });
  };
}

// Frontmatter tags are now handled by LocalTagAPI in MarkdownViewer component


/**
 * Markdown processing options
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
 * Default processing options
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
 * Obsidian #tags plugin
 */
function remarkObsidianTags() {
  return (tree: MdastRoot) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      
      const value = node.value;
      const tagRegex = /(^|[\s：:,，])(#[\w\-\/]+)/g;
      
      if (!tagRegex.test(value)) return;
      
      
      const parts: Array<{ type: 'text' | 'tag'; value: string }> = [];
      let lastIndex = 0;
      let match;
      
      tagRegex.lastIndex = 0; // Reset regex
      
      while ((match = tagRegex.exec(value)) !== null) {
        const fullMatch = match[0];
        const prefix = match[1];
        const tag = match[2];
        
        // Add text before the tag (including prefix)
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            value: value.slice(lastIndex, match.index) + prefix
          });
        } else if (prefix) {
          parts.push({
            type: 'text',
            value: prefix
          });
        }
        
        parts.push({
          type: 'tag',
          value: tag
        });
        
        lastIndex = match.index + fullMatch.length;
      }
      
      // Add remaining text
      if (lastIndex < value.length) {
        parts.push({
          type: 'text',
          value: value.slice(lastIndex)
        });
      }
      
      // Replace the text node with processed parts
      if (parts.length > 1) {
        const newNodes: MdastNode[] = parts.map(part => {
          if (part.type === 'text') {
            return { type: 'text', value: part.value };
          } else {
            return {
              type: 'link',
              url: `#tag:${encodeURIComponent(part.value.slice(1))}`,
              title: null,
              children: [{ type: 'text', value: part.value }],
              data: {
                hProperties: {
                  className: ['tag'],
                  'data-tag': part.value.slice(1)
                }
              }
            };
          }
        });
        
        (parent.children as any[]).splice(index, 1, ...newNodes);
      }
    });
  };
}

/**
 * Obsidian ==highlights== plugin
 */
function remarkObsidianHighlights() {
  return (tree: MdastRoot) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      
      const value = node.value;
      const highlightRegex = /==([^=]+)==/g;
      
      if (!highlightRegex.test(value)) return;
      
      const parts: Array<{ type: 'text' | 'highlight'; value: string }> = [];
      let lastIndex = 0;
      let match;
      
      highlightRegex.lastIndex = 0; // Reset regex
      
      while ((match = highlightRegex.exec(value)) !== null) {
        // Add text before the highlight
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            value: value.slice(lastIndex, match.index)
          });
        }
        
        parts.push({
          type: 'highlight',
          value: match[1]
        });
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < value.length) {
        parts.push({
          type: 'text',
          value: value.slice(lastIndex)
        });
      }
      
      // Replace the text node with processed parts
      if (parts.length > 1) {
        const newNodes: MdastNode[] = parts.map(part => {
          if (part.type === 'text') {
            return { type: 'text', value: part.value };
          } else {
            return {
              type: 'emphasis', // Use emphasis as base, we'll style it as highlight
              children: [{ type: 'text', value: part.value }],
              data: {
                hProperties: {
                  className: ['cm-highlight']
                }
              }
            };
          }
        });
        
        (parent.children as any[]).splice(index, 1, ...newNodes);
      }
    });
  };
}

/**
 * Obsidian callouts plugin
 */
function remarkObsidianCallouts() {
  return (tree: MdastRoot) => {
    visit(tree, 'blockquote', (node) => {
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;
      
      const firstText = firstChild.children[0];
      if (!firstText || firstText.type !== 'text') return;
      
      // Check for callout syntax: [!type] title (handle multiline content)
      const fullText = firstText.value;
      const calloutRegex = /^\[!([\w\-]+)\]\s*(.*?)$/s; // 's' flag for multiline
      const match = fullText.match(calloutRegex);
      
      if (!match) return;
      
      const calloutType = match[1].toLowerCase();
      const calloutTitle = match[2].split('\n')[0].trim() || calloutType.charAt(0).toUpperCase() + calloutType.slice(1);
      
      // Extract content after the title line
      const titleLine = `[!${match[1]}] ${calloutTitle}`;
      const contentText = fullText.replace(titleLine, '').trim();
      
      // Transform blockquote to callout div
      (node as any).type = 'element';
      node.data = {
        hName: 'div',
        hProperties: {
          className: ['callout', `callout-${calloutType}`],
          'data-callout': calloutType
        }
      };
      
      // Create callout structure
      const titleElement = {
        type: 'element' as any,
        data: {
          hName: 'div',
          hProperties: {
            className: ['callout-title']
          }
        },
        children: [{ type: 'text', value: calloutTitle }]
      };
      
      // Create content - preserve all children after first paragraph for multi-paragraph callouts
      const contentChildren = [];
      
      // Add remaining content from first paragraph if any
      if (contentText) {
        contentChildren.push({
          type: 'paragraph' as any,
          children: [{ type: 'text', value: contentText }]
        });
      }
      
      // Add all remaining child elements (preserving lists, etc.)
      for (let i = 1; i < node.children.length; i++) {
        contentChildren.push(node.children[i]);
      }
      
      const contentElement = {
        type: 'element' as any,
        data: {
          hName: 'div',
          hProperties: {
            className: ['callout-content']
          }
        },
        children: contentChildren
      };
      
      node.children = [titleElement, contentElement];
    });
  };
}

/**
 * Mermaid diagrams extraction (for use in processWithMetadata)
 */
function extractMermaidDiagrams(markdown: string) {
  const mermaidDiagrams: Array<{ id: string; code: string; placeholder: string }> = [];
  let diagramId = 0;
  
  // Replace mermaid code blocks with placeholders and extract the code
  const processedMarkdown = markdown.replace(/```mermaid\n([\s\S]*?)\n```/g, (_, code) => {
    const id = `mermaid-diagram-${diagramId++}`;
    // Use a text-based placeholder that won't be stripped by HTML sanitizer
    const placeholder = `MERMAID_PLACEHOLDER_${id}`;
    
    mermaidDiagrams.push({
      id,
      code: code.trim(),
      placeholder
    });
    
    return placeholder;
  });
  
  return { processedMarkdown, mermaidDiagrams };
}

/**
 * Track maps extraction from markdown (supports GPX/KML for use in processWithMetadata)
 */
function extractTrackMaps(markdown: string) {
  const trackMaps: Array<{ id: string; code: string; placeholder: string; isFile?: boolean; fileType?: string }> = [];
  let mapId = 0;
  
  // Replace track code blocks with placeholders and extract the code
  let processedMarkdown = markdown;
  
  // Handle direct GPX content: ```gpx\n<gpx>...</gpx>\n```
  processedMarkdown = processedMarkdown.replace(/```gpx\n([\s\S]*?)\n```/g, (_, code) => {
    const id = `track-map-${mapId++}`;
    const placeholder = `TRACK_PLACEHOLDER_${id}`;
    
    trackMaps.push({
      id,
      code: code.trim(),
      placeholder,
      isFile: false
    });
    
    return placeholder;
  });
  
  // Handle GPX file references: ```gpx:@Publish/Attachments/file.gpx```
  processedMarkdown = processedMarkdown.replace(/```gpx:(.+?)```/g, (_, filePath) => {
    const id = `track-map-${mapId++}`;
    const placeholder = `TRACK_PLACEHOLDER_${id}`;
    
    trackMaps.push({
      id,
      code: filePath.trim(), // Store file path in code field
      placeholder,
      isFile: true
    });
    
    return placeholder;
  });
  
  // Handle KML file references: ```kml:@Publish/Attachments/file.kml```
  processedMarkdown = processedMarkdown.replace(/```kml:(.+?)```/g, (_, filePath) => {
    const id = `track-map-${mapId++}`;
    const placeholder = `TRACK_PLACEHOLDER_${id}`;
    
    trackMaps.push({
      id,
      code: filePath.trim(), // Store file path in code field
      placeholder,
      isFile: true
    });
    
    return placeholder;
  });
  
  // Handle direct KML content: ```kml\n<kml>...</kml>\n```
  processedMarkdown = processedMarkdown.replace(/```kml\n([\s\S]*?)\n```/g, (_, code) => {
    const id = `track-map-${mapId++}`;
    const placeholder = `TRACK_PLACEHOLDER_${id}`;
    
    trackMaps.push({
      id,
      code: code.trim(),
      placeholder,
      isFile: false
    });
    
    return placeholder;
  });
  
  return { processedMarkdown, trackMaps };
}

/**
 * Extract track maps from HTML (to handle obsidianLinksPlugin embeds)
 */
function extractTrackMapsFromHTML(html: string) {
  const trackMaps: Array<{ id: string; code: string; placeholder: string; isFile?: boolean; fileType?: string }> = [];
  let mapId = 0;
  
  let processedHtml = html;
  
  // Check if HTML contains track-embed elements
  // const trackEmbedRegex = /<div class="track-embed"[^>]*>/g;
  
  // Handle track embeds generated by obsidianLinksPlugin: <div class="track-embed" data-track-url="...">
  processedHtml = processedHtml.replace(
    /<div class="track-embed" data-track-type="(gpx|kml)" data-track-url="([^"]+)" data-placeholder="[^"]+"><\/div>/g,
    (_, trackType, trackUrl) => {
      const id = `track-map-${mapId++}`;
      const placeholder = `TRACK_PLACEHOLDER_${id}`;
      
      // Extract file path from URL (remove baseUrl prefix)
      let filePath = trackUrl;
      if (trackUrl.startsWith(VAULT_PATH)) {
        filePath = trackUrl.replace(VAULT_PATH, '');
      }
      
      trackMaps.push({
        id,
        code: filePath, // Store file path in code field
        placeholder,
        isFile: true,
        fileType: trackType // 🔧 保存文件类型信息
      });
      
      return placeholder;
    }
  );
  
  return { processedMarkdown: processedHtml, trackMaps };
}

/**
 * Main markdown processor class
 */
export class MarkdownProcessor {
  private processor: any;
  
  constructor(options: MarkdownProcessingOptions = DEFAULT_OPTIONS) {
    this.processor = unified()
      .use(remarkParse)
      .use(remarkGfm);
    
    // Add Obsidian-specific plugins
    if (options.enableObsidianLinks) {
      this.processor.use(obsidianLinksPlugin());
    }
    
    if (options.enableObsidianTags) {
      this.processor.use(remarkObsidianTags);
    }
    
    if (options.enableHighlights) {
      this.processor.use(remarkObsidianHighlights);
    }
    
    if (options.enableCallouts) {
      this.processor.use(remarkObsidianCallouts);
    }
    
    // Add math support
    if (options.enableMath) {
      this.processor.use(remarkMath);
    }
    
    // Convert to HTML - allow dangerous HTML to preserve custom elements
    this.processor.use(remarkRehype, { allowDangerousHtml: true });
    
    // Add heading IDs but disable autolinks to prevent clickable titles
    // TOC functionality does not depend on rehypeAutolinkHeadings since it uses document.getElementById()
    this.processor.use(rehypeSlug);
    // Commented out to fix issue where all headings become clickable links
    // this.processor.use(rehypeAutolinkHeadings, { behavior: 'wrap' });
    
    // Add HTML plugins
    if (options.enableMath) {
      this.processor.use(rehypeKatex);
    }
    
    // Wrap tables in responsive containers
    this.processor.use(wrapTablesPlugin);
    
    // Transform frontmatter tags into styled badges (will be added dynamically)
    
    // Handle external links (add target="_blank")
    this.processor.use(externalLinksPlugin);
    
    // Mermaid diagrams are now handled in extractMermaidDiagrams function
    
    if (options.enableCodeHighlight) {
      this.processor.use(rehypeHighlight);
    }
    
    this.processor.use(rehypeStringify, { allowDangerousHtml: true });
  }
  
  /**
   * Process markdown string to HTML
   */
  async processToHTML(markdown: string): Promise<string> {
    const result = await this.processor.process(markdown);
    return String(result);
  }
  
  /**
   * Process markdown and extract metadata
   */
  async processWithMetadata(
    markdown: string, 
    currentFilePath?: string
  ): Promise<{
    html: string;
    metadata: {
      headings: Array<{ level: number; text: string; id: string }>;
      links: Array<{ href: string; text: string }>;
      tags: string[];
    };
    frontMatter: FrontMatterData;
    mermaidDiagrams: Array<{ id: string; code: string; placeholder: string }>;
    trackMaps: Array<{ id: string; code: string; placeholder: string; isFile?: boolean; fileType?: string }>;
  }> {
    // Parse front matter and remove it from content (tags now handled by LocalTagAPI)
    const { frontMatter, content } = parseFrontMatter(markdown);
    
    // Extract Mermaid diagrams and track maps from content without front matter
    const { processedMarkdown: markdownAfterMermaid, mermaidDiagrams } = extractMermaidDiagrams(content);
    const { processedMarkdown, trackMaps: initialTrackMaps } = extractTrackMaps(markdownAfterMermaid);
    
    // Load metadata.json for intelligent link resolution
    let metadataArray: any[] = [];
    try {
      const metadataResponse = await fetchVault(`${VAULT_PATH}/metadata.json`);
      if (metadataResponse.ok) {
        metadataArray = await metadataResponse.json();
      }
    } catch (error) {
      console.warn('Failed to load metadata.json, using fallback path resolution:', error);
    }
    
    // Create a simplified processor that doesn't require file index
    const processorWithContext = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(obsidianLinksPlugin({ 
        baseUrl: VAULT_PATH,
        currentFilePath,
        metadata: metadataArray
      }))
      .use(remarkObsidianTags)
      .use(remarkObsidianHighlights)
      .use(remarkObsidianCallouts)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeSlug) // 自动为所有标题生成ID
      // .use(rehypeAutolinkHeadings, { behavior: 'wrap' }) // 禁用以避免标题变成链接
      .use(rehypeKatex)
      .use(wrapTablesPlugin)
      // Frontmatter tags now handled by LocalTagAPI in MarkdownViewer
      .use(externalLinksPlugin) // Handle external links
      .use(rehypeHighlight)
      .use(rehypeStringify, { allowDangerousHtml: true });
    
    // Then process the markdown with diagrams replaced by placeholders
    const ast = processorWithContext.parse(processedMarkdown);
    const metadata = {
      headings: [] as Array<{ level: number; text: string; id: string }>,
      links: [] as Array<{ href: string; text: string }>,
      tags: [] as string[]
    };
    
    // Extract metadata from AST and add IDs to headings
    const usedIds = new Set<string>();
    let headingIndex = 0;
    
    visit(ast, (node: any) => {
      if (node.type === 'heading') {
        const text = node.children
          .filter((child: any) => child.type === 'text')
          .map((child: any) => child.value)
          .join('');
        
        // Generate a more robust ID that preserves unicode characters
        let baseId = text.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\u4e00-\u9fff\-]/g, '') // Keep Chinese characters
          .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
          
        // Ensure ID is unique by adding a suffix if needed
        let id = baseId;
        let counter = 1;
        while (usedIds.has(id)) {
          id = `${baseId}-${counter}`;
          counter++;
        }
        
        // If ID is empty (e.g. all special characters), use fallback
        if (!id) {
          id = `heading-${headingIndex}`;
        }
        
        usedIds.add(id);
        headingIndex++;
        
        // Add ID to the heading node for HTML rendering
        if (!node.data) {
          node.data = {};
        }
        if (!node.data.hProperties) {
          node.data.hProperties = {};
        }
        node.data.hProperties.id = id;
        
        metadata.headings.push({
          level: node.depth,
          text,
          id
        });
      }
      
      if (node.type === 'link') {
        const text = node.children
          .filter((child: any) => child.type === 'text')
          .map((child: any) => child.value)
          .join('');
        
        metadata.links.push({
          href: node.url,
          text
        });
        
        // Check if it's a tag link
        if (node.url.startsWith('#tag:')) {
          metadata.tags.push(node.url.replace('#tag:', ''));
        }
      }
    });
    
    // Second pass: generate HTML from the modified AST (which now has IDs)
    const transformedAst = await processorWithContext.run(ast);
    const initialHtml = processorWithContext.stringify(transformedAst);
    
    // Third pass: extract additional track maps from the generated HTML (to handle obsidianLinksPlugin embeds)
    const { processedMarkdown: finalHtml, trackMaps: additionalTrackMaps } = extractTrackMapsFromHTML(initialHtml);
    
    // Combine initial track maps (from markdown) with additional ones (from HTML embeds)
    const allTrackMaps = [...initialTrackMaps, ...additionalTrackMaps];
    
    return { html: finalHtml, metadata, frontMatter, mermaidDiagrams, trackMaps: allTrackMaps };
  }
}

/**
 * Default markdown processor instance
 */
export const markdownProcessor = new MarkdownProcessor();