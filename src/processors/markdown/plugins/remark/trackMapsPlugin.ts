/**
 * Track Maps remark 插件
 *
 * 处理轨迹地图相关的 Markdown 语法：
 * 1. ```leaflet 代码块（仅支持文件引用）
 * 2. ![[*.gpx]], ![[*.kml]] 文件嵌入
 * 3. [[*.gpx]], [[*.kml]] 文件链接
 *
 * 转换为自定义 AST 节点，供 rehype-track 插件处理
 *
 * 注意：为保持插件同步性，不再支持内联 ```gpx 和 ```kml 代码块
 */

import { visit } from 'unist-util-visit';
import type { Root as MdastRoot, Code, Text } from 'mdast';
import * as YAML from 'yaml';

export interface TrackMapsPluginOptions {
  baseUrl?: string;
  currentFilePath?: string;
}

/**
 * 轨迹数据接口
 */
interface TrackData {
  id: string;
  type: 'single-track' | 'multi-track' | 'leaflet';
  format?: 'gpx' | 'kml' | 'leaflet';
  source: 'file' | 'mixed';  // 移除 'inline'，只支持文件引用
  filePath?: string;
  leafletConfig?: LeafletConfig;
  tracks?: SingleTrack[];
}

/**
 * 单个轨迹接口
 */
interface SingleTrack {
  id: string;
  format: 'gpx' | 'kml';
  source: 'file';  // 只支持文件引用
  filePath: string;
}

/**
 * Leaflet 配置接口
 */
interface LeafletConfig {
  gpx?: string | string[]; // 可以是单个文件或文件列表
  [key: string]: unknown; // 其他 leaflet 配置
}


/**
 * Track Maps 插件
 */
export function trackMapsPlugin() {
  let trackId = 0;

  return (tree: MdastRoot) => {
    // 处理代码块：只支持 ```leaflet
    visit(tree, 'code', (node: Code, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      const lang = node.lang?.toLowerCase();

      if (lang === 'leaflet') {
        // Leaflet 配置：可包含多个轨迹文件
        let leafletConfig: LeafletConfig = {};

        try {
          // Fix for leaflet blocks without quotes - parse as YAML
          // The YAML parser should handle both quoted and unquoted strings
          leafletConfig = YAML.parse(node.value) || {};
        } catch {
          // console.warn('Failed to parse leaflet config:', error);
          
          return;
        }

        const trackData = processLeafletConfig(leafletConfig, trackId++);
        replaceWithTrackNode(parent, index, trackData, 'leaflet');
      }
    });

    // 处理文件引用：![[*.gpx]], ![[*.kml]], [[*.gpx]], [[*.kml]]
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      const value = node.value;
      // 匹配所有轨迹文件引用：![[file.gpx]] 或 [[file.kml]]
      const trackLinkRegex = /(!?\[\[([^[\]]+\.(gpx|kml))\]\])/g;
      const matches = Array.from(value.matchAll(trackLinkRegex));

      if (matches.length === 0) return;

      // 检查是否在段落内
      const isInParagraph = parent.type === 'paragraph';

      if (isInParagraph && matches.length > 0) {
        // 如果在段落内且有匹配，需要将段落分解
        const grandParent = (tree as MdastRoot).children.find((child: unknown) =>
          child.children && child.children.includes(parent)
        );

        if (grandParent) {
          const parentIndex = grandParent.children.indexOf(parent);
          const newNodes: Node[] = [];
          let lastIndex = 0;

          matches.forEach(match => {
            const matchStart = match.index!;
            const matchEnd = matchStart + match[0].length;
            const filePath = match[2];
            const format = match[3] as 'gpx' | 'kml';

            // 添加匹配前的文本作为段落
            if (matchStart > lastIndex) {
              const beforeText = value.slice(lastIndex, matchStart).trim();
              if (beforeText) {
                newNodes.push({
                  type: 'paragraph',
                  children: [{ type: 'text', value: beforeText }]
                });
              }
            }

            // 创建轨迹地图节点（不包裹在段落中）
            const trackData: TrackData = {
              id: `track-${trackId++}`,
              type: 'single-track',
              format,
              source: 'file',
              filePath
            };
            newNodes.push(createTrackMapNode(trackData, 'single'));

            lastIndex = matchEnd;
          });

          // 添加剩余文本作为段落
          if (lastIndex < value.length) {
            const remainingText = value.slice(lastIndex).trim();
            if (remainingText) {
              newNodes.push({
                type: 'paragraph',
                children: [{ type: 'text', value: remainingText }]
              });
            }
          }

          // 替换整个段落
          grandParent.children.splice(parentIndex, 1, ...newNodes);
          return;
        }
      }

      // 如果不在段落内但父节点是段落，我们需要打破段落
      if (parent.type === 'paragraph') {
        // 需要找到段落的父节点
        const findParentOfNode = (tree: Node, targetNode: Node): Node | undefined => {
          if (tree.children) {
            for (const child of tree.children) {
              if (child === targetNode) return tree;
              const found = findParentOfNode(child, targetNode);
              if (found) return found;
            }
          }
          return null;
        };

        const grandParent = findParentOfNode(tree, parent);
        if (grandParent && grandParent.children) {
          const parentIndex = grandParent.children.indexOf(parent);
          const newNodes: Node[] = [];
          let lastIndex = 0;

          matches.forEach(match => {
            const matchStart = match.index!;
            const matchEnd = matchStart + match[0].length;
            const filePath = match[2];
            const format = match[3] as 'gpx' | 'kml';

            // 添加匹配前的文本作为段落
            if (matchStart > lastIndex) {
              const beforeText = value.slice(lastIndex, matchStart).trim();
              if (beforeText) {
                newNodes.push({
                  type: 'paragraph',
                  children: [{ type: 'text', value: beforeText }]
                });
              }
            }

            // 创建轨迹地图节点（不包裹在段落中）
            const trackData: TrackData = {
              id: `track-${trackId++}`,
              type: 'single-track',
              format,
              source: 'file',
              filePath
            };
            newNodes.push(createTrackMapNode(trackData, 'single'));

            lastIndex = matchEnd;
          });

          // 添加剩余文本作为段落
          if (lastIndex < value.length) {
            const remainingText = value.slice(lastIndex).trim();
            if (remainingText) {
              newNodes.push({
                type: 'paragraph',
                children: [{ type: 'text', value: remainingText }]
              });
            }
          }

          // 替换整个段落
          grandParent.children.splice(parentIndex, 1, ...newNodes);
          return;
        }
      }

      // 如果真的不在段落内（比如在列表项内），使用原来的逻辑
      const newNodes: Node[] = [];
      let lastIndex = 0;

      matches.forEach(match => {
        const matchStart = match.index!;
        const matchEnd = matchStart + match[0].length;
        const filePath = match[2];
        const format = match[3] as 'gpx' | 'kml';

        // 添加匹配前的文本
        if (matchStart > lastIndex) {
          const beforeText = value.slice(lastIndex, matchStart);
          if (beforeText.trim()) {
            newNodes.push({
              type: 'text',
              value: beforeText
            });
          }
        }

        // 创建轨迹地图节点
        const trackData: TrackData = {
          id: `track-${trackId++}`,
          type: 'single-track',
          format,
          source: 'file',
          filePath
        };
        newNodes.push(createTrackMapNode(trackData, 'single'));

        lastIndex = matchEnd;
      });

      // 添加剩余文本
      if (lastIndex < value.length) {
        const remainingText = value.slice(lastIndex);
        if (remainingText.trim()) {
          newNodes.push({
            type: 'text',
            value: remainingText
          });
        }
      }

      // 替换节点
      if (newNodes.length > 0) {
        (parent.children as Node[]).splice(index, 1, ...newNodes);
      }
    });
  };
}

/**
 * 处理 Leaflet 配置，解析 gpx 字段
 */
function processLeafletConfig(config: LeafletConfig, id: number): TrackData {
  const tracks: SingleTrack[] = [];
  let trackIdCounter = 0;

  // console.log('[processLeafletConfig] Config:', JSON.stringify(config, null, 2));

  if (config.gpx) {
    if (typeof config.gpx === 'string') {
      // 单个 GPX 文件：gpx: [[track.gpx]] 或 gpx: "[[track.gpx]]" 或 gpx: "track.gpx"
      // 单个 GPX 文件
      const track = parseGpxReference(config.gpx, `${id}-${trackIdCounter++}`);
      if (track) tracks.push(track);

    } else if (Array.isArray(config.gpx)) {
      // GPX 文件列表：gpx: ["[[track1.gpx]]", "[[track2.gpx]]"]
      // GPX 文件列表
      (config.gpx as unknown[]).forEach((gpxRef: unknown, _index) => {
        // console.log(`[processLeafletConfig] Processing item ${index}:`, gpxRef);

        // 处理 YAML 解析 [[file]] 为嵌套数组的情况
        let actualRef: unknown = gpxRef;
        if (Array.isArray(gpxRef) && gpxRef.length === 1 && Array.isArray(gpxRef[0])) {
          // 处理 [['file']] 的情况
          actualRef = gpxRef[0];
          // Unwrapped nested array
        }

        const track = parseGpxReference(actualRef, `${id}-${trackIdCounter++}`);
        if (track) tracks.push(track);
      });
    }
  }

  // console.log('[processLeafletConfig] Final tracks:', tracks);


  return {
    id: `leaflet-${id}`,
    type: 'leaflet',  // Always use 'leaflet' type for proper handling
    format: 'leaflet',
    source: 'mixed',
    leafletConfig: config,
    tracks
  };
}

/**
 * 解析 GPX 文件引用，支持 [[file.gpx]] 和 file.gpx 格式
 */
function parseGpxReference(gpxRef: unknown, id: string): SingleTrack | null {
  // YAML 会将 [[Attachments/yamap.gpx]] 解析为一个数组，因为 [[ 开头被视为数组
  // 但实际上这是 Obsidian 的链接语法，需要特殊处理

  // console.log('[parseGpxReference] Input:', gpxRef);

  let fileRef: string = '';

  if (Array.isArray(gpxRef)) {
    // YAML 解析 [[file.gpx]] 为 ["file.gpx"]
    if (gpxRef.length > 0 && typeof gpxRef[0] === 'string') {
      // 只取第一个元素，不要 join
      fileRef = `[[${gpxRef[0]}]]`;
      // Array handled as: [[file]]
    } else {
      // Invalid array format
      return null;
    }
  } else if (typeof gpxRef === 'string') {
    fileRef = gpxRef;
    // String input
  } else {
    // Invalid type
    return null;
  }

  // 检查是否是 Obsidian 链接格式 [[file]]
  const obsidianLinkMatch = fileRef.match(/^\[\[(.+?)\]\]$/);
  let cleanRef: string;

  if (obsidianLinkMatch) {
    cleanRef = obsidianLinkMatch[1].trim();
  } else {
    // 普通文件路径，移除可能的引号
    cleanRef = fileRef.replace(/^"|"$/g, '').trim();
  }

  if (!cleanRef || (!cleanRef.endsWith('.gpx') && !cleanRef.endsWith('.kml'))) {
    // Invalid file extension or empty
    return null;
  }

  const format = cleanRef.endsWith('.gpx') ? 'gpx' : 'kml';

  const result = {
    id,
    format,
    source: 'file' as const,
    filePath: cleanRef
  };

  // console.log('[parseGpxReference] Success:', result);
  return result;
}

/**
 * 创建轨迹地图 AST 节点
 */
function createTrackMapNode(trackData: TrackData, displayType: string) {
  // 准备要存储的完整数据
  const dataToStore = {
    ...trackData,
    displayType
  };

  const node = {
    type: 'trackMap',
    data: {
      hName: 'div',
      hProperties: {
        className: ['track-map-container'],
        // 将所有数据存储在一个属性中
        'data-track-props': JSON.stringify(dataToStore)
      }
    },
    children: []
  };

  return node;
}

/**
 * 替换节点为轨迹地图节点的通用函数
 */
function replaceWithTrackNode(parent: Parent, index: number, trackData: TrackData, displayType: string) {
  (parent.children as Node[])[index] = createTrackMapNode(trackData, displayType);
}

// 导出类型
export type { TrackMapsPluginOptions, TrackData, SingleTrack, LeafletConfig };