import React, { useState } from 'react';
import { bulkScan } from '../api/axon';
import { useNavigate } from 'react-router-dom';

export default function BulkInvestigation({ caseId }) {
  const [inputData, setInputData] = useState('');
  const [inputCaseId, setInputCaseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const navigate = useNavigate();

  const handleScan = async (e) => {
    e.preventDefault();
    
    // Regex to match 0x followed by 40 hex characters
    const addressRegex = /0x[a-fA-F0-9]{40}/g;
    let addresses = inputData.match(addressRegex) || [];
    
    // Remove duplicates and normalize
    addresses = [...new Set(addresses)].map(a => a.toLowerCase());

    if (addresses.length === 0) {
      alert("No valid Ethereum addresses found. Ensure addresses start with 0x and are 42 characters long.");
      return;
    }

    setLoading(true);
    setReport(null);
    setExpandedRow(null);

    try {
      const targetCaseId = caseId || (inputCaseId ? parseInt(inputCaseId) : null);
      const result = await bulkScan(addresses, targetCaseId);
      setReport(result);
    } catch (err) {
      console.error(err);
      alert("Failed to run bulk scan.");
    } finally {
      setLoading(false);
    }
  };

  const getConsensusMessage = () => {
    if (!report || !report.summary) return "";
    const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0 } = report.summary;
    const total = CRITICAL + HIGH + MEDIUM + LOW;
    if (CRITICAL > 0) {
      return `FORENSIC CONSENSUS: ${CRITICAL} critical threats identified out of ${total} subjects. Immediate isolation and manual review strongly recommended for high-risk assets.`;
    } else if (HIGH > 0) {
      return `FORENSIC CONSENSUS: Elevated risk detected. ${HIGH} subjects show suspicious behavioral patterns. Proceed with caution and monitor closely.`;
    } else if (MEDIUM > 0) {
      return `FORENSIC CONSENSUS: Moderate risk profile. Some subjects exhibit anomalous but non-critical behaviors.`;
    }
    return `FORENSIC CONSENSUS: Low risk profile. No immediate threats or sanctions exposure detected in the scanned batch.`;
  };

  const sortedResults = report?.results 
    ? [...report.results].sort((a, b) => (b.data?.risk?.score || 0) - (a.data?.risk?.score || 0))
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="border-b border-axon-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-axon-orange bg-axon-orange/10 border border-axon-orange/30 rounded-full">
            MASS DETECTION SUITE
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Bulk Investigation Engine</h1>
        <p className="text-axon-text-muted mt-1 text-base max-w-2xl">
          High-throughput forensic processing. Ingest large datasets to uncover systemic threats and clustered illicit behavior.
        </p>
      </div>

      {!report && (
        <form onSubmit={handleScan} className="glass-panel p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-axon-orange/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-axon-text-dim uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-axon-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Subject Data (Raw Text / CSV)
              </label>
              
              <label className="axon-button px-3 py-1 text-[10px] cursor-pointer hover:bg-axon-card transition-colors">
                <input 
                  type="file" 
                  accept=".txt,.csv" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => setInputData(event.target.result);
                      reader.readAsText(file);
                    }
                  }} 
                />
                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload File (.txt)
              </label>
            </div>
            <textarea
              className="w-full bg-[#05080f] border border-axon-border rounded-lg p-5 text-axon-cyan font-mono text-sm focus:border-axon-orange focus:ring-1 focus:ring-axon-orange outline-none transition-all resize-y min-h-[200px] shadow-inner"
              placeholder={"Paste wallet addresses, CSV logs, or unstructured intercept data containing 0x... addresses. \n\nAXON Regex Extraction Engine is active."}
              value={inputData}
              onChange={e => setInputData(e.target.value)}
              spellCheck="false"
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-axon-text-dim font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-axon-green animate-pulse"></span>
                Extracted Targets: {new Set(inputData.match(/0x[a-fA-F0-9]{40}/g) || []).size}
              </div>
            </div>
          </div>

          <div className="relative z-10 border-t border-axon-border/50 pt-5">
            <label className="block text-sm font-bold text-axon-text-dim uppercase tracking-wider mb-3">
              Case Linkage (Optional ID)
            </label>
            <input
              type="number"
              className="w-full max-w-xs bg-[#05080f] border border-axon-border rounded-lg p-3 text-white font-mono text-sm focus:border-axon-orange focus:ring-1 focus:ring-axon-orange outline-none transition-all"
              placeholder="e.g. 1"
              value={caseId}
              onChange={e => setCaseId(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !inputData.trim()}
            className="axon-button relative z-10 w-full sm:w-auto bg-axon-orange/10 border border-axon-orange/30 text-axon-orange hover:bg-axon-orange hover:text-white px-8 py-3.5 font-bold uppercase tracking-widest transition-all overflow-hidden group"
          >
            <div className="absolute inset-0 bg-axon-orange/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <span className="relative z-10 flex items-center justify-center">
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Initiating Batch Scan...
                </>
              ) : "Execute Mass Detection"}
            </span>
          </button>
        </form>
      )}

      {loading && (
        <div className="glass-panel p-10 text-center animate-pulse border-axon-orange/30">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-axon-orange/10 mb-4 border border-axon-orange/20">
            <svg className="w-8 h-8 text-axon-orange animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </div>
          <div className="text-axon-orange text-xl mb-2 font-mono font-bold tracking-widest">ANALYZING TARGETS</div>
          <p className="text-axon-text-muted text-sm max-w-md mx-auto font-mono">
            Cross-referencing global intelligence databases. Throttling concurrency to maintain operational stealth and API limits...
          </p>
        </div>
      )}

      {report && report.summary && (
        <div className="space-y-6 animate-fade-in">
          {/* Forensic Consensus Block */}
          <div className={`p-5 rounded-lg border ${report.summary.CRITICAL > 0 ? 'bg-red-500/10 border-red-500/50' : report.summary.HIGH > 0 ? 'bg-orange-500/10 border-orange-500/50' : 'bg-axon-card border-axon-border'}`}>
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {report.summary.CRITICAL > 0 ? (
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                ) : (
                  <svg className="w-6 h-6 text-axon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
              </div>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-1 ${report.summary.CRITICAL > 0 ? 'text-red-400' : report.summary.HIGH > 0 ? 'text-orange-400' : 'text-axon-cyan'}`}>
                  Automated Threat Assessment
                </h3>
                <p className="text-white font-mono text-sm leading-relaxed">
                  {getConsensusMessage()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-axon-orange"></span>
              Investigation Matrix
            </h2>
            <div className="flex gap-3">
              <button onClick={() => { setReport(null); setInputData(''); }} className="axon-button px-4 py-2 text-xs">Reset Tool</button>
              <button 
                onClick={() => {
                  const json = JSON.stringify(report, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `axon-bulk-report-${report.bulk_batch_id || 'export'}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }} 
                className="axon-button px-4 py-2 text-xs border-axon-cyan/30 text-axon-cyan hover:bg-axon-cyan hover:text-white"
              >
                <svg className="w-3 h-3 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export JSON Log
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#05080f] rounded-lg border border-red-500/30 p-5 text-center shadow-[0_0_15px_rgba(239,68,68,0.05)]">
              <div className="text-4xl font-bold font-mono text-red-500">{report.summary.CRITICAL || 0}</div>
              <div className="text-[10px] text-red-500/70 mt-2 font-bold tracking-widest">CRITICAL</div>
            </div>
            <div className="bg-[#05080f] rounded-lg border border-orange-500/30 p-5 text-center shadow-[0_0_15px_rgba(249,115,22,0.05)]">
              <div className="text-4xl font-bold font-mono text-orange-500">{report.summary.HIGH || 0}</div>
              <div className="text-[10px] text-orange-500/70 mt-2 font-bold tracking-widest">HIGH</div>
            </div>
            <div className="bg-[#05080f] rounded-lg border border-yellow-500/30 p-5 text-center shadow-[0_0_15px_rgba(234,179,8,0.05)]">
              <div className="text-4xl font-bold font-mono text-yellow-500">{report.summary.MEDIUM || 0}</div>
              <div className="text-[10px] text-yellow-500/70 mt-2 font-bold tracking-widest">MEDIUM</div>
            </div>
            <div className="bg-[#05080f] rounded-lg border border-green-500/30 p-5 text-center shadow-[0_0_15px_rgba(34,197,94,0.05)]">
              <div className="text-4xl font-bold font-mono text-green-500">{report.summary.LOW || 0}</div>
              <div className="text-[10px] text-green-500/70 mt-2 font-bold tracking-widest">LOW</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedResults.map((r, i) => {
              const score = r.data?.risk?.score || 0;
              const isCritical = score >= 80;
              const isHigh = score >= 60 && score < 80;
              const isMedium = score >= 40 && score < 60;
              
              const colorClass = isCritical ? 'red' : isHigh ? 'orange' : isMedium ? 'yellow' : 'green';
              const borderClass = isCritical ? 'border-red-500/50 hover:border-red-500' : isHigh ? 'border-orange-500/50 hover:border-orange-500' : isMedium ? 'border-yellow-500/50 hover:border-yellow-500' : 'border-axon-green/50 hover:border-axon-green';
              const bgClass = isCritical ? 'bg-red-500/5' : isHigh ? 'bg-orange-500/5' : isMedium ? 'bg-yellow-500/5' : 'bg-axon-green/5';
              const textClass = isCritical ? 'text-red-400' : isHigh ? 'text-orange-400' : isMedium ? 'text-yellow-400' : 'text-axon-green';

              return (
                <div key={i} className={`relative flex flex-col rounded-xl border ${borderClass} ${bgClass} p-5 transition-all duration-300 group overflow-hidden`}>
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="font-mono text-sm font-bold text-white truncate pr-4" title={r.address}>
                      {r.address.slice(0, 16)}...{r.address.slice(-4)}
                    </div>
                    <div className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-full border ${borderClass} font-bold font-mono text-lg ${textClass} shadow-inner bg-[#05080f]`}>
                      {score}
                    </div>
                  </div>

                  {/* Classification & Entity */}
                  <div className="mb-4 bg-[#05080f]/50 p-3 rounded-lg border border-axon-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      {isCritical && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                      <span className={`text-xs font-bold uppercase tracking-widest ${textClass}`}>
                        {r.data?.risk?.label || "Unknown"}
                      </span>
                    </div>
                    <div className="text-sm text-axon-text-muted truncate" title={r.data?.identity?.label || "Unattributed Entity"}>
                      {r.data?.identity?.label || "Unattributed Entity"}
                    </div>
                    {r.data?.identity?.entityClass && (
                      <div className="text-[10px] text-axon-text-dim mt-1 font-mono">
                        CLASS: {r.data.identity.entityClass}
                      </div>
                    )}
                  </div>

                  {/* Risk Factors */}
                  <div className="flex-1 mb-6">
                    <div className="text-[10px] text-axon-text-dim uppercase tracking-widest font-bold mb-2 border-b border-axon-border/50 pb-1">Primary Risk Factors</div>
                    {r.data?.risk?.factors && r.data.risk.factors.length > 0 ? (
                      <ul className="space-y-1.5">
                        {r.data.risk.factors.slice(0, 3).map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[11px] text-axon-text-muted leading-tight">
                            <span className="shrink-0 mt-0.5">{factor.icon || '⚠️'}</span>
                            <span className="line-clamp-2">{factor.reason || factor.toString()}</span>
                          </li>
                        ))}
                        {r.data.risk.factors.length > 3 && (
                          <li className="text-[10px] text-axon-text-dim italic mt-1">+ {r.data.risk.factors.length - 3} more flags</li>
                        )}
                      </ul>
                    ) : (
                       <div className="text-[11px] text-axon-text-dim italic">No specific risk flags available.</div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/wallet?address=${r.address}`);
                    }}
                    className={`w-full py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-all ${
                      isCritical ? 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' :
                      isHigh ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white' :
                      isMedium ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500 hover:text-white' :
                      'bg-axon-green/20 text-axon-green hover:bg-axon-green hover:text-white'
                    }`}
                  >
                    Deep Dive Analysis
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
