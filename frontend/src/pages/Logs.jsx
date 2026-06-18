import React, { useState, useEffect } from 'react';
import { searchLogs } from '../api/axon';

// Deterministic micro-summary from stored signals — no API cost
function buildMicroSummary(log) {
  const { risk_score, entity_class, triggered_signals } = log;
  if (!risk_score && !entity_class) return null;

  const riskLabel =
    risk_score >= 80 ? 'CRITICAL risk'
    : risk_score >= 60 ? 'HIGH risk'
    : risk_score >= 40 ? 'MEDIUM risk'
    : 'LOW risk';

  const signals = triggered_signals || [];
  const topSignal = signals[0];
  const signalText = topSignal?.reason
    ? ` Key signal: ${topSignal.reason.slice(0, 90)}${topSignal.reason.length > 90 ? '…' : ''}.`
    : '';

  const classText = entity_class && entity_class !== 'Unknown EOA'
    ? ` Classified as ${entity_class}.`
    : '';

  return `${riskLabel} entity (${risk_score}/100).${classText}${signalText}`;
}

function RiskBadge({ score }) {
  const cfg =
    score >= 80 ? { bg: 'bg-red-500/15 text-red-400 border-red-500/30',    label: 'CRITICAL' } :
    score >= 60 ? { bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30', label: 'HIGH' } :
    score >= 40 ? { bg: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30', label: 'MEDIUM' } :
                  { bg: 'bg-green-500/15 text-green-400 border-green-500/30',    label: 'LOW' };
  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 text-xs font-bold rounded border font-mono ${cfg.bg}`}>
        {cfg.label}
      </span>
      <span className="text-xs font-mono text-gray-400">{score}/100</span>
    </div>
  );
}

function ExpandedRow({ log }) {
  const summary = buildMicroSummary(log);
  const signals = log.triggered_signals || [];

  return (
    <tr className="bg-[#05080f]">
      <td colSpan={7} className="px-6 py-4 border-b border-[#1e293b]">
        <div className="flex flex-col md:flex-row gap-6">

          {/* AI micro-summary */}
          {summary && (
            <div className="flex-1 bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-blue-600/30 text-blue-400 rounded tracking-wider">AXON ANALYSIS</span>
                <span className="text-[9px] text-gray-600">Deterministic · No API cost</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Signals */}
          {signals.length > 0 && (
            <div className="flex-1">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Triggered Signals</div>
              <div className="space-y-1.5">
                {signals.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 shrink-0">{s.icon || '🔸'}</span>
                    <span className="text-gray-300 leading-snug">{s.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="min-w-[160px] space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Scan Depth</span>
              <span className="font-mono text-gray-300 uppercase">{log.scan_depth || 'quick'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Chain</span>
              <span className="font-mono text-gray-300">{log.chain || 'ETH'}</span>
            </div>
            {log.case_id && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Case</span>
                <span className="font-mono text-[#22d3ee]">#{log.case_id}</span>
              </div>
            )}
            {log.bulk_batch_id && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Batch</span>
                <span className="font-mono text-gray-400 text-[10px]">{String(log.bulk_batch_id).slice(0, 12)}…</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Log ID</span>
              <span className="font-mono text-gray-500">#{log.id}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function Logs() {
  const [query,      setQuery]      = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [expanded,   setExpanded]   = useState(null);

  useEffect(() => {
    fetchLogs('', '', '');
  }, []);

  const fetchLogs = async (q, risk, type) => {
    setLoading(true);
    try {
      // Merge risk label into search query if no free text
      const searchTerm = q || risk;
      const data = await searchLogs(searchTerm, 100, type);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setExpanded(null);
    fetchLogs(query, riskFilter, typeFilter);
  };

  const handleFilterChange = (risk, type) => {
    setRiskFilter(risk);
    setTypeFilter(type);
    setExpanded(null);
    fetchLogs(query, risk, type);
  };

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  // Stats
  const criticalCount = logs.filter(l => l.risk_score >= 80).length;
  const highCount     = logs.filter(l => l.risk_score >= 60 && l.risk_score < 80).length;
  const walletCount   = logs.filter(l => l.entity_type === 'wallet').length;
  const contractCount = logs.filter(l => l.entity_type === 'contract').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">

      {/* Header */}
      <div className="border-b border-[#1e293b] pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-green-400 bg-green-500/10 border border-green-500/30 rounded-full">
            SYSTEM LOGS
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Investigation Logs</h1>
        <p className="text-gray-500 mt-1 text-sm max-w-2xl">
          Historical database of all scanned entities. Click any row to expand signals and analysis.
          Filter by risk level, entity type, or search by address.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-3 flex-1">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by address, class, or signal text..."
              className="w-full bg-[#05080f] border border-[#1e293b] rounded-lg pl-11 pr-4 py-3 text-white text-sm focus:border-green-500 outline-none transition-all font-mono placeholder:text-gray-600"
            />
          </div>
          <button type="submit" disabled={loading}
            className="px-6 py-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg font-bold text-sm hover:bg-green-500 hover:text-white transition-all disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={riskFilter}
            onChange={e => handleFilterChange(e.target.value, typeFilter)}
            className="bg-[#05080f] border border-[#1e293b] rounded-lg px-3 py-3 text-sm text-gray-300 font-mono focus:border-green-500 outline-none"
          >
            <option value="">All Risk Levels</option>
            <option value="critical">Critical (80+)</option>
            <option value="high">High (60–79)</option>
            <option value="medium">Medium (40–59)</option>
            <option value="low">Low (&lt;40)</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => handleFilterChange(riskFilter, e.target.value)}
            className="bg-[#05080f] border border-[#1e293b] rounded-lg px-3 py-3 text-sm text-gray-300 font-mono focus:border-green-500 outline-none"
          >
            <option value="">All Types</option>
            <option value="wallet">Wallets</option>
            <option value="contract">Contracts</option>
          </select>
        </div>
      </div>

      {/* Quick Stats Bar */}
      {logs.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-500">
          <span><span className="text-white font-bold">{logs.length}</span> results</span>
          {criticalCount > 0 && <span><span className="text-red-400 font-bold">{criticalCount}</span> critical</span>}
          {highCount > 0 && <span><span className="text-orange-400 font-bold">{highCount}</span> high</span>}
          <span><span className="text-[#22d3ee] font-bold">{walletCount}</span> wallets</span>
          <span><span className="text-purple-400 font-bold">{contractCount}</span> contracts</span>
          <span className="text-gray-600">Click any row to expand signals ↓</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0a0f1a] border border-[#1e293b] rounded-xl overflow-hidden">
        <table className="w-full text-sm font-mono text-left">
          <thead>
            <tr className="border-b border-[#1e293b] bg-[#05080f]">
              <th className="py-4 px-5 text-[10px] text-gray-500 uppercase tracking-widest">Timestamp</th>
              <th className="py-4 px-5 text-[10px] text-gray-500 uppercase tracking-widest">Address</th>
              <th className="py-4 px-5 text-[10px] text-gray-500 uppercase tracking-widest">Type</th>
              <th className="py-4 px-5 text-[10px] text-gray-500 uppercase tracking-widest">Risk</th>
              <th className="py-4 px-5 text-[10px] text-gray-500 uppercase tracking-widest">Class</th>
              <th className="py-4 px-5 text-[10px] text-gray-500 uppercase tracking-widest">Chain</th>
              <th className="py-4 px-5 text-[10px] text-gray-500 uppercase tracking-widest">Signals</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-600">
                  No logs found matching your query.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr
                    onClick={() => toggleExpand(log.id)}
                    className={`border-b border-[#1e293b]/60 cursor-pointer transition-colors ${
                      expanded === log.id ? 'bg-[#05080f]' : 'hover:bg-[#05080f]/60'
                    }`}
                  >
                    <td className="py-3.5 px-5 text-gray-500 text-xs">
                      {new Date(log.scan_timestamp * 1000).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                      })}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className="font-bold text-[#22d3ee] hover:text-white"
                        onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(log.entity_address); }}
                        title={log.entity_address}
                      >
                        {log.entity_address.slice(0, 10)}…{log.entity_address.slice(-5)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${
                        log.entity_type === 'wallet'
                          ? 'bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/30'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      }`}>
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <RiskBadge score={log.risk_score} />
                    </td>
                    <td className="py-3.5 px-5 text-gray-400 text-xs max-w-[140px] truncate">
                      {log.entity_class || '—'}
                    </td>
                    <td className="py-3.5 px-5 text-gray-500 text-xs">{log.chain || 'ETH'}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        {(log.triggered_signals || []).length > 0 ? (
                          <span className="text-[10px] text-yellow-400 font-bold">
                            {log.triggered_signals.length} signal{log.triggered_signals.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-600">—</span>
                        )}
                        <svg
                          className={`w-3 h-3 text-gray-600 transition-transform ${expanded === log.id ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                  {expanded === log.id && <ExpandedRow log={log} />}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {logs.length > 0 && (
        <p className="text-center text-xs text-gray-600 font-mono">
          Showing {logs.length} records · Click any row to view signals and analysis
        </p>
      )}
    </div>
  );
}
