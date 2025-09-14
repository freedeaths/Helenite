/**
 * trackMapsPlugin 单元测试
 * 测试所有轨迹语法的解析功能
 */

import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { trackMapsPlugin } from '../plugins/remark/trackMapsPlugin.js';

describe('trackMapsPlugin', () => {
  const createProcessor = () => {
    return unified()
      .use(remarkParse)
      .use(trackMapsPlugin, { baseUrl: '/test' });
  };

  describe('GPX 代码块', () => {
    it('should process inline GPX code block', () => {
      const markdown = `
# Test

\`\`\`gpx
<gpx><trk><name>Test Track</name></trk></gpx>
\`\`\`
`;

      const processor = createProcessor();
      const ast = processor.parse(markdown);
      processor.runSync(ast);

      // 查找 trackMap 节点
      const trackMapNodes = findNodesOfType(ast, 'trackMap');
      expect(trackMapNodes).toHaveLength(1);
      
      const trackNode = trackMapNodes[0] as any;
      expect(trackNode.trackData.type).toBe('single-track');
      expect(trackNode.trackData.format).toBe('gpx');
      expect(trackNode.trackData.source).toBe('inline');
      expect(trackNode.trackData.content).toContain('<gpx>');
    });

    it('should process inline KML code block', () => {
      const markdown = `
\`\`\`kml
<kml><Document><name>Test</name></Document></kml>
\`\`\`
`;

      const processor = createProcessor();
      const ast = processor.parse(markdown);
      processor.runSync(ast);

      const trackMapNodes = findNodesOfType(ast, 'trackMap');
      expect(trackMapNodes).toHaveLength(1);
      
      const trackNode = trackMapNodes[0] as any;
      expect(trackNode.trackData.format).toBe('kml');
      expect(trackNode.trackData.content).toContain('<kml>');
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
      
      const trackNode = trackMapNodes[0] as any;
      expect(trackNode.trackData.type).toBe('single-track');
      expect(trackNode.trackData.format).toBe('gpx');
      expect(trackNode.trackData.source).toBe('file');
      expect(trackNode.trackData.filePath).toBe('hokkaido-trip.gpx');
    });

    it('should process KML file link [[]]', () => {
      const markdown = 'See the route: [[city-walk.kml]]';

      const processor = createProcessor();
      const ast = processor.parse(markdown);
      processor.runSync(ast);

      const trackMapNodes = findNodesOfType(ast, 'trackMap');
      expect(trackMapNodes).toHaveLength(1);
      
      const trackNode = trackMapNodes[0] as any;
      expect(trackNode.trackData.format).toBe('kml');
      expect(trackNode.trackData.filePath).toBe('city-walk.kml');
    });

    it('should process multiple file references in one paragraph', () => {
      const markdown = 'Routes: ![[day1.gpx]] and [[day2.kml]] and ![[day3.gpx]]';

      const processor = createProcessor();
      const ast = processor.parse(markdown);
      processor.runSync(ast);

      const trackMapNodes = findNodesOfType(ast, 'trackMap');
      expect(trackMapNodes).toHaveLength(3);
      
      expect(trackMapNodes[0].trackData.filePath).toBe('day1.gpx');
      expect(trackMapNodes[1].trackData.filePath).toBe('day2.kml');
      expect(trackMapNodes[2].trackData.filePath).toBe('day3.gpx');
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
      
      const trackNode = trackMapNodes[0] as any;
      expect(trackNode.trackData.type).toBe('single-track');
      expect(trackNode.trackData.format).toBe('leaflet');
      expect(trackNode.trackData.tracks).toHaveLength(1);
      expect(trackNode.trackData.tracks[0].filePath).toBe('single-track.gpx');
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
      
      const trackNode = trackMapNodes[0] as any;
      expect(trackNode.trackData.type).toBe('multi-track');
      expect(trackNode.trackData.format).toBe('leaflet');
      expect(trackNode.trackData.tracks).toHaveLength(3);
      
      expect(trackNode.trackData.tracks[0].filePath).toBe('track1.gpx');
      expect(trackNode.trackData.tracks[1].filePath).toBe('track2.gpx');
      expect(trackNode.trackData.tracks[2].filePath).toBe('track3.kml');
      expect(trackNode.trackData.tracks[2].format).toBe('kml');
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
function findNodesOfType(tree: any, type: string): any[] {
  const nodes: any[] = [];
  
  function visit(node: any) {
    if (node.type === type) {
      nodes.push(node);
    }
    if (node.children) {
      node.children.forEach(visit);
    }
  }
  
  visit(tree);
  return nodes;
}