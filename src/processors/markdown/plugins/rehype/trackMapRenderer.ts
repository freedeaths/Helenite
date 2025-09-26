/**
 * Track Map Renderer rehype 插件
 *
 * 将 remark-track 生成的 trackMap 节点转换为实际的 React 组件
 * 所有轨迹数据加载延迟到 TrackMap 组件中使用 FootprintsService 处理
 */

import { visit } from 'unist-util-visit';
import type { Root as HastRoot, Element as HastElement } from 'hast';

export interface TrackMapRendererOptions {
  baseUrl?: string;
  vaultService?: any; // VaultService 实例，用于加载文件
}

/**
 * Track Map Renderer 插件
 */
export function trackMapRenderer(options: TrackMapRendererOptions = {}) {
  return (tree: HastRoot) => {
    visit(tree, (node: any) => {
      // 查找已转换的 track-map-container div 元素
      if (node.type !== 'element' || node.tagName !== 'div') return;
      if (!node.properties?.className?.includes('track-map-container')) return;

      // 从 data-track-props 属性中提取所有数据
      const trackPropsJson = node.properties?.['data-track-props'];

      if (!trackPropsJson) {
        console.warn('🔄 trackMapRenderer: Missing track props in container');
        return;
      }

      // 解析存储的数据
      let trackData: any;
      try {
        trackData = JSON.parse(trackPropsJson);
      } catch (error) {
        console.warn('Failed to parse track props:', error);
        return;
      }

      const displayType = trackData.displayType || 'single';

      let componentProps: any = {
        trackId: trackData.id,
        trackType: trackData.type
      };

      if (trackData.type === 'single-track') {
        // 单个轨迹地图 - 只传递文件路径
        componentProps = {
          ...componentProps,
          format: trackData.format,
          filePathsJson: JSON.stringify([trackData.filePath])  // 使用 JSON 字符串避免序列化问题
        };

      } else if (trackData.type === 'leaflet') {
        // Leaflet 配置地图 - 从 tracks 中提取文件路径
        // console.log('trackMapRenderer - leaflet trackData:', JSON.stringify(trackData, null, 2));

        const filePaths = (trackData.tracks || [])
          .filter((track: any) => track.filePath)
          .map((track: any) => track.filePath);

        // console.log('trackMapRenderer - leaflet filePaths:', filePaths);

        componentProps = {
          ...componentProps,
          config: trackData.leafletConfig || {},
          filePathsJson: JSON.stringify(filePaths)  // 使用 JSON 字符串避免序列化问题
        };
      }

      // 直接使用 TrackMap 作为组件名
      node.tagName = 'TrackMap';
      node.properties = componentProps;  // 直接传递 props，不再使用 data-props

      // 清理 track-map-container 的 data 属性
      delete node.properties['data-track-props'];

      // 更新子节点内容
      node.children = [
        {
          type: 'text',
          value: '📍 Loading map...'
        }
      ];
    });
  };
}

