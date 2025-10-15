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
  vaultService?: unknown; // VaultService 实例，用于加载文件
}

/**
 * Track Map Renderer 插件
 */
export function trackMapRenderer() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: HastElement) => {
      // 查找已转换的 track-map-container div 元素
      if (node.tagName !== 'div') return;

      const classNameProp = node.properties?.className;
      const classNames = Array.isArray(classNameProp)
        ? classNameProp
        : typeof classNameProp === 'string'
          ? [classNameProp]
          : [];

      if (!classNames.includes('track-map-container')) return;

      // 从 data-track-props 属性中提取所有数据
      const trackPropsJson = node.properties?.['data-track-props'];

      if (!trackPropsJson) {
        // console.warn('🔄 trackMapRenderer: Missing track props in container');
        return;
      }

      // 解析存储的数据
      let trackData: unknown;
      try {
        trackData = JSON.parse(String(trackPropsJson));
      } catch {
        // console.warn('Failed to parse track props:', error);
        return;
      }

      const trackDataTyped = trackData as { id: string; type: string; [key: string]: unknown };
      let componentProps: Record<string, unknown> = {
        trackId: trackDataTyped.id,
        trackType: trackDataTyped.type,
      };

      if (trackDataTyped.type === 'single-track') {
        // 单个轨迹地图 - 只传递文件路径
        componentProps = {
          ...componentProps,
          format: trackDataTyped.format,
          filePathsJson: JSON.stringify([trackDataTyped.filePath]), // 使用 JSON 字符串避免序列化问题
        };
      } else if (trackDataTyped.type === 'leaflet') {
        // Leaflet 配置地图 - 从 tracks 中提取文件路径
        // console.log('trackMapRenderer - leaflet trackData:', JSON.stringify(trackData, null, 2));

        const filePaths = ((trackDataTyped.tracks as { filePath: string }[]) || [])
          .filter((track) => track.filePath)
          .map((track) => track.filePath);

        // console.log('trackMapRenderer - leaflet filePaths:', filePaths);

        componentProps = {
          ...componentProps,
          config: trackDataTyped.leafletConfig || {},
          filePathsJson: JSON.stringify(filePaths), // 使用 JSON 字符串避免序列化问题
        };
      }

      // 直接使用 TrackMap 作为组件名
      node.tagName = 'TrackMap';
      node.properties = componentProps as Record<
        string,
        string | number | boolean | (string | number)[] | null | undefined
      >; // 直接传递 props，不再使用 data-props

      // 清理 track-map-container 的 data 属性
      delete node.properties['data-track-props'];

      // 更新子节点内容
      node.children = [
        {
          type: 'text',
          value: '📍 Loading map...',
        },
      ];
    });
  };
}
