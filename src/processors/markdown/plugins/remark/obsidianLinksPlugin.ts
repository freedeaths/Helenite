/**
 * Obsidian 内部链接处理插件
 * 处理 [[]] 和 ![[]] 语法
 */

import { visit } from 'unist-util-visit';
import type { Root, Text, Link, Image } from 'mdast';
import { parseObsidianLink } from '../../utils/obsidianLinkUtils.js';
import { VAULT_PATH } from '../../../../config/vaultConfig.js';

export interface ObsidianLinksPluginOptions {
  baseUrl?: string;
  currentFilePath?: string;
  metadata?: any[]; // Array of file metadata for path resolution
}

/**
 * Obsidian 链接处理插件
 */

export function obsidianLinksPlugin(options: ObsidianLinksPluginOptions = {}) {
  return function transformer(tree: Root) {
    // 第一遍：处理段落中的块级嵌入
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      const children = node.children;
      const newNodes: any[] = [];
      let currentParagraphChildren: any[] = [];

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (child.type === 'text') {
          const text = child.value;
          const linkRegex = /(!?\[\[[^\]]+\]\])/g;
          const matches = Array.from(text.matchAll(linkRegex));

          if (matches.length > 0) {
            let lastIndex = 0;

            for (const match of matches) {
              const matchStart = match.index!;
              const matchEnd = matchStart + match[0].length;

              // 添加匹配前的文本
              if (matchStart > lastIndex) {
                const beforeText = text.slice(lastIndex, matchStart);
                if (beforeText) {
                  currentParagraphChildren.push({
                    type: 'text',
                    value: beforeText
                  });
                }
              }

              // 解析链接
              const parsedLink = parseObsidianLink(match[0]);
              if (parsedLink) {
                if (parsedLink.type === 'embed') {
                  const fileExt = parsedLink.filePath.split('.').pop()?.toLowerCase();

                  // 检查是否是块级嵌入
                  if (['pdf', 'mp4', 'webm', 'ogg', 'mov', 'mp3', 'wav', 'm4a', 'gpx', 'kml'].includes(fileExt || '')) {
                    // 如果当前段落有内容，先结束它
                    if (currentParagraphChildren.length > 0) {
                      newNodes.push({
                        type: 'paragraph',
                        children: [...currentParagraphChildren]
                      });
                      currentParagraphChildren = [];
                    }

                    // 添加块级嵌入作为独立节点
                    const embedNode = createLinkNode(parsedLink, options);
                    newNodes.push(embedNode);
                  } else {
                    // 内联嵌入（如图片），保留在段落中
                    const embedNode = createLinkNode(parsedLink, options);
                    currentParagraphChildren.push(embedNode);
                  }
                } else {
                  // 普通链接，保留在段落中
                  const linkNode = createLinkNode(parsedLink, options);
                  currentParagraphChildren.push(linkNode);
                }
              } else {
                // 解析失败，保持原文
                currentParagraphChildren.push({
                  type: 'text',
                  value: match[0]
                });
              }

              lastIndex = matchEnd;
            }

            // 添加剩余文本
            if (lastIndex < text.length) {
              const remainingText = text.slice(lastIndex);
              if (remainingText) {
                currentParagraphChildren.push({
                  type: 'text',
                  value: remainingText
                });
              }
            }
          } else {
            // 没有嵌入，直接添加
            currentParagraphChildren.push(child);
          }
        } else {
          // 非文本节点，直接添加
          currentParagraphChildren.push(child);
        }
      }

      // 如果有剩余的段落内容
      if (currentParagraphChildren.length > 0) {
        newNodes.push({
          type: 'paragraph',
          children: currentParagraphChildren
        });
      }

      // 如果生成了多个节点，替换原段落
      if (newNodes.length > 1 || (newNodes.length === 1 && newNodes[0].type !== 'paragraph')) {
        parent.children.splice(index, 1, ...newNodes);
        return index + newNodes.length; // 跳过新插入的节点
      }
    });

    // 第二遍：处理其他链接（保持原有逻辑）
    const replacements: Array<{
      node: Text;
      parent: any;
      index: number;
      newNodes: any[];
    }> = [];

    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      // 跳过段落中的文本节点，因为已经在第一遍处理过了
      if (parent.type === 'paragraph') return;

      const text = node.value;
      const linkRegex = /(!?\[\[[^\]]+\]\])/g;
      const matches = Array.from(text.matchAll(linkRegex));

      if (matches.length === 0) return;

      // 处理非段落中的链接（标题、列表项等）
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
}

/**
 * 根据解析结果创建对应的 AST 节点
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
      const fileExt = parsedLink.filePath.split('.').pop()?.toLowerCase();

      // GPX/KML 文件可能已经被 trackMapsPlugin 处理了
      if (fileExt === 'gpx' || fileExt === 'kml') {
        result = createTrackEmbed(parsedLink, resolvedPath, baseUrl);
      }
      // PDF 文件
      else if (fileExt === 'pdf') {
        result = createPdfEmbed(parsedLink, resolvedPath, baseUrl);
      }
      // 视频文件
      else if (['mp4', 'webm', 'ogg', 'mov'].includes(fileExt || '')) {
        result = createVideoEmbed(parsedLink, resolvedPath, baseUrl);
      }
      // 音频文件
      else if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt || '')) {
        result = createAudioEmbed(parsedLink, resolvedPath, baseUrl);
      }
      // 其他嵌入类型
      else {
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
 * 创建文件链接节点
 */
function createFileLink(parsedLink: any, resolvedPath: string): Link {
  const displayText = parsedLink.displayText ||
    parsedLink.filePath.split('/').pop()?.replace(/\.md$/, '') ||
    parsedLink.filePath;

  // 生成不带 .md 扩展名的 URL 路径
  const urlPath = resolvedPath.replace(/\.md$/, '');

  return {
    type: 'link',
    url: `#${urlPath}`, // 使用 hash 路由，不包含 .md 扩展名
    children: [{
      type: 'text',
      value: displayText
    }],
    data: {
      hProperties: {
        className: ['internal-link'],
        'data-file-path': resolvedPath // 保留完整路径用于导航
        // onClick 应该在 React 组件中处理，而不是在这里设置
      }
    }
  };
}

/**
 * 创建图片嵌入节点
 */
function createImageEmbed(parsedLink: any, resolvedPath: string, baseUrl: string): Image {
  // 处理图片路径
  let imagePath = resolvedPath;

  // 确保路径格式正确
  if (!imagePath.startsWith('/')) {
    imagePath = '/' + imagePath;
  }

  // 构建完整的图片 URL
  const fullImageUrl = imagePath.startsWith('http')
    ? imagePath
    : `${VAULT_PATH}${imagePath}`;

  return {
    type: 'image',
    url: fullImageUrl,
    alt: parsedLink.displayText || parsedLink.filePath.split('/').pop() || '',
    data: {
      hProperties: {
        className: ['obsidian-image'],
        loading: 'lazy',
        // 添加自定义属性，让前端组件知道这是 vault 图片
        'data-vault-image': 'true'
      }
    }
  };
}

/**
 * 创建轨迹文件嵌入节点
 */
function createTrackEmbed(parsedLink: any, resolvedPath: string, baseUrl: string) {
  // 对于轨迹文件，确保路径正确
  const normalizedPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;

  const fullTrackUrl = normalizedPath.startsWith('http')
    ? normalizedPath
    : `${baseUrl}${normalizedPath}`;

  const ext = parsedLink.filePath.split('.').pop()?.toLowerCase();
  const placeholder = `TRACK_EMBED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    type: 'html',
    value: `<div class="track-embed" data-track-type="${ext}" data-track-url="${fullTrackUrl}" data-placeholder="${placeholder}"></div>`
  };
}

/**
 * 创建 PDF 嵌入节点
 */
function createPdfEmbed(parsedLink: any, resolvedPath: string, baseUrl: string) {
  const normalizedPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
  const fullPdfUrl = normalizedPath.startsWith('http')
    ? normalizedPath
    : `${baseUrl}${normalizedPath}`;

  // 使用和 track 一样的方式，返回自定义节点类型
  return {
    type: 'pdfEmbed',
    data: {
      hName: 'div',
      hProperties: {
        className: ['pdf-embed-placeholder'],
        'data-pdf-url': fullPdfUrl
      }
    },
    children: []
  };
}

/**
 * 创建视频嵌入节点
 */
function createVideoEmbed(parsedLink: any, resolvedPath: string, baseUrl: string) {
  const normalizedPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
  const fullVideoUrl = normalizedPath.startsWith('http')
    ? normalizedPath
    : `${baseUrl}${normalizedPath}`;

  const ext = parsedLink.filePath.split('.').pop()?.toLowerCase();

  // 使用和 track 一样的方式，返回自定义节点类型
  return {
    type: 'videoEmbed',
    data: {
      hName: 'div',
      hProperties: {
        className: ['video-embed-placeholder'],
        'data-video-url': fullVideoUrl,
        'data-video-type': ext
      }
    },
    children: []
  };
}

/**
 * 创建音频嵌入节点
 */
function createAudioEmbed(parsedLink: any, resolvedPath: string, baseUrl: string) {
  const normalizedPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
  const fullAudioUrl = normalizedPath.startsWith('http')
    ? normalizedPath
    : `${baseUrl}${normalizedPath}`;

  const ext = parsedLink.filePath.split('.').pop()?.toLowerCase();

  // 使用和 track 一样的方式，返回自定义节点类型
  return {
    type: 'audioEmbed',
    data: {
      hName: 'div',
      hProperties: {
        className: ['audio-embed-placeholder'],
        'data-audio-url': fullAudioUrl,
        'data-audio-type': ext
      }
    },
    children: []
  };
}

/**
 * 创建通用嵌入节点
 */
function createGenericEmbed(parsedLink: any, _resolvedPath: string) {
  return {
    type: 'text',
    value: `![[${parsedLink.filePath}]]`
  };
}