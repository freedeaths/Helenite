/**
 * Track Maps remark 插件
 * 
 * 处理轨迹地图相关的 Markdown 语法：
 * 1. ```gpx, ```kml, ```leaflet 代码块
 * 2. ![[*.gpx]], ![[*.kml]] 文件嵌入
 * 3. [[*.gpx]], [[*.kml]] 文件链接
 * 4. ```footprints 聚合地图配置
 * 
 * 转换为自定义 AST 节点，供 rehype-track 插件处理
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
  type: 'single-track' | 'multi-track' | 'leaflet' | 'footprints';
  format?: 'gpx' | 'kml' | 'leaflet';
  source: 'inline' | 'file' | 'mixed';
  content?: string;
  filePath?: string;
  leafletConfig?: LeafletConfig;
  tracks?: SingleTrack[];
  config?: FootprintsConfig;
}

/**
 * 单个轨迹接口
 */
interface SingleTrack {
  id: string;
  format: 'gpx' | 'kml';
  source: 'inline' | 'file';
  content?: string;
  filePath?: string;
}

/**
 * Leaflet 配置接口
 */
interface LeafletConfig {
  gpx?: string | string[]; // 可以是单个文件或文件列表
  [key: string]: any; // 其他 leaflet 配置
}

/**
 * 足迹聚合配置
 */
interface FootprintsConfig {
  userInputs?: string[];
  attachmentsPath?: string;
  includeTracks?: boolean;
  locationType?: 'centerPoint' | 'bounds';
  clustering?: {
    enabled: boolean;
    maxDistance: number;
    minPoints: number;
  };
  timeFilter?: {
    start: string;
    end: string;
  };
}

/**
 * Track Maps 插件
 */
export function trackMapsPlugin(options: TrackMapsPluginOptions = {}) {
  let trackId = 0;

  return (tree: MdastRoot) => {
    // 处理代码块：```gpx, ```kml, ```leaflet, ```footprints
    visit(tree, 'code', (node: Code, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      const lang = node.lang?.toLowerCase();

      if (lang === 'gpx' || lang === 'kml') {
        // 单个轨迹：内联 GPX/KML 数据
        const trackData: TrackData = {
          id: `track-${trackId++}`,
          type: 'single-track',
          format: lang as 'gpx' | 'kml',
          source: 'inline',
          content: node.value.trim()
        };

        replaceWithTrackNode(parent, index, trackData, 'single');

      } else if (lang === 'leaflet') {
        // Leaflet 配置：可包含多个轨迹文件
        let leafletConfig: LeafletConfig = {};
        
        try {
          leafletConfig = YAML.parse(node.value) || {};
        } catch (error) {
          console.warn('Failed to parse leaflet config:', error);
          return;
        }

        const trackData = processLeafletConfig(leafletConfig, trackId++);
        replaceWithTrackNode(parent, index, trackData, 'leaflet');

      } else if (lang === 'footprints') {
        // 足迹聚合地图
        let config: FootprintsConfig = {};
        
        try {
          config = YAML.parse(node.value) || {};
        } catch (error) {
          console.warn('Failed to parse footprints config:', error);
          return;
        }

        const trackData: TrackData = {
          id: `footprints-${trackId++}`,
          type: 'footprints',
          source: 'inline',
          config
        };

        replaceWithTrackNode(parent, index, trackData, 'footprints');
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

      // 分割文本并创建新节点
      const newNodes: any[] = [];
      let lastIndex = 0;

      matches.forEach(match => {
        const matchStart = match.index!;
        const matchEnd = matchStart + match[0].length;
        const fullMatch = match[1];    // ![[file.gpx]] 或 [[file.gpx]]
        const filePath = match[2];     // file.gpx
        const format = match[3] as 'gpx' | 'kml';
        const isEmbed = fullMatch.startsWith('!');

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

        // 无论是 ![[]] 嵌入还是 [[]] 链接，都转换为轨迹地图
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
        (parent.children as any[]).splice(index, 1, ...newNodes);
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

  if (config.gpx) {
    if (typeof config.gpx === 'string') {
      // 单个 GPX 文件：gpx: "[[track.gpx]]" 或 gpx: "track.gpx"
      const track = parseGpxReference(config.gpx, `${id}-${trackIdCounter++}`);
      if (track) tracks.push(track);
      
    } else if (Array.isArray(config.gpx)) {
      // GPX 文件列表：gpx: ["[[track1.gpx]]", "[[track2.gpx]]"]
      config.gpx.forEach(gpxRef => {
        const track = parseGpxReference(gpxRef, `${id}-${trackIdCounter++}`);
        if (track) tracks.push(track);
      });
    }
  }

  return {
    id: `leaflet-${id}`,
    type: tracks.length > 1 ? 'multi-track' : 'single-track',
    format: 'leaflet',
    source: 'mixed',
    leafletConfig: config,
    tracks
  };
}

/**
 * 解析 GPX 文件引用，支持 [[file.gpx]] 和 file.gpx 格式
 */
function parseGpxReference(gpxRef: string, id: string): SingleTrack | null {
  if (!gpxRef) return null;

  // 移除 [[ ]] 包装
  const cleanRef = gpxRef.replace(/^\[\[|\]\]$/g, '').trim();
  
  if (!cleanRef || (!cleanRef.endsWith('.gpx') && !cleanRef.endsWith('.kml'))) {
    return null;
  }

  const format = cleanRef.endsWith('.gpx') ? 'gpx' : 'kml';

  return {
    id,
    format,
    source: 'file',
    filePath: cleanRef
  };
}

/**
 * 创建轨迹地图 AST 节点
 */
function createTrackMapNode(trackData: TrackData, displayType: string) {
  const node = {
    type: 'trackMap',
    data: {
      hName: 'div',
      hProperties: {
        className: ['track-map-container'],
        'data-track-type': displayType,
        'data-track-format': trackData.format,
        'data-track-id': trackData.id,
        'data-track-file': trackData.filePath,
        'data-track-count': trackData.tracks?.length || 1,
        // Store track content as base64 to preserve it through remark-to-rehype conversion
        'data-track-content': trackData.content ? btoa(encodeURIComponent(trackData.content)) : undefined,
        'data-track-config': (trackData.leafletConfig || trackData.config) ? JSON.stringify(trackData.leafletConfig || trackData.config) : undefined
      }
    },
    trackData,
    children: []
  };
  
  console.log('🗺️ createTrackMapNode: Created node for', trackData.id, 'type:', trackData.type);
  return node;
}

/**
 * 替换节点为轨迹地图节点的通用函数
 */
function replaceWithTrackNode(parent: any, index: number, trackData: TrackData, displayType: string) {
  (parent.children as any[])[index] = createTrackMapNode(trackData, displayType);
}

// 导出类型
export type { TrackMapsPluginOptions, FootprintsConfig, TrackData, SingleTrack, LeafletConfig };