/**
 * trackMapsPlugin 单元测试
 * 测试所有轨迹语法的解析功能
 */

import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Node } from 'mdast';
import { trackMapsPlugin, type TrackData } from '../plugins/remark/trackMapsPlugin.js';

// 扩展 Node 类型以包含实际的存储结构
interface TrackNode extends Node {
  type: 'trackMap';
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
}

describe('trackMapsPlugin', () => {
  const createProcessor = () => {
    return unified().use(remarkParse).use(trackMapsPlugin, true);
  };

  describe('GPX 代码块', () => {
    it.skip('should process inline GPX code block', () => {
      // 注意：根据插件注释，不再支持内联 ```gpx 代码块
      // 保留测试用于文档目的，但跳过执行
    });

    it.skip('should process inline KML code block', () => {
      // 注意：根据插件注释，不再支持内联 ```kml 代码块
      // 保留测试用于文档目的，但跳过执行
    });
  });

  describe('文件引用', () => {
    it('should process GPX file embed ![[]]', () => {
      const markdown = 'Check out this route: ![[hokkaido-trip.gpx]]';

      const processor = createProcessor();
      const ast = processor.parse(markdown);
      processor.runSync(ast);

      const trackMapNodes = findNodesOfType(ast, 'trackMap');
      expect(trackMapNodes).toHaveLength(1);

      const trackNode = trackMapNodes[0] as TrackNode;
      const trackData = extractTrackData(trackNode);
      expect(trackData?.type).toBe('single-track');
      expect(trackData?.format).toBe('gpx');
      expect(trackData?.source).toBe('file');
      expect(trackData?.filePath).toBe('hokkaido-trip.gpx');
    });

    it('should process KML file link [[]]', () => {
      const markdown = 'See the route: [[city-walk.kml]]';

      const processor = createProcessor();
      const ast = processor.parse(markdown);
      processor.runSync(ast);

      const trackMapNodes = findNodesOfType(ast, 'trackMap');
      expect(trackMapNodes).toHaveLength(1);

      const trackNode = trackMapNodes[0] as TrackNode;
      const trackData = extractTrackData(trackNode);
      expect(trackData?.format).toBe('kml');
      expect(trackData?.filePath).toBe('city-walk.kml');
    });

    it('should process multiple file references in one paragraph', () => {
      const markdown = 'Routes: ![[day1.gpx]] and [[day2.kml]] and ![[day3.gpx]]';

      const processor = createProcessor();
      const ast = processor.parse(markdown);
      processor.runSync(ast);

      const trackMapNodes = findNodesOfType(ast, 'trackMap');
      expect(trackMapNodes).toHaveLength(3);

      expect(extractTrackData(trackMapNodes[0] as TrackNode)?.filePath).toBe('day1.gpx');
      expect(extractTrackData(trackMapNodes[1] as TrackNode)?.filePath).toBe('day2.kml');
      expect(extractTrackData(trackMapNodes[2] as TrackNode)?.filePath).toBe('day3.gpx');
    });
  });

  describe('Leaflet 配置', () => {
    it('should process leaflet with single GPX file', () => {
      const markdown = `
\`\`\`leaflet
gpx: "[[single-track.gpx]]"
zoom: 12
\`\`\`
`;

      const processor = createProcessor();
      const ast = processor.parse(markdown);
      processor.runSync(ast);

      const trackMapNodes = findNodesOfType(ast, 'trackMap');
      expect(trackMapNodes).toHaveLength(1);

      const trackNode = trackMapNodes[0] as TrackNode;
      const trackData = extractTrackData(trackNode);
      expect(trackData?.type).toBe('leaflet');
      expect(trackData?.format).toBe('leaflet');
      expect(trackData?.tracks).toHaveLength(1);
      expect(trackData?.tracks?.[0]?.filePath).toBe('single-track.gpx');
    });

    it('should process leaflet with multiple GPX files', () => {
      const markdown = `
\`\`\`leaflet
gpx:
  - "[[track1.gpx]]"
  - "[[track2.gpx]]"
  - "track3.kml"
zoom: 10
\`\`\`
`;

      const processor = createProcessor();
      const ast = processor.parse(markdown);
      processor.runSync(ast);

      const trackMapNodes = findNodesOfType(ast, 'trackMap');
      expect(trackMapNodes).toHaveLength(1);

      const trackNode = trackMapNodes[0] as TrackNode;
      const trackData = extractTrackData(trackNode);
      expect(trackData?.type).toBe('leaflet');
      expect(trackData?.format).toBe('leaflet');
      expect(trackData?.tracks).toHaveLength(3);

      expect(trackData?.tracks?.[0]?.filePath).toBe('track1.gpx');
      expect(trackData?.tracks?.[1]?.filePath).toBe('track2.gpx');
      expect(trackData?.tracks?.[2]?.filePath).toBe('track3.kml');
      expect(trackData?.tracks?.[2].format).toBe('kml');
    });

    it('should handle invalid leaflet YAML gracefully', () => {
      const markdown = `
\`\`\`leaflet
invalid: yaml: content
  - malformed
\`\`\`
`;

      const processor = createProcessor();
      const ast = processor.parse(markdown);

      // 应该不会抛出错误，保持原始代码块
      expect(() => processor.runSync(ast)).not.toThrow();

      const trackMapNodes = findNodesOfType(ast, 'trackMap');
      expect(trackMapNodes).toHaveLength(0); // 解析失败，保持原样
    });
  });
});

// 辅助函数：查找指定类型的节点
function findNodesOfType(tree: Node, type: string): Node[] {
  const nodes: Node[] = [];

  function visit(node: Node) {
    if (node.type === type) {
      nodes.push(node);
    }
    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  visit(tree);
  return nodes;
}

// 辅助函数：从节点中提取 trackData
function extractTrackData(node: TrackNode): TrackData | null {
  try {
    const dataTrackProps = node.data?.hProperties?.['data-track-props'];
    if (typeof dataTrackProps === 'string') {
      return JSON.parse(dataTrackProps) as TrackData;
    }
    return null;
  } catch {
    return null;
  }
}
