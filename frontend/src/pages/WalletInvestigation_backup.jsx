import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import GraphView from '../components/GraphView';
import SmartAddressInput from '../components/SmartAddressInput';
import ForensicReport from '../components/ForensicReport';
import { downloadWalletPDF } from '../utils/pdfExport';
import { formatINR, formatIndian } from '../utils/indianFormat';
import TemporalHeatmap from '../components/TemporalHeatmap';

// ─── DEMO PROFILES ─────────────────────────────────────────────────────────
import { DEMO_PROFILES } from '../data/demoProfiles';


// ─── HELPERS ─────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} title="Copy to clipboard" className="shrink-0 p-1 rounded hover:bg-axon-card transition-colors">
      {copied ? (
        <svg className="w-4 h-4 text-axon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-4 h-4 text-axon-text-dim hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  );
}

function SectionHeader({ color = 'cyan', icon, title, badge }) {
  const bar = { cyan: 'bg-axon-cyan', purple: 'bg-axon-purple', orange: 'bg-axon-orange', green: 'bg-axon-green', red: 'bg-red-500' };
  const bdg = { cyan: 'bg-axon-cyan/10 border-axon-cyan/30 text-axon-cyan', purple: 'bg-axon-purple/10 border-axon-purple/30 text-axon-purple', orange: 'bg-axon-orange/10 border-axon-orange/30 text-axon-orange', green: 'bg-axon-green/10 border-axon-green/30 text-axon-green', red: 'bg-red-500/10 border-red-500/30 text-red-400' };
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-3">
        <span className={`w-1.5 h-6 rounded-full ${bar[color]}`}></span>
        <span className="text-lg">{icon}</span>
        {title}
      </h2>
      {badge && <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded border ${bdg[color]}`}>{badge}</span>}
    </div>
  );
}

function CollapsibleSection({ color, icon, title, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-panel overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-6 pb-0 text-left group">
        <div className="flex items-center justify-between mb-5">
          <SectionHeader color={color} icon={icon} title={title} badge={badge} />
          <svg className={`w-5 h-5 text-axon-text-dim transition-transform duration-300 shrink-0 ml-3 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

function RiskMeter({ score, label }) {
  const color = score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : score >= 40 ? '#eab308' : '#22c55e';
  const textColor = score >= 80 ? 'text-red-400' : score >= 60 ? 'text-orange-400' : score >= 40 ? 'text-yellow-400' : 'text-green-400';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle cx="70" cy="70" r="54" fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <text x="70" y="64" textAnchor="middle" fontSize="30" fontWeight="bold" fill="white" fontFamily="monospace">{score}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">/100</text>
      </svg>
      <span className={`text-lg font-extrabold font-mono tracking-widest ${textColor}`}>{label}</span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
export default function WalletInvestigation({ caseId }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [crossChain, setCrossChain] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [ethPrice, setEthPrice] = useState({ usd: 3500, inr: 290500 });
  const [reportHash, setReportHash] = useState(null);
  const [isDeepDiving, setIsDeepDiving] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,inr')
      .then(res => res.json())
      .then(data => {
        if (data.ethereum) {
          setEthPrice({ usd: data.ethereum.usd, inr: data.ethereum.inr });
        }
      })
      .catch(err => console.error('Failed to fetch live ETH price:', err));
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const initialAddress = searchParams.get('address');
    if (initialAddress) {
      setAddress(initialAddress);
      runAnalysis(initialAddress);
    }
  }, [location.search]);

  const runAnalysis = async (targetAddress) => {
    if (!targetAddress || !targetAddress.trim()) return;
    setLoading(true);
    setResult(null);
    setCrossChain(null);
    
    try {
      const { scanWallet, getCrossChainHoldings } = await import('../api/axon');
      const profile = await scanWallet(targetAddress.trim(), caseId);
      setResult(profile);

      // Async fetch cross-chain
      getCrossChainHoldings(targetAddress.trim())
        .then(cc => setCrossChain(cc))
        .catch(err => console.error("Cross-chain fetch failed:", err));

      // Generate SHA-256 integrity hash for UI
      try {
        const msgUint8 = new TextEncoder().encode(JSON.stringify(profile));
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const docHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setReportHash(docHash);
      } catch(e) { console.error("Hash err:", e); }

    } catch (err) {
      console.error(err);
      alert("Failed to fetch wallet analysis from backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (e) => {
    if (e) e.preventDefault();
    runAnalysis(address);
  };

  const handleDeepDive = async () => {
    if (!result || !result.evidence_context) return;
    setIsDeepDiving(true);
    setDeepDiveError(null);
    try {
      const { scanDeepDive } = await import('../api/axon');
      const aiResult = await scanDeepDive('wallet', result.evidence_context);
      
      // Update result state with the new Analytical Engine verdict
      setResult(prev => ({
        ...prev,
        risk: {
          ...prev.risk,
          analyticalSynthesis: aiResult
        }
      }));
    } catch (err) {
      console.error(err);
      setDeepDiveError("Failed to run deep dive analysis.");
    } finally {
      setIsDeepDiving(false);
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axon-wallet-report-${result.identity.address.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">

      {/* Page Header */}
      <div className="border-b border-axon-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-axon-cyan bg-axon-cyan/10 border border-axon-cyan/30 rounded-full">
            WALLET INVESTIGATION
          </span>
          <span className="w-2 h-2 rounded-full bg-axon-accent animate-pulse-slow"></span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Wallet Investigation</h1>
        <p className="text-axon-text-muted mt-1 text-base max-w-2xl">
          Enter a wallet address once. AXON runs all intelligence modules — risk scoring, transaction graph, OSINT attribution, exchange detection, and mixer analysis.
        </p>
      </div>

      {/* Input Panel */}
      <form onSubmit={handleAnalyze} className="glass-panel p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <SmartAddressInput
            value={address}
            onChange={setAddress}
            onSubmit={handleAnalyze}
            loading={loading}
            placeholder="0x... or search by name (e.g. Vitalik, Tornado, Binance)"
          />
          <button type="submit" disabled={loading || !address.trim()} className="axon-button axon-button-primary px-8 py-3.5 min-w-[160px] font-bold" id="wallet-analyze-btn">
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Investigate
              </>
            )}
          </button>
        </div>


        {/* Module Pills */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-axon-border/30">
          {['Wallet Risk Scorer', 'Transaction Graph', 'OSINT Engine', 'Exchange Detection', 'Mixer Detection'].map(m => (
            <span key={m} className="px-2.5 py-1 text-[11px] font-mono bg-axon-card border border-axon-border text-axon-text-dim rounded-full">{m}</span>
          ))}
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="glass-panel p-8 space-y-4 animate-fade-in">
          <div className="text-center text-axon-text-muted mb-6 text-sm font-mono">Running intelligence pipeline...</div>
          {['Wallet Risk Scorer', 'Transaction Graph Builder', 'OSINT Engine', 'Exchange Attribution', 'Mixer Detector'].map((m, i) => (
            <div key={m} className="flex items-center gap-4">
              <div className="w-40 text-xs font-mono text-axon-text-dim truncate">{m}</div>
              <div className="flex-1 h-1.5 bg-axon-card rounded-full overflow-hidden">
                <div className="h-full bg-axon-cyan rounded-full" style={{ width: '100%', animation: `slide-loading 1.2s ease-in-out ${i * 0.18}s infinite alternate` }} />
              </div>
              <svg className="animate-spin w-3 h-3 text-axon-cyan shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* ═══ RESULTS ═══════════════════════════════════════════════════════ */}
      {result && (
        <div className="space-y-6 animate-fade-in">

          {/* Export Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-sm text-axon-text-dim font-mono">
                Investigation complete · <span className="text-white">6 modules</span> · {new Date().toLocaleString()}
              </div>
              {reportHash && (
                <div className="mt-1 flex items-center gap-2 text-[10px] text-axon-text-muted font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-axon-card border border-axon-border text-axon-text-dim uppercase tracking-widest">SHA-256 PROOF</span>
                  <span className="truncate max-w-[200px] md:max-w-md">{reportHash}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={async () => await downloadWalletPDF(result)} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" id="wallet-download-pdf-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                📄 Download PDF
              </button>
              <button onClick={() => setShowReport(true)} className="axon-button text-xs px-4 py-2 gap-1.5 bg-axon-purple/10 border-axon-purple/30 text-axon-purple hover:bg-axon-purple hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                🔒 Forensic Report
              </button>
              <button onClick={handleExport} className="axon-button text-xs px-4 py-2 gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export JSON
              </button>
            </div>
          </div>

          {/* ── 1. Identity Panel ─────────────────────────────────────── */}
          <div className="glass-panel p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <SectionHeader color="cyan" icon="🔍" title="Wallet Identity" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span 
                className="font-mono text-base text-white break-all cursor-pointer hover:text-axon-cyan transition-colors"
                onClick={() => navigator.clipboard.writeText(result.identity.address)}
                title="Click to copy"
              >
                {result.identity.address}
              </span>
              <CopyButton text={result.identity.address} />
              <span className={`shrink-0 px-2 py-0.5 text-xs font-bold rounded border ${
                result.identity.tag === 'HACKER' || result.identity.tag === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : result.identity.tag === 'PUBLIC FIGURE' || result.identity.tag === 'LOW' ? 'bg-axon-green/20 text-axon-green border-axon-green/40'
                : 'bg-axon-cyan/20 text-axon-cyan border-axon-cyan/40'
              }`}>{result.identity.tag}</span>
              {result.identity.entityClass && (
                <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold font-mono tracking-widest text-axon-purple bg-axon-purple/10 border border-axon-purple/30 rounded uppercase">
                  {result.identity.entityClass} ×{result.identity.classModifier || 1.0}
                </span>
              )}
            </div>
            <div className="text-axon-text-muted text-sm font-semibold mb-4">{result.identity.label}</div>
            {result.identity.ens && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-axon-purple/10 border border-axon-purple/30 rounded-lg text-sm font-mono text-axon-purple">
                🏷️ {result.identity.ens}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-axon-bg rounded-lg border border-axon-border p-3 text-center col-span-2">
                <div className="text-lg font-bold font-mono text-axon-cyan">
                  {result.identity.ethBalance + (String(result.identity.ethBalance).includes('ETH') ? '' : ' ETH')}
                </div>
                <div className="text-[11px] text-axon-text-dim mt-0.5 font-mono">
                  ≈ ${(parseFloat(String(result.identity.ethBalance).replace(/,/g, '').replace(' ETH','')) * ethPrice.usd).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD
                  <span className="mx-2">|</span>
                  ≈ {formatINR(parseFloat(String(result.identity.ethBalance).replace(/,/g, '').replace(' ETH','')) * ethPrice.inr)} INR
                </div>
                <div className="text-[10px] text-axon-text-dim uppercase tracking-wider mt-1.5">ETH Balance (Live Value)</div>
              </div>
              <div className="bg-axon-bg rounded-lg border border-axon-border p-3 text-center col-span-2">
                <div className="text-xl font-bold font-mono text-axon-orange mt-1">
                  {result.identity.totalVolumeUSD}
                </div>
                <div className="text-[10px] text-axon-text-dim uppercase tracking-wider mt-2.5">Total Volume</div>
              </div>
              {[
                { label: 'Transactions', value: result.identity.txCount?.toLocaleString(), color: 'text-white' },
                { label: 'Counterparties', value: result.identity.uniqueCounterparties, color: 'text-white' },
                { label: 'First Seen', value: result.identity.firstSeen, color: 'text-axon-text-muted' },
                { label: 'Last Active', value: result.identity.lastSeen, color: 'text-axon-text-muted' },
                { label: 'Total Received', value: result.identity.totalReceived, color: 'text-axon-green' },
                { label: 'Total Sent', value: result.identity.totalSent, color: 'text-red-400' },
              ].map(item => (
                <div key={item.label} className="bg-axon-bg rounded-lg border border-axon-border p-3 text-center">
                  <div className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</div>
                  <div className="text-[10px] text-axon-text-dim uppercase tracking-wider mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 2. Risk Score ─────────────────────────────────────────── */}
          <div className="glass-panel p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <SectionHeader color="red" icon="⚠️" title="Risk Assessment" badge="5-LAYER BEHAVIORAL ENGINE" />
            </div>
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex flex-col items-center gap-3 shrink-0">
                <RiskMeter score={result.risk.score} label={result.risk.label} />
                
                {/* Score Breakdown Panel */}
                <div className="w-full bg-axon-bg rounded border border-axon-border p-3 text-left min-w-[170px]">
                  <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-wider mb-2 text-center border-b border-axon-border/50 pb-1">5-Layer Breakdown</div>
                  {[
                    { l: 'L1: Behavioral', v: result.risk.layers?.L1 },
                    { l: 'L2: Graph', v: result.risk.layers?.L2 },
                    { l: 'L3: Economic', v: result.risk.layers?.L3 },
                    { l: 'L4: Attribution', v: result.risk.layers?.L4 },
                    { l: 'L5: Analytical Engine Delta', v: result.risk.layers?.L5 }
                  ].map(a => (
                     <div key={a.l} className="flex justify-between items-center text-[11px] mb-1">
                        <span className="text-axon-text-muted">{a.l}</span>
                        <span className="font-mono text-white">{a.v !== undefined ? a.v : 0}/100</span>
                     </div>
                  ))}
                </div>

                <div className="text-center mt-2">
                  <div className="text-xs text-axon-text-dim">ML Classification</div>
                  <div className="text-sm font-bold font-mono text-axon-purple">{result.risk.mlClassification}</div>
                </div>
                <div className="w-full bg-axon-bg rounded border border-axon-border p-3 text-center min-w-[150px]">
                  <div className="text-xs text-axon-text-dim mb-1">Anomaly Score</div>
                  <div className="text-lg font-bold font-mono text-axon-purple">{result.risk.anomalyScore}%</div>
                  <div className="w-full h-1.5 bg-axon-card rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-axon-purple rounded-full" style={{ width: `${result.risk.anomalyScore}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                
                {/* Analytical Engine Forensic Analysis */}
                {result.risk.analyticalSynthesis && result.risk.analyticalSynthesis.engine_type === 'dual_adversarial' ? (
                  <div className="mb-6 font-sans text-sm leading-relaxed">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                      {/* Prosecution Panel */}
                      <div className="bg-red-950/20 rounded-xl border border-red-500/30 p-4">
                        <div className="flex items-center justify-between mb-3 border-b border-red-500/20 pb-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-red-600 rounded">PROSECUTION AI</span>
                          <span className="text-xs font-mono font-bold text-red-400">{result.risk.analyticalSynthesis.prosecution_risk} RISK</span>
                        </div>
                        <p className="text-gray-300 font-mono text-xs break-words">{result.risk.analyticalSynthesis.prosecution_summary}</p>
                      </div>

                      {/* Defense Panel */}
                      <div className="bg-[#064e3b]/40 rounded-xl border border-emerald-500/30 p-4">
                        <div className="flex items-center justify-between mb-3 border-b border-emerald-500/20 pb-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-emerald-600 rounded">DEFENSE AI</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">{result.risk.analyticalSynthesis.defense_risk} RISK</span>
                        </div>
                        <p className="text-gray-300 font-mono text-xs break-words">{result.risk.analyticalSynthesis.defense_summary}</p>
                      </div>
                    </div>

                    {/* Judge Panel */}
                    <div className="bg-[#1e293b]/50 rounded-xl border border-blue-500/30 p-5 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full"></div>
                      <div className="flex items-center justify-between mb-4 border-b border-blue-500/20 pb-2 relative z-10">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-blue-600 rounded">CHIEF JUDGE VERDICT</span>
                          <span className="text-xs font-mono font-bold text-blue-400">{result.risk.analyticalSynthesis.mitre_tag || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest">Confidence</span>
                          <span className="text-xs font-mono font-bold text-white bg-blue-500/20 px-2 py-0.5 rounded">{result.risk.analyticalSynthesis.confidence}%</span>
                        </div>
                      </div>
                      
                      <div className="mb-4 relative z-10">
                        <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Synthesized Hypothesis</div>
                        <p className="text-gray-300 font-mono text-xs break-words">{result.risk.analyticalSynthesis.hypothesis}</p>
                      </div>

                      <div className="mb-4 relative z-10">
                        <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Judge Reasoning</div>
                        <p className="text-gray-400 italic text-xs break-words border-l-2 border-blue-500/30 pl-3">{result.risk.analyticalSynthesis.judge_reasoning}</p>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 relative z-10">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex justify-between">
                          <span>Final Executive Verdict</span>
                          <span className="opacity-70">Consensus: {result.risk.analyticalSynthesis.consensus_level}</span>
                        </div>
                        <p className="text-white font-bold break-words">{result.risk.analyticalSynthesis.verdict}</p>
                      </div>
                    </div>
                  </div>
                ) : result.risk.analyticalSynthesis && result.risk.analyticalSynthesis.verdict ? (
                  <div className="mb-6 bg-[#1e293b]/50 rounded-xl border border-blue-500/30 p-5 font-sans text-sm leading-relaxed text-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b border-blue-500/20 pb-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-blue-600 rounded">FORENSIC VERDICT</span>
                      <span className="text-xs font-mono font-bold text-blue-400">{result.risk.analyticalSynthesis.mitre_tag || "N/A"}</span>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Plausible Hypothesis</div>
                      <p className="text-gray-300 font-mono text-xs break-words">{result.risk.analyticalSynthesis.hypothesis}</p>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Executive Verdict</div>
                      <p className="text-white font-bold break-words">{result.risk.analyticalSynthesis.verdict}</p>
                    </div>

                    <div className="mt-6 border-t border-blue-500/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-blue-300/70 max-w-sm">
                        This is a quick summary. For a comprehensive forensic analysis, run the Dual Adversarial Analytical Engine Engine.
                      </div>
                      <button
                        onClick={handleDeepDive}
                        disabled={isDeepDiving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono tracking-wider rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                      >
                        {isDeepDiving ? 'ANALYZING...' : 'RUN DEEP DIVE ANALYSIS'}
                      </button>
                    </div>
                    {deepDiveError && <div className="mt-3 text-red-400 text-xs">{deepDiveError}</div>}
                  </div>
                ) : null}
                <div className="text-sm font-bold text-axon-text-dim uppercase tracking-wider mb-3">Risk Factors</div>
                <div className="space-y-3">
                  {result.risk.factors.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-axon-bg rounded-lg border border-axon-border">
                      <span className="text-base shrink-0">{f.icon}</span>
                      <div className="flex-1 min-w-0 text-sm text-white">{f.reason}</div>
                      <span className="shrink-0 px-2 py-0.5 text-xs font-bold font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded">+{f.penalty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>


          <div className="block">
            {/* ── 4. OSINT & Threat Alerts ──────────────────────────────────────── */}
            <CollapsibleSection color="purple" icon="🛰️" title="OSINT & Threat Alerts" badge="LIVE" defaultOpen={true}>
            {result.osint.analyticalSynthesis && result.osint.analyticalSynthesis.verdict ? (
              <div className="mb-6 p-4 bg-axon-purple/5 border border-axon-purple/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3 border-b border-axon-purple/20 pb-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-axon-purple/20 text-axon-purple rounded">THREAT SUMMARY</span>
                  <span className="text-xs font-bold text-white">{result.osint.analyticalSynthesis.mitre_tag || "N/A"}</span>
                </div>
                <div className="text-xs text-axon-text-dim uppercase tracking-widest mb-1 font-bold">Hypothesis</div>
                <p className="text-sm text-axon-text-muted leading-relaxed mb-3">{result.osint.analyticalSynthesis.hypothesis}</p>
                <div className="text-xs text-axon-text-dim uppercase tracking-widest mb-1 font-bold">Verdict</div>
                <p className="text-sm text-axon-purple font-bold leading-relaxed">{result.osint.analyticalSynthesis.verdict}</p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-axon-purple/5 border border-axon-purple/20 rounded-lg text-sm text-axon-text-muted">
                {result.osint.summary}
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Forta Alerts */}
              <div>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-red-400">🚨</span> Forta Network Alerts
                </div>
                <div className="p-4 bg-axon-bg rounded border border-axon-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Live Security Alerts</div>
                    <div className="text-xs text-axon-text-dim">Triggered in the last 24h</div>
                  </div>
                  <div className={`text-2xl font-mono font-bold ${result.holdings?.forta_alerts > 0 ? 'text-red-400' : 'text-axon-green'}`}>
                    {result.holdings?.forta_alerts || 0}
                  </div>
                </div>
              </div>

              {/* Stablecoin Flows */}
              <div>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-green-400">💵</span> Stablecoin Flow Analysis
                </div>
                <div className="p-4 bg-axon-bg rounded border border-axon-border flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-white">USDT / USDC Volume</div>
                      <div className="text-xs text-axon-text-dim">Historical Token Transfers</div>
                    </div>
                    <div className="text-xl font-mono font-bold text-green-400">
                      ${(result.holdings?.stablecoin_flows?.total_usd_volume || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-axon-border/50">
                    <div>
                      <div className="text-axon-text-dim mb-1">INFLOW</div>
                      <div className="text-green-400">USDT: +{(result.holdings?.stablecoin_flows?.usdt_in || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                      <div className="text-green-400">USDC: +{(result.holdings?.stablecoin_flows?.usdc_in || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                    </div>
                    <div>
                      <div className="text-axon-text-dim mb-1">OUTFLOW</div>
                      <div className="text-red-400">USDT: -{(result.holdings?.stablecoin_flows?.usdt_out || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                      <div className="text-red-400">USDC: -{(result.holdings?.stablecoin_flows?.usdc_out || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Alchemy Token Holdings */}
              <div>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-axon-cyan">🪙</span> ERC-20 Token Holdings
                </div>
                <div className="p-4 bg-axon-bg rounded border border-axon-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Distinct Tokens Found</div>
                    <div className="text-xs text-axon-text-dim">Via Alchemy RPC</div>
                  </div>
                  <div className="text-2xl font-mono font-bold text-axon-cyan">
                    {result.holdings?.erc20_count || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3">Discovered Aliases</div>
                <div className="flex flex-wrap gap-2">
                  {result.osint.aliases.map(a => (
                    <span key={a} className="px-2.5 py-1 text-xs font-mono bg-axon-purple/10 border border-axon-purple/30 text-axon-purple rounded">{a}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3">Threat Mentions</div>
                <div className="p-4 bg-axon-bg rounded border border-axon-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">OSINT Platform Mentions</div>
                    <div className="text-xs text-axon-text-dim">Scraped from security feeds</div>
                  </div>
                  <div className={`text-2xl font-mono font-bold ${result.osint.walletMentions > 0 ? 'text-red-400' : 'text-axon-green'}`}>
                    {result.osint.walletMentions || 0}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          </div>

          <div className="block">
            {/* ── 4.5 DeFi Interactions ────────────────────────────────── */}
            {result.graph && result.graph.defi_interactions && result.graph.defi_interactions.length > 0 && (
              <CollapsibleSection color="cyan" icon="🧩" title="DeFi Protocol Interactions" badge="DECODED" defaultOpen={true}>
              <div className="mb-4 p-3 bg-axon-cyan/5 border border-axon-cyan/20 rounded-lg text-sm text-axon-text-muted">
                Analyzed raw hex calldata and mapped to known smart contract ABI signatures using Openchain database.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="border-b border-axon-border text-left">
                      {['Date', 'Method', 'Narrative', 'To Contract', 'Hash'].map(h => (
                        <th key={h} className="pb-2 pr-4 text-xs text-axon-text-dim uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.graph.defi_interactions.map((tx, i) => {
                      const date = new Date(parseInt(tx.timestamp) * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      return (
                        <tr key={i} className="border-b border-axon-border/50 hover:bg-axon-card/30 transition-colors">
                          <td className="py-3 pr-4 text-axon-text-dim whitespace-nowrap">{date}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded border ${tx.is_defi ? 'bg-axon-purple/10 text-axon-purple border-axon-purple/30' : 'bg-axon-card text-white border-axon-border'}`}>
                              {tx.simple_name}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-white max-w-[300px] truncate" title={tx.narrative}>{tx.narrative}</td>
                          <td className="py-3 pr-4 text-axon-cyan text-xs">
                            <a href={`https://etherscan.io/address/${tx.to}`} target="_blank" rel="noreferrer" className="hover:underline">
                              {tx.to.slice(0, 8)}...
                            </a>
                          </td>
                          <td className="py-3 pr-4 text-axon-text-muted text-xs">
                            <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                              {tx.hash.slice(0, 10)}...
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}
          </div>

          <div className="block">
          {/* ── 5. Exchange Detection ────────────────────────────────── */}
          <CollapsibleSection color="green" icon="🏦" title="Exchange Detection" badge="ATTRIBUTION ENGINE" defaultOpen={true}>
            <div className="mb-4 p-3 bg-axon-green/5 border border-axon-green/20 rounded-lg text-sm text-axon-text-muted">
              {result.exchange.summary}
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-axon-bg rounded border border-axon-border p-4 text-center">
                <div className="text-2xl font-bold font-mono text-axon-orange">{result.exchange.findings.length}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Exchanges Matched</div>
              </div>
              <div className="bg-axon-bg rounded border border-axon-border p-4 text-center">
                <div className="text-2xl font-bold font-mono text-axon-green">{result.exchange.cashOutEvents}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Cash-Out Events</div>
              </div>
              <div className="bg-axon-bg rounded border border-axon-border p-4 text-center">
                <div className="text-xl font-bold font-mono text-red-400">{result.exchange.totalCashOutUSD}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Total Cashed Out</div>
              </div>
            </div>
            {result.exchange.findings.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="border-b border-axon-border text-left">
                      {['Exchange', 'Deposit Address', 'Confidence', 'Type', 'Volume (ETH)', 'Date', 'Status'].map(h => (
                        <th key={h} className="pb-2 pr-4 text-xs text-axon-text-dim uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.exchange.findings.map((f, i) => (
                      <tr key={i} className="border-b border-axon-border/50 hover:bg-axon-card/30 transition-colors">
                        <td className="py-3 pr-4 font-bold text-white">{f.exchange}</td>
                        <td className="py-3 pr-4 text-axon-cyan text-xs">{f.address}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-axon-card rounded-full overflow-hidden">
                              <div className="h-full bg-axon-green rounded-full" style={{ width: `${f.confidence}%` }} />
                            </div>
                            <span className="text-axon-green text-xs">{f.confidence}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-axon-text-muted">{f.type}</td>
                        <td className="py-3 pr-4 text-white">{f.volumeETH}</td>
                        <td className="py-3 pr-4 text-axon-text-dim">{f.date}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded border ${
                            f.status === 'FLAGGED' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : f.status === 'BLOCKED' ? 'bg-axon-orange/10 text-axon-orange border-axon-orange/30'
                            : 'bg-axon-green/10 text-axon-green border-axon-green/30'
                          }`}>{f.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>

          {/* ── 6. Mixer Detection ───────────────────────────────────── */}
          <CollapsibleSection color="orange" icon="🌪️" title="Mixer Detection" badge="LAUNDERING ANALYSIS" defaultOpen={false}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-axon-bg rounded border border-red-500/30 p-4 text-center">
                <div className="text-2xl font-bold font-mono text-red-400">{result.mixer.findings.length}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Mixers Detected</div>
              </div>
              <div className="bg-axon-bg rounded border border-axon-border p-4 text-center">
                <div className="text-2xl font-bold font-mono text-axon-orange">{result.mixer.bridgeActivity.length}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Bridges Used</div>
              </div>
              <div className="bg-axon-bg rounded border border-red-500/30 p-4 col-span-2 text-center">
                <div className="text-xl font-bold font-mono text-red-400">{result.mixer.totalMixedETH}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Total Mixed</div>
              </div>
            </div>

            <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3">Mixer Usage</div>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="border-b border-axon-border text-left">
                    {['Pool', 'Transactions', 'Total ETH', 'First Use', 'Last Use', 'Risk'].map(h => (
                      <th key={h} className="pb-2 pr-4 text-xs text-axon-text-dim uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.mixer.findings.map((f, i) => (
                    <tr key={i} className="border-b border-axon-border/50 hover:bg-axon-card/30 transition-colors">
                      <td className="py-3 pr-4 text-white">{f.mixer}</td>
                      <td className="py-3 pr-4 text-axon-orange">{f.txCount.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-red-400 font-bold">{f.totalETH}</td>
                      <td className="py-3 pr-4 text-axon-text-dim">{f.firstUse}</td>
                      <td className="py-3 pr-4 text-axon-text-dim">{f.lastUse}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded border ${
                          f.risk === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : f.risk === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                          : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30'
                        }`}>{f.risk}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.mixer.bridgeActivity.length > 0 && (
              <>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3">Bridge Activity</div>
                <div className="grid md:grid-cols-2 gap-3 mb-6">
                  {result.mixer.bridgeActivity.map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-axon-bg rounded border border-axon-border">
                      <span className="text-sm text-white">{b.bridge}</span>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-axon-orange">{b.volumeUSD}</div>
                        <div className="text-xs text-axon-text-dim">{b.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3">Laundering Indicators</div>
            <div className="space-y-2">
              {result.mixer.launderingIndicators.map((ind, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 rounded border border-red-500/20">
                  <span className="text-red-400 text-xs mt-0.5 shrink-0">▸</span>
                  <span className="text-xs text-axon-text-muted">{ind}</span>
                 </div>
               ))}
             </div>
           </CollapsibleSection>
          </div>

          <div className="block">
          {/* ── 6.5 Temporal Activity Analysis ───────────────────────────────────── */}
          {result.temporal_activity && result.temporal_activity.length > 0 && (
            <CollapsibleSection color="cyan" icon="🕒" title="Temporal Activity Analysis" badge="TIMEZONE HEATMAP" defaultOpen={true}>
              <div className="mb-4 p-3 bg-axon-cyan/5 border border-axon-cyan/20 rounded-lg text-sm text-axon-text-muted">
                Transaction frequency by Day of Week & Hour of Day (UTC). Concentrated clusters can help deduce the operator's geographic timezone or automated script schedules.
              </div>
              <TemporalHeatmap data={result.temporal_activity} />
            </CollapsibleSection>
          )}
          </div>

          <div className="block">
           {/* ── 7. Transaction History ────────────────────────────────── */}
          <CollapsibleSection color="slate" icon="📜" title="Transaction History" badge={`${result.transactions?.length || 0} RECORDS`} defaultOpen={false}>
            {result.transactions && result.transactions.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm font-mono">
                  <thead className="sticky top-0 bg-axon-bg z-10">
                    <tr className="border-b border-axon-border text-left">
                      {['Hash', 'Block', 'Type', 'From / To', 'Value (ETH)', 'Gas Fee'].map(h => (
                        <th key={h} className="py-3 pr-4 text-xs text-axon-text-dim uppercase tracking-wider bg-axon-bg">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.transactions.map((tx, i) => {
                      const isIncoming = tx.to?.toLowerCase() === result.identity.address.toLowerCase();
                      const valEth = (parseInt(tx.value || '0') / 1e18).toFixed(4);
                      const gasEth = ((parseInt(tx.gasUsed || '0') * parseInt(tx.gasPrice || '0')) / 1e18).toFixed(6);
                      const displayAddr = isIncoming ? tx.from : tx.to;
                      return (
                        <tr key={tx.hash || i} className="border-b border-axon-border/50 hover:bg-axon-card/30 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2 text-axon-cyan">
                              {tx.hash ? tx.hash.substring(0, 10) + '...' : 'N/A'}
                              {tx.hash && <CopyButton text={tx.hash} />}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-axon-text-dim">{tx.blockNumber || 'Pending'}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                              isIncoming 
                                ? 'bg-axon-green/10 text-axon-green border-axon-green/30' 
                                : 'bg-axon-orange/10 text-axon-orange border-axon-orange/30'
                            }`}>
                              {isIncoming ? 'IN' : 'OUT'}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-white">
                            {displayAddr ? displayAddr.substring(0, 8) + '...' + displayAddr.substring(displayAddr.length - 6) : 'Contract Creation'}
                          </td>
                          <td className={`py-3 pr-4 font-bold ${isIncoming ? 'text-axon-green' : 'text-axon-text-dim'}`}>
                            {isIncoming ? '+' : '-'}{valEth}
                          </td>
                          <td className="py-3 pr-4 text-axon-text-muted">{gasEth}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-axon-border rounded-lg text-axon-text-dim">
                No transaction history found on Ethereum Mainnet.
              </div>
            )}
          </CollapsibleSection>
          </div>

          <div className="block">
          {/* ── Transaction Graph (Moved to Bottom) ──────────────────── */}
          <CollapsibleSection color="orange" icon="🕸️" title="Money Flow & Topology" badge="VISUALIZATION" defaultOpen={true}>
            <div className="h-[500px] rounded-lg overflow-hidden bg-axon-bg border border-axon-border">
              <GraphView data={result.graph} />
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs font-mono">
              {[
                { color: 'bg-red-500', label: 'Hacker/Suspect' },
                { color: 'bg-purple-500', label: 'Mixer' },
                { color: 'bg-blue-500', label: 'Exchange' },
                { color: 'bg-axon-cyan', label: 'Victim' },
                { color: 'bg-slate-600', label: 'Normal' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5 text-axon-text-dim">
                  <span className={`w-3 h-3 rounded-full ${item.color}`} />
                  {item.label}
                </div>
              ))}
            </div>
          </CollapsibleSection>
          </div>

        </div>
      )}

      {/* Empty State */}
      {!loading && !result && (
        <div className="glass-panel p-16 flex flex-col items-center justify-center text-center border-dashed border-2">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-white mb-2">Start an Investigation</h3>
          <p className="text-axon-text-muted max-w-md text-sm">
            Enter a wallet address above to run all 5 intelligence modules simultaneously using real data.
          </p>
        </div>
      )}

      {/* Forensic Report Overlay */}
      {showReport && result && (
        <ForensicReport result={result} onClose={() => setShowReport(false)} />
      )}

    </div>
  );
}
