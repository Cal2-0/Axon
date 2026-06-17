import React, { useState, useEffect } from 'react';
import { searchLogs } from '../api/axon';

export default function Logs() {
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs('');
  }, []);

  const fetchLogs = async (q) => {
    setLoading(true);
    try {
      const data = await searchLogs(q);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(query);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="border-b border-axon-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-axon-green bg-axon-green/10 border border-axon-green/30 rounded-full">
            SYSTEM LOGS
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Investigation Logs</h1>
        <p className="text-axon-text-muted mt-1 text-base max-w-2xl">
          Search the historical database of all scanned entities. Supports smart filtering by risk ("critical", "high") or free-form text.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by address, risk level, or entity class..."
          className="flex-1 bg-[#0a0f1a] border border-axon-border rounded-lg px-6 py-4 text-white text-lg focus:border-axon-green outline-none transition-colors"
        />
        <button type="submit" disabled={loading} className="axon-button px-8 py-4 font-bold bg-axon-green/10 border border-axon-green/30 text-axon-green hover:bg-axon-green hover:text-white">
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm font-mono text-left">
          <thead>
            <tr className="border-b border-axon-border bg-axon-bg/50">
              <th className="py-4 px-6 text-xs text-axon-text-dim uppercase tracking-wider">Timestamp</th>
              <th className="py-4 px-6 text-xs text-axon-text-dim uppercase tracking-wider">Address</th>
              <th className="py-4 px-6 text-xs text-axon-text-dim uppercase tracking-wider">Type</th>
              <th className="py-4 px-6 text-xs text-axon-text-dim uppercase tracking-wider">Risk</th>
              <th className="py-4 px-6 text-xs text-axon-text-dim uppercase tracking-wider">Class</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-axon-text-muted">No logs found matching your query.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-axon-border/50 hover:bg-axon-card/30 transition-colors">
                  <td className="py-4 px-6 text-axon-text-dim text-xs">
                    {new Date(log.scan_timestamp * 1000).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 font-bold text-axon-cyan cursor-pointer" onClick={() => navigator.clipboard.writeText(log.entity_address)}>
                    {log.entity_address.slice(0, 12)}...{log.entity_address.slice(-4)}
                  </td>
                  <td className="py-4 px-6 text-white uppercase text-xs">
                    {log.entity_type}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded border ${
                      log.risk_score >= 80 ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                      log.risk_score >= 60 ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                      log.risk_score >= 40 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                      'bg-green-500/10 text-green-400 border-green-500/30'
                    }`}>
                      {log.risk_score}/100
                    </span>
                  </td>
                  <td className="py-4 px-6 text-axon-text-muted truncate max-w-[150px]">
                    {log.entity_class || "Unknown"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
