/**
 * Obsidian 内部链接处理插件
 * 处理 [[]] 和 ![[]] 语法
 */

import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';
import { parseObsidianLink } from '../../utils/obsidianLinkUtils';
import { navigateToFile } from '../../utils/routeUtils';
import { VAULT_PATH } from '../../config/vaultConfig';

interface ObsidianLinksPluginOptions {
  baseUrl?: string;
  currentFilePath?: string;
  metadata?: any[]; // Array of file metadata for path resolution
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

        // Processing text node with Obsidian links

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
          
          if (parsedLink) {
            const linkNode = createLinkNode(parsedLink, options);
            newNodes.push(linkNode);
          } else {
            // 如果解析失败，保持原文
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
  const { baseUrl = VAULT_PATH, currentFilePath, metadata } = options;
  
  // 智能路径解析：优先使用 metadata.json，降级到直接构造路径
  const resolvedPath = constructDirectPath(parsedLink.filePath, currentFilePath, metadata);

  let result;
  switch (parsedLink.type) {
    case 'file':
      result = createFileLink(parsedLink, resolvedPath);
      break;
    
    case 'image':
      result = createImageEmbed(parsedLink, resolvedPath, baseUrl);
      break;
    
    case 'embed': {
      // 检查是否为轨迹文件
      const ext = parsedLink.filePath.split('.').pop()?.toLowerCase();
      if (ext === 'gpx' || ext === 'kml') {
        result = createTrackEmbed(parsedLink, resolvedPath, baseUrl);
      } else {
        result = createGenericEmbed(parsedLink, resolvedPath);
      }
      break;
    }
    
    default:
      result = {
        type: 'text',
        value: `[[${parsedLink.filePath}]]`
      };
  }
  
  return result;
}

/**
 * 智能的路径构造函数
 * 优先使用 metadata.json 查找文件，降级到直接路径构造，支持相对路径解析
 */
function constructDirectPath(linkPath: string, currentFilePath?: string, metadata?: any[]): string {
  let filePath = linkPath.trim();
  
  // 第一步：尝试使用 metadata.json 查找文件
  if (metadata && metadata.length > 0) {
    // 查找文件名匹配的条目（不包括扩展名）
    const targetFileName = filePath.replace(/\.md$/, ''); // 去掉可能的 .md 后缀
    
    const matchedFile = metadata.find(item => {
      const itemFileName = item.fileName || '';
      const itemRelativePath = item.relativePath || '';
      
      // 尝试多种匹配方式
      return itemFileName === targetFileName || // 直接文件名匹配
             itemFileName === `${targetFileName}.md` || // 文件名加扩展名匹配
             itemRelativePath.endsWith(`/${targetFileName}.md`) || // 路径结尾匹配
             itemRelativePath === `${targetFileName}.md`; // 完整路径匹配
    });
    
    if (matchedFile) {
      const resolvedPath = `/${matchedFile.relativePath}`;
      return resolvedPath;
    }
  }
  
  // 第二步：降级到直接路径构造（原有逻辑）
  // 处理相对路径解析
  if (currentFilePath) {
    // 获取当前文件的目录
    const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
    
    // 处理多级向上的相对路径 (../../ 或 ../)
    if (filePath.startsWith('../')) {
      let workingDir = currentDir;
      let workingPath = filePath;
      
      // 逐级处理 ../
      while (workingPath.startsWith('../')) {
        // 移除一个 ../
        workingPath = workingPath.substring(3);
        // 向上移动一级目录
        const lastSlash = workingDir.lastIndexOf('/');
        workingDir = lastSlash > 0 ? workingDir.substring(0, lastSlash) : '';
      }
      
      // 组合最终路径
      filePath = workingDir ? `${workingDir}/${workingPath}` : `/${workingPath}`;
    } else if (filePath.startsWith('./')) {
      // 当前目录：保持在同一级
      const relativePart = filePath.substring(2); // 去掉 './'
      filePath = `${currentDir}/${relativePart}`;
    } else if (!filePath.startsWith('/') && !filePath.startsWith('Attachments/')) {
      // 相对路径（没有 ./ 前缀）：相对于当前文件所在目录
      // 例如：从 /Trips/Visited-Places.md 链接到 Plans/夏之北海道 应该解析为 /Trips/Plans/夏之北海道.md
      // 但如果是 Attachments/xxx，则保持原样（因为它是相对于 vault 根目录的）
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
  return linkNode;
}

/**
 * 创建图片嵌入节点（简化版本）
 */
function createImageEmbed(parsedLink: any, resolvedPath: string, baseUrl: string) {
  // 处理图片路径
  let imagePath = resolvedPath;
  
  // 如果路径中包含 Attachments，确保路径正确
  if (!imagePath.toLowerCase().includes('attachments')) {
    // 如果不包含 Attachments，假定图片在 Attachments 文件夹中
    imagePath = `/Attachments/${imagePath.replace(/^\/+/, '')}`;
  }
  
  // 构建完整的图片 URL
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
        loading: 'lazy',
        // 添加自定义属性，让前端组件知道需要使用 fetchWithAuth
        'data-vault-image': 'true'
      }
    }
  };
}

/**
 * 创建轨迹文件嵌入节点（简化版本）
 */
function createTrackEmbed(parsedLink: any, resolvedPath: string, baseUrl: string) {
  // 对于轨迹文件，确保路径正确
  // 如果 resolvedPath 是相对路径（不以 / 开头），则添加 /
  const normalizedPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
  
  const fullTrackUrl = normalizedPath.startsWith('http') 
    ? normalizedPath 
    : `${baseUrl}${normalizedPath}`;

  const ext = parsedLink.filePath.split('.').pop()?.toLowerCase();
  const placeholder = `TRACK_EMBED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log for debugging
  console.log('[TrackEmbed] Creating track embed:', {
    originalPath: parsedLink.filePath,
    resolvedPath,
    normalizedPath,
    fullTrackUrl,
    ext
  });

  return {
    type: 'html',
    value: `<div class="track-embed" data-track-type="${ext}" data-track-url="${fullTrackUrl}" data-placeholder="${placeholder}"></div>`
  };
}

/**
 * 创建通用嵌入节点（简化版本）
 */
function createGenericEmbed(parsedLink: any, _resolvedPath: string) {
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