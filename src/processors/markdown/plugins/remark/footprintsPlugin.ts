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
import type { Root as MdastRoot, Code, Node as MdastNode } from 'mdast';
import * as YAML from 'yaml';

export interface FootprintsPluginOptions {
  baseUrl?: string;
  currentFilePath?: string;
  footprintsService?: unknown; // FootprintsService 实例
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
export function footprintsPlugin(_options: FootprintsPluginOptions = {}) {
  let footprintsId = 0;

  return (tree: MdastRoot) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      // 只处理 footprints 代码块
      if (node.lang?.toLowerCase() !== 'footprints') return;

      let config: FootprintsConfig = {};

      try {
        config = YAML.parse(node.value) || {};
      } catch {
        // console.warn('Failed to parse footprints config:', error);
        return;
      }

      // 预处理配置，估算数据量 - 移除异步操作，在 rehype 阶段处理
      const estimatedData = {
        tracksCount: 0,
        locationsCount: 0,
        photosCount: 0
      };
      
      const footprintsData: FootprintsData = {
        id: `footprints-${footprintsId++}`,
        config,
        estimatedData
      };

      // 替换为自定义 footprints 节点
      (parent.children as MdastNode[])[index] = {
        type: 'footprintsMap',
        data: {
          hName: 'div',
          hProperties: {
            className: ['footprints-map-container'],
            'data-footprints-id': footprintsData.id,
            'data-footprints-config': JSON.stringify(config)
          }
        },
        children: []
      } as MdastNode;
    });
  };
}

// 已移除未使用的估算函数

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

// 类型已在文件顶部导出