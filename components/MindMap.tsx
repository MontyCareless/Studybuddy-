import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { KnowledgeNode } from '../types';

interface MindMapProps {
  data: KnowledgeNode | null;
  currentProcessId?: string;
}

const MindMap: React.FC<MindMapProps> = ({ data, currentProcessId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(40,${height / 2})`);

    const root = d3.hierarchy(data);
    const treeLayout = d3.tree<KnowledgeNode>().size([height - 100, width - 200]);

    treeLayout(root);

    // Links
    svg.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any
      )
      .attr('fill', 'none')
      .attr('stroke', '#475569')
      .attr('stroke-width', 2);

    // Nodes
    const node = svg.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', (d: any) => `node ${d.data.id === currentProcessId ? 'active' : ''}`)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`);

    node.append('circle')
      .attr('r', 6)
      .attr('fill', (d: any) => d.data.id === currentProcessId ? '#38bdf8' : (d.data.completed ? '#4ade80' : '#94a3b8'))
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2);

    node.append('text')
      .attr("dy", "0.31em")
      .attr("x", (d: any) => d.children ? -10 : 10)
      .attr("text-anchor", (d: any) => d.children ? "end" : "start")
      .text((d: any) => d.data.name)
      .style("font-size", "12px")
      .style("fill", "#e2e8f0")
      .clone(true).lower()
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 3);

  }, [data, currentProcessId]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-slate-900/50 rounded-lg border border-slate-700">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default MindMap;