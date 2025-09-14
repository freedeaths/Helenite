/**
 * Footprints 聚合地图插件
 * 
 * 专门处理足迹聚合地图的高级功能：
 * 1. 解析 footprints 配置
 * 2. 整合多数据源（用户输入、轨迹文件、照片EXIF）
 * 3. 生成统一的地图组件配置
 * 
 * 基于现有的 FootprintsService 架构
 */

import { visit } from 'unist-util-visit';
import type { Root as MdastRoot, Code } from 'mdast';
import * as YAML from 'yaml';

export interface FootprintsPluginOptions {
  baseUrl?: string;
  currentFilePath?: string;
  footprintsService?: any; // FootprintsService 实例
}

/**
 * 足迹配置接口（基于设计文档）
 */
export interface FootprintsConfig {
  // 用户输入的城市列表
  userInputs?: string[];
  
  // 附件路径扫描
  attachmentsPath?: string;
  includeTracks?: boolean;
  includePhotos?: boolean;
  
  // 可视化配置
  locationType?: 'centerPoint' | 'bounds';
  clustering?: {
    enabled: boolean;
    maxDistance: number; // km
    minPoints: number;
  };
  
  // 时间过滤
  timeFilter?: {
    start: string;
    end: string;
  };
  
  // 地图样式
  style?: {
    showTracks?: boolean;
    showPhotos?: boolean;
    trackColor?: string;
    visitedColor?: string;
    plannedColor?: string;
  };
}

/**
 * 足迹数据接口
 */
interface FootprintsData {
  id: string;
  config: FootprintsConfig;
  estimatedData: {
    tracksCount: number;
    locationsCount: number;
    photosCount: number;
    dateRange?: { start: Date; end: Date };
  };
}

/**
 * Footprints 插件
 */
export function footprintsPlugin(options: FootprintsPluginOptions = {}) {
  let footprintsId = 0;

  return (tree: MdastRoot) => {
    visit(tree, 'code', async (node: Code, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      
      // 只处理 footprints 代码块
      if (node.lang?.toLowerCase() !== 'footprints') return;

      let config: FootprintsConfig = {};
      
      try {
        config = YAML.parse(node.value) || {};
      } catch (error) {
        console.warn('Failed to parse footprints config:', error);
        return;
      }

      // 预处理配置，估算数据量
      const estimatedData = await estimateFootprintsData(config, options.footprintsService);
      
      const footprintsData: FootprintsData = {
        id: `footprints-${footprintsId++}`,
        config,
        estimatedData
      };

      // 替换为自定义 footprints 节点
      (parent.children as any[])[index] = {
        type: 'footprintsMap',
        data: {
          hName: 'div',
          hProperties: {
            className: ['footprints-map-container'],
            'data-footprints-id': footprintsData.id,
            'data-estimated-tracks': estimatedData.tracksCount,
            'data-estimated-locations': estimatedData.locationsCount,
            'data-estimated-photos': estimatedData.photosCount
          }
        },
        footprintsData,
        children: []
      };
    });
  };
}

/**
 * 估算足迹数据量（用于优化渲染性能）
 */
async function estimateFootprintsData(
  config: FootprintsConfig, 
  footprintsService?: any
): Promise<FootprintsData['estimatedData']> {
  let tracksCount = 0;
  let locationsCount = 0;
  let photosCount = 0;
  let dateRange: { start: Date; end: Date } | undefined;

  try {
    // 估算用户输入的城市数量
    if (config.userInputs?.length) {
      locationsCount += config.userInputs.length;
    }

    // 如果有 footprintsService，扫描附件
    if (footprintsService && config.attachmentsPath) {
      if (config.includeTracks) {
        try {
          const trackFiles = await footprintsService.scanTrackFiles(config.attachmentsPath);
          tracksCount = trackFiles?.length || 0;
        } catch (error) {
          console.warn('Failed to scan track files:', error);
        }
      }

      if (config.includePhotos) {
        try {
          // TODO: 扫描照片文件
          // const photoFiles = await footprintsService.scanPhotoFiles(config.attachmentsPath);
          // photosCount = photoFiles?.length || 0;
        } catch (error) {
          console.warn('Failed to scan photo files:', error);
        }
      }
    }

    // 处理时间过滤
    if (config.timeFilter) {
      try {
        dateRange = {
          start: new Date(config.timeFilter.start),
          end: new Date(config.timeFilter.end)
        };
      } catch (error) {
        console.warn('Invalid time filter format:', error);
      }
    }

  } catch (error) {
    console.warn('Failed to estimate footprints data:', error);
  }

  return {
    tracksCount,
    locationsCount,
    photosCount,
    dateRange
  };
}

// 默认配置
export const DEFAULT_FOOTPRINTS_CONFIG: Partial<FootprintsConfig> = {
  locationType: 'centerPoint',
  clustering: {
    enabled: true,
    maxDistance: 50,
    minPoints: 3
  },
  style: {
    showTracks: true,
    showPhotos: true,
    trackColor: '#3b82f6',
    visitedColor: '#10b981',
    plannedColor: '#f59e0b'
  }
};

// 导出类型
export type { FootprintsPluginOptions, FootprintsConfig, FootprintsData };