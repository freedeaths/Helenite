/**
 * Obsidian 内部链接处理插件
 * 处理 [[]] 和 ![[]] 语法
 */

import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';
import { parseObsidianLink } from '../../utils/obsidianLinkUtils';
import { navigateToFile } from '../../utils/routeUtils';

interface ObsidianLinksPluginOptions {
  baseUrl?: string;
  currentFilePath?: string;
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
        console.log(`🔗 Full text content:`, text);

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
 * 根据解析结果创建对应的 AST 节点（简化版本，不依赖文件树索引）
 */
function createLinkNode(parsedLink: any, options: ObsidianLinksPluginOptions) {
  const { baseUrl = '/vault/Publish', currentFilePath } = options;
  
  console.log(`🔗 Creating link node for:`, parsedLink);
  
  // 简化路径解析：直接构造路径而不依赖文件树，支持相对路径
  const resolvedPath = constructDirectPath(parsedLink.filePath, currentFilePath);
  console.log(`🔗 Constructed path for "${parsedLink.filePath}" from "${currentFilePath}":`, resolvedPath);

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
  
  console.log(`🔗 Final link node:`, result);
  return result;
}

/**
 * 简化的路径构造函数
 * 直接根据 Obsidian 链接路径构造文件路径，支持相对路径解析
 */
function constructDirectPath(linkPath: string, currentFilePath?: string): string {
  let filePath = linkPath.trim();
  
  // 处理相对路径解析
  if (currentFilePath) {
    // 获取当前文件的目录
    const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
    
    if (filePath.startsWith('../')) {
      // 上级目录：从当前目录上移一级
      const parentDir = currentDir.substring(0, currentDir.lastIndexOf('/'));
      const relativePart = filePath.substring(3); // 去掉 '../'
      filePath = parentDir ? `${parentDir}/${relativePart}` : `/${relativePart}`;
    } else if (filePath.startsWith('./')) {
      // 当前目录：保持在同一级
      const relativePart = filePath.substring(2); // 去掉 './'
      filePath = `${currentDir}/${relativePart}`;
    } else if (!filePath.startsWith('/')) {
      // 相对路径（没有 ./ 前缀）：相对于当前文件所在目录
      // 例如：从 /Trips/Visited-Places.md 链接到 Plans/夏之北海道 应该解析为 /Trips/Plans/夏之北海道.md
      filePath = `${currentDir}/${filePath}`;
    }
  }
  
  // 如果没有扩展名，添加 .md
  if (!filePath.includes('.') || !filePath.match(/\.[a-zA-Z0-9]+$/)) {
    filePath = `${filePath}.md`;
  }
  
  // 确保路径以 / 开头
  if (!filePath.startsWith('/')) {
    filePath = `/${filePath}`;
  }
  
  return filePath;
}

/**
 * 创建文件链接节点（简化版本）
 */
function createFileLink(parsedLink: any, resolvedPath: string) {
  const displayText = parsedLink.displayText || 
    parsedLink.filePath.split('/').pop()?.replace(/\.md$/, '') ||
    parsedLink.filePath;

  console.log(`📁 Creating file link: "${parsedLink.filePath}" → "${resolvedPath}" (display: "${displayText}")`);

  // 生成不带 .md 扩展名的 URL 路径
  const urlPath = resolvedPath.replace(/\.md$/, '');
  
  // 总是创建可点击的内部链接（简化版本不验证文件存在性）
  const linkNode = {
    type: 'link',
    url: `#${urlPath}`, // 使用 hash 路由，不包含 .md 扩展名
    data: {
      hProperties: {
        className: ['internal-link'],
        'data-file-path': resolvedPath, // 保留完整路径用于导航
        onClick: `window.navigateToFile('${resolvedPath}')`
      }
    },
    children: [{
      type: 'text',
      value: displayText
    }]
  };
  console.log(`✅ Created internal link:`, linkNode);
  return linkNode;
}

/**
 * 创建图片嵌入节点（简化版本）
 */
function createImageEmbed(parsedLink: any, resolvedPath: string, baseUrl: string) {
  const fullImageUrl = resolvedPath.startsWith('http') 
    ? resolvedPath 
    : `${baseUrl}${resolvedPath}`;

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
 * 创建轨迹文件嵌入节点（简化版本）
 */
function createTrackEmbed(parsedLink: any, resolvedPath: string, baseUrl: string) {
  const fullTrackUrl = resolvedPath.startsWith('http') 
    ? resolvedPath 
    : `${baseUrl}${resolvedPath}`;

  const ext = parsedLink.filePath.split('.').pop()?.toLowerCase();
  const placeholder = `TRACK_EMBED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    type: 'html',
    value: `<div class="track-embed" data-track-type="${ext}" data-track-url="${fullTrackUrl}" data-placeholder="${placeholder}"></div>`
  };
}

/**
 * 创建通用嵌入节点（简化版本）
 */
function createGenericEmbed(parsedLink: any, resolvedPath: string) {
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