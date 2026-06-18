import React, { useState, useEffect, useCallback } from 'react';
import { getIntelWallets, getIntelExchanges, getIntelMixers, getIntelThreats, getIntelStats } from '../api/axon';

// ─── THREAT BADGE ──────────────────────────────────────────────────────────
function ThreatBadge({ threat }) {
  const map = {
    CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/40',
    HIGH:     'bg-orange-500/15 text-orange-400 border-orange-500/40',
    MEDIUM:   'bg-yellow-400/15 text-yellow-400 border-yellow-400/40',
    LOW:      'bg-green-500/15 text-green-400 border-green-500/40',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded border ${map[threat] || map.MEDIUM}`}>
      {threat}
    </span>
  );
}

// ─── COPY BUTTON ────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
      title="Copy address"
    >
      {copied
        ? <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        : <svg className="w-3 h-3 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      }
    </button>
  );
}

// ─── PAGINATION ─────────────────────────────────────────────────────────────
function Pagination({ page, pages, total, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1e293b]">
      <span className="text-xs text-gray-500 font-mono">{total.toLocaleString('en-IN')} total records</span>
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev} disabled={page <= 1}
          className="px-3 py-1.5 text-xs font-mono rounded border border-[#1e293b] text-gray-400 hover:text-white hover:border-[#22d3ee] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >← Prev</button>
        <span className="text-xs font-mono text-gray-400">Page {page} / {pages}</span>
        <button
          onClick={onNext} disabled={page >= pages}
          className="px-3 py-1.5 text-xs font-mono rounded border border-[#1e293b] text-gray-400 hover:text-white hover:border-[#22d3ee] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >Next →</button>
      </div>
    </div>
  );
}

// ─── METRIC CARD ─────────────────────────────────────────────────────────────
function MetricCard({ count, label, icon, color }) {
  const colors = {
    orange: 'border-orange-500/20 text-orange-400',
    purple: 'border-purple-500/20 text-purple-400',
    cyan:   'border-cyan-500/20 text-cyan-400',
    red:    'border-red-500/20 text-red-400',
  };
  return (
    <div className={`bg-[#0a0f1a] border ${colors[color]} rounded-xl p-5 flex items-center gap-4`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-2xl font-bold font-mono text-white">{Number(count || 0).toLocaleString('en-IN')}</div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── TABLE WRAPPER ─────────────────────────────────────────────────────────
function DataTable({ headers, children, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-[#1e293b]">
            {headers.map(h => (
              <th key={h} className="pb-3 pr-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
      {empty && (
        <div className="text-center py-10 text-gray-600 text-sm font-mono">No records found.</div>
      )}
    </div>
  );
}

// ─── TABS ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'wallets',   label: 'Flagged Wallets',  icon: '🚨', color: 'red' },
  { id: 'threats',   label: 'Threat Actors',    icon: '🎭', color: 'orange' },
  { id: 'mixers',    label: 'Mixers & Tumblers', icon: '🌪️', color: 'purple' },
  { id: 'exchanges', label: 'Exchanges',         icon: '🏦', color: 'cyan' },
];

const TAB_COLORS = {
  red:    { active: 'border-red-500 text-red-400 bg-red-500/10',    inactive: 'border-transparent text-gray-500' },
  orange: { active: 'border-orange-500 text-orange-400 bg-orange-500/10', inactive: 'border-transparent text-gray-500' },
  purple: { active: 'border-purple-500 text-purple-400 bg-purple-500/10', inactive: 'border-transparent text-gray-500' },
  cyan:   { active: 'border-cyan-500 text-cyan-400 bg-cyan-500/10',   inactive: 'border-transparent text-gray-500' },
};

const PAGE_SIZE = 25;

export default function IntelligenceDatabases() {
  const [stats,     setStats]     = useState({ malicious_wallets: 0, exchange_wallets: 0, known_mixers: 0, threat_actors: 0 });
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('wallets');

  // Data states
  const [exchanges, setExchanges] = useState([]);
  const [mixers,    setMixers]    = useState([]);
  const [threats,   setThreats]   = useState([]);

  // Wallet pagination state (server-side)
  const [wallets, setWallets] = useState({ data: [], total: 0, page: 1, pages: 1 });
  const [walletPage, setWalletPage] = useState(1);
  const [walletLoading, setWalletLoading] = useState(false);

  // Global search
  const [searchInput, setSearchInput] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  // Local page states for static lists
  const [threatPage,   setThreatPage]   = useState(1);
  const [mixerPage,    setMixerPage]    = useState(1);
  const [exchangePage, setExchangePage] = useState(1);

  // Initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [st, ex, mx, th] = await Promise.all([
          getIntelStats(),
          getIntelExchanges(''),
          getIntelMixers(''),
          getIntelThreats(''),
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

  // Fetch wallets whenever page or search changes
  const fetchWallets = useCallback(async (page, search) => {
    setWalletLoading(true);
    try {
      const data = await getIntelWallets(search, page, PAGE_SIZE, '', '');
      setWallets(data);
    } catch (err) {
      console.error("Failed to load wallets", err);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets(walletPage, globalSearch);
  }, [walletPage, globalSearch, fetchWallets]);

  const handleSearch = (e) => {
    e.preventDefault();
    setGlobalSearch(searchInput);
    setWalletPage(1);
    setThreatPage(1);
    setMixerPage(1);
    setExchangePage(1);
  };

  // Local filtered lists
  const filteredThreats   = threats.filter(t   => !globalSearch || (t.name || '').toLowerCase().includes(globalSearch.toLowerCase()));
  const filteredMixers    = mixers.filter(m    => !globalSearch || (m.name || '').toLowerCase().includes(globalSearch.toLowerCase()));
  const filteredExchanges = exchanges.filter(e => !globalSearch || (e.name || '').toLowerCase().includes(globalSearch.toLowerCase()));

  const paginate = (arr, page) => arr.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages    = (arr) => Math.max(1, Math.ceil(arr.length / PAGE_SIZE));

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full animate-pulse">
        <div className="w-16 h-16 border-4 border-[#22d3ee] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-[#22d3ee] font-mono tracking-widest text-sm">CONNECTING TO INTELLIGENCE MATRIX...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="border-b border-[#1e293b] pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-full">
            GLOBAL INTELLIGENCE
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Threat Databases</h1>
        <p className="text-gray-500 mt-2 text-sm max-w-xl">
          Curated reference data for forensic attribution — threat actors, mixers, exchanges, and{' '}
          <span className="text-white font-bold">{Number(stats.malicious_wallets).toLocaleString('en-IN')}</span> flagged addresses.
        </p>
      </div>

      {/* ── SEARCH BAR ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by name, address, alias, category..."
            className="w-full bg-[#05080f] border border-[#1e293b] rounded-lg pl-11 pr-4 py-3.5 text-white text-sm focus:border-[#22d3ee] outline-none transition-all font-mono placeholder:text-gray-600"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3.5 bg-[#22d3ee]/10 border border-[#22d3ee]/40 text-[#22d3ee] rounded-lg font-bold text-sm hover:bg-[#22d3ee] hover:text-[#05080f] transition-all"
        >
          Search
        </button>
        {globalSearch && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setGlobalSearch(''); setWalletPage(1); }}
            className="px-4 py-3.5 bg-[#1e293b] border border-[#1e293b] text-gray-400 rounded-lg text-sm hover:text-white transition-all"
          >
            ✕ Clear
          </button>
        )}
      </form>

      {/* ── METRIC CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard count={stats.threat_actors}   label="Threat Actors"     icon="🎭" color="orange" />
        <MetricCard count={stats.known_mixers}    label="Sanctioned Mixers" icon="🌪️" color="purple" />
        <MetricCard count={stats.exchange_wallets}label="Exchange Entities"  icon="🏦" color="cyan"   />
        <MetricCard count={stats.malicious_wallets}label="Flagged Wallets"   icon="🚨" color="red"    />
      </div>

      {/* ── TABS ────────────────────────────────────────────────────────── */}
      <div className="bg-[#0a0f1a] border border-[#1e293b] rounded-xl overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-[#1e293b] overflow-x-auto">
          {TABS.map(tab => {
            const c = TAB_COLORS[tab.color];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id ? c.active : c.inactive + ' hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.id === 'wallets'   && <span className="px-1.5 py-0.5 text-[9px] bg-[#1e293b] rounded font-mono">{Number(stats.malicious_wallets).toLocaleString('en-IN')}</span>}
                {tab.id === 'threats'   && <span className="px-1.5 py-0.5 text-[9px] bg-[#1e293b] rounded font-mono">{filteredThreats.length}</span>}
                {tab.id === 'mixers'    && <span className="px-1.5 py-0.5 text-[9px] bg-[#1e293b] rounded font-mono">{filteredMixers.length}</span>}
                {tab.id === 'exchanges' && <span className="px-1.5 py-0.5 text-[9px] bg-[#1e293b] rounded font-mono">{filteredExchanges.length}</span>}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">

          {/* ── FLAGGED WALLETS (server-paginated) ────────────────────── */}
          {activeTab === 'wallets' && (
            <div>
              {walletLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-[#22d3ee] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <DataTable
                  headers={['Address', 'Label', 'Category', 'Chain', 'Threat', 'Sanctioned', 'Volume']}
                  empty={wallets.data.length === 0}
                >
                  {wallets.data.map(w => (
                    <tr key={w.id} className="border-b border-[#1e293b]/60 hover:bg-[#05080f] transition-colors group">
                      <td className="py-3 pr-6">
                        <span
                          className="font-mono text-xs text-[#22d3ee] hover:text-white cursor-pointer flex items-center"
                          onClick={() => navigator.clipboard.writeText(w.address)}
                          title={w.address}
                        >
                          {w.address.slice(0, 8)}…{w.address.slice(-6)}
                          <CopyBtn text={w.address} />
                        </span>
                      </td>
                      <td className="py-3 pr-6 text-sm text-white font-semibold max-w-[180px] truncate">{w.label}</td>
                      <td className="py-3 pr-6">
                        <span className="px-1.5 py-0.5 text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-mono">{w.category}</span>
                      </td>
                      <td className="py-3 pr-6 text-xs text-gray-400 font-mono">{w.chain}</td>
                      <td className="py-3 pr-6"><ThreatBadge threat={w.threat_level} /></td>
                      <td className="py-3 pr-6">
                        {w.sanctioned
                          ? <span className="px-1.5 py-0.5 text-[9px] bg-red-500/10 text-red-400 border border-red-500/30 rounded font-bold">OFAC</span>
                          : <span className="text-gray-600 text-xs">—</span>
                        }
                      </td>
                      <td className="py-3 pr-6 font-mono text-xs text-orange-400">{w.amount_usd || '—'}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
              <Pagination
                page={walletPage}
                pages={wallets.pages || 1}
                total={wallets.total || 0}
                onPrev={() => setWalletPage(p => Math.max(1, p - 1))}
                onNext={() => setWalletPage(p => Math.min(wallets.pages, p + 1))}
              />
            </div>
          )}

          {/* ── THREAT ACTORS ─────────────────────────────────────────── */}
          {activeTab === 'threats' && (
            <div>
              <DataTable
                headers={['Name', 'Type', 'Origin', 'Threat Level', 'Aliases', 'Total Stolen']}
                empty={filteredThreats.length === 0}
              >
                {paginate(filteredThreats, threatPage).map(t => (
                  <tr key={t.id} className="border-b border-[#1e293b]/60 hover:bg-[#05080f] transition-colors">
                    <td className="py-3 pr-6 text-white font-bold text-sm">{t.name}</td>
                    <td className="py-3 pr-6">
                      <span className="px-1.5 py-0.5 text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded font-mono">{t.type}</span>
                    </td>
                    <td className="py-3 pr-6 text-xs text-gray-400">{t.origin || '—'}</td>
                    <td className="py-3 pr-6"><ThreatBadge threat={t.threat_level} /></td>
                    <td className="py-3 pr-6">
                      <div className="flex flex-wrap gap-1">
                        {(t.aliases || []).slice(0, 3).map((a, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-[#1e293b] text-gray-400 text-[9px] rounded font-mono">#{a}</span>
                        ))}
                        {(t.aliases || []).length > 3 && <span className="text-gray-600 text-[9px]">+{t.aliases.length - 3}</span>}
                      </div>
                    </td>
                    <td className="py-3 pr-6 font-mono text-xs text-red-400 font-bold">{t.total_stolen || '—'}</td>
                  </tr>
                ))}
              </DataTable>
              <Pagination
                page={threatPage} pages={pages(filteredThreats)} total={filteredThreats.length}
                onPrev={() => setThreatPage(p => Math.max(1, p - 1))}
                onNext={() => setThreatPage(p => Math.min(pages(filteredThreats), p + 1))}
              />
            </div>
          )}

          {/* ── MIXERS ───────────────────────────────────────────────── */}
          {activeTab === 'mixers' && (
            <div>
              <DataTable
                headers={['Name', 'Address', 'Chain', 'Type', 'Status', 'Volume Processed']}
                empty={filteredMixers.length === 0}
              >
                {paginate(filteredMixers, mixerPage).map(m => (
                  <tr key={m.id} className="border-b border-[#1e293b]/60 hover:bg-[#05080f] transition-colors group">
                    <td className="py-3 pr-6 text-white font-bold text-sm">{m.name}</td>
                    <td className="py-3 pr-6">
                      <span
                        className="font-mono text-xs text-purple-400 hover:text-white cursor-pointer flex items-center"
                        onClick={() => navigator.clipboard.writeText(m.address)}
                      >
                        {m.address.slice(0, 10)}…{m.address.slice(-6)}
                        <CopyBtn text={m.address} />
                      </span>
                    </td>
                    <td className="py-3 pr-6 text-xs text-gray-400">{m.chain}</td>
                    <td className="py-3 pr-6 text-xs text-gray-400">{m.type}</td>
                    <td className="py-3 pr-6">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                        m.status === 'SANCTIONED'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-green-500/15 text-green-400 border-green-500/30'
                      }`}>{m.status}</span>
                    </td>
                    <td className="py-3 pr-6 font-mono text-xs text-gray-300">{m.total_processed || '—'}</td>
                  </tr>
                ))}
              </DataTable>
              <Pagination
                page={mixerPage} pages={pages(filteredMixers)} total={filteredMixers.length}
                onPrev={() => setMixerPage(p => Math.max(1, p - 1))}
                onNext={() => setMixerPage(p => Math.min(pages(filteredMixers), p + 1))}
              />
            </div>
          )}

          {/* ── EXCHANGES ─────────────────────────────────────────────── */}
          {activeTab === 'exchanges' && (
            <div>
              <DataTable
                headers={['Name', 'Category', 'Chain', 'KYC Level', '24h Volume', 'Hot Wallets']}
                empty={filteredExchanges.length === 0}
              >
                {paginate(filteredExchanges, exchangePage).map(e => (
                  <tr key={e.id} className="border-b border-[#1e293b]/60 hover:bg-[#05080f] transition-colors">
                    <td className="py-3 pr-6 text-white font-bold text-sm">{e.name}</td>
                    <td className="py-3 pr-6">
                      <span className="px-1.5 py-0.5 text-[9px] bg-[#1e293b] text-gray-300 border border-[#1e293b] rounded font-mono">{e.category}</span>
                    </td>
                    <td className="py-3 pr-6 text-xs text-gray-400">{e.chain}</td>
                    <td className="py-3 pr-6">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        (e.kyc_level || '').includes('Full')
                          ? 'text-green-400 bg-green-500/10'
                          : 'text-orange-400 bg-orange-500/10'
                      }`}>{e.kyc_level}</span>
                    </td>
                    <td className="py-3 pr-6 font-mono text-xs text-green-400">{e.volume_24h || '—'}</td>
                    <td className="py-3 pr-6 text-xs text-gray-400 font-mono">{(e.addresses || []).length}</td>
                  </tr>
                ))}
              </DataTable>
              <Pagination
                page={exchangePage} pages={pages(filteredExchanges)} total={filteredExchanges.length}
                onPrev={() => setExchangePage(p => Math.max(1, p - 1))}
                onNext={() => setExchangePage(p => Math.min(pages(filteredExchanges), p + 1))}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
