
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useGraphAPI } from '../../hooks/useAPIs';
import { useVaultStore } from '../../stores/vaultStore';
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

export function LocalGraph() {
  const graphAPI = useGraphAPI();
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeFile } = useVaultStore();

  // 加载当前文件的本地图谱数据
  useEffect(() => {
    const loadLocalGraphData = async () => {
      if (!activeFile) {
        setGraphData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await graphAPI.getLocalGraph(activeFile);
        console.log('📊 Loaded local graph data for', activeFile, ':', data);
        setGraphData(data);
      } catch (err) {
        console.error('❌ Failed to load local graph data:', err);
        setError('无法加载本地图谱数据');
      } finally {
        setLoading(false);
      }
    };

    loadLocalGraphData();
  }, [graphAPI, activeFile]);

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

    const width = 400;
    const height = 300;

    // 准备数据
    const nodes: D3Node[] = graphData.nodes.map(node => ({ ...node }));
    const links: D3Link[] = graphData.edges.map(edge => ({ 
      source: edge.from, 
      target: edge.to 
    }));
    
    // 找到当前文件对应的节点（应该是中心节点）
    const currentFileNode = activeFile ? nodes.find(node => 
      node.title === activeFile.replace('.md', '') || 
      node.title === activeFile
    ) : null;

    // 如果有当前文件节点，将其固定在中心
    if (currentFileNode) {
      currentFileNode.fx = width / 2;
      currentFileNode.fy = height / 2;
    }
    
    // 创建力仿真
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => {
        if (d.group === 'tag') return 15;
        if (currentFileNode && d.id === currentFileNode.id) return 30;
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
        // 当前文件节点更大
        if (currentFileNode && d.id === currentFileNode.id) return 20;
        return 12;
      })
      .attr('fill', (d: D3Node) => {
        if (d.group === 'tag') return 'var(--color-accent)';
        // 当前文件节点使用特殊颜色
        if (currentFileNode && d.id === currentFileNode.id) return 'var(--color-orange)';
        return 'var(--interactive-accent)';
      })
      .attr('stroke', 'var(--background-primary)')
      .attr('stroke-width', (d: D3Node) => {
        // 当前文件节点边框更粗
        if (currentFileNode && d.id === currentFileNode.id) return 3;
        return 2;
      })
      .on('click', function(event: MouseEvent, d: D3Node) {
        // 阻止事件冒泡
        event.stopPropagation();
        
        // 只有文件节点（非标签节点）才能跳转，且不是当前文件
        if (d.group !== 'tag' && d.path && (!currentFileNode || d.id !== currentFileNode.id)) {
          console.log(`📊 Navigating to file from local graph: ${d.path}`);
          navigateToFile(d.path);
        }
      });

    // 添加节点标签
    node.append('text')
      .text((d: D3Node) => d.label)
      .attr('font-size', '10px')
      .attr('fill', 'var(--text-normal)')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('pointer-events', 'none');

    // 添加悬停提示
    node.append('title')
      .text((d: D3Node) => d.title || d.label);

    // 添加拖拽功能到节点组（不会干扰圆圈的点击事件）
    node.call(d3.drag<SVGGElement, D3Node>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

    // 更新位置
    simulation.on('tick', () => {
      // 添加边界约束，确保所有节点都在视口内
      nodes.forEach(d => {
        const radius = d.group === 'tag' ? 15 : (currentFileNode && d.id === currentFileNode.id ? 25 : 20); // 节点半径
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
      // 如果是当前文件节点，不允许拖拽离开中心
      if (currentFileNode && event.subject.id === currentFileNode.id) {
        return;
      }
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      // 如果是当前文件节点，保持在中心
      if (currentFileNode && event.subject.id === currentFileNode.id) {
        event.subject.fx = width / 2;
        event.subject.fy = height / 2;
        return;
      }
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      if (!event.active) simulation.alphaTarget(0);
      // 如果是当前文件节点，保持固定在中心
      if (currentFileNode && event.subject.id === currentFileNode.id) {
        event.subject.fx = width / 2;
        event.subject.fy = height / 2;
        return;
      }
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
      <div className="h-full p-4">
        <div className="text-sm font-medium mb-4 text-[var(--text-normal)]">
          Local Graph
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-[var(--text-muted)]">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-4">
        <div className="text-sm font-medium mb-4 text-[var(--text-normal)]">
          Local Graph
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!activeFile) {
    return (
      <div className="h-full p-4">
        <div className="text-sm font-medium mb-4 text-[var(--text-normal)]">
          Local Graph
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-center text-[var(--text-muted)]">
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm">选择一个文件查看本地图谱</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      <div className="text-sm font-medium mb-4 text-[var(--text-normal)]">
        Local Graph
      </div>
      
      {graphData && (
        <div className="text-xs text-[var(--text-muted)] mb-2">
          {graphData.nodes.length} 个节点, {graphData.edges.length} 条连接
        </div>
      )}
      
      <div className="border border-[var(--background-modifier-border)] rounded">
        <svg
          ref={svgRef}
          width="400"
          height="300"
          viewBox="0 0 400 300"
          className="w-full h-full"
        >
          <g className="graph-container"></g>
        </svg>
      </div>
    </div>
  );
}