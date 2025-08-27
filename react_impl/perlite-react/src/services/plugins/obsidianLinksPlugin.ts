/**
 * Obsidian 内部链接处理插件
 * 处理 [[]] 和 ![[]] 语法
 */

import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';
import { parseObsidianLink, createFileIndex, findFilePath } from '../../utils/obsidianLinkUtils';
import { navigateToFile } from '../../utils/routeUtils';

interface ObsidianLinksPluginOptions {
  fileIndex?: Map<string, string>;
  currentFilePath?: string;
  baseUrl?: string;
}

/**
 * 创建 Obsidian 链接处理插件
 */
export function obsidianLinksPlugin(options: ObsidianLinksPluginOptions = {}) {
  return () => {
    return (tree: Root) => {
      // 存储需要替换的节点信息
      const replacements: Array<{
        node: Text;
        parent: any;
        index: number;
        newNodes: any[];
      }> = [];

      visit(tree, 'text', (node: Text, index, parent) => {
        if (!parent || index === undefined) return;

        const text = node.value;
        const linkRegex = /(!?\[\[[^\]]+\]\])/g;
        const matches = Array.from(text.matchAll(linkRegex));

        if (matches.length === 0) return;

        console.log(`🔗 Processing text node: "${text.substring(0, 100)}..."`);
        console.log(`🔗 Found ${matches.length} link matches:`, matches.map(m => m[0]));

        // 分割文本并创建新节点
        const newNodes: any[] = [];
        let lastIndex = 0;

        matches.forEach(match => {
          const matchStart = match.index!;
          const matchEnd = matchStart + match[0].length;
          
          // 添加匹配前的文本
          if (matchStart > lastIndex) {
            const beforeText = text.slice(lastIndex, matchStart);
            if (beforeText) {
              newNodes.push({
                type: 'text',
                value: beforeText
              });
            }
          }

          // 解析 Obsidian 链接
          const parsedLink = parseObsidianLink(match[0]);
          console.log(`🔗 Parsed link "${match[0]}":`, parsedLink);
          
          if (parsedLink) {
            const linkNode = createLinkNode(parsedLink, options);
            console.log(`🔗 Created link node:`, linkNode);
            newNodes.push(linkNode);
          } else {
            // 如果解析失败，保持原文
            console.log(`❌ Failed to parse link: ${match[0]}`);
            newNodes.push({
              type: 'text',
              value: match[0]
            });
          }

          lastIndex = matchEnd;
        });

        // 添加剩余的文本
        if (lastIndex < text.length) {
          const remainingText = text.slice(lastIndex);
          if (remainingText) {
            newNodes.push({
              type: 'text', 
              value: remainingText
            });
          }
        }

        // 记录需要替换的节点
        if (newNodes.length > 0) {
          console.log(`🔗 Will replace with ${newNodes.length} new nodes`);
          replacements.push({
            node,
            parent,
            index,
            newNodes
          });
        }
      });

      // 执行替换（从后往前，避免索引错乱）
      replacements.reverse().forEach(({ parent, index, newNodes }) => {
        parent.children.splice(index, 1, ...newNodes);
      });
    };
  };
}

/**
 * 根据解析结果创建对应的 AST 节点
 */
function createLinkNode(parsedLink: any, options: ObsidianLinksPluginOptions) {
  const { fileIndex, currentFilePath, baseUrl = '/vault' } = options;
  
  console.log(`🔍 Creating link node for:`, parsedLink);
  console.log(`🔍 Options:`, { hasFileIndex: !!fileIndex, currentFilePath, baseUrl });
  
  // 解析文件路径
  let resolvedPath: string | null = null;
  
  if (fileIndex && parsedLink.filePath) {
    const currentDir = currentFilePath ? currentFilePath.substring(0, currentFilePath.lastIndexOf('/')) : '';
    resolvedPath = findFilePath(parsedLink.filePath, fileIndex, currentDir);
    console.log(`🔍 Resolved path for "${parsedLink.filePath}":`, resolvedPath);
  }

  let result;
  switch (parsedLink.type) {
    case 'file':
      result = createFileLink(parsedLink, resolvedPath);
      break;
    
    case 'image':
      result = createImageEmbed(parsedLink, resolvedPath, baseUrl);
      break;
    
    case 'embed':
      // 检查是否为轨迹文件
      const ext = parsedLink.filePath.split('.').pop()?.toLowerCase();
      if (ext === 'gpx' || ext === 'kml') {
        result = createTrackEmbed(parsedLink, resolvedPath, baseUrl);
      } else {
        result = createGenericEmbed(parsedLink, resolvedPath);
      }
      break;
    
    default:
      result = {
        type: 'text',
        value: `[[${parsedLink.filePath}]]`
      };
  }
  
  console.log(`🔍 Final link node:`, result);
  return result;
}

/**
 * 创建文件链接节点
 */
function createFileLink(parsedLink: any, resolvedPath: string | null) {
  const displayText = parsedLink.displayText || 
    parsedLink.filePath.split('/').pop()?.replace(/\.md$/, '') ||
    parsedLink.filePath;

  console.log(`📁 Creating file link: "${parsedLink.filePath}" → "${resolvedPath}" (display: "${displayText}")`);

  if (resolvedPath) {
    // 创建可点击的内部链接
    const linkNode = {
      type: 'link',
      url: `#${resolvedPath}`, // 使用 hash 路由
      data: {
        hProperties: {
          className: ['internal-link'],
          'data-file-path': resolvedPath,
          onClick: `window.navigateToFile('${resolvedPath}')`
        }
      },
      children: [{
        type: 'text',
        value: displayText
      }]
    };
    console.log(`✅ Created valid internal link:`, linkNode);
    return linkNode;
  } else {
    // 创建无效链接（灰色显示）
    const invalidNode = {
      type: 'text',
      data: {
        hProperties: {
          className: ['internal-link', 'invalid-link'],
          title: `文件未找到: ${parsedLink.filePath}`
        }
      },
      value: displayText
    };
    console.log(`❌ Created invalid link:`, invalidNode);
    return invalidNode;
  }
}

/**
 * 创建图片嵌入节点
 */
function createImageEmbed(parsedLink: any, resolvedPath: string | null, baseUrl: string) {
  const imagePath = resolvedPath || parsedLink.filePath;
  const fullImageUrl = imagePath.startsWith('http') 
    ? imagePath 
    : `${baseUrl}${imagePath}`;

  return {
    type: 'image',
    url: fullImageUrl,
    alt: parsedLink.displayText || parsedLink.filePath.split('/').pop() || '',
    data: {
      hProperties: {
        className: ['obsidian-image'],
        loading: 'lazy'
      }
    }
  };
}

/**
 * 创建轨迹文件嵌入节点
 */
function createTrackEmbed(parsedLink: any, resolvedPath: string | null, baseUrl: string) {
  const trackPath = resolvedPath || parsedLink.filePath;
  const fullTrackUrl = trackPath.startsWith('http') 
    ? trackPath 
    : `${baseUrl}${trackPath}`;

  const ext = parsedLink.filePath.split('.').pop()?.toLowerCase();
  const placeholder = `TRACK_EMBED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    type: 'html',
    value: `<div class="track-embed" data-track-type="${ext}" data-track-url="${fullTrackUrl}" data-placeholder="${placeholder}"></div>`
  };
}

/**
 * 创建通用嵌入节点
 */
function createGenericEmbed(parsedLink: any, resolvedPath: string | null) {
  return {
    type: 'text',
    data: {
      hProperties: {
        className: ['embed-link'],
        title: `嵌入: ${parsedLink.filePath}`
      }
    },
    value: `![[${parsedLink.filePath}]]`
  };
}

/**
 * 全局导航函数，供 HTML 中的 onclick 使用
 */
declare global {
  interface Window {
    navigateToFile: (filePath: string) => void;
  }
}

// 设置全局导航函数
if (typeof window !== 'undefined') {
  window.navigateToFile = (filePath: string) => {
    navigateToFile(filePath);
  };
}