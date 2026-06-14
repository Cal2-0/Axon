import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Overview from './pages/Overview';
import WalletInvestigation from './pages/WalletInvestigation';
import ContractInvestigation from './pages/ContractInvestigation';
import IntelligenceDatabases from './pages/IntelligenceDatabases';
import NotFound from './pages/NotFound';

// ─── AXON LOGO COMPONENT (Minimal Bond-Style X) ─────────────────────────────
function AxonLogo({ size = 36 }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Outer glow ring */}
        <circle cx="24" cy="24" r="22" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.4" />
        {/* Inner circle background */}
        <circle cx="24" cy="24" r="18" fill="#0a0f1a" stroke="url(#logoGrad)" strokeWidth="0.8" opacity="0.6" />
        {/* X lettermark — bold intersecting strokes */}
        <path d="M14 12L24 24M24 24L34 36M24 24L34 12M24 24L14 36" stroke="url(#logoGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Circuit accent lines */}
        <line x1="14" y1="24" x2="10" y2="24" stroke="#22d3ee" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
        <line x1="34" y1="24" x2="38" y2="24" stroke="#a78bfa" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
        <line x1="24" y1="14" x2="24" y2="10" stroke="#22d3ee" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
        <line x1="24" y1="34" x2="24" y2="38" stroke="#a78bfa" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
        {/* Corner dots */}
        <circle cx="14" cy="12" r="1.5" fill="#22d3ee" opacity="0.8" />
        <circle cx="34" cy="12" r="1.5" fill="#a78bfa" opacity="0.8" />
        <circle cx="14" cy="36" r="1.5" fill="#a78bfa" opacity="0.8" />
        <circle cx="34" cy="36" r="1.5" fill="#22d3ee" opacity="0.8" />
        {/* Center node */}
        <circle cx="24" cy="24" r="2.5" fill="#22d3ee" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="3s" repeatCount="indefinite" />
        </circle>
        <defs>
          <linearGradient id="logoGrad" x1="8" y1="8" x2="40" y2="40">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── LIVE METRICS BAR (Hardcoded Demo) ───────────────────────────────────────
function MetricsBar() {
  const [blockNumber, setBlockNumber] = useState(21847293);
  const [gasPrice, setGasPrice] = useState(24.7);
  const [ethPrice, setEthPrice] = useState(3847.52);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlockNumber(prev => prev + Math.floor(Math.random() * 2));
      setGasPrice(prev => +(prev + (Math.random() - 0.5) * 2).toFixed(1));
      setEthPrice(prev => +(prev + (Math.random() - 0.5) * 8).toFixed(2));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    { label: 'ETH', value: `$${ethPrice.toLocaleString()}`, color: 'text-axon-cyan', icon: '◆' },
    { label: 'GAS', value: `${gasPrice} Gwei`, color: 'text-axon-orange', icon: '⛽' },
    { label: 'BLOCK', value: `#${blockNumber.toLocaleString()}`, color: 'text-axon-green', icon: '▣' },
    { label: 'THREATS', value: '2,847', color: 'text-red-400', icon: '⚠' },
    { label: 'SCANS', value: '14.2K', color: 'text-axon-purple', icon: '◎' },
    { label: 'UPTIME', value: '99.97%', color: 'text-axon-green', icon: '●' },
  ];

  return (
    <div className="h-10 bg-axon-surface/60 backdrop-blur-sm border-b border-axon-border flex items-center px-4 gap-1 overflow-x-auto shrink-0" id="metrics-bar">
      <div className="flex items-center gap-1 mr-3">
        <span className="w-1.5 h-1.5 rounded-full bg-axon-green animate-pulse-slow"></span>
        <span className="text-[10px] font-mono text-axon-text-dim uppercase tracking-wider">LIVE</span>
      </div>
      <div className="flex items-center gap-5 flex-1">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={`text-xs ${m.color}`}>{m.icon}</span>
            <span className="text-[10px] text-axon-text-dim font-mono">{m.label}</span>
            <span className={`text-[11px] font-mono font-bold ${m.color}`}>{m.value}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-axon-text-dim font-mono shrink-0">
        <span className="px-2 py-0.5 bg-axon-card border border-axon-border rounded text-axon-cyan">DEMO</span>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
function AppLayout() {
  const location = useLocation();
  const [apiHealth, setApiHealth] = useState({
    Etherscan: null,
    Alchemy: null,
    GoPlus: null,
    DefiLlama: null,
    Groq: null
  });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const { checkApiHealth } = await import('./api/axon');
        const data = await checkApiHealth();
        setApiHealth(data);
      } catch (err) {
        console.error("Failed to fetch API health:", err);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden animate-fade-in">
      {/* Sidebar */}
      <aside className="w-64 bg-axon-surface border-r border-axon-border flex flex-col z-20 shrink-0">
        {/* Logo — Minimal Bond Style */}
        <div className="p-5 border-b border-axon-border flex items-center gap-3">
          <AxonLogo size={40} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-[0.3em] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>AXON</span>
            </div>
            <div className="text-[9px] text-axon-text-dim font-mono tracking-[0.25em] uppercase mt-0.5">
              Blockchain Intel
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">

          {/* General */}
          <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest mb-2 px-3 pt-2">General</div>

          <NavLink to="/overview" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Overview & Plan
          </NavLink>

          {/* Investigation */}
          <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest mb-2 px-3 pt-5">Investigation</div>

          <NavLink to="/wallet" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Wallet Investigation
          </NavLink>

          <NavLink to="/contract" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Contract Investigation
          </NavLink>

          {/* Intelligence */}
          <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest mb-2 px-3 pt-5">Intelligence</div>

          <NavLink to="/intel" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            Intelligence Databases
          </NavLink>

          {/* Future */}
          <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest mb-2 px-3 pt-5">Future</div>

          <div className="sidebar-link opacity-40 cursor-not-allowed select-none">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="flex-1">Cases</span>
            <span className="text-[9px] bg-axon-border text-axon-text-dim px-1.5 py-0.5 rounded font-mono">SOON</span>
          </div>

          <div className="sidebar-link opacity-40 cursor-not-allowed select-none">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="flex-1">Settings</span>
            <span className="text-[9px] bg-axon-border text-axon-text-dim px-1.5 py-0.5 rounded font-mono">SOON</span>
          </div>
        </nav>

        {/* API Health Footer */}
        <div className="p-4 border-t border-axon-border">
          <div className="text-[10px] text-axon-text-dim font-bold uppercase tracking-wider mb-2">API Systems Health</div>
          <div className="space-y-1.5">
            {Object.entries(apiHealth).map(([api, status]) => (
              <div key={api} className="flex items-center justify-between">
                <span className="text-xs font-mono text-axon-text-muted">{api}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono ${
                    status === null ? 'text-axon-text-dim' :
                    status ? 'text-axon-green' : 'text-red-400'
                  }`}>
                    {status === null ? 'WAIT' : status ? 'ONLINE' : 'ERROR'}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    status === null ? 'bg-axon-text-dim animate-pulse' :
                    status ? 'bg-axon-green shadow-glow-green' : 'bg-red-500 shadow-glow-red'
                  }`}></span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[9px] text-axon-text-dim font-mono text-center opacity-50">
            AXON v2.0
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Metrics Bar */}
        <MetricsBar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <Routes>
            <Route path="/" element={<Navigate to="/wallet" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/wallet" element={<WalletInvestigation />} />
            <Route path="/contract" element={<ContractInvestigation />} />
            <Route path="/intel" element={<IntelligenceDatabases />} />
            {/* Legacy redirects */}
            <Route path="/graph" element={<Navigate to="/wallet" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
