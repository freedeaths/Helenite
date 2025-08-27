import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useGraphAPI } from '../../hooks/useAPIs';
import { navigateToFile } from '../../utils/routeUtils';
import type { GraphData, GraphNode, GraphEdge } from '../../apis/interfaces/IGraphAPI';

interface D3Node extends GraphNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link extends GraphEdge {
  source: D3Node | number;
  target: D3Node | number;
}

export function GlobalGraph() {
  const graphAPI = useGraphAPI();
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载全局图谱数据
  useEffect(() => {
    const loadGlobalGraphData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await graphAPI.getGlobalGraph();
        console.log('📊 Loaded global graph data:', data);
        setGraphData(data);
      } catch (err) {
        console.error('❌ Failed to load global graph data:', err);
        setError('无法加载全局图谱数据');
      } finally {
        setLoading(false);
      }
    };

    loadGlobalGraphData();
  }, [graphAPI]);

  // 渲染 D3 力导向图
  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    let container = svg.select('.graph-container');
    
    // 清除之前的内容
    svg.selectAll('*').remove();
    
    // 重新创建容器并添加缩放和平移功能
    container = svg.append('g').attr('class', 'graph-container');
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
    
    svg.call(zoom);

    const width = 800;
    const height = 600;

    // 准备数据
    const nodes: D3Node[] = graphData.nodes.map(node => ({ ...node }));
    const links: D3Link[] = graphData.edges.map(edge => ({ 
      source: edge.from, 
      target: edge.to 
    }));
    
    // 创建力仿真
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => {
        if (d.group === 'tag') return 15;
        return 20;
      }));

    // 创建连线
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', 'var(--text-muted)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', (d: any) => {
        // 检查连线的两端是否有标签节点
        const sourceNode = nodes.find(n => n.id === d.source.id || n.id === d.source);
        const targetNode = nodes.find(n => n.id === d.target.id || n.id === d.target);
        
        // 如果有一端是标签节点，使用虚线
        if (sourceNode?.group === 'tag' || targetNode?.group === 'tag') {
          return '5,5'; // 虚线样式
        }
        return 'none'; // 实线
      });

    // 创建节点组
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // 添加节点圆圈
    node.append('circle')
      .attr('r', (d: D3Node) => {
        if (d.group === 'tag') return 8;
        // 根据连接数调整大小
        const connectionCount = d.value || 1;
        return Math.min(20, Math.max(8, connectionCount * 3));
      })
      .attr('fill', (d: D3Node) => {
        if (d.group === 'tag') return 'var(--color-accent)';
        return 'var(--interactive-accent)';
      })
      .attr('stroke', 'var(--background-primary)')
      .attr('stroke-width', 2)
      .on('click', function(event: MouseEvent, d: D3Node) {
        // 阻止事件冒泡
        event.stopPropagation();
        
        // 只有文件节点（非标签节点）才能跳转
        if (d.group !== 'tag' && d.path) {
          console.log(`📊 Navigating to file from global graph: ${d.path}`);
          navigateToFile(d.path);
        }
      });

    // 添加节点标签
    node.append('text')
      .text((d: D3Node) => {
        // 截断过长的标签
        const label = d.label;
        return label.length > 15 ? label.substring(0, 12) + '...' : label;
      })
      .attr('font-size', '10px')
      .attr('fill', 'var(--text-normal)')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('pointer-events', 'none');

    // 添加悬停提示
    node.append('title')
      .text((d: D3Node) => `${d.title || d.label}${d.value ? ` (${d.value} connections)` : ''}`);

    // 添加拖拽功能到节点组（不会干扰圆圈的点击事件）
    node.call(d3.drag<SVGGElement, D3Node>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

    // 更新位置
    simulation.on('tick', () => {
      // 添加边界约束，确保所有节点都在视口内
      nodes.forEach(d => {
        const radius = d.group === 'tag' ? 15 : 25; // 节点半径
        d.x = Math.max(radius, Math.min(width - radius, d.x!));
        d.y = Math.max(radius, Math.min(height - radius, d.y!));
      });

      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: D3Node) => `translate(${d.x},${d.y})`);
    });

    // 拖拽功能
    function dragstarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // 清理函数
    return () => {
      simulation.stop();
    };
  }, [graphData]);

  if (loading) {
    return (
      <div className="h-full p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-4 text-[var(--text-normal)]">
            Global Graph
          </div>
          <div className="text-[var(--text-muted)]">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-4 text-[var(--text-normal)]">
            Global Graph
          </div>
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="h-full p-8 flex items-center justify-center">
        <div className="text-center text-[var(--text-muted)]">
          <div className="text-lg font-medium mb-4 text-[var(--text-normal)]">
            Global Graph
          </div>
          <div className="text-2xl mb-2">🕸️</div>
          <div className="text-sm">没有找到任何图谱数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-8">
      <div className="text-lg font-medium mb-4 text-[var(--text-normal)]">
        Global Graph
      </div>
      
      <div className="text-sm text-[var(--text-muted)] mb-4">
        {graphData.nodes.length} 个节点, {graphData.edges.length} 条连接
      </div>
      
      <div className="border border-[var(--background-modifier-border)] rounded h-[calc(100%-80px)]">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          className="w-full h-full"
        >
          <g className="graph-container"></g>
        </svg>
      </div>
    </div>
  );
}