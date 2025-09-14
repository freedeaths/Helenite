/**
 * Track Map Renderer rehype 插件
 * 
 * 将 remark-track 生成的 trackMap 节点转换为实际的 React 组件
 * 处理轨迹数据加载和地图组件渲染
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

      // 从 data 属性中提取基本信息
      const trackId = node.properties?.['data-track-id'];
      const trackType = node.properties?.['data-track-type'];
      const trackFormat = node.properties?.['data-track-format'];
      const trackFile = node.properties?.['data-track-file'];
      const trackContentBase64 = node.properties?.['data-track-content'];
      const trackConfigJson = node.properties?.['data-track-config'];
      
      if (!trackId || !trackType) {
        console.warn('🔄 trackMapRenderer: Missing track data in container');
        return;
      }

      // 解码存储的轨迹内容
      let trackContent: string | undefined;
      if (trackContentBase64) {
        try {
          trackContent = decodeURIComponent(atob(trackContentBase64));
        } catch (error) {
          console.error('Failed to decode track content for', trackId, ':', error);
        }
      }

      // 解析存储的配置
      let trackConfig: any;
      if (trackConfigJson) {
        try {
          trackConfig = JSON.parse(trackConfigJson);
        } catch (error) {
          console.warn('Failed to parse track config:', error);
        }
      }

      // 重构 trackData 对象
      const trackData = {
        id: trackId,
        type: trackType === 'single' ? 'single-track' :
              trackType === 'multi' ? 'multi-track' :
              trackType === 'leaflet' ? 'leaflet' : 'footprints',
        format: trackFormat,
        filePath: trackFile,
        content: trackContent,
        config: trackConfig
      };

      let componentProps: any = {
        trackId: trackData.id,
        trackType: trackData.type
      };

      if (trackData.type === 'single-track') {
        // 单个轨迹地图
        componentProps = {
          ...componentProps,
          format: trackData.format,
          source: trackData.filePath ? 'file' : 'inline'
        };

        if (trackData.filePath) {
          // 文件轨迹数据
          componentProps.trackFile = trackData.filePath;
        } else if (trackData.content) {
          // 内联轨迹数据
          componentProps.trackData = trackData.content;
        }

      } else if (trackData.type === 'leaflet') {
        // Leaflet 配置地图
        componentProps = {
          ...componentProps,
          config: trackData.leafletConfig || trackData.config || {}
        };
      } else if (trackData.type === 'footprints') {
        // 足迹聚合地图
        componentProps = {
          ...componentProps,
          config: trackData.config || {}
        };
      }

      // 更新节点属性为 track-map-component
      node.properties.className = ['track-map-component'];
      node.properties['data-component'] = 'TrackMap';
      node.properties['data-props'] = JSON.stringify(componentProps);
      
      // 清理 track-map-container 的 data 属性
      delete node.properties['data-track-id'];
      delete node.properties['data-track-type'];
      delete node.properties['data-track-format'];
      delete node.properties['data-track-file'];
      delete node.properties['data-track-count'];

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

/**
 * 轨迹数据预处理工具
 */
export class TrackDataProcessor {
  constructor(private vaultService: any) {}

  /**
   * 预处理轨迹文件，提取基本信息
   */
  async preprocessTrackFile(filePath: string): Promise<{
    format: 'gpx' | 'kml';
    name?: string;
    bounds?: { 
      north: number; 
      south: number; 
      east: number; 
      west: number; 
    };
    points?: number;
  }> {
    try {
      const content = await this.vaultService.getDocumentContent(filePath);
      const format = filePath.toLowerCase().endsWith('.gpx') ? 'gpx' : 'kml';
      
      // 基础信息提取
      let name: string | undefined;
      let points = 0;

      if (format === 'gpx') {
        // 提取 GPX 名称和统计
        const nameMatch = content.match(/<name>(.*?)<\/name>/);
        name = nameMatch?.[1];
        
        const trackPoints = content.match(/<trkpt/g);
        points = trackPoints?.length || 0;
        
      } else if (format === 'kml') {
        // 提取 KML 名称和统计
        const nameMatch = content.match(/<name>(.*?)<\/name>/);
        name = nameMatch?.[1];
        
        const coordinates = content.match(/<coordinates>/g);
        points = coordinates?.length || 0;
      }

      return {
        format,
        name,
        points
      };

    } catch (error) {
      console.warn(`Failed to preprocess track file ${filePath}:`, error);
      const format = filePath.toLowerCase().endsWith('.gpx') ? 'gpx' : 'kml';
      return { format };
    }
  }

  /**
   * 处理足迹聚合配置
   */
  async preprocessFootprintsConfig(config: any): Promise<{
    estimatedTracks: number;
    estimatedLocations: number;
    attachmentFiles: string[];
  }> {
    let estimatedTracks = 0;
    let estimatedLocations = 0;
    let attachmentFiles: string[] = [];

    try {
      // 处理用户输入的城市
      if (config.userInputs?.length) {
        estimatedLocations += config.userInputs.length;
      }

      // 扫描附件路径
      if (config.attachmentsPath && config.includeTracks) {
        // TODO: 调用 FootprintsService 扫描文件
        // const files = await this.vaultService.scanTrackFiles(config.attachmentsPath);
        // attachmentFiles = files;
        // estimatedTracks = files.filter(f => f.endsWith('.gpx') || f.endsWith('.kml')).length;
      }

    } catch (error) {
      console.warn('Failed to preprocess footprints config:', error);
    }

    return {
      estimatedTracks,
      estimatedLocations,
      attachmentFiles
    };
  }
}