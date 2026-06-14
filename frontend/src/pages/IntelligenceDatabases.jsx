import React, { useState, useEffect, useCallback } from 'react';
import { getIntelWallets, getIntelExchanges, getIntelMixers, getIntelThreats, getIntelStats } from '../api/axon';

// ─── THREAT BADGE ─────────────────────────────────────────────────────────
function ThreatBadge({ threat }) {
  const map = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
    HIGH:     'bg-orange-500/10 text-orange-400 border-orange-500/30',
    MEDIUM:   'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
    LOW:      'bg-axon-green/10 text-axon-green border-axon-green/30',
  };
  return <span className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded border ${map[threat] || map.MEDIUM}`}>{threat}</span>;
}

// ─── DATABASE SECTION ─────────────────────────────────────────────────────
function DbSection({ icon, title, color, children, count }) {
  const colors = {
    cyan:   'text-axon-cyan bg-axon-cyan/10 border-axon-cyan/30',
    purple: 'text-axon-purple bg-axon-purple/10 border-axon-purple/30',
    orange: 'text-axon-orange bg-axon-orange/10 border-axon-orange/30',
    red:    'text-red-400 bg-red-500/10 border-red-500/30',
  };
  const bar = { cyan: 'bg-axon-cyan', purple: 'bg-axon-purple', orange: 'bg-axon-orange', red: 'bg-red-500' };
  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <span className={`w-1.5 h-6 rounded-full ${bar[color]}`}></span>
          <span className="text-lg">{icon}</span>
          {title}
        </h2>
        <span className={`px-3 py-1 text-xs font-mono font-bold rounded border ${colors[color]}`}>{count?.toLocaleString() || 0} ENTRIES</span>
      </div>
      {children}
    </div>
  );
}

// ─── SEARCH INPUT ─────────────────────────────────────────────────────────
const SearchInput = ({ value, onChange, placeholder, id }) => (
  <div className="relative mb-5">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-axon-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="axon-input pl-10 w-full"
    />
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
export default function IntelligenceDatabases() {
  const [stats, setStats] = useState({ malicious_wallets: 0, exchange_wallets: 0, known_mixers: 0, threat_actors: 0 });
  const [loading, setLoading] = useState(true);

  // Exchange state
  const [exchanges, setExchanges] = useState([]);
  const [exchangeQuery, setExchangeQuery] = useState('');

  // Mixer state
  const [mixers, setMixers] = useState([]);
  const [mixerQuery, setMixerQuery] = useState('');

  // Threat state
  const [threats, setThreats] = useState([]);
  const [threatQuery, setThreatQuery] = useState('');

  // Wallet state (Paginated)
  const [wallets, setWallets] = useState({ data: [], total: 0, page: 1, pages: 1 });
  const [walletQuery, setWalletQuery] = useState('');
  const [walletCategory, setWalletCategory] = useState('');
  const [walletThreat, setWalletThreat] = useState('');

  // Fetch Stats & Non-Paginated Data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [st, ex, mx, th] = await Promise.all([
          getIntelStats(),
          getIntelExchanges(''),
          getIntelMixers(''),
          getIntelThreats('')
        ]);
        setStats(st);
        setExchanges(ex);
        setMixers(mx);
        setThreats(th);
      } catch (err) {
        console.error("Failed to load intel data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch Paginated Wallets (Debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await getIntelWallets(walletQuery, wallets.page, 50, walletCategory, walletThreat);
        setWallets(res);
      } catch (err) {
        console.error("Failed to fetch wallets", err);
      }
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [walletQuery, wallets.page, walletCategory, walletThreat]);

  // Client-side filtering for non-paginated data
  const filteredExchanges = exchanges.filter(e =>
    (e.name?.toLowerCase() || '').includes(exchangeQuery.toLowerCase()) ||
    (e.category?.toLowerCase() || '').includes(exchangeQuery.toLowerCase())
  );

  const filteredMixers = mixers.filter(m =>
    (m.name?.toLowerCase() || '').includes(mixerQuery.toLowerCase()) ||
    (m.type?.toLowerCase() || '').includes(mixerQuery.toLowerCase())
  );

  const filteredThreats = threats.filter(t =>
    (t.name?.toLowerCase() || '').includes(threatQuery.toLowerCase()) ||
    (t.origin?.toLowerCase() || '').includes(threatQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center mt-20 text-axon-cyan font-mono animate-pulse">Initializing Axon Intelligence Matrix...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Page Header */}
      <div className="border-b border-axon-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-axon-orange bg-axon-orange/10 border border-axon-orange/30 rounded-full">
            INTELLIGENCE DATABASES
          </span>
          <span className="w-2 h-2 rounded-full bg-axon-orange animate-pulse-slow"></span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Intelligence Databases</h1>
        <p className="text-axon-text-muted mt-1 text-base max-w-3xl">
          AXON Intelligence Sources — curated reference databases for blockchain forensic investigations. Live data pulled from FastAPI backend.
        </p>
        <div className="flex flex-wrap gap-4 mt-4">
          {[
            { count: stats.exchange_wallets, label: 'Exchange Wallets', color: 'text-axon-cyan' },
            { count: stats.known_mixers, label: 'Known Mixers', color: 'text-axon-purple' },
            { count: stats.threat_actors, label: 'Threat Actors', color: 'text-axon-orange' },
            { count: stats.malicious_wallets, label: 'Flagged Wallets', color: 'text-red-400' },
          ].map(item => (
            <div key={item.label} className="bg-axon-card border border-axon-border rounded-lg px-4 py-2 flex items-center gap-2">
              <span className={`text-2xl font-bold font-mono ${item.color}`}>{item.count?.toLocaleString()}</span>
              <span className="text-xs text-axon-text-dim">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 1. EXCHANGE WALLET DATABASE ═══════════════════════════════════ */}
      <DbSection icon="🏦" title="Exchange Wallet Database" color="cyan" count={stats.exchange_wallets}>
        <SearchInput id="exchange-search" value={exchangeQuery} onChange={setExchangeQuery} placeholder="Search exchanges, addresses, tier..." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-axon-border text-left">
                {['Exchange', 'Known Addresses', 'Chain', 'Volume (24h)', 'KYC Level', 'Status', 'Category'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs text-axon-text-dim uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredExchanges.map(e => (
                <tr key={e.id} className="border-b border-axon-border/40 hover:bg-axon-card/30 transition-colors">
                  <td className="py-3 pr-4 font-bold text-white">{e.name}</td>
                  <td className="py-3 pr-4">
                    <div className="space-y-0.5">
                      {e.addresses.slice(0, 2).map((a, i) => (
                        <div key={i} 
                             className="text-axon-cyan text-[11px] cursor-pointer hover:text-white transition-colors"
                             onClick={() => navigator.clipboard.writeText(a)}
                             title="Click to copy full address">
                          {a.slice(0, 18)}...
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-axon-text-muted">{e.chain}</td>
                  <td className="py-3 pr-4 text-axon-green">{e.volume_24h}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                      e.kyc_level === 'Full KYC' || e.kyc_level === 'Strict KYC' ? 'bg-axon-green/10 text-axon-green border-axon-green/30'
                      : e.kyc_level === 'Partial' ? 'bg-axon-orange/10 text-axon-orange border-axon-orange/30'
                      : 'bg-axon-card text-axon-text-dim border-axon-border'
                    }`}>{e.kyc_level}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                      e.status === 'Active' ? 'bg-axon-green/10 text-axon-green border-axon-green/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>{e.status}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 text-[10px] rounded border ${
                      e.category === 'Tier 1' ? 'bg-axon-cyan/10 text-axon-cyan border-axon-cyan/30'
                      : e.category === 'Defunct' ? 'bg-axon-card text-axon-text-dim border-axon-border'
                      : 'bg-axon-purple/10 text-axon-purple border-axon-purple/30'
                    }`}>{e.category}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DbSection>

      {/* ═══ 2. MIXER DATABASE ════════════════════════════════════════════ */}
      <DbSection icon="🌪️" title="Mixer Database" color="purple" count={stats.known_mixers}>
        <SearchInput id="mixer-search" value={mixerQuery} onChange={setMixerQuery} placeholder="Search mixers, type, status..." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-axon-border text-left">
                {['Mixer Name', 'Type', 'Chain', 'Status', 'Total Processed', 'Sanctions', 'Risk'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs text-axon-text-dim uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMixers.map(m => (
                <tr key={m.id} className="border-b border-axon-border/40 hover:bg-axon-card/30 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-bold text-white">{m.name}</div>
                    <div 
                      className="text-[11px] text-axon-cyan cursor-pointer hover:text-white transition-colors mt-0.5"
                      onClick={() => navigator.clipboard.writeText(m.address)}
                      title="Click to copy full address"
                    >
                      {m.address.slice(0,18)}...
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-axon-text-muted text-[11px]">{m.type}</td>
                  <td className="py-3 pr-4 text-axon-text-muted">{m.chain}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                      m.status === 'SANCTIONED' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : m.status === 'SEIZED' ? 'bg-axon-orange/10 text-axon-orange border-axon-orange/30'
                      : 'bg-axon-cyan/10 text-axon-cyan border-axon-cyan/30'
                    }`}>{m.status}</span>
                  </td>
                  <td className="py-3 pr-4 text-axon-orange">{m.total_processed}</td>
                  <td className="py-3 pr-4 text-[10px] text-axon-text-muted">{m.sanctioned_by}</td>
                  <td className="py-3 pr-4"><ThreatBadge threat={m.risk_level} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DbSection>

      {/* ═══ 3. THREAT ACTOR DATABASE ══════════════════════════════════════ */}
      <DbSection icon="🎭" title="Threat Actor Database" color="orange" count={stats.threat_actors}>
        <SearchInput id="threat-search" value={threatQuery} onChange={setThreatQuery} placeholder="Search aliases, origin..." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-axon-border text-left">
                {['Actor Profile', 'Origin', 'Actor Type', 'Total Stolen', 'Status', 'Threat Level'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs text-axon-text-dim uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredThreats.map(t => (
                <tr key={t.id} className="border-b border-axon-border/40 hover:bg-axon-card/30 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-bold text-white">{t.name}</div>
                    <div className="text-[10px] text-axon-cyan mt-1 leading-tight">
                      Aliases: {t.aliases.slice(0,3).join(', ')}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-axon-text-muted">{t.origin}</td>
                  <td className="py-3 pr-4 text-axon-text-dim">{t.type}</td>
                  <td className="py-3 pr-4 text-red-400 font-bold">{t.total_stolen}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 text-[10px] rounded border ${
                      t.status.includes('Active') ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-axon-card text-axon-text-dim border-axon-border'
                    }`}>{t.status}</span>
                  </td>
                  <td className="py-3 pr-4"><ThreatBadge threat={t.threat_level} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DbSection>

      {/* ═══ 4. MALICIOUS WALLET DATABASE (10,000+ RECORDS) ════════════════ */}
      <DbSection icon="🚨" title="Malicious Wallet Watchlist" color="red" count={stats.malicious_wallets}>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <SearchInput id="wallet-search" value={walletQuery} onChange={(v) => {setWalletQuery(v); setWallets(w => ({...w, page: 1}))}} placeholder="Search by address, label, tags..." />
          </div>
          <div className="flex gap-2">
            <select className="axon-input py-0 px-3 h-10 text-sm" value={walletCategory} onChange={(e) => {setWalletCategory(e.target.value); setWallets(w => ({...w, page: 1}))}}>
              <option value="">All Categories</option>
              <option value="Hacker">Hacker</option>
              <option value="Scammer">Scammer</option>
              <option value="Phishing">Phishing</option>
              <option value="Mixer User">Mixer User</option>
              <option value="Money Mule">Money Mule</option>
              <option value="Rug Pull">Rug Pull</option>
              <option value="State Actor">State Actor</option>
              <option value="Sanctions Evasion">Sanctions Evasion</option>
            </select>
            <select className="axon-input py-0 px-3 h-10 text-sm" value={walletThreat} onChange={(e) => {setWalletThreat(e.target.value); setWallets(w => ({...w, page: 1}))}}>
              <option value="">All Threats</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-axon-border text-left">
                {['Address / Label', 'Category', 'Chain', 'Volume (USD)', 'Threat', 'Last Active'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs text-axon-text-dim uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wallets.data.map(w => (
                <tr key={w.id} className="border-b border-axon-border/40 hover:bg-axon-card/30 transition-colors">
                  <td className="py-3 pr-4">
                    <div 
                      className="text-axon-cyan font-bold cursor-pointer hover:text-white transition-colors"
                      onClick={() => navigator.clipboard.writeText(w.address)}
                      title="Click to copy full address"
                    >
                      {w.address.slice(0,8)}...{w.address.slice(-6)}
                    </div>
                    <div className="text-[10px] text-axon-text-muted mt-1">{w.label}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-0.5 text-[10px] rounded border bg-axon-purple/10 text-axon-purple border-axon-purple/30">
                      {w.category}
                    </span>
                    {w.sanctioned && <span className="ml-2 text-red-500 font-bold" title="OFAC Sanctioned">⚠️</span>}
                  </td>
                  <td className="py-3 pr-4 text-axon-text-muted">{w.chain}</td>
                  <td className="py-3 pr-4 text-axon-orange font-bold">{w.amount_usd}</td>
                  <td className="py-3 pr-4"><ThreatBadge threat={w.threat_level} /></td>
                  <td className="py-3 pr-4 text-[10px] text-axon-text-dim">{w.last_active}</td>
                </tr>
              ))}
              {wallets.data.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-axon-text-muted">No wallets found matching your query.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-axon-border/50">
          <div className="text-xs text-axon-text-dim font-mono">
            Showing {(wallets.page - 1) * 50 + 1} - {Math.min(wallets.page * 50, wallets.total)} of {wallets.total.toLocaleString()} entries
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setWallets(w => ({ ...w, page: Math.max(1, w.page - 1) }))}
              disabled={wallets.page === 1}
              className="px-3 py-1 bg-axon-card border border-axon-border rounded text-xs text-white hover:border-axon-cyan disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button 
              onClick={() => setWallets(w => ({ ...w, page: Math.min(w.pages, w.page + 1) }))}
              disabled={wallets.page === wallets.pages || wallets.total === 0}
              className="px-3 py-1 bg-axon-card border border-axon-border rounded text-xs text-white hover:border-axon-cyan disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </DbSection>
    </div>
  );
}
