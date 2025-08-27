/**
 * Unified Markdown Processing Pipeline
 * 
 * This service handles markdown parsing and rendering using the unified ecosystem
 * with support for Obsidian-specific syntax extensions.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root as MdastRoot, Node as MdastNode } from 'mdast';
import type { Root as HastRoot, Element as HastElement } from 'hast';

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
 * Obsidian [[links]] plugin
 */
function remarkObsidianLinks() {
  return (tree: MdastRoot) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      
      const value = node.value;
      const linkRegex = /\[\[([^\]]+)\]\]/g;
      
      if (!linkRegex.test(value)) return;
      
      const parts: Array<{ type: 'text' | 'link'; value: string; display?: string }> = [];
      let lastIndex = 0;
      let match;
      
      linkRegex.lastIndex = 0; // Reset regex
      
      while ((match = linkRegex.exec(value)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            value: value.slice(lastIndex, match.index)
          });
        }
        
        // Parse link content (handle display text)
        const linkContent = match[1];
        let linkPath = linkContent;
        let displayText = linkContent;
        
        if (linkContent.includes('|')) {
          const [path, display] = linkContent.split('|', 2);
          linkPath = path.trim();
          displayText = display.trim();
        }
        
        parts.push({
          type: 'link',
          value: linkPath,
          display: displayText
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
              type: 'link',
              url: `#${encodeURIComponent(part.value)}`,
              title: null,
              children: [{ type: 'text', value: part.display || part.value }],
              data: {
                hProperties: {
                  className: ['internal-link'],
                  'data-href': part.value
                }
              }
            };
          }
        });
        
        parent.children.splice(index, 1, ...newNodes);
      }
    });
  };
}

/**
 * Obsidian #tags plugin
 */
function remarkObsidianTags() {
  return (tree: MdastRoot) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      
      const value = node.value;
      const tagRegex = /(^|\s)(#[\w\-\/]+)/g;
      
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
        
        parent.children.splice(index, 1, ...newNodes);
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
        
        parent.children.splice(index, 1, ...newNodes);
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
      
      // Create content paragraph if we have content
      const contentChildren = [];
      if (contentText) {
        contentChildren.push({
          type: 'paragraph' as any,
          children: [{ type: 'text', value: contentText }]
        });
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
  const processedMarkdown = markdown.replace(/```mermaid\n([\s\S]*?)\n```/g, (match, code) => {
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
 * Track maps extraction (supports GPX/KML for use in processWithMetadata)
 */
function extractTrackMaps(markdown: string) {
  const trackMaps: Array<{ id: string; code: string; placeholder: string; isFile?: boolean }> = [];
  let mapId = 0;
  
  // Replace track code blocks with placeholders and extract the code
  let processedMarkdown = markdown;
  
  // Handle direct GPX content: ```gpx\n<gpx>...</gpx>\n```
  processedMarkdown = processedMarkdown.replace(/```gpx\n([\s\S]*?)\n```/g, (match, code) => {
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
  processedMarkdown = processedMarkdown.replace(/```gpx:(.+?)```/g, (match, filePath) => {
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
  processedMarkdown = processedMarkdown.replace(/```kml:(.+?)```/g, (match, filePath) => {
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
  processedMarkdown = processedMarkdown.replace(/```kml\n([\s\S]*?)\n```/g, (match, code) => {
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
 * Main markdown processor class
 */
export class MarkdownProcessor {
  private processor: ReturnType<typeof unified>;
  
  constructor(options: MarkdownProcessingOptions = DEFAULT_OPTIONS) {
    this.processor = unified()
      .use(remarkParse)
      .use(remarkGfm);
    
    // Add Obsidian-specific plugins
    if (options.enableObsidianLinks) {
      this.processor.use(remarkObsidianLinks);
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
    
    // Convert to HTML
    this.processor.use(remarkRehype);
    
    // Add HTML plugins
    if (options.enableMath) {
      this.processor.use(rehypeKatex);
    }
    
    // Mermaid diagrams are now handled in extractMermaidDiagrams function
    
    if (options.enableCodeHighlight) {
      this.processor.use(rehypeHighlight);
    }
    
    this.processor.use(rehypeStringify);
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
  async processWithMetadata(markdown: string): Promise<{
    html: string;
    metadata: {
      headings: Array<{ level: number; text: string; id: string }>;
      links: Array<{ href: string; text: string }>;
      tags: string[];
    };
    mermaidDiagrams: Array<{ id: string; code: string; placeholder: string }>;
    trackMaps: Array<{ id: string; code: string; placeholder: string; isFile?: boolean }>;
  }> {
    // First, extract Mermaid diagrams and track maps
    const { processedMarkdown: markdownAfterMermaid, mermaidDiagrams } = extractMermaidDiagrams(markdown);
    const { processedMarkdown, trackMaps } = extractTrackMaps(markdownAfterMermaid);
    
    
    // Then process the markdown with diagrams replaced by placeholders
    const ast = this.processor.parse(processedMarkdown);
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
    const transformedAst = await this.processor.run(ast);
    const html = this.processor.stringify(transformedAst);
    
    return { html, metadata, mermaidDiagrams, trackMaps };
  }
}

/**
 * Default markdown processor instance
 */
export const markdownProcessor = new MarkdownProcessor();