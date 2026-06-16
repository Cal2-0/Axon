import React, { useState, useEffect } from 'react';
import SmartAddressInput from '../components/SmartAddressInput';
import ContractForensicReport from '../components/ContractForensicReport';
import { downloadContractPDF } from '../utils/pdfExport';


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
export default function ContractInvestigation() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeCodeTab, setActiveCodeTab] = useState('source');
  const [showReport, setShowReport] = useState(false);

  // Removed async polling for Grok AI as it is now integrated synchronously.

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true); setResult(null);
    try {
      const { scanContract } = await import('../api/axon');
      const profile = await scanContract(address.trim());
      setResult(profile);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch contract analysis from backend.");
    } finally {
      setLoading(false);
    }
  };


  const handleExport = () => {
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `axon-contract-report-${result.identity.address.slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
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
          <div className="flex items-center justify-between">
            <div className="text-sm text-axon-text-dim font-mono">
              Scan complete · <span className="text-white">7 modules</span> · {new Date().toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => downloadContractPDF(result)} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" id="contract-download-pdf-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                📄 Download PDF
              </button>
              <button onClick={() => setShowReport(true)} className="axon-button text-xs px-4 py-2 gap-1.5 bg-axon-purple/10 border-axon-purple/30 text-axon-purple hover:bg-axon-purple hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                🔬 Audit Report
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

          {/* 2. Risk Score */}
          <CollapsibleSection color="orange" icon="⚠️" title="Risk Assessment" badge="5-AXIS BEHAVIORAL MATRIX">
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
                
                {/* Strict Forensic Verdict */}
                {result.risk.aiAnalysis && result.risk.aiAnalysis.verdict && (
                  <div className="bg-[#1e293b]/50 rounded-xl border border-blue-500/30 p-5 font-sans text-sm leading-relaxed text-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b border-blue-500/20 pb-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-blue-600 rounded">FORENSIC VERDICT</span>
                      <span className="text-xs font-mono font-bold text-blue-400">{result.risk.aiAnalysis.mitre_tag || "N/A"}</span>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Plausible Hypothesis</div>
                      <p className="text-gray-300 font-mono text-xs">{result.risk.aiAnalysis.hypothesis}</p>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Executive Verdict</div>
                      <p className="text-white font-bold">{result.risk.aiAnalysis.verdict}</p>
                    </div>
                  </div>
                )}

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

      {/* Forensic Report Overlay */}
      {showReport && result && (
        <ContractForensicReport result={result} onClose={() => setShowReport(false)} />
      )}

    </div>
  );
}
