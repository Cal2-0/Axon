import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SmartAddressInput, { isValidAddress } from '../components/SmartAddressInput';
import ContractForensicReport from '../components/ContractForensicReport';
import GraphView from '../components/GraphView';
// ─── HELPERS ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={handleCopy} title="Copy" className="shrink-0 p-1 rounded hover:bg-axon-card transition-colors">
      {copied ? (
        <svg className="w-4 h-4 text-axon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-4 h-4 text-axon-text-dim hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  );
}

function SectionHeader({ color = 'cyan', icon, title, badge }) {
  const bar = { cyan: 'bg-axon-cyan', purple: 'bg-axon-purple', orange: 'bg-axon-orange', green: 'bg-axon-green', red: 'bg-red-500', yellow: 'bg-yellow-400' };
  const bdg = { cyan: 'bg-axon-cyan/10 border-axon-cyan/30 text-axon-cyan', purple: 'bg-axon-purple/10 border-axon-purple/30 text-axon-purple', orange: 'bg-axon-orange/10 border-axon-orange/30 text-axon-orange', green: 'bg-axon-green/10 border-axon-green/30 text-axon-green', red: 'bg-red-500/10 border-red-500/30 text-red-400', yellow: 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' };
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

function SeverityBadge({ severity }) {
  const map = { High: 'bg-red-500/10 text-red-400 border-red-500/30', Medium: 'bg-axon-orange/10 text-axon-orange border-axon-orange/30', Low: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30', Info: 'bg-axon-cyan/10 text-axon-cyan border-axon-cyan/30' };
  return <span className={`px-2 py-0.5 text-xs font-bold font-mono rounded border ${map[severity] || map.Info}`}>{severity}</span>;
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
          style={{ transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 8px ${color})` }} />
        <text x="70" y="64" textAnchor="middle" fontSize="30" fontWeight="bold" fill="white" fontFamily="monospace">{score}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">/100</text>
      </svg>
      <div className="flex flex-col items-center">
        <span className={`text-lg font-extrabold font-mono tracking-widest ${textColor}`}>{label}</span>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
export default function ContractInvestigation({ caseId }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeCodeTab, setActiveCodeTab] = useState('source');
  const [reportHash, setReportHash] = useState(null);
  const [isDeepDiving, setIsDeepDiving] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState(null);
  const [deepDiveResult, setDeepDiveResult] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const initialAddress = searchParams.get('address');
    if (initialAddress) {
      setAddress(initialAddress);
      runAnalysis(initialAddress);
    }
  }, [location.search]);

  const runAnalysis = async (targetAddress) => {
    if (!targetAddress.trim()) return;
    setLoading(true); setResult(null); setDeepDiveResult(null);
    try {
      const { scanContract } = await import('../api/axon');
      const data = await scanContract(targetAddress, caseId);
      setResult(data);
      
      // Use server-side hash if available, otherwise compute client-side
      if (data.report_metadata && data.report_metadata.sha256_hash) {
        setReportHash(data.report_metadata.sha256_hash);
      } else {
        try {
          const msgUint8 = new TextEncoder().encode(JSON.stringify(data));
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const docHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          setReportHash(docHash);
        } catch(e) { console.error("Hash err:", e); }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch contract analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    runAnalysis(address);
  };


  const handleDeepDive = async () => {
    if (!result || !result.identity || !result.identity.address) return;
    setIsDeepDiving(true);
    setDeepDiveError(null);
    try {
      const { scanContract } = await import('../api/axon');
      // Full re-scan at depth='deep' — runs 3-AI pipeline, produces updated score
      const deepResult = await scanContract(result.identity.address, caseId, 'deep');
      setDeepDiveResult(deepResult);
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
    a.download = `axon-contract-report-${result.identity.address.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCoC = async () => {
    if (!result || !result.report_metadata || !result.report_metadata.report_id) {
      alert("No verifiable report ID found for this scan. Run a new scan to generate a Final Analysis PDF.");
      return;
    }
    const reportId = result.report_metadata.report_id;
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';
      const response = await fetch(`${API_BASE}/scan/report/${reportId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF from backend");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error generating Final Analysis PDF: " + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">

      {/* Page Header */}
      <div className="border-b border-axon-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-axon-purple bg-axon-purple/10 border border-axon-purple/30 rounded-full">CONTRACT INVESTIGATION</span>
          <span className="w-2 h-2 rounded-full bg-axon-purple animate-pulse-slow"></span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Contract Investigation</h1>
        <p className="text-axon-text-muted mt-1 text-base max-w-2xl">
          Enter a contract address once. AXON fetches source code, ABI, metadata, then runs Slither static analysis, Mythril symbolic execution, and GoPlus token security checks.
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
            placeholder="0x... or search by name (e.g. USDT, Uniswap)"
          />
          <button type="submit" disabled={loading || !address.trim()} className="axon-button bg-axon-purple/10 border-axon-purple/50 text-axon-purple hover:bg-axon-purple hover:text-white px-8 py-3.5 min-w-[160px] font-bold" id="contract-analyze-btn">
            {loading ? (
              <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Scanning...</>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>Scan Contract</>
            )}
          </button>
        </div>


        {/* Module Pills */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-axon-border/30">
          {['Contract Info', 'Source Code', 'ABI', 'Slither Analysis', 'Mythril Analysis', 'GoPlus Engine'].map(m => (
            <span key={m} className="px-2.5 py-1 text-[11px] font-mono bg-axon-card border border-axon-border text-axon-text-dim rounded-full">{m}</span>
          ))}
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="glass-panel p-8 space-y-4 animate-fade-in">
          <div className="text-center text-axon-text-muted mb-6 text-sm font-mono">Running contract analysis pipeline...</div>
          {['Fetching Source Code & ABI', 'Running Slither Static Analysis', 'Running Mythril Symbolic Execution', 'Querying GoPlus Security API', 'Generating Risk Report'].map((m, i) => (
            <div key={m} className="flex items-center gap-4">
              <div className="w-52 text-xs font-mono text-axon-text-dim truncate">{m}</div>
              <div className="flex-1 h-1.5 bg-axon-card rounded-full overflow-hidden">
                <div className="h-full bg-axon-purple rounded-full" style={{ width: '100%', animation: `slide-loading 1.4s ease-in-out ${i * 0.2}s infinite alternate` }} />
              </div>
              <svg className="animate-spin w-3 h-3 text-axon-purple shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
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
                Scan complete · <span className="text-white">7 modules</span> · {new Date().toLocaleString()}
              </div>
              {reportHash && (
                <div className="mt-1 flex items-center gap-2 text-[10px] text-axon-text-muted font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-axon-card border border-axon-border text-axon-text-dim uppercase tracking-widest">SHA-256 PROOF</span>
                  <span className="truncate max-w-[200px] md:max-w-md">{reportHash}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDownloadCoC} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" id="contract-download-pdf-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                📄 Download Final Analysis PDF
              </button>
              <button onClick={handleExport} className="axon-button text-xs px-4 py-2 gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export JSON
              </button>
            </div>
          </div>

          {/* 1. Identity */}
          <CollapsibleSection color="purple" icon="📋" title="Contract Identity">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-sm text-axon-cyan break-all">{result.identity.address}</span>
              <CopyButton text={result.identity.address} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Contract Name', value: result.identity.name, color: 'text-white font-bold' },
                { label: 'Compiler', value: result.identity.compiler, color: 'text-axon-cyan text-xs' },
                { label: 'Network', value: result.identity.network, color: 'text-axon-green' },
                { label: 'License', value: result.identity.license, color: 'text-axon-orange text-xs' },
                { label: 'Deployed', value: result.identity.deployedDate, color: 'text-axon-text-muted' },
                { label: 'Proxy Type', value: result.identity.proxyType, color: 'text-axon-orange' },
                { label: 'Verified', value: result.identity.verified ? '✓ Source Verified' : '✗ Unverified', color: result.identity.verified ? 'text-axon-green' : 'text-red-400' },
                { label: 'Deployer', value: typeof result.identity.deployer === 'string' ? result.identity.deployer.slice(0, 14) + '...' : 'N/A', color: 'text-axon-cyan font-mono text-xs' },
              ].map(item => (
                <div key={item.label} className="bg-axon-bg rounded-lg border border-axon-border p-3">
                  <div className={`text-sm font-mono ${item.color}`}>{item.value}</div>
                  <div className="text-[10px] text-axon-text-dim uppercase tracking-wider mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* 2. Threat Indicator */}
          <CollapsibleSection color="orange" icon="⚠️" title="Threat Assessment" badge="5-AXIS BEHAVIORAL MATRIX">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="shrink-0 flex flex-col items-center gap-4">
                <RiskMeter score={result.risk.score} label={result.risk.label} />
                <div className="text-axon-text-muted text-xs font-mono font-bold mt-[-10px] bg-axon-bg px-2 py-0.5 rounded border border-axon-border">± {result.risk.ci} CI</div>
                
                {/* Score Breakdown Panel */}
                <div className="w-full bg-axon-bg rounded border border-axon-border p-3 text-left min-w-[170px]">
                  <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-wider mb-2 text-center border-b border-axon-border/50 pb-1">5-Axis Matrix Breakdown</div>
                  {[
                    { l: 'A1: Code Security', v: result.risk.axes?.A1 },
                    { l: 'A2: Admin Risk', v: result.risk.axes?.A2 },
                    { l: 'A3: Behavior', v: result.risk.axes?.A3 },
                    { l: 'A4: Topology', v: result.risk.axes?.A4 },
                    { l: 'A5: Threat Intel', v: result.risk.axes?.A5 }
                  ].map(a => (
                     <div key={a.l} className="flex justify-between items-center text-[11px] mb-1">
                        <span className="text-axon-text-muted">{a.l}</span>
                        <span className="font-mono text-white">{a.v || 0}/100</span>
                     </div>
                  ))}
                  {result.risk.multiplier && result.risk.multiplier > 1.0 && (
                    <div className="mt-2 pt-1 border-t border-axon-orange/30 flex justify-between items-center text-[11px]">
                      <span className="text-axon-orange font-bold uppercase">Cross-Axis Mult</span>
                      <span className="font-mono text-axon-orange font-bold">x{result.risk.multiplier}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-6">
                
                {/* Initial Quick Forensic Verdict */}
                {result.risk.analyticalSynthesis && result.risk.analyticalSynthesis.verdict ? (
                  <div className="mb-6 bg-[#1e293b]/50 rounded-xl border border-blue-500/30 p-5 font-sans text-sm leading-relaxed text-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b border-blue-500/20 pb-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-blue-600 rounded">ANALYST SYNTHESIS</span>
                      <span className="text-xs font-mono font-bold text-blue-400">{result.risk.analyticalSynthesis.mitre_tag || "N/A"}</span>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Plausible Hypothesis</div>
                      <p className="text-gray-300 font-mono text-xs break-words">{result.risk.analyticalSynthesis.hypothesis}</p>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Adversarial Synthesis (Executive Verdict)</div>
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

                <div>
                  <div className="text-sm font-bold text-axon-text-dim uppercase tracking-wider mb-3">Top Signals Triggered</div>
                {result.risk.factors.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-axon-bg rounded-lg border border-axon-border">
                    <span className="text-base shrink-0">{f.icon}</span>
                    <div className="flex-1 text-sm text-white">{f.reason}</div>
                    <span className="shrink-0 px-2 py-0.5 text-xs font-bold font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded">+{f.penalty}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </CollapsibleSection>

          {/* Deep Dive Independent Module */}
          {deepDiveResult && deepDiveResult.risk && deepDiveResult.risk.analyticalSynthesis && (
            <CollapsibleSection color="cyan" icon="🧠" title="Dual-Adversarial Deep Scan" badge="3-AGENT PIPELINE" defaultOpen={true}>

              {/* Updated Risk Score Delta */}
              {deepDiveResult.risk.score !== undefined && (
                <div className="mb-6 flex items-center gap-6 p-4 bg-axon-bg rounded-xl border border-axon-purple/30">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest mb-1">Quick Scan</div>
                      <div className="text-2xl font-bold font-mono text-white">{result.risk.score}</div>
                    </div>
                    <div className="text-2xl text-axon-text-dim">→</div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-axon-purple uppercase tracking-widest mb-1">Deep Scan</div>
                      <div className={`text-2xl font-bold font-mono ${deepDiveResult.risk.score >= 80 ? 'text-red-400' : deepDiveResult.risk.score >= 60 ? 'text-orange-400' : deepDiveResult.risk.score >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {deepDiveResult.risk.score}
                      </div>
                    </div>
                    <div className={`px-3 py-1 text-sm font-bold font-mono rounded border ${
                      deepDiveResult.risk.score - result.risk.score > 0
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : deepDiveResult.risk.score - result.risk.score < 0
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-axon-card text-axon-text-dim border-axon-border'
                    }`}>
                      Δ {deepDiveResult.risk.score - result.risk.score > 0 ? '+' : ''}{deepDiveResult.risk.score - result.risk.score}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className={`text-lg font-extrabold font-mono tracking-widest ${deepDiveResult.risk.score >= 80 ? 'text-red-400' : deepDiveResult.risk.score >= 60 ? 'text-orange-400' : deepDiveResult.risk.score >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {deepDiveResult.risk.label}
                    </div>
                    <div className="text-[10px] text-axon-text-dim font-mono">Updated Risk Rating</div>
                  </div>
                </div>
              )}

              <div className="mb-6 font-sans text-sm leading-relaxed">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                  {/* Prosecution Panel */}
                  <div className="bg-red-950/20 rounded-xl border border-red-500/30 p-4">
                    <div className="flex items-center justify-between mb-3 border-b border-red-500/20 pb-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-red-600 rounded">PROSECUTION PERSPECTIVE</span>
                      <span className="text-xs font-mono font-bold text-red-400">{deepDiveResult.risk.analyticalSynthesis.prosecution_risk} RISK</span>
                    </div>
                    <p className="text-gray-300 font-mono text-xs break-words">{deepDiveResult.risk.analyticalSynthesis.prosecution_summary}</p>
                  </div>

                  {/* Defense Panel */}
                  <div className="bg-[#064e3b]/40 rounded-xl border border-emerald-500/30 p-4">
                    <div className="flex items-center justify-between mb-3 border-b border-emerald-500/20 pb-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-emerald-600 rounded">DEFENSE PERSPECTIVE</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">{deepDiveResult.risk.analyticalSynthesis.defense_risk} RISK</span>
                    </div>
                    <p className="text-gray-300 font-mono text-xs break-words">{deepDiveResult.risk.analyticalSynthesis.defense_summary}</p>
                  </div>
                </div>

                {/* Judge Panel */}
                <div className="bg-[#1e293b]/50 rounded-xl border border-blue-500/30 p-5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full"></div>
                  <div className="flex items-center justify-between mb-4 border-b border-blue-500/20 pb-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-blue-600 rounded">EXECUTIVE VERDICT</span>
                      <span className="text-xs font-mono font-bold text-blue-400">{deepDiveResult.risk.analyticalSynthesis.mitre_tag || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest">Confidence</span>
                      <span className="text-xs font-mono font-bold text-white bg-blue-500/20 px-2 py-0.5 rounded">{deepDiveResult.risk.analyticalSynthesis.confidence}%</span>
                    </div>
                  </div>
                  
                  <div className="mb-4 relative z-10">
                    <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Synthesized Hypothesis</div>
                    <p className="text-gray-300 font-mono text-xs break-words">{deepDiveResult.risk.analyticalSynthesis.hypothesis}</p>
                  </div>

                  <div className="mb-4 relative z-10">
                    <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Judge Reasoning</div>
                    <p className="text-gray-400 italic text-xs break-words border-l-2 border-blue-500/30 pl-3">{deepDiveResult.risk.analyticalSynthesis.judge_reasoning}</p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 relative z-10">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex justify-between">
                      <span>Final Executive Verdict</span>
                      <span className="opacity-70">Consensus: {deepDiveResult.risk.analyticalSynthesis.consensus_level}</span>
                    </div>
                    <p className="text-white font-bold break-words">{deepDiveResult.risk.analyticalSynthesis.verdict}</p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* 3. Main Analysis Engine (GoPlus) */}
          <CollapsibleSection color="green" icon="🛡️" title="Main Analysis Engine (GoPlus)" badge={result.goplus.overall.toUpperCase()} defaultOpen={false}>
            <div className="grid md:grid-cols-2 gap-3">
              {result.goplus.checks.map((check, i) => {
                const statusMap = {
                  OK:   { color: 'border-axon-green/30 bg-axon-green/5', icon: '✓', iconColor: 'text-axon-green', textColor: 'text-axon-green' },
                  WARN: { color: 'border-axon-orange/30 bg-axon-orange/5', icon: '⚠', iconColor: 'text-axon-orange', textColor: 'text-axon-orange' },
                  RISK: { color: 'border-red-500/30 bg-red-500/5', icon: '✗', iconColor: 'text-red-400', textColor: 'text-red-400' },
                };
                const s = statusMap[check.status];
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${s.color}`}>
                    <span className={`text-base shrink-0 font-bold ${s.iconColor}`}>{s.icon}</span>
                    <div>
                      <div className={`text-sm font-semibold ${s.textColor}`}>{check.name}</div>
                      <div className="text-xs text-axon-text-dim mt-0.5">{check.detail}</div>
                    </div>
                    <span className={`ml-auto shrink-0 px-2 py-0.5 text-xs font-bold font-mono rounded border ${
                      check.status === 'OK' ? 'bg-axon-green/10 text-axon-green border-axon-green/30'
                      : check.status === 'WARN' ? 'bg-axon-orange/10 text-axon-orange border-axon-orange/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>{check.status}</span>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* 4. Contract Info */}
          <CollapsibleSection color="cyan" icon="📊" title="Contract Information" defaultOpen={false}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Token Name', value: result.info.tokenName, color: 'text-white font-bold' },
                { label: 'Symbol', value: result.info.symbol, color: 'text-axon-cyan font-bold' },
                { label: 'Total Supply', value: result.info.totalSupply, color: 'text-axon-orange text-xs' },
                { label: 'Holders', value: result.info.holders, color: 'text-axon-green' },
                { label: 'Contract Balance', value: result.info.contractBalance, color: 'text-white' },
                { label: 'Owner', value: result.info.ownerAddress, color: 'text-axon-cyan text-xs font-mono' },
              ].map(item => (
                <div key={item.label} className="bg-axon-bg rounded-lg border border-axon-border p-3">
                  <div className={`text-sm font-mono ${item.color}`}>{item.value}</div>
                  <div className="text-[10px] text-axon-text-dim uppercase tracking-wider mt-1">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {[
                { label: 'Mintable', active: result.info.isMintable, warn: true },
                { label: 'Freezable', active: result.info.isFreezable, warn: true },
                { label: 'Blacklist', active: result.info.isBlacklist, warn: true },
                { label: 'ERC-20 Token', active: result.info.isToken, warn: false },
                { label: 'Proxy', active: result.identity.proxy, warn: true },
              ].map(item => (
                <span key={item.label} className={`px-3 py-1 text-xs font-mono font-bold rounded border ${
                  item.active && item.warn ? 'bg-axon-orange/10 text-axon-orange border-axon-orange/30'
                  : item.active ? 'bg-axon-green/10 text-axon-green border-axon-green/30'
                  : 'bg-axon-card text-axon-text-dim border-axon-border'
                }`}>{item.active ? '✓' : '✗'} {item.label}</span>
              ))}
            </div>
          </CollapsibleSection>

          {/* 5. Static Vulnerability Analysis */}
          <CollapsibleSection color="red" icon="🔬" title="Static Vulnerability Analysis" badge="SLITHER ENGINE" defaultOpen={false}>
            {result.slither && result.slither.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {result.slither.map((vuln, i) => (
                  <div key={i} className="bg-axon-bg rounded-lg border border-axon-border p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-white text-sm">{vuln.name}</div>
                      <SeverityBadge severity={vuln.severity} />
                    </div>
                    <div className="text-xs text-axon-text-muted mt-1">{vuln.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-axon-green/10 border border-axon-green/30 text-axon-green rounded-lg text-sm font-mono text-center">
                ✓ No critical vulnerabilities found in source code via static analysis.
              </div>
            )}
          </CollapsibleSection>

          {/* 6. Source Code & ABI */}
          <CollapsibleSection color="purple" icon="💻" title="Source Code & ABI Viewer" defaultOpen={false}>
            {!result.identity.verified ? (
              <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                <div className="text-4xl mb-3">⚠️</div>
                <h3 className="text-red-400 font-bold mb-2 uppercase tracking-widest">Unverified Contract</h3>
                <p className="text-axon-text-muted text-sm max-w-md mx-auto mb-4">
                  The source code for this contract is not available on Etherscan. AXON is unable to perform static analysis. 
                </p>
                <button className="axon-button bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500 hover:text-white px-4 py-2 text-xs">
                  Request Analytical Engine Bytecode Decompilation (BETA)
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2 mb-4">
                  <button 
                    type="button"
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-colors ${activeCodeTab === 'source' ? 'bg-axon-cyan/20 text-axon-cyan border border-axon-cyan/40' : 'bg-axon-bg text-axon-text-dim border border-axon-border hover:bg-axon-card'}`}
                    onClick={(e) => { e.preventDefault(); setActiveCodeTab('source'); }}
                  >
                    Solidity Source
                  </button>
                  <button 
                    type="button"
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-colors ${activeCodeTab === 'abi' ? 'bg-axon-cyan/20 text-axon-cyan border border-axon-cyan/40' : 'bg-axon-bg text-axon-text-dim border border-axon-border hover:bg-axon-card'}`}
                    onClick={(e) => { e.preventDefault(); setActiveCodeTab('abi'); }}
                  >
                    Contract ABI
                  </button>
                  <div className="ml-auto">
                    <CopyButton text={activeCodeTab === 'source' ? result.sourceCode : result.abi} />
                  </div>
                </div>
                
                <div className="bg-[#05080f] rounded-lg border border-axon-border overflow-hidden">
                  <pre className="p-4 text-[10px] sm:text-xs font-mono text-axon-cyan/80 max-h-[500px] overflow-y-auto overflow-x-auto whitespace-pre-wrap">
                    {activeCodeTab === 'source' ? result.sourceCode : result.abi}
                  </pre>
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* 7. DeFi Protocol Interactions */}
          {result.graph && result.graph.defi_interactions && result.graph.defi_interactions.length > 0 && (
            <CollapsibleSection color="cyan" icon="🧩" title="DeFi Protocol Interactions" badge="DECODED" defaultOpen={false}>
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

          {/* 8. Graph & Topology */}
          {result.graph && result.graph.nodes && result.graph.nodes.length > 0 && (
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
          )}

        </div>
      )}

      {/* Empty State */}
      {!loading && !result && (
        <div className="glass-panel p-16 flex flex-col items-center justify-center text-center border-dashed border-2">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-white mb-2">Scan a Smart Contract</h3>
          <p className="text-axon-text-muted max-w-md text-sm">
            Enter any Ethereum contract address above to run all intelligence modules using real data. AXON runs Slither, Mythril, and GoPlus checks.
          </p>
        </div>
      )}


    </div>
  );
}
