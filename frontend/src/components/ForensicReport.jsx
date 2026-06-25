import React, { useRef } from 'react';
import { downloadWalletPDF } from '../utils/pdfExport';

// ─── WALLET FORENSIC INTELLIGENCE REPORT ────────────────────────────────────
// National forensic digital lab standard — executive briefing format
export default function ForensicReport({ result, onClose }) {
  const reportRef = useRef(null);
  if (!result) return null;

  const caseId = result.report_metadata?.report_id || `AXN-${Date.now().toString(36).toUpperCase().slice(0, 6)}-${result.identity.address.slice(2, 8).toUpperCase()}`;
  const reportDate = new Date();
  const dateStr = reportDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = reportDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const riskColor = result.risk.score >= 80 ? '#ef4444' : result.risk.score >= 60 ? '#f97316' : result.risk.score >= 40 ? '#eab308' : '#22c55e';
  const totalPenalty = result.risk.factors.reduce((s, f) => s + f.penalty, 0);

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>AXON Report ${caseId}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Inter',sans-serif;background:#0a0f1a;color:#cbd5e1;padding:0;font-size:13px;line-height:1.6}
      .page{max-width:850px;margin:0 auto;padding:48px 56px;background:#0d1321;border:1px solid rgba(255,255,255,0.06)}
      @media print{body{background:#fff;color:#1a1a1a;font-size:11px}.page{border:none;padding:24px 32px;background:#fff}
        .cls-mark{color:#333!important}.sec-bar{background:#ddd!important}.risk-fill{print-color-adjust:exact;-webkit-print-color-adjust:exact}
        .tag{border:1px solid #999!important;background:#f0f0f0!important;color:#333!important}}
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
      .tag-green{background:rgba(34,197,94,0.1);color:#22c55e;border-color:rgba(34,197,94,0.3)}
      .tag-cyan{background:rgba(34,211,238,0.1);color:#22d3ee;border-color:rgba(34,211,238,0.3)}
      .tag-purple{background:rgba(167,139,250,0.1);color:#a78bfa;border-color:rgba(167,139,250,0.3)}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;padding:8px 12px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;font-family:'JetBrains Mono',monospace;border-bottom:1px solid rgba(255,255,255,0.08)}
      td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);color:#cbd5e1}
      .finding{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px 16px;margin-bottom:8px}
      .finding:last-child{margin-bottom:0}
      .conclusion-box{background:rgba(34,211,238,0.04);border:1px solid rgba(34,211,238,0.15);border-radius:8px;padding:16px 20px}
    </style></head><body>${reportRef.current?.innerHTML || ''}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ caseId, generated: reportDate.toISOString(), classification: 'CONFIDENTIAL', subject: result.identity, risk: result.risk, osint: result.osint, exchange: result.exchange, mixer: result.mixer, graph: result.graph }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `AXON-${caseId}.json`; a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}>
      {/* ── Toolbar ── */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-axon-surface/95 backdrop-blur-md border-b border-axon-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 text-sm font-bold">🔒</div>
          <div>
            <div className="text-sm font-bold text-white">Forensic Intelligence Report</div>
            <div className="text-[10px] font-mono text-axon-text-dim">CASE {caseId} · WALLET INVESTIGATION</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadWalletPDF(result)} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            📄 Download PDF
          </button>
          <button onClick={handlePrint} className="axon-button text-xs px-4 py-2 gap-1.5 bg-axon-cyan/10 border-axon-cyan/30 text-axon-cyan hover:bg-axon-cyan hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print Dark
          </button>
          <button onClick={handleExportJSON} className="axon-button text-xs px-4 py-2 gap-1.5">Export JSON</button>
          <button onClick={onClose} className="axon-button text-xs px-4 py-2 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white">✕ Close</button>
        </div>
      </div>

      {/* ══════════════ REPORT BODY ══════════════ */}
      <div ref={reportRef} className="w-full max-w-[850px] mx-auto mt-16 mb-16">
        <div className="page">

          {/* Classification Banner */}
          <div className="cls-mark">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>

          {/* ── COVER HEADER ── */}
          <div className="sec" style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee', fontSize: 12, fontWeight: 700 }}>A</div>
                  <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.25em', color: '#fff' }}>AXON</span>
                </div>
                <div className="mono" style={{ fontSize: 9, color: '#64748b', letterSpacing: '0.2em' }}>BLOCKCHAIN INTELLIGENCE PLATFORM</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="tag tag-red">CONFIDENTIAL</span>
              </div>
            </div>

            <h1 style={{ marginBottom: 6 }}>Wallet Forensic Intelligence Report</h1>
            <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 560, marginBottom: 20 }}>
              Comprehensive blockchain forensic analysis encompassing risk assessment, transaction topology mapping, open-source intelligence gathering, exchange attribution, and mixer/laundering pattern detection.
            </p>

            {/* Document Control */}
            <div className="grid4">
              <div className="cell"><div className="label">Case Reference</div><div className="val mono" style={{ color: '#22d3ee', fontSize: 12 }}>{caseId}</div></div>
              <div className="cell"><div className="label">Report Date</div><div className="val">{dateStr}</div></div>
              <div className="cell"><div className="label">Time (UTC)</div><div className="val mono">{timeStr}</div></div>
              <div className="cell"><div className="label">Classification</div><div className="val" style={{ color: '#ef4444' }}>CONFIDENTIAL</div></div>
              <div className="cell"><div className="label">Analyst Engine</div><div className="val">AXON v2.0 Auto</div></div>
              <div className="cell"><div className="label">Network</div><div className="val">Ethereum Mainnet</div></div>
              <div className="cell"><div className="label">Modules Executed</div><div className="val">6 / 6</div></div>
              <div className="cell"><div className="label">Report Status</div><div className="val" style={{ color: '#22c55e' }}>FINAL</div></div>
            </div>
          </div>

          {/* ── TABLE OF CONTENTS ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#64748b' }}></span>Table of Contents</h2>
            <div style={{ columns: 2, columnGap: 32 }}>
              {[
                ['1', 'Executive Summary', 'Threat overview & key findings'],
                ['2', 'Subject Identification', 'Wallet profile & on-chain identity'],
                ['3', 'Risk Assessment', 'Quantified threat scoring & factor analysis'],
                ['4', 'OSINT Intelligence', 'Open-source attribution & alias discovery'],
                ['5', 'Financial Flow Analysis', 'Exchange detection & cash-out events'],
                ['6', 'Mixer & Laundering', 'Mixing service usage & pattern indicators'],
                ['7', 'Graph Topology', 'Transaction network mapping & node classification'],
                ['8', 'Conclusions', 'Summary findings & recommended actions'],
              ].map(([num, title, desc]) => (
                <div key={num} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span className="mono" style={{ color: '#22d3ee', fontSize: 11, fontWeight: 700, width: 16, flexShrink: 0 }}>{num}.</span>
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
            <h2><span className="bar" style={{ background: '#22d3ee' }}></span>1. Executive Summary</h2>
            <div style={{ display: 'flex', gap: 24 }}>
              {/* Threat Level */}
              <div style={{ flexShrink: 0, width: 160, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '20px 16px' }}>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Threat Level</div>
                <div className="mono" style={{ fontSize: 48, fontWeight: 800, color: riskColor, lineHeight: 1 }}>{result.risk.score}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>/100</div>
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
                  <div className="risk-fill" style={{ width: `${result.risk.score}%`, height: '100%', borderRadius: 3, background: riskColor }}></div>
                </div>
                <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: riskColor, marginTop: 8, letterSpacing: '0.15em' }}>{result.risk.label}</div>
              </div>
              {/* Summary */}
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: 12, lineHeight: 1.7 }}>
                  This report documents the forensic analysis of Ethereum wallet <span className="mono" style={{ color: '#22d3ee', fontSize: 11 }}>{result.identity.address.slice(0, 20)}...{result.identity.address.slice(-6)}</span>,
                  identified as <strong style={{ color: '#fff' }}>{result.identity.label || 'Unknown Entity'}</strong>.
                  {result.identity.ens && <> ENS resolution: <span style={{ color: '#a78bfa' }}>{result.identity.ens}</span>.</>}
                </p>
                <p style={{ marginBottom: 12, lineHeight: 1.7 }}>
                  The automated analysis engine identified <strong style={{ color: '#fff' }}>{result.risk.factors.length} risk factors</strong> contributing
                  to a composite threat score of <strong style={{ color: riskColor }}>{result.risk.score}/100 ({result.risk.label})</strong>.
                  Machine learning classification: <strong style={{ color: '#a78bfa' }}>{result.risk.mlClassification}</strong> with
                  anomaly confidence of <strong style={{ color: '#a78bfa' }}>{result.risk.anomalyScore}%</strong>.
                </p>
                <div className="grid3" style={{ marginTop: 16 }}>
                  <div className="cell"><div className="label">Total Volume</div><div className="val">{result.identity.totalVolumeUSD}</div></div>
                  <div className="cell"><div className="label">Transaction Count</div><div className="val">{result.identity.txCount?.toLocaleString()}</div></div>
                  <div className="cell"><div className="label">Active Period</div><div className="val">{result.identity.firstSeen} → {result.identity.lastSeen}</div></div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. SUBJECT IDENTIFICATION ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#22d3ee' }}></span>2. Subject Identification</h2>
            <div className="grid4">
              {[
                ['Address', result.identity.address, '#22d3ee'],
                ['Label', result.identity.label, '#fff'],
                ['Tag', result.identity.tag, result.identity.tag === 'HACKER' ? '#ef4444' : '#22c55e'],
                ['ENS', result.identity.ens || 'None', '#a78bfa'],
                ['ETH Balance', result.identity.ethBalance + ' ETH', '#22d3ee'],
                ['Total Received', result.identity.totalReceived, '#22c55e'],
                ['Total Sent', result.identity.totalSent, '#ef4444'],
                ['Counterparties', result.identity.uniqueCounterparties, '#fff'],
                ['First Seen', result.identity.firstSeen, '#94a3b8'],
                ['Last Active', result.identity.lastSeen, '#94a3b8'],
                ['Wallet Age', result.identity.walletAgeDays + ' days', '#fff'],
                ['Total Volume', result.identity.totalVolumeUSD, '#f97316'],
              ].map(([label, value, color]) => (
                <div key={label} className="cell">
                  <div className="label">{label}</div>
                  <div className="val mono" style={{ color, fontSize: value.length > 20 ? 9 : 12, wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 3. RISK ASSESSMENT ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#ef4444' }}></span>3. Risk Assessment</h2>
            <p style={{ marginBottom: 16 }}>
              The following table enumerates all identified risk indicators. Each factor is assigned a severity weight (penalty points) contributing
              to the aggregate risk score. Factors are ordered by severity descending.
            </p>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ width: 50 }}>Sev.</th>
                  <th style={{ width: 70 }}>Weight</th>
                  <th>Risk Factor Description</th>
                </tr>
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
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                  <td colSpan="2" style={{ fontWeight: 700, color: '#fff' }}>TOTAL</td>
                  <td><span className="tag tag-red" style={{ fontSize: 11 }}>+{totalPenalty}</span></td>
                  <td className="mono" style={{ color: riskColor, fontWeight: 700 }}>Composite Score: {result.risk.score}/100 — {result.risk.label}</td>
                </tr>
              </tbody>
            </table>

            <div className="sec-bar"></div>
            <h3>Machine Learning Classification</h3>
            <div className="grid3">
              <div className="cell"><div className="label">ML Model</div><div className="val">Isolation Forest</div></div>
              <div className="cell"><div className="label">Classification</div><div className="val" style={{ color: '#a78bfa' }}>{result.risk.mlClassification}</div></div>
              <div className="cell"><div className="label">Anomaly Score</div><div className="val" style={{ color: '#a78bfa' }}>{result.risk.anomalyScore}%</div></div>
            </div>
          </div>

          {/* ── 4. OSINT INTELLIGENCE ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#a78bfa' }}></span>4. OSINT Intelligence</h2>
            <div className="conclusion-box" style={{ background: 'rgba(167,139,250,0.04)', borderColor: 'rgba(167,139,250,0.15)', marginBottom: 16 }}>
              {typeof result.osint?.summary === 'string' ? (
                <p style={{ lineHeight: 1.7 }}>{result.osint.summary}</p>
              ) : (
                <div style={{ lineHeight: 1.7, fontSize: 13 }}>
                  <strong style={{ display: 'block', marginBottom: 4, color: '#a78bfa' }}>OSINT Sweep Metrics:</strong>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {result.osint?.summary?.ens_name && <li>ENS Domain: {result.osint.summary.ens_name}</li>}
                    <li>Reddit Mentions: <strong>{result.osint?.summary?.reddit_mentions || 0}</strong></li>
                    <li>GitHub Mentions: <strong>{result.osint?.summary?.github_mentions || 0}</strong></li>
                    <li>Twitter Mentions: <strong>{result.osint?.summary?.twitter_mentions || 0}</strong></li>
                    <li>General Web Mentions: <strong>{result.osint?.summary?.web_mentions || 0}</strong></li>
                  </ul>
                </div>
              )}
            </div>

            <h3>4.1 Discovered Aliases</h3>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {result.osint.aliases.map(a => <span key={a} className="tag tag-purple">{a}</span>)}
            </div>

            <h3>4.2 Platform Verification</h3>
            <table>
              <thead><tr><th>Platform</th><th>Label</th><th>Verified</th></tr></thead>
              <tbody>
                {result.osint.walletMentions.map((m, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 11 }}>{m.platform}</td>
                    <td>{m.label}</td>
                    <td>{m.verified ? <span className="tag tag-green">✓ VERIFIED</span> : <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', borderColor: 'rgba(255,255,255,0.1)' }}>UNVERIFIED</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="sec-bar"></div>
            <h3>4.3 GitHub Mentions</h3>
            {result.osint.githubMentions.map((m, i) => (
              <div key={i} className="finding">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 11, color: '#22d3ee' }}>@{m.username}</span>
                  <span className="tag tag-green">{m.confidence}% confidence</span>
                </div>
                <p style={{ fontSize: 12 }}>{m.content}</p>
                <div className="mono" style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{m.date} · {m.source}</div>
              </div>
            ))}

            <h3 style={{ marginTop: 16 }}>4.4 Reddit Mentions</h3>
            {result.osint.redditMentions.map((m, i) => (
              <div key={i} className="finding">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 11, color: '#f97316' }}>{m.subreddit}</span>
                  <span className="mono" style={{ fontSize: 10, color: '#64748b' }}>↑ {m.upvotes.toLocaleString()} · {m.date}</span>
                </div>
                <p style={{ fontSize: 12 }}>{m.post}</p>
              </div>
            ))}
          </div>

          {/* ── 5. FINANCIAL FLOW ANALYSIS ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#22c55e' }}></span>5. Financial Flow Analysis — Exchange Detection</h2>
            <div className="conclusion-box" style={{ background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.15)', marginBottom: 16 }}>
              <p style={{ lineHeight: 1.7 }}>{result.exchange.summary}</p>
            </div>
            <div className="grid3" style={{ marginBottom: 16 }}>
              <div className="cell"><div className="label">Exchanges Identified</div><div className="val" style={{ fontSize: 22, color: '#f97316' }}>{result.exchange.findings.length}</div></div>
              <div className="cell"><div className="label">Cash-Out Events</div><div className="val" style={{ fontSize: 22, color: '#22c55e' }}>{result.exchange.cashOutEvents}</div></div>
              <div className="cell"><div className="label">Total Cashed Out</div><div className="val" style={{ fontSize: 18, color: '#ef4444' }}>{result.exchange.totalCashOutUSD}</div></div>
            </div>
            {result.exchange.findings.length > 0 && (
              <table>
                <thead><tr><th>Exchange</th><th>Address</th><th>Confidence</th><th>Type</th><th>Volume</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {result.exchange.findings.map((f, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{f.exchange}</td>
                      <td className="mono" style={{ fontSize: 10, color: '#22d3ee' }}>{f.address}</td>
                      <td><span className="tag tag-green">{f.confidence}%</span></td>
                      <td>{f.type}</td>
                      <td className="mono" style={{ color: '#fff' }}>{f.volumeETH} ETH</td>
                      <td className="mono" style={{ fontSize: 10 }}>{f.date}</td>
                      <td><span className={`tag ${f.status === 'FLAGGED' ? 'tag-red' : f.status === 'BLOCKED' ? 'tag-orange' : 'tag-green'}`}>{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── 6. MIXER & LAUNDERING ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#f97316' }}></span>6. Mixer & Laundering Analysis</h2>
            <div className="grid4" style={{ marginBottom: 16 }}>
              <div className="cell"><div className="label">Mixers Detected</div><div className="val" style={{ fontSize: 22, color: '#ef4444' }}>{result.mixer.findings.length}</div></div>
              <div className="cell"><div className="label">Bridges Used</div><div className="val" style={{ fontSize: 22, color: '#f97316' }}>{result.mixer.bridgeActivity.length}</div></div>
              <div className="cell" style={{ gridColumn: 'span 2' }}><div className="label">Total Mixed Volume</div><div className="val" style={{ fontSize: 18, color: '#ef4444' }}>{result.mixer.totalMixedETH}</div></div>
            </div>

            {result.mixer.findings.length > 0 && (<>
              <h3>6.1 Mixer Usage Detail</h3>
              <table style={{ marginBottom: 16 }}>
                <thead><tr><th>Pool</th><th>Transactions</th><th>Total ETH</th><th>First Use</th><th>Last Use</th><th>Risk</th></tr></thead>
                <tbody>
                  {result.mixer.findings.map((f, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{f.mixer}</td>
                      <td className="mono">{f.txCount.toLocaleString()}</td>
                      <td className="mono" style={{ color: '#ef4444', fontWeight: 700 }}>{f.totalETH}</td>
                      <td className="mono" style={{ fontSize: 10 }}>{f.firstUse}</td>
                      <td className="mono" style={{ fontSize: 10 }}>{f.lastUse}</td>
                      <td><span className={`tag ${f.risk === 'CRITICAL' ? 'tag-red' : f.risk === 'HIGH' ? 'tag-orange' : 'tag-green'}`}>{f.risk}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>)}

            {result.mixer.bridgeActivity.length > 0 && (<>
              <h3>6.2 Cross-Chain Bridge Activity</h3>
              <div className="grid2" style={{ marginBottom: 16 }}>
                {result.mixer.bridgeActivity.map((b, i) => (
                  <div key={i} className="cell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{b.bridge}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ color: '#f97316', fontWeight: 700, fontSize: 13 }}>{b.volumeUSD}</div>
                      <div className="mono" style={{ color: '#64748b', fontSize: 10 }}>{b.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>)}

            <h3>6.3 Laundering Pattern Indicators</h3>
            {result.mixer.launderingIndicators.map((ind, i) => (
              <div key={i} className="finding" style={{ background: 'rgba(239,68,68,0.03)', borderColor: 'rgba(239,68,68,0.12)' }}>
                <span style={{ color: '#ef4444', marginRight: 8, fontWeight: 700 }}>▸</span>
                {ind}
              </div>
            ))}
          </div>

          {/* ── 7. GRAPH TOPOLOGY ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#22d3ee' }}></span>7. Transaction Graph Topology</h2>
            <div className="grid2" style={{ marginBottom: 16 }}>
              <div className="cell"><div className="label">Nodes Identified</div><div className="val" style={{ fontSize: 22, color: '#22d3ee' }}>{result.graph.nodes.length}</div></div>
              <div className="cell"><div className="label">Edges / Links</div><div className="val" style={{ fontSize: 22, color: '#a78bfa' }}>{result.graph.edges.length}</div></div>
            </div>
            <h3>7.1 Node Classification Matrix</h3>
            <table>
              <thead><tr><th>Node</th><th>Type</th><th>Risk Score</th><th>Classification</th></tr></thead>
              <tbody>
                {result.graph.nodes.map((n, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{n.label}</td>
                    <td className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8' }}>{n.type}</td>
                    <td><span className={`tag ${n.risk >= 70 ? 'tag-red' : n.risk >= 40 ? 'tag-orange' : 'tag-green'}`}>{n.risk}/100</span></td>
                    <td style={{ color: n.risk >= 70 ? '#ef4444' : n.risk >= 40 ? '#f97316' : '#22c55e', fontWeight: 600 }}>
                      {n.risk >= 70 ? 'HIGH THREAT' : n.risk >= 40 ? 'MODERATE' : 'LOW RISK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 8. CONCLUSIONS ── */}
          <div className="sec">
            <h2><span className="bar" style={{ background: '#22c55e' }}></span>8. Conclusions & Recommended Actions</h2>
            <div className="conclusion-box" style={{ marginBottom: 16 }}>
              <p style={{ lineHeight: 1.8, marginBottom: 12 }}>
                Based on the comprehensive forensic analysis conducted across 6 intelligence modules, wallet
                <strong style={{ color: '#22d3ee' }}> {result.identity.address.slice(0, 14)}...{result.identity.address.slice(-6)} </strong>
                has been classified as <strong style={{ color: riskColor }}>{result.risk.label} RISK (Score: {result.risk.score}/100)</strong>.
              </p>
              <p style={{ lineHeight: 1.8, marginBottom: 12 }}>
                {result.risk.score >= 80
                  ? `This address exhibits critical threat indicators requiring immediate action. ${result.risk.factors.length} high-severity risk factors were identified, including interactions with sanctioned entities, anomalous transaction patterns flagged by ML classification (${result.risk.mlClassification}, ${result.risk.anomalyScore}% confidence), and ${result.mixer.findings.length > 0 ? `confirmed usage of ${result.mixer.findings.length} mixing service(s) processing ${result.mixer.totalMixedETH}` : 'suspicious financial flow patterns'}.`
                  : result.risk.score >= 40
                  ? `This address shows moderate risk indicators warranting ongoing monitoring. ${result.risk.factors.length} risk factors were identified. No immediate enforcement action is recommended at this time, but continued surveillance is advised.`
                  : `This address presents low risk indicators consistent with normal blockchain usage. ${result.risk.factors.length} minor factors were noted but do not indicate malicious activity. No action required.`
                }
              </p>
            </div>

            <h3>Recommended Actions</h3>
            <table>
              <thead><tr><th style={{ width: 30 }}>#</th><th style={{ width: 90 }}>Priority</th><th>Action Item</th></tr></thead>
              <tbody>
                {(result.risk.score >= 80 ? [
                  ['CRITICAL', 'Flag address across all monitored exchange compliance systems for immediate SAR filing.'],
                  ['CRITICAL', 'Initiate formal investigation and coordinate with relevant law enforcement agencies.'],
                  ['HIGH', 'Freeze associated assets on cooperating exchange platforms per compliance protocols.'],
                  ['HIGH', 'Cross-reference graph topology nodes with OFAC SDN list and international sanctions databases.'],
                  ['MEDIUM', 'Deploy continuous monitoring on all identified counterparty addresses.'],
                ] : result.risk.score >= 40 ? [
                  ['MEDIUM', 'Add address to watchlist for enhanced transaction monitoring.'],
                  ['MEDIUM', 'Review associated exchange interactions for suspicious activity patterns.'],
                  ['LOW', 'Schedule periodic re-assessment in 30/60/90-day intervals.'],
                ] : [
                  ['LOW', 'No immediate action required. Address cleared for normal operations.'],
                  ['LOW', 'Retain report for compliance audit trail purposes.'],
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
              <strong style={{ color: '#64748b' }}>DISCLAIMER:</strong> This report was generated by the AXON Blockchain Intelligence Platform automated analysis engine.
              All findings are based on publicly available blockchain data, OSINT databases, and proprietary intelligence feeds. This document is provided for
              informational and investigative purposes only. Findings should be independently verified before use in legal proceedings or enforcement actions.
              Distribution is restricted to authorized personnel per the originating organization's data classification policy.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee', fontSize: 8, fontWeight: 700 }}>A</div>
                <span className="mono" style={{ fontSize: 9, color: '#475569', letterSpacing: '0.15em' }}>AXON BLOCKCHAIN INTELLIGENCE v2.0</span>
              </div>
              <span className="mono" style={{ fontSize: 9, color: '#475569' }}>Case {caseId} · Page 1/1 · END OF REPORT</span>
            </div>
          </div>

          {/* Classification Banner (bottom) */}
          <div className="cls-mark" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none', marginTop: 16 }}>
            CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY
          </div>
        </div>
      </div>
    </div>
  );
}
