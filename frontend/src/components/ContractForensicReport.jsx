import React, { useRef } from 'react';
import { API_BASE } from '../api/axon';

// ─── CONTRACT FORENSIC INTELLIGENCE REPORT ──────────────────────────────────
// National forensic digital lab standard — smart contract security audit format
export default function ContractForensicReport({ result, onClose }) {
  const reportRef = useRef(null);
  if (!result) return null;

  const caseId = result.report_metadata?.report_id || `AXN-SC-${Date.now().toString(36).toUpperCase().slice(0, 6)}-${result.identity.address.slice(2, 8).toUpperCase()}`;
  const reportDate = new Date();
  const dateStr = reportDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = reportDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const riskColor = result.risk.score >= 80 ? '#ef4444' : result.risk.score >= 60 ? '#f97316' : result.risk.score >= 40 ? '#eab308' : '#22c55e';
  const totalSlither = result.slither?.length || 0;
  const totalMythril = result.mythril?.length || 0;
  const totalFindings = totalSlither + totalMythril;
  const criticalFindings = (result.slither || []).filter(f => f.severity === 'High').length + (result.mythril || []).filter(f => f.severity === 'High').length;
  const mediumFindings = (result.slither || []).filter(f => f.severity === 'Medium').length + (result.mythril || []).filter(f => f.severity === 'Medium').length;
  const lowFindings = totalFindings - criticalFindings - mediumFindings;

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>AXON Contract Report ${caseId}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Inter',sans-serif;background:#0a0f1a;color:#cbd5e1;padding:0;font-size:13px;line-height:1.6}
      .page{max-width:850px;margin:0 auto;padding:48px 56px;background:#0d1321;border:1px solid rgba(255,255,255,0.06)}
      @media print{body{background:#fff;color:#1a1a1a;font-size:11px}.page{border:none;padding:24px 32px;background:#fff}
        .cls-mark{color:#333!important}.risk-fill{print-color-adjust:exact;-webkit-print-color-adjust:exact}
        .tag{border:1px solid #999!important;background:#f0f0f0!important;color:#333!important}pre{background:#f5f5f5!important;color:#333!important}}
      .cls-mark{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:3px;text-align:center;padding:6px 0;color:#ef4444;border-bottom:1px solid rgba(255,255,255,0.06)}
      h1{font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.02em}
      h2{font-size:15px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;display:flex;align-items:center;gap:8px}
      h2 .bar{width:3px;height:20px;border-radius:2px;flex-shrink:0}
      h3{font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px}
      .mono{font-family:'JetBrains Mono',monospace}
      .sec{padding:28px 0;border-bottom:1px solid rgba(255,255,255,0.06)}
      .sec:last-child{border-bottom:none}
      .sec-bar{display:block;width:100%;height:1px;background:rgba(255,255,255,0.06);margin:20px 0}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
      .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}
      .cell{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:10px 12px}
      .cell .label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;font-family:'JetBrains Mono',monospace}
      .cell .val{font-size:13px;color:#e2e8f0;font-weight:600}
      .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;border:1px solid}
      .tag-red{background:rgba(239,68,68,0.1);color:#ef4444;border-color:rgba(239,68,68,0.3)}
      .tag-orange{background:rgba(249,115,22,0.1);color:#f97316;border-color:rgba(249,115,22,0.3)}
      .tag-yellow{background:rgba(234,179,8,0.1);color:#eab308;border-color:rgba(234,179,8,0.3)}
      .tag-green{background:rgba(34,197,94,0.1);color:#22c55e;border-color:rgba(34,197,94,0.3)}
      .tag-cyan{background:rgba(34,211,238,0.1);color:#22d3ee;border-color:rgba(34,211,238,0.3)}
      .tag-purple{background:rgba(167,139,250,0.1);color:#a78bfa;border-color:rgba(167,139,250,0.3)}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;padding:8px 12px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;font-family:'JetBrains Mono',monospace;border-bottom:1px solid rgba(255,255,255,0.08)}
      td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);color:#cbd5e1}
      .finding{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px 16px;margin-bottom:10px}
      .finding:last-child{margin-bottom:0}
      .conclusion-box{background:rgba(34,211,238,0.04);border:1px solid rgba(34,211,238,0.15);border-radius:8px;padding:16px 20px}
      pre.code{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:12px 16px;font-family:'JetBrains Mono',monospace;font-size:11px;overflow-x:auto;line-height:1.7;color:#e2e8f0;max-height:200px;overflow-y:auto}
    </style></head><body>${reportRef.current?.innerHTML || ''}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ caseId, generated: reportDate.toISOString(), classification: 'CONFIDENTIAL', contract: result.identity, risk: result.risk, info: result.info, slither: result.slither || [], mythril: result.mythril || [], goplus: result.goplus }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `AXON-${caseId}.json`; a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}>
      {/* ── Toolbar ── */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-axon-surface/95 backdrop-blur-md border-b border-axon-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-axon-purple/20 border border-axon-purple/40 flex items-center justify-center text-axon-purple text-sm font-bold">🔬</div>
          <div>
            <div className="text-sm font-bold text-white">Smart Contract Security Audit Report</div>
            <div className="text-[10px] font-mono text-axon-text-dim">CASE {caseId} · CONTRACT INVESTIGATION</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            if (!result || !result.report_metadata || !result.report_metadata.report_id) {
              alert("Report ID not found.");
              return;
            }
            window.open(`${API_BASE}/scan/report/${result.report_metadata.report_id}/pdf`, "_blank");
          }} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            📄 Download Final PDF
          </button>
          <button onClick={handlePrint} className="axon-button text-xs px-4 py-2 gap-1.5 bg-axon-cyan/10 border-axon-cyan/30 text-axon-cyan hover:bg-axon-cyan hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print / PDF
          </button>
          <button onClick={handleExportJSON} className="axon-button text-xs px-4 py-2 gap-1.5">Export JSON</button>
          <button onClick={onClose} className="axon-button text-xs px-4 py-2 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white">✕ Close</button>
        </div>
      </div>

      {/* ══════════════ REPORT BODY ══════════════ */}
      <div ref={reportRef} className="w-full max-w-[850px] mx-auto mt-16 mb-16">
        <div className="page">

          {/* Classification Banner */}
          <div className="cls-mark">CONFIDENTIAL — AXON SMART CONTRACT SECURITY AUDIT — FOR AUTHORIZED RECIPIENTS ONLY</div>

          {/* ── COVER HEADER ── */}
          <div className="sec" style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontSize: 12, fontWeight: 700 }}>A</div>
                  <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.25em', color: '#fff' }}>AXON</span>
                </div>
                <div className="mono" style={{ fontSize: 9, color: '#64748b', letterSpacing: '0.2em' }}>BLOCKCHAIN INTELLIGENCE PLATFORM</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="tag tag-red">CONFIDENTIAL</span>
              </div>
            </div>

            <h1 style={{ marginBottom: 6 }}>Smart Contract Security Audit Report</h1>
            <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 600, marginBottom: 20 }}>
              Comprehensive automated security audit encompassing static analysis (Slither), symbolic execution (Mythril),
              token security verification (GoPlus), source code review, ABI analysis, and risk classification of the target smart contract.
            </p>

            {/* Document Control */}
            <div className="grid4">
              <div className="cell"><div className="label">Case Reference</div><div className="val mono" style={{ color: '#a78bfa', fontSize: 12 }}>{caseId}</div></div>
              <div className="cell"><div className="label">Report Date</div><div className="val">{dateStr}</div></div>
              <div className="cell"><div className="label">Time</div><div className="val mono">{timeStr}</div></div>
              <div className="cell"><div className="label">Classification</div><div className="val" style={{ color: '#ef4444' }}>CONFIDENTIAL</div></div>
              <div className="cell"><div className="label">Audit Engine</div><div className="val">AXON v2.0 Auto</div></div>
              <div className="cell"><div className="label">Network</div><div className="val">{result.identity.network}</div></div>
              <div className="cell"><div className="label">Total Findings</div><div className="val" style={{ color: totalFindings > 5 ? '#ef4444' : '#22c55e' }}>{totalFindings}</div></div>
              <div className="cell"><div className="label">Report Status</div><div className="val" style={{ color: '#22c55e' }}>FINAL</div></div>
            </div>
          </div>

          {/* ── TABLE OF CONTENTS ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#64748b' }}></span>Table of Contents</h2>
            <div style={{ columns: 2, columnGap: 32 }}>
              {[
                ['1', 'Executive Summary', 'Risk overview & key findings'],
                ['2', 'Contract Identification', 'Deployer, compiler, verification status'],
                ['3', 'Risk Assessment', 'Composite score & factor breakdown'],
                ['4', 'Contract Properties', 'Token metadata & capability flags'],
                ['5', 'Static Analysis — Slither', 'Automated vulnerability detection'],
                ['6', 'Symbolic Execution — Mythril', 'Formal verification findings'],
                ['7', 'Token Security — GoPlus', 'Third-party security checks'],
                ['8', 'Source Code Review', 'Annotated source & ABI summary'],
                ['9', 'Conclusions', 'Final assessment & recommendations'],
              ].map(([num, title, desc]) => (
                <div key={num} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span className="mono" style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, width: 16, flexShrink: 0 }}>{num}.</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{title}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 1. EXECUTIVE SUMMARY ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#a78bfa' }}></span>1. Executive Summary</h2>
            <div style={{ display: 'flex', gap: 24 }}>
              {/* Threat Level */}
              <div style={{ flexShrink: 0, width: 160, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '20px 16px' }}>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Threat Level</div>
                <div className="mono" style={{ fontSize: 48, fontWeight: 800, color: riskColor, lineHeight: 1 }}>{result.risk.score}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>/100</div>
                <div style={{ fontSize: 9, color: '#a78bfa', marginTop: 8, textTransform: 'uppercase' }}>Behaviour: {result.risk.label}</div>
                <div style={{ fontSize: 9, color: '#a78bfa', marginTop: 2, textTransform: 'uppercase' }}>Confidence: Medium</div>
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
                  <div className="risk-fill" style={{ width: `${result.risk.score}%`, height: '100%', borderRadius: 3, background: riskColor }}></div>
                </div>
                <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: riskColor, marginTop: 8, letterSpacing: '0.15em' }}>{result.risk.label}</div>
              </div>
              {/* Summary Text */}
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: 12, lineHeight: 1.7 }}>
                  This report documents the automated security audit of contract
                  <strong style={{ color: '#fff' }}> {result.identity.name}</strong> deployed at
                  <span className="mono" style={{ color: '#a78bfa', fontSize: 11 }}> {result.identity.address.slice(0, 16)}...{result.identity.address.slice(-6)}</span>.
                </p>
                <p style={{ marginBottom: 12, lineHeight: 1.7 }}>
                  The audit identified a total of <strong style={{ color: '#fff' }}>{totalFindings} findings</strong> across
                  all analysis engines: <strong style={{ color: '#ef4444' }}>{criticalFindings} High</strong>,{' '}
                  <strong style={{ color: '#f97316' }}>{mediumFindings} Medium</strong>, and{' '}
                  <strong style={{ color: '#eab308' }}>{lowFindings} Low/Info</strong> severity issues.
                  GoPlus overall assessment: <strong style={{ color: riskColor }}>{result.goplus.overall}</strong>.
                </p>

                {/* Severity Distribution */}
                <div className="grid4" style={{ marginTop: 16 }}>
                  <div className="cell"><div className="label">High Severity</div><div className="val" style={{ fontSize: 20, color: '#ef4444' }}>{criticalFindings}</div></div>
                  <div className="cell"><div className="label">Medium</div><div className="val" style={{ fontSize: 20, color: '#f97316' }}>{mediumFindings}</div></div>
                  <div className="cell"><div className="label">Low / Info</div><div className="val" style={{ fontSize: 20, color: '#eab308' }}>{lowFindings}</div></div>
                  <div className="cell"><div className="label">GoPlus</div><div className="val" style={{ fontSize: 12, color: riskColor }}>{result.goplus.overall}</div></div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. CONTRACT IDENTIFICATION ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#22d3ee' }}></span>2. Contract Identification</h2>
            <div className="grid4">
              {[
                ['Contract Name', result.identity.name, '#fff'],
                ['Address', result.identity.address, '#a78bfa'],
                ['Compiler', result.identity.compiler, '#22d3ee'],
                ['Network', result.identity.network, '#22c55e'],
                ['License', result.identity.license, '#f97316'],
                ['Deployed', result.identity.deployedDate, '#94a3b8'],
                ['Proxy', result.identity.proxyType, result.identity.proxy ? '#f97316' : '#22c55e'],
                ['Verified', result.identity.verified ? '✓ Source Verified' : '✗ Unverified', result.identity.verified ? '#22c55e' : '#ef4444'],
                ['Deployer', typeof result.identity.deployer === 'string' ? result.identity.deployer.slice(0, 14) + '...' : 'N/A', '#22d3ee'],
              ].map(([label, value, color]) => (
                <div key={label} className="cell">
                  <div className="label">{label}</div>
                  <div className="val mono" style={{ color, fontSize: value.length > 24 ? 9 : 12, wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 3. RISK ASSESSMENT ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#ef4444' }}></span>3. Risk Assessment</h2>
            <p style={{ marginBottom: 16 }}>
              Risk factors are derived from automated static analysis, symbolic execution, token security scanning, and contract property inspection.
            </p>
            <table>
              <thead>
                <tr><th style={{ width: 30 }}>#</th><th style={{ width: 40 }}>Sev.</th><th style={{ width: 60 }}>Weight</th><th>Risk Factor Description</th></tr>
              </thead>
              <tbody>
                {result.risk.factors.sort((a, b) => b.penalty - a.penalty).map((f, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ color: '#64748b' }}>{i + 1}</td>
                    <td>{f.icon}</td>
                    <td><span className="tag tag-red">+{f.penalty}</span></td>
                    <td>{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sec-bar"></div>
            <h3>Analysis Engine Coverage</h3>
            <div className="grid3">
              <div className="cell">
                <div className="label">Slither (Static)</div>
                <div className="val">{result.risk.slitherCount.high}H / {result.risk.slitherCount.medium}M / {result.risk.slitherCount.low}L / {result.risk.slitherCount.info}I</div>
              </div>
              <div className="cell">
                <div className="label">Mythril (Symbolic)</div>
                <div className="val">{result.risk?.mythrilCount?.high || 0}H / {result.risk?.mythrilCount?.medium || 0}M / {result.risk?.mythrilCount?.low || 0}L</div>
              </div>
              <div className="cell">
                <div className="label">GoPlus Score</div>
                <div className="val" style={{ color: riskColor }}>{result.risk.goplusScore}</div>
              </div>
            </div>
          </div>

          {/* ── 4. CONTRACT PROPERTIES ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#22d3ee' }}></span>4. Contract Properties & Capabilities</h2>
            <div className="grid4" style={{ marginBottom: 16 }}>
              {[
                ['Token Name', result.info.tokenName],
                ['Symbol', result.info.symbol],
                ['Decimals', String(result.info.decimals)],
                ['Total Supply', result.info.totalSupply],
                ['Holders', result.info.holders],
                ['Functions', String(result.info.functionCount)],
                ['Events', String(result.info.eventCount)],
                ['Owner', result.info.ownerAddress],
              ].map(([label, value]) => (
                <div key={label} className="cell">
                  <div className="label">{label}</div>
                  <div className="val mono" style={{ fontSize: String(value).length > 16 ? 10 : 13 }}>{value}</div>
                </div>
              ))}
            </div>

            <h3>Capability Flags</h3>
            <table>
              <thead><tr><th>Capability</th><th>Status</th><th>Risk Implication</th></tr></thead>
              <tbody>
                {[
                  ['Mintable', result.info.isMintable, 'Owner can inflate token supply without limit'],
                  ['Freezable', result.info.isFreezable, 'Owner can freeze individual account balances'],
                  ['Blacklist', result.info.isBlacklist, 'Owner can blacklist addresses from transfers'],
                  ['ERC-20 Token', result.info.isToken, 'Contract implements ERC-20 token standard'],
                  ['Proxy / Upgradeable', result.identity.proxy, 'Contract logic can be modified post-deployment'],
                ].map(([name, active, implication]) => (
                  <tr key={name}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{name}</td>
                    <td>
                      <span className={`tag ${active ? (name === 'ERC-20 Token' ? 'tag-green' : 'tag-red') : 'tag-green'}`}>
                        {active ? (name === 'ERC-20 Token' ? '✓ YES' : '⚠ ENABLED') : '✓ DISABLED'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11 }}>{active ? implication : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 5. SLITHER ANALYSIS ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#ef4444' }}></span>5. Static Analysis — Slither</h2>
            <p style={{ marginBottom: 16 }}>
              Slither is a static analysis framework for Solidity. It identifies vulnerabilities, code quality issues, and optimization
              opportunities without executing the contract. Total findings: <strong style={{ color: '#fff' }}>{totalSlither}</strong>.
            </p>
            {result.slither.map((f, i) => (
              <div key={f.id} className="finding" style={{
                borderColor: f.severity === 'High' ? 'rgba(239,68,68,0.2)' : f.severity === 'Medium' ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)',
                background: f.severity === 'High' ? 'rgba(239,68,68,0.03)' : f.severity === 'Medium' ? 'rgba(249,115,22,0.02)' : 'rgba(255,255,255,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="mono" style={{ fontSize: 10, color: '#64748b' }}>{f.id}</span>
                    <span className={`tag ${f.severity === 'High' ? 'tag-red' : f.severity === 'Medium' ? 'tag-orange' : 'tag-yellow'}`}>{f.severity.toUpperCase()}</span>
                    <span className="tag tag-cyan">{f.detector}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: '#a78bfa', flexShrink: 0 }}>{f.function}</span>
                </div>
                <p style={{ marginBottom: 8, lineHeight: 1.7 }}>{f.description}</p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 12px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 6 }}>
                  <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>↳ REMEDIATION:</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{f.recommendation}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── 6. MYTHRIL ANALYSIS ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#a78bfa' }}></span>6. Symbolic Execution — Mythril</h2>
            <p style={{ marginBottom: 16 }}>
              Mythril uses concolic analysis and SMT solving to discover exploitable vulnerabilities. It explores all possible execution paths
              and identifies conditions under which security violations can occur. Total findings: <strong style={{ color: '#fff' }}>{totalMythril}</strong>.
            </p>
            {(result.mythril || []).map((f, i) => (
              <div key={f.id} className="finding" style={{
                borderColor: f.severity === 'High' ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.15)',
                background: f.severity === 'High' ? 'rgba(239,68,68,0.03)' : 'rgba(249,115,22,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="mono" style={{ fontSize: 10, color: '#64748b' }}>{f.id}</span>
                    <span className={`tag ${f.severity === 'High' ? 'tag-red' : 'tag-orange'}`}>{f.severity.toUpperCase()}</span>
                    <span className="tag tag-purple">{f.swcId}</span>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: 12 }}>{f.title}</span>
                  </div>
                </div>
                <p style={{ marginBottom: 6, lineHeight: 1.7 }}>{f.description}</p>
                <div className="mono" style={{ fontSize: 10, color: '#64748b' }}>Reference: {f.codeRef}</div>
              </div>
            ))}
          </div>

          {/* ── 7. GOPLUS SECURITY ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#22c55e' }}></span>7. Token Security — GoPlus</h2>
            <p style={{ marginBottom: 16 }}>
              GoPlus Security API provides an independent third-party assessment of token smart contracts, checking for common scam patterns,
              honeypot mechanisms, and centralization risks. Overall verdict: <strong style={{ color: riskColor }}>{result.goplus.overall}</strong>.
            </p>
            <table>
              <thead><tr><th style={{ width: 40 }}>#</th><th>Check</th><th style={{ width: 80 }}>Status</th><th>Detail</th></tr></thead>
              <tbody>
                {result.goplus.checks.map((c, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ color: '#64748b' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{c.name}</td>
                    <td><span className={`tag ${c.status === 'OK' ? 'tag-green' : c.status === 'WARN' ? 'tag-orange' : 'tag-red'}`}>{c.status}</span></td>
                    <td style={{ fontSize: 11 }}>{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 8. SOURCE CODE EXCERPT ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#22d3ee' }}></span>8. Source Code Review</h2>
            <h3>8.1 Contract Source (Excerpt)</h3>
            <pre className="code" style={{ marginBottom: 16 }}>{result.sourceCode}</pre>

            <h3>8.2 ABI Summary</h3>
            <table>
              <thead><tr><th>Type</th><th>Name</th><th>Parameters</th><th>Mutability</th></tr></thead>
              <tbody>
                {result.abi.map((item, i) => (
                  <tr key={i}>
                    <td><span className={`tag ${item.type === 'function' ? 'tag-cyan' : 'tag-purple'}`}>{item.type}</span></td>
                    <td className="mono" style={{ fontWeight: 600, color: '#fff' }}>{item.name}</td>
                    <td className="mono" style={{ fontSize: 10, color: '#94a3b8' }}>{(item.inputs || []).map(p => `${p.type} ${p.name}`).join(', ') || '—'}</td>
                    <td className="mono" style={{ fontSize: 10, color: '#f97316' }}>{item.stateMutability || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 9. CONCLUSIONS ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#22c55e' }}></span>9. Conclusions & Recommended Actions</h2>
            <div className="conclusion-box" style={{ marginBottom: 16 }}>
              <p style={{ lineHeight: 1.8, marginBottom: 12 }}>
                The automated security audit of <strong style={{ color: '#fff' }}>{result.identity.name}</strong> at
                <span className="mono" style={{ color: '#a78bfa', fontSize: 11 }}> {result.identity.address.slice(0, 14)}...{result.identity.address.slice(-6)}</span> has been completed.
                The contract received a threat indicator level of <strong style={{ color: riskColor }}>{result.risk.score}/100 ({result.risk.label})</strong>.
              </p>
              <p style={{ lineHeight: 1.8, marginBottom: 12 }}>
                {result.risk.score >= 80
                  ? `CRITICAL: This contract exhibits severe security vulnerabilities and/or malicious patterns. ${criticalFindings} high-severity findings were identified across Slither and Mythril analysis. GoPlus assessment: ${result.goplus.overall}. Users should NOT interact with this contract. Immediate delisting from all platforms is recommended.`
                  : result.risk.score >= 40
                  ? `CAUTION: This contract presents moderate risk indicators. ${totalFindings} total findings were identified, of which ${criticalFindings} are high-severity. While the contract may function as intended, identified vulnerabilities and centralization concerns warrant careful evaluation before interaction.`
                  : `LOW RISK: This contract presents minimal security concerns. ${totalFindings} findings were identified, none posing immediate exploitability risk. The contract appears to be well-constructed and follows security best practices.`
                }
              </p>
            </div>

            <h3>Recommended Actions</h3>
            <table>
              <thead><tr><th style={{ width: 30 }}>#</th><th style={{ width: 90 }}>Priority</th><th>Action Item</th></tr></thead>
              <tbody>
                {(result.risk.score >= 80 ? [
                  ['CRITICAL', 'Immediately flag this contract on all compliance monitoring systems. Do not approve for listing.'],
                  ['CRITICAL', 'Issue security advisory to users who have interacted with this contract.'],
                  ['HIGH', 'Report to relevant blockchain security organizations (e.g., OpenZeppelin, Immunefi).'],
                  ['HIGH', 'Monitor deployer wallet for additional malicious contract deployments.'],
                  ['MEDIUM', 'Add all identified functions to transaction monitoring rule sets.'],
                ] : result.risk.score >= 40 ? [
                  ['HIGH', 'Require manual security review before approving for platform integration.'],
                  ['MEDIUM', 'Monitor proxy upgrade activity if contract uses upgradeable pattern.'],
                  ['MEDIUM', 'Add to watchlist for enhanced monitoring of admin key activity.'],
                  ['LOW', 'Schedule follow-up audit if contract receives code upgrades.'],
                ] : [
                  ['LOW', 'Contract cleared for normal operations. Retain report for audit trail.'],
                  ['LOW', 'Schedule periodic re-assessment if contract volume increases significantly.'],
                ]).map(([priority, action], i) => (
                  <tr key={i}>
                    <td className="mono" style={{ color: '#64748b' }}>{i + 1}</td>
                    <td><span className={`tag ${priority === 'CRITICAL' ? 'tag-red' : priority === 'HIGH' ? 'tag-orange' : priority === 'MEDIUM' ? 'tag-cyan' : 'tag-green'}`}>{priority}</span></td>
                    <td>{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, marginTop: 8 }}>
            <p style={{ fontSize: 10, color: '#475569', lineHeight: 1.6, marginBottom: 12 }}>
              <strong style={{ color: '#64748b' }}>DISCLAIMER:</strong> This automated security audit report was generated by the AXON Blockchain Intelligence Platform.
              Findings are based on static analysis (Slither), symbolic execution (Mythril), and third-party security APIs (GoPlus).
              While comprehensive, automated tools may produce false positives or miss novel attack vectors.
              This report should supplement, not replace, a manual code audit by qualified smart contract security engineers.
              Findings should be independently verified before use in compliance decisions or legal proceedings.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontSize: 8, fontWeight: 700 }}>A</div>
                <span className="mono" style={{ fontSize: 9, color: '#475569', letterSpacing: '0.15em' }}>AXON BLOCKCHAIN INTELLIGENCE v2.0</span>
              </div>
              <span className="mono" style={{ fontSize: 9, color: '#475569' }}>Case {caseId} · Page 1/1 · END OF REPORT</span>
            </div>
          </div>

          <div className="cls-mark" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none', marginTop: 16 }}>
            CONFIDENTIAL — AXON SMART CONTRACT SECURITY AUDIT — FOR AUTHORIZED RECIPIENTS ONLY
          </div>
        </div>
      </div>
    </div>
  );
}
