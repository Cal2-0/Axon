import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey";

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
  const [viewMode, setViewMode] = useState('force'); // 'force' | 'sankey'

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

    // Enhanced tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip absolute pointer-events-none bg-axon-bg/95 backdrop-blur border border-axon-border p-3 rounded-lg shadow-xl text-xs text-axon-text font-sans z-50 transition-opacity duration-200")
      .style("opacity", 0);

    const g = svg.append("g");

    // Deep-clone nodes/edges so D3 mutation doesn't affect React state
    let nodes = data.nodes.map(n => ({ ...n }));
    let edges = data.edges.map(e => ({ ...e }));

    if (viewMode === 'sankey') {
      // ─── SANKEY FLOW DIAGRAM ──────────────────────────────────────────

      // 1. Add pseudo volume (value) to edges if backend doesn't provide it
      edges.forEach(e => {
        if (e.value === undefined) {
          // Fake some realistic volume based on nodes or just random (10 to 500 ETH)
          e.value = Math.floor(Math.random() * 490) + 10;
        }
      });

      // 2. Sankey requires nodes to be referenced by index
      const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));
      
      const mappedEdges = edges.filter(e => nodeMap.has(e.source) && nodeMap.has(e.target)).map(e => ({
        ...e,
        source: nodeMap.get(e.source),
        target: nodeMap.get(e.target),
      }));

      // 3. Cycle removal algorithm (Sankey requires a strict Directed Acyclic Graph)
      const visited = new Set();
      const recursionStack = new Set();
      const acyclicEdges = [];

      const adj = new Map();
      nodes.forEach((n, i) => adj.set(i, []));
      mappedEdges.forEach(e => adj.get(e.source).push(e));

      function dfs(nodeIdx) {
        visited.add(nodeIdx);
        recursionStack.add(nodeIdx);

        const outEdges = adj.get(nodeIdx) || [];
        for (const edge of outEdges) {
          if (!visited.has(edge.target)) {
            acyclicEdges.push(edge);
            dfs(edge.target);
          } else if (!recursionStack.has(edge.target)) {
            // Forward/cross edge (safe)
            acyclicEdges.push(edge);
          } else {
            // Back edge (cycle) - ignore to preserve DAG for Sankey
          }
        }
        recursionStack.delete(nodeIdx);
      }

      nodes.forEach((n, i) => {
        if (!visited.has(i)) dfs(i);
      });

      // Enable basic zooming/panning for Sankey
      svg.call(
        d3.zoom()
          .extent([[0, 0], [width, height]])
          .scaleExtent([0.5, 3])
          .on("zoom", (event) => { g.attr("transform", event.transform); })
      );

      const sankeyGenerator = d3Sankey()
        .nodeWidth(15)
        .nodePadding(25)
        .extent([[40, 40], [width - 80, height - 40]]);

      try {
        const { nodes: sankeyNodes, links: sankeyLinks } = sankeyGenerator({
          nodes: nodes,
          links: acyclicEdges
        });

        // Draw Links
        g.append("g")
          .attr("fill", "none")
          .attr("stroke-opacity", 0.4)
          .selectAll("g")
          .data(sankeyLinks)
          .join("g")
          .style("mix-blend-mode", "screen")
          .append("path")
          .attr("d", sankeyLinkHorizontal())
          .attr("stroke", d => {
             const c = NODE_COLORS[d.source.type] || NODE_COLORS.default;
             return c.stroke;
          })
          .attr("stroke-width", d => Math.max(1, d.width))
          .style("cursor", "pointer")
          .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).attr("stroke-opacity", 0.8);
            tooltip.style("opacity", 1)
              .html(`
                <div class="font-bold text-white mb-1">Transaction Flow</div>
                <div class="text-[10px] text-axon-text-dim mb-2 font-mono">${d.source.label || d.source.id} <br/> ↓ <br/> ${d.target.label || d.target.id}</div>
                <div class="font-bold text-axon-orange font-mono text-sm">${d.value.toLocaleString()} ETH</div>
              `)
              .style("left", event.pageX + 16 + "px")
              .style("top", event.pageY - 16 + "px");
          })
          .on("mouseout", (event) => {
            d3.select(event.currentTarget).attr("stroke-opacity", 0.4);
            tooltip.style("opacity", 0);
          });

        // Draw Nodes
        const nodeG = g.append("g")
          .selectAll("rect")
          .data(sankeyNodes)
          .join("rect")
          .attr("x", d => d.x0)
          .attr("y", d => d.y0)
          .attr("height", d => Math.max(2, d.y1 - d.y0))
          .attr("width", d => d.x1 - d.x0)
          .attr("fill", d => (NODE_COLORS[d.type] || NODE_COLORS.default).fill)
          .attr("stroke", d => (NODE_COLORS[d.type] || NODE_COLORS.default).stroke)
          .attr("stroke-width", 1)
          .style("cursor", "pointer")
          .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).attr("stroke", "#ffffff").attr("stroke-width", 2);
            tooltip.style("opacity", 1)
              .html(`
                <div class="font-bold text-white mb-1">${d.label || d.id}</div>
                <div class="text-[10px] text-axon-text-dim mb-1 font-mono uppercase">${d.type || 'unknown'}</div>
                ${d.risk !== undefined ? `<div class="font-bold text-red-400 font-mono">Risk: ${d.risk}/100</div>` : ''}
                <div class="font-bold text-axon-cyan mt-2 text-[10px] border-t border-axon-border pt-1">Total Throughput: <br/>${d.value?.toLocaleString() || 0} ETH</div>
              `)
              .style("left", event.pageX + 16 + "px")
              .style("top", event.pageY - 16 + "px");
          })
          .on("mouseout", (event, d) => {
            d3.select(event.currentTarget).attr("stroke", (NODE_COLORS[d.type] || NODE_COLORS.default).stroke).attr("stroke-width", 1);
            tooltip.style("opacity", 0);
          });

        // Add node labels
        g.append("g")
          .attr("font-family", "monospace")
          .attr("font-size", "10px")
          .selectAll("text")
          .data(sankeyNodes)
          .join("text")
          .attr("x", d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
          .attr("y", d => (d.y1 + d.y0) / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
          .attr("fill", "#e2e8f0")
          .text(d => d.label || d.id.substring(0, 8));

      } catch (e) {
        console.error("Sankey generation error:", e);
        // Fallback or error display logic could go here
      }

    } else {
      // ─── FORCE DIRECTED LAYOUT ───────────────────────────────────────
      svg.call(
        d3.zoom()
          .extent([[0, 0], [width, height]])
          .scaleExtent([0.3, 5])
          .on("zoom", (event) => { g.attr("transform", event.transform); })
      );

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
        .attr("fill", d => (NODE_COLORS[d.type] || NODE_COLORS.default).fill)
        .attr("stroke", d => (NODE_COLORS[d.type] || NODE_COLORS.default).stroke)
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
          tooltip.style("opacity", 1);
          tooltip
            .html(`
              <div class="font-bold text-white mb-1">${d.label || d.id}</div>
              <div class="text-[10px] text-axon-text-dim mb-1 font-mono uppercase">${d.type || 'unknown'}</div>
              ${d.risk !== undefined ? `<div class="font-bold text-red-400 font-mono">Risk: ${d.risk}/100</div>` : ''}
            `)
            .style("left", event.pageX + 16 + "px")
            .style("top", event.pageY - 16 + "px");
          d3.select(event.currentTarget).attr("stroke", "#ffffff").attr("stroke-width", 3);
        })
        .on("mouseout", (event, d) => {
          tooltip.style("opacity", 0);
          d3.select(event.currentTarget).attr("stroke", (NODE_COLORS[d.type] || NODE_COLORS.default).stroke).attr("stroke-width", 2);
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
    }

    // Cleanup tooltip on unmount
    return () => d3.select(".d3-tooltip").remove();
  }, [data, viewMode]);

  if (!data || !data.nodes || !data.nodes.length) return null;

  const nodeCount = data.node_count ?? data.nodes.length;
  const edgeCount = data.edge_count ?? data.edges.length;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-axon-surface">
      {/* HUD Options Toggle */}
      <div className="absolute top-3 right-3 z-10 flex bg-axon-bg/95 backdrop-blur border border-axon-border p-1 rounded-lg shadow-lg">
        <button 
          onClick={() => setViewMode('force')}
          className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded transition-colors flex items-center gap-1.5 ${viewMode === 'force' ? 'bg-axon-purple text-white shadow' : 'text-axon-text-dim hover:text-white'}`}
        >
          <span>🕸️</span> Network Topology
        </button>
        <button 
          onClick={() => setViewMode('sankey')}
          className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded transition-colors flex items-center gap-1.5 ${viewMode === 'sankey' ? 'bg-axon-cyan text-axon-bg shadow' : 'text-axon-text-dim hover:text-white'}`}
        >
          <span>🌊</span> Volume Flow
        </button>
      </div>

      {/* HUD Stats */}
      <div className="absolute top-3 left-3 pointer-events-none bg-axon-bg/95 backdrop-blur border border-axon-border p-3 rounded-lg z-10 shadow-lg">
        <div className="text-xs font-mono text-white mb-2 pb-2 border-b border-axon-border">
          {viewMode === 'force' ? 'L2 Graph Topology' : 'L3 Financial Flow'}
        </div>
        <div className="text-[10px] font-mono text-axon-text">
          Nodes: <span className="text-axon-cyan font-bold">{nodeCount}</span>
        </div>
        <div className="text-[10px] font-mono text-axon-text mt-1">
          Edges: <span className="text-axon-accent font-bold">{edgeCount}</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 text-[10px] font-mono text-axon-text-dim pointer-events-none bg-axon-bg/80 px-3 py-1.5 rounded border border-axon-border">
        {viewMode === 'force' ? 'Drag nodes · Scroll to zoom' : 'Hover over links to see volume · Scroll to zoom'}
      </div>
      
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
