import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

// Node color by type
const NODE_COLORS = {
  hacker:   { fill: '#ef4444', stroke: '#fca5a5' }, // red
  mixer:    { fill: '#a855f7', stroke: '#d8b4fe' }, // purple
  exchange: { fill: '#3b82f6', stroke: '#93c5fd' }, // blue
  suspect:  { fill: '#f97316', stroke: '#fdba74' }, // orange
  victim:   { fill: '#22d3ee', stroke: '#a5f3fc' }, // cyan
  default:  { fill: '#1e293b', stroke: '#22d3ee' }, // dark
};

export default function GraphView({ data }) {
  const svgRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (!data || !data.nodes || !data.nodes.length) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    d3.select(svgRef.current).selectAll("*").remove();
    d3.select(".d3-tooltip").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height]);

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip")
      .style("opacity", 0);

    const g = svg.append("g");

    svg.call(
      d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.3, 5])
        .on("zoom", (event) => { g.attr("transform", event.transform); })
    );

    // Deep-clone nodes/edges so D3 mutation doesn't affect React state
    const nodes = data.nodes.map(n => ({ ...n }));
    const edges = data.edges.map(e => ({ ...e }));

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id(d => d.id).distance(130))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(28));

    // Draw edges
    const link = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke", "#334155")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.7)
      .attr("marker-end", "url(#arrow)");

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18).attr("refY", 0)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#334155");

    // Node groups
    const nodeGroup = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .call(
        d3.drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    // Circles
    nodeGroup
      .append("circle")
      .attr("r", d => d.is_seed ? 18 : 13)
      .attr("fill", d => {
        const c = NODE_COLORS[d.type] || NODE_COLORS.default;
        return c.fill;
      })
      .attr("stroke", d => {
        const c = NODE_COLORS[d.type] || NODE_COLORS.default;
        return c.stroke;
      })
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(150).style("opacity", 0.95);
        tooltip
          .html(`<strong>${d.label || d.id}</strong><br/>
            ${d.type ? `Type: <span style="color:#22d3ee">${d.type}</span><br/>` : ''}
            ${d.risk !== undefined ? `Risk: <span style="color:#f97316">${d.risk}/100</span>` : ''}
          `)
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 32 + "px");
        d3.select(event.currentTarget)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 3);
      })
      .on("mouseout", (event, d) => {
        tooltip.transition().duration(300).style("opacity", 0);
        const c = NODE_COLORS[d.type] || NODE_COLORS.default;
        d3.select(event.currentTarget)
          .attr("stroke", c.stroke)
          .attr("stroke-width", 2);
      });

    // Labels
    nodeGroup
      .append("text")
      .attr("dy", "2.4em")
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .attr("fill", "#94a3b8")
      .text(d => d.label || d.id.slice(0, 10));

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // HUD stats from either format
    const nodeCount = data.node_count ?? data.nodes.length;
    const edgeCount = data.edge_count ?? data.edges.length;

    return () => d3.select(".d3-tooltip").remove();
  }, [data]);

  if (!data || !data.nodes || !data.nodes.length) return null;

  const nodeCount = data.node_count ?? data.nodes.length;
  const edgeCount = data.edge_count ?? data.edges.length;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* HUD */}
      <div className="absolute top-3 left-3 pointer-events-none bg-axon-bg/90 backdrop-blur border border-axon-border p-2.5 rounded-lg z-10">
        <div className="text-xs font-mono text-axon-text">
          Nodes: <span className="text-axon-cyan font-bold">{nodeCount}</span>
        </div>
        <div className="text-xs font-mono text-axon-text mt-0.5">
          Edges: <span className="text-axon-accent font-bold">{edgeCount}</span>
        </div>
        {data.seed && (
          <div className="text-[10px] text-axon-text-dim mt-1.5 max-w-[160px] break-all">
            Seed: {data.seed}
          </div>
        )}
      </div>
      <div className="absolute bottom-3 right-3 text-[10px] font-mono text-axon-text-dim pointer-events-none">
        Drag nodes · Scroll to zoom
      </div>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
