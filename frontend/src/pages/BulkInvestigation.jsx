import React, { useState, useEffect, useRef } from 'react';
import { bulkScan, API_BASE } from '../api/axon';
import { useNavigate } from 'react-router-dom';
import { downloadBulkPDF } from '../utils/pdfExport';
import * as d3 from 'd3';
import { 
  ShieldAlert, Activity, Zap, Users, Share2, Target, GitPullRequest, 
  BarChart2, FileText, AlertTriangle, Search, Info, Grid, List
} from 'lucide-react';

// D3 Force Graph Component
const RelationshipGraph = ({ data }) => {
  const d3Container = useRef(null);
  
  useEffect(() => {
    if (!data || !d3Container.current) return;
    
    // Clear previous
    d3.select(d3Container.current).selectAll("*").remove();
    
    // Build graph from results
    const nodes = new Map();
    const links = [];
    
    data.forEach(r => {
      const subjectAddr = r.address.toLowerCase();
      if (!nodes.has(subjectAddr)) {
        nodes.set(subjectAddr, {
          id: subjectAddr,
          label: r.data?.identity?.label || "Subject",
          group: "subject",
          risk: r.data?.risk?.score || 0
        });
      }
      
      const rNodes = r.data?.graph?.nodes || [];
      const rEdges = r.data?.graph?.edges || [];
      
      rNodes.forEach(n => {
        const nid = n.id.toLowerCase();
        if (!nodes.has(nid) && nid !== subjectAddr) {
          nodes.set(nid, {
            id: nid,
            label: n.label || "Entity",
            group: n.type || "wallet",
            risk: 0
          });
        }
      });
      
      rEdges.forEach(e => {
        links.push({
          source: e.source.toLowerCase(),
          target: e.target.toLowerCase()
        });
      });
    });
    
    const nodeData = Array.from(nodes.values());
    
    const width = d3Container.current.clientWidth || 800;
    const height = 600;
    
    const svg = d3.select(d3Container.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
      
    // Add zoom
    const zoom = d3.zoom().on("zoom", e => {
      g.attr("transform", e.transform);
    });
    svg.call(zoom);
    
    const g = svg.append("g");
    
    const simulation = d3.forceSimulation(nodeData)
      .force("link", d3.forceLink(links).id(d => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20));
      
    // Links
    const link = g.append("g")
      .attr("stroke", "#1e293b")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5);
      
    // Nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(nodeData)
      .join("circle")
      .attr("r", d => d.group === "subject" ? 12 : 6)
      .attr("fill", d => {
        if (d.group === "subject") {
          return d.risk >= 80 ? "#ef4444" : d.risk >= 60 ? "#f97316" : d.risk >= 40 ? "#eab308" : "#22c55e";
        }
        if (d.group === "exchange") return "#3b82f6";
        if (d.group === "mixer") return "#a855f7";
        if (d.group === "contract") return "#64748b";
        return "#475569";
      })
      .attr("stroke", "#0f1423")
      .attr("stroke-width", 2)
      .call(drag(simulation));
      
    node.append("title").text(d => `${d.label} (${d.id})`);
    
    simulation.on("tick", () => {
      link
        .attr("x1", d => Math.max(20, Math.min(width - 20, d.source.x)))
        .attr("y1", d => Math.max(20, Math.min(height - 20, d.source.y)))
        .attr("x2", d => Math.max(20, Math.min(width - 20, d.target.x)))
        .attr("y2", d => Math.max(20, Math.min(height - 20, d.target.y)));
        
      node
        .attr("cx", d => Math.max(20, Math.min(width - 20, d.x)))
        .attr("cy", d => Math.max(20, Math.min(height - 20, d.y)));
    });
    
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }
  }, [data]);

  return <div ref={d3Container} className="w-full bg-[#05080f] rounded-xl border border-axon-border/50 shadow-inner overflow-hidden" />;
};

export default function BulkInvestigation({ caseId }) {
  const [inputData, setInputData] = useState('');
  const [inputCaseId, setInputCaseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [reportHash, setReportHash] = useState(null);
  const [activeTab, setActiveTab] = useState('targets');
  const [failedChainNames, setFailedChainNames] = useState({});
  const navigate = useNavigate();

  const handleScan = async (e) => {
    e.preventDefault();
    
    const addressRegex = /\b(0x[a-fA-F0-9]{40}|[a-zA-Z0-9]{25,65})\b/g;
    let addresses = inputData.match(addressRegex) || [];
    
    const uniqueMap = new Map();
    addresses.forEach(addr => {
      if (!uniqueMap.has(addr.toLowerCase())) {
        uniqueMap.set(addr.toLowerCase(), addr);
      }
    });
    addresses = Array.from(uniqueMap.values());

    if (addresses.length === 0) {
      alert("No valid addresses found.");
      return;
    }

    setLoading(true);
    setReport(null);
    setActiveTab('targets');

    try {
      const targetCaseId = caseId || (inputCaseId ? parseInt(inputCaseId) : null);
      const result = await bulkScan(addresses, targetCaseId);
      setReport(result);
      
      if (result.errors && result.errors.length > 0) {
        const { analyzeAddressFormat } = await import('../api/axon');
        const names = {};
        for (const err of result.errors) {
          try {
            const info = await analyzeAddressFormat(err.address);
            names[err.address] = info?.family || info?.candidates?.[0]?.chain || 'Unrecognized';
          } catch(e) {
            names[err.address] = 'Data Not Available';
          }
        }
        setFailedChainNames(names);
      }
      
      if (result.report_metadata && result.report_metadata.sha256_hash) {
        setReportHash(result.report_metadata.sha256_hash);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to run bulk scan.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto pt-20 flex flex-col items-center justify-center animate-pulse">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <svg className="w-10 h-10 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </div>
        <div className="text-blue-400 text-2xl mb-3 font-bold tracking-widest uppercase">Executing Investigation</div>
        <p className="text-gray-400 text-sm max-w-md mx-auto text-center font-mono">
          Correlating entities, deriving behavioral clusters, and building relationship matrices.
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20 pt-8">
        <div className="border-b border-[#1e293b]/60 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase mb-4">
            <LayersIcon className="w-4 h-4" /> Mass Target Acquisition
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">Investigation Dashboard</h1>
          <p className="text-gray-400 text-base max-w-2xl mx-auto leading-relaxed">
            Submit up to 100 targets simultaneously. AXON will generate relationship graphs, behavioral clusters, and prioritize threats deterministically.
          </p>
        </div>

        <form onSubmit={handleScan} className="bg-[#090b14] border border-[#1e293b]/60 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-900/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                Target Roster
              </label>
              
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setInputData("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\n0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe\n0xC8a65Fadf0e0dDAf421F28FEAb69Bf6E2E589963")}
                  className="px-3 py-1.5 bg-white/5 text-gray-300 hover:text-white text-xs font-bold border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                >
                  Load Demo Targets
                </button>
              </div>
            </div>

            <textarea
              className="w-full bg-[#05080f] border border-[#1e293b] rounded-2xl p-6 text-blue-300 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-y min-h-[250px] shadow-inner"
              placeholder="Paste wallet addresses or raw text...\n\nRegex extraction is automatic."
              value={inputData}
              onChange={e => setInputData(e.target.value)}
              spellCheck="false"
            />
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-400 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Extracted: {new Set(inputData.match(/\b(0x[a-fA-F0-9]{40}|[a-zA-Z0-9]{25,65})\b/g) || []).size} Valid Targets
              </div>
              <input
                type="number"
                className="w-48 bg-[#05080f] border border-[#1e293b] rounded-xl p-2.5 text-white font-mono text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                placeholder="Case ID (Optional)"
                value={inputCaseId}
                onChange={e => setInputCaseId(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={!inputData.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Execute Investigation
            </button>
          </div>
        </form>
      </div>
    );
  }

  const { intelligence, summary, results, errors } = report;
  const isRed = summary.CRITICAL > 0;
  const isOrange = summary.HIGH > 0;
  const accentColor = isRed ? 'red' : isOrange ? 'orange' : 'blue';

  const TABS = [
    { id: 'targets', icon: <List className="w-4 h-4"/>, label: 'Target Grid' },
    { id: 'summary', icon: <Activity className="w-4 h-4"/>, label: 'Investigation Summary' },
    { id: 'priority', icon: <AlertTriangle className="w-4 h-4"/>, label: 'Priority Queue' },
    { id: 'graph', icon: <Share2 className="w-4 h-4"/>, label: 'Relationship Graph' },
    { id: 'findings', icon: <FileText className="w-4 h-4"/>, label: 'Key Findings' },
    { id: 'clusters', icon: <Users className="w-4 h-4"/>, label: 'Groups & Clusters' },
    { id: 'similarity', icon: <GitPullRequest className="w-4 h-4"/>, label: 'Similarity Matrix' },
    { id: 'timeline', icon: <BarChart2 className="w-4 h-4"/>, label: 'Merged Timeline' },
    { id: 'heatmap', icon: <Grid className="w-4 h-4"/>, label: 'Entity Heatmap' }
  ];

  return (
    <div className="max-w-[95%] mx-auto pb-20 pt-6 animate-fade-in">
      
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-[10px] font-bold uppercase tracking-widest mb-3">
            <Target className="w-3 h-3" /> Batch {report.bulk_batch_id.split('-')[0]}
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Investigation Dashboard
          </h1>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setReport(null)} className="px-4 py-2 bg-[#1e293b] hover:bg-gray-700 text-white rounded-lg text-xs font-bold transition-all shadow-md">
            New Batch
          </button>
          <button onClick={() => downloadBulkPDF(report, true)} className="px-4 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-md mr-2">
            Download HTML Dossier
          </button>
          <button onClick={() => {
            if (report?.report_metadata?.report_id) {
              window.open(`${API_BASE}/scan/report/${report.report_metadata.report_id}/pdf`, "_blank");
            } else {
              alert("Report ID not available for this batch.");
            }
          }} className="px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-md">
            Export Master PDF
          </button>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <div className="bg-[#0f1423] border border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Tab Navigation */}
        <div className="flex overflow-x-auto bg-[#090b14] border-b border-[#1e293b] p-2 hide-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? `bg-${accentColor}-600/20 text-${accentColor}-400 border border-${accentColor}-500/30` 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e293b]/50 border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="p-6 md:p-8 min-h-[600px]">
          
                    {/* TAB 0: TARGET GRID */}
          {activeTab === 'targets' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Submitted Targets</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((target, idx) => {
                  const riskScore = target.data?.risk?.score || 0;
                  const riskColor = riskScore >= 80 ? 'red' : riskScore >= 60 ? 'orange' : riskScore >= 40 ? 'yellow' : 'green';
                  const entityType = target.entity_type || (target.data?.type === 'contract' ? 'contract' : 'wallet');
                  const defaultLabel = entityType === 'contract' ? "Unlabeled Contract" : "Unlabeled Wallet";
                  const label = target.data?.identity?.label || defaultLabel;
                  
                  // For the coin chip, checking if it failed in formatting or using default ETH
                  const coinName = failedChainNames[target.address] || 'Ethereum (ETH)';
                  
                  const colorMap = {
                    red: "hover:border-red-500/50 bg-red-500/10 text-red-500 border-red-500/20",
                    orange: "hover:border-orange-500/50 bg-orange-500/10 text-orange-500 border-orange-500/20",
                    yellow: "hover:border-yellow-500/50 bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                    green: "hover:border-green-500/50 bg-green-500/10 text-green-500 border-green-500/20",
                  };
                  
                  const cClasses = colorMap[riskColor];
                  const hoverBorder = cClasses.split(" ")[0];
                  const pillClasses = cClasses.split(" ").slice(1).join(" ");
                  
                  return (
                    <div key={idx} className={`bg-[#05080f] border border-[#1e293b] rounded-xl p-5 ${hoverBorder} transition-colors shadow-lg flex flex-col justify-between h-full`}>
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-mono text-[#38bdf8] text-sm break-all">{target.address.slice(0,12)}...{target.address.slice(-6)}</div>
                          <div className={`px-2 py-1 rounded text-xs font-bold font-mono border ${pillClasses}`}>
                            {riskScore}/100
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-300 font-semibold mb-1 truncate">{label}</div>
                        
                        <div className="flex gap-2 mt-2 mb-4">
                          <div className="inline-block px-2 py-1 bg-[#1e293b]/50 border border-[#334155] rounded text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                            {coinName}
                          </div>
                          <div className={`inline-block px-2 py-1 bg-[#1e293b]/50 border rounded text-[10px] font-mono uppercase tracking-widest ${entityType === 'contract' ? 'text-purple-400 border-purple-500/30' : 'text-[#22d3ee] border-[#22d3ee]/30'}`}>
                            {entityType}
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          const route = `/wallet?address=${target.address}${report.case_id ? `&case_id=${report.case_id}` : ''}`;
                          navigate(route);
                        }}
                        className="w-full py-2.5 bg-[#1e293b] hover:bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                      >
                        <Search className="w-4 h-4"/> Deep Analyze
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

{/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-8 animate-fade-in">
              <div className={`p-6 rounded-2xl border ${isRed ? 'bg-red-900/10 border-red-500/30' : isOrange ? 'bg-orange-900/10 border-orange-500/30' : 'bg-blue-900/10 border-blue-500/30'} flex items-start gap-4 shadow-lg`}>
                <div className={`p-3 rounded-xl ${isRed ? 'bg-red-500/20 text-red-500' : isOrange ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'}`}>
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold mb-1 ${isRed ? 'text-red-400' : isOrange ? 'text-orange-400' : 'text-blue-400'}`}>
                    {isRed ? "Critical Threats Identified" : isOrange ? "Elevated Risk Detected" : "Routine Batch Profile"}
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm">
                    {intelligence.statistics.total_entities} targets analyzed. {summary.CRITICAL} critical, {summary.HIGH} high risk. 
                    {intelligence.statistics.mixer_count > 0 && ` ${intelligence.statistics.mixer_count} targets show mixer exposure.`}
                    {intelligence.statistics.sanctioned > 0 && ` ${intelligence.statistics.sanctioned} sanctioned entities detected.`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Critical", val: summary.CRITICAL, col: "red" },
                  { label: "High", val: summary.HIGH, col: "orange" },
                  { label: "Medium", val: summary.MEDIUM, col: "yellow" },
                  { label: "Low", val: summary.LOW, col: "green" }
                ].map((s, i) => (
                  <div key={i} className={`bg-[#05080f] rounded-2xl border border-${s.col}-500/20 p-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]`}>
                    <div className={`text-5xl font-bold font-mono text-${s.col}-500 mb-2`}>{s.val || 0}</div>
                    <div className={`text-xs font-bold uppercase tracking-widest text-${s.col}-500/70`}>{s.label} Risk</div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#05080f] border border-[#1e293b] rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4">Chain Breakdown</h3>
                  <div className="space-y-3">
                    {Object.entries(intelligence.chain_breakdown || {}).map(([chain, count]) => (
                      <div key={chain} className="flex justify-between items-center bg-[#090b14] p-3 rounded-lg border border-[#1e293b]/50">
                        <span className="text-sm text-gray-300 capitalize">{chain}</span>
                        <span className="font-mono text-blue-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#05080f] border border-[#1e293b] rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4">Batch Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#090b14] p-3 rounded-lg border border-[#1e293b]/50">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">Avg Risk</div>
                      <div className="text-lg font-mono text-white">{intelligence.statistics.avg_risk}</div>
                    </div>
                    <div className="bg-[#090b14] p-3 rounded-lg border border-[#1e293b]/50">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">Total Volume</div>
                      <div className="text-lg font-mono text-white">{intelligence.statistics.total_volume_usd}</div>
                    </div>
                    <div className="bg-[#090b14] p-3 rounded-lg border border-[#1e293b]/50">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">Exchange Contacts</div>
                      <div className="text-lg font-mono text-white">{intelligence.statistics.exchange_count}</div>
                    </div>
                    <div className="bg-[#090b14] p-3 rounded-lg border border-[#1e293b]/50">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">Threat Matches</div>
                      <div className="text-lg font-mono text-white">{intelligence.statistics.threat_db_matches}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRIORITY QUEUE */}
          {activeTab === 'priority' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-white mb-6">Investigative Priority Queue</h2>
              <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#05080f] text-gray-400 font-mono text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="p-4 py-3">Priority</th>
                      <th className="p-4 py-3">Target</th>
                      <th className="p-4 py-3">Risk</th>
                      <th className="p-4 py-3">Key Reason</th>
                      <th className="p-4 py-3 text-right">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {intelligence.priority_queue.map((item, i) => (
                      <tr key={i} className="bg-[#090b14] hover:bg-[#13192b] transition-colors group cursor-pointer" onClick={() => navigate(`/wallet?address=${item.address}`)}>
                        <td className="p-4 text-yellow-500 text-lg tracking-tighter">
                          {'★'.repeat(item.priority)}{'☆'.repeat(5 - item.priority)}
                        </td>
                        <td className="p-4">
                          <div className="font-mono text-blue-400 mb-1">{item.address.slice(0,10)}...{item.address.slice(-4)}</div>
                          <div className="text-xs text-gray-400">{item.label}</div>
                        </td>
                        <td className="p-4 font-mono">
                          <span className={`px-2 py-1 rounded text-xs ${item.risk_score >= 80 ? 'bg-red-500/10 text-red-400' : item.risk_score >= 60 ? 'bg-orange-500/10 text-orange-400' : 'bg-gray-800 text-gray-300'}`}>
                            {item.risk_score}
                          </span>
                        </td>
                        <td className="p-4 text-gray-300 text-xs max-w-xs">{item.reason}</td>
                        <td className="p-4 text-right">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                            item.action === 'Immediate' ? 'bg-red-600 border-red-500 text-white' :
                            item.action === 'Escalate' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' :
                            item.action === 'Review' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' :
                            'bg-gray-800 border-gray-700 text-gray-400'
                          }`}>
                            {item.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: RELATIONSHIP GRAPH */}
          {activeTab === 'graph' && (
            <div className="animate-fade-in h-full">
               <h2 className="text-xl font-bold text-white mb-4">Topology & Shared Counterparties</h2>
               <div className="text-sm text-gray-400 mb-6">Visualizing direct interactions and 1-hop intersections between targets.</div>
               <RelationshipGraph data={results} />
               <div className="flex gap-4 mt-4 justify-center">
                 <div className="flex items-center gap-2 text-xs text-gray-400"><span className="w-3 h-3 rounded-full bg-red-500"></span> Critical Target</div>
                 <div className="flex items-center gap-2 text-xs text-gray-400"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Exchange</div>
                 <div className="flex items-center gap-2 text-xs text-gray-400"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Mixer</div>
                 <div className="flex items-center gap-2 text-xs text-gray-400"><span className="w-3 h-3 rounded-full bg-gray-500"></span> Contract</div>
               </div>
            </div>
          )}

          {/* TAB 4: KEY FINDINGS & RECOMMENDATIONS */}
          {activeTab === 'findings' && (
            <div className="animate-fade-in grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Zap className="text-blue-400 w-5 h-5"/> Automated Findings</h2>
                <div className="space-y-4">
                  {intelligence.key_findings.map((f, i) => (
                    <div key={i} className="bg-[#05080f] border border-[#1e293b]/60 rounded-xl p-5 flex gap-4">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-blue-900/30 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20">{i+1}</div>
                      <p className="text-gray-300 text-sm leading-relaxed">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Target className="text-purple-400 w-5 h-5"/> Investigative Leads</h2>
                <div className="space-y-4">
                  {intelligence.recommendations.map((r, i) => (
                    <div key={i} className="bg-[#05080f] border border-[#1e293b]/60 rounded-xl p-5 border-l-4 border-l-purple-500">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-white">{r.target_label}</div>
                        <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold uppercase tracking-widest">{r.action}</span>
                      </div>
                      <p className="text-gray-400 text-sm">{r.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLUSTERS */}
          {activeTab === 'clusters' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-white mb-6">Behavioral Target Clusters</h2>
              <div className="grid lg:grid-cols-2 gap-6">
                {intelligence.clusters.map((c, i) => (
                  <div key={i} className="bg-[#05080f] border border-[#1e293b] rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4 border-b border-[#1e293b] pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded bg-blue-600 text-white font-bold text-xs flex items-center justify-center">{c.id}</span>
                          <h3 className="text-lg font-bold text-white">{c.label}</h3>
                        </div>
                        <div className="text-xs text-gray-400">{c.reason}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-blue-400">{c.count}</div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-500">Entities</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {c.wallets.slice(0, 5).map((w, j) => {
                        const target = results.find(r => r.address === w);
                        return (
                          <div key={j} className="flex justify-between items-center p-2 rounded-lg bg-[#090b14] border border-white/5 cursor-pointer hover:border-blue-500/30" onClick={() => navigate(`/wallet?address=${w}`)}>
                            <div className="font-mono text-xs text-gray-300">{w.slice(0,10)}...{w.slice(-4)}</div>
                            <div className="text-xs text-gray-500">{target?.data?.identity?.label || "Unknown"}</div>
                          </div>
                        )
                      })}
                      {c.count > 5 && <div className="text-xs text-center text-gray-500 pt-2">+ {c.count - 5} more entities</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: SIMILARITY */}
          {activeTab === 'similarity' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-white mb-6">Counterparty Overlap Matrix</h2>
              {intelligence.similarity_matrix.length === 0 ? (
                <div className="p-10 text-center bg-[#05080f] rounded-2xl border border-[#1e293b]">
                  <p className="text-gray-400">No significant similarity patterns detected between targets.</p>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-4">
                  {intelligence.similarity_matrix.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#05080f] border border-[#1e293b]/60 rounded-xl p-5 hover:border-blue-500/30 transition-colors">
                      <div className="flex-1">
                        <div className="flex flex-col gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="font-mono text-xs text-gray-300">{s.wallet_a.slice(0,8)}...</span>
                            <span className="text-xs text-gray-500 truncate max-w-[120px]">{s.label_a}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span className="font-mono text-xs text-gray-300">{s.wallet_b.slice(0,8)}...</span>
                            <span className="text-xs text-gray-500 truncate max-w-[120px]">{s.label_b}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">{s.classification} • {s.shared_count} Shared Counterparties</div>
                      </div>
                      <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-full border-4 border-[#090b14] bg-[#1e293b]/50">
                        <div className="text-sm font-bold text-white">{Math.round(s.score * 100)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="animate-fade-in relative">
              <h2 className="text-xl font-bold text-white mb-6">Merged Chronology</h2>
              <div className="absolute left-4 top-16 bottom-0 w-0.5 bg-[#1e293b]"></div>
              <div className="space-y-4 pl-10">
                {intelligence.merged_timeline.slice(0, 100).map((t, i) => (
                  <div key={i} className="relative bg-[#05080f] border border-[#1e293b] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="absolute -left-10 w-3 h-3 rounded-full bg-blue-500 border-[3px] border-[#0f1423]"></div>
                    <div>
                      <div className="text-xs font-mono text-gray-400 mb-1">{new Date(t.timestamp * 1000).toLocaleString()}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'inflow' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{t.type}</span>
                        <span className="font-mono text-xs text-white">{t.value_eth} {t.chain === 'bitcoin' ? 'BTC' : t.chain === 'solana' ? 'SOL' : t.chain === 'tron' ? 'TRX' : 'ETH'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-300 font-mono">Target: <span className="text-blue-400">{t.address.slice(0,8)}...</span></div>
                      <div className="text-[10px] text-gray-500">Counterparty: {t.counterparty.slice(0,12)}...</div>
                    </div>
                  </div>
                ))}
                {intelligence.merged_timeline.length > 100 && (
                   <div className="text-center text-xs text-gray-500 italic py-4">Timeline truncated to latest 100 events for performance.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: HEATMAP */}
          {activeTab === 'heatmap' && (
            <div className="animate-fade-in overflow-x-auto">
              <h2 className="text-xl font-bold text-white mb-6">Entity Attribute Heatmap</h2>
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#05080f] text-gray-400 uppercase tracking-widest font-mono">
                  <tr>
                    <th className="p-3">Target</th>
                    <th className="p-3">Risk</th>
                    <th className="p-3">Tx Vol</th>
                    <th className="p-3">Value (USD)</th>
                    <th className="p-3">Counterparties</th>
                    <th className="p-3 text-center">Exchange</th>
                    <th className="p-3 text-center">Mixer</th>
                    <th className="p-3 text-center">Threat DB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {intelligence.heatmap_data.map((h, i) => {
                    const rCol = h.risk >= 80 ? 'bg-red-500/20 text-red-400' : h.risk >= 60 ? 'bg-orange-500/20 text-orange-400' : h.risk >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400';
                    return (
                      <tr key={i} className="hover:bg-[#1e293b]/30">
                        <td className="p-3 font-mono text-blue-400">{h.address.slice(0,10)}...</td>
                        <td className="p-3 font-mono"><span className={`px-2 py-1 rounded ${rCol}`}>{h.risk}</span></td>
                        <td className="p-3 font-mono text-gray-300">{h.tx_count}</td>
                        <td className="p-3 font-mono text-gray-300">{h.volume_usd > 0 ? `$${h.volume_usd.toLocaleString()}` : '-'}</td>
                        <td className="p-3 font-mono text-gray-300">{h.counterparties}</td>
                        <td className="p-3 text-center">{h.exchange ? <span className="text-blue-400">●</span> : <span className="text-gray-700">-</span>}</td>
                        <td className="p-3 text-center">{h.mixer ? <span className="text-purple-400">●</span> : <span className="text-gray-700">-</span>}</td>
                        <td className="p-3 text-center">{h.threat_db ? <span className="text-red-500">●</span> : <span className="text-gray-700">-</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const LayersIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);
