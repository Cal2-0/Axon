/**
 * AXON — Court-Ready PDF Dossier Generator
 * 
 * Generates a professionally formatted, white-background PDF dossier
 * from wallet/contract scan results. Uses browser-native printing
 * via a hidden iframe to produce clean, downloadable PDFs.
 * 
 * Design: Clean white professional style suitable for legal counsel,
 * compliance teams, and law enforcement handoff.
 */

/**
 * Generate and download a PDF dossier for a wallet scan result.
 * @param {Object} result - The full wallet scan result object
 */
export async function downloadWalletPDF(result) {
  if (!result) return;

  const caseId = result.report_metadata?.report_id || `AXN-${Date.now().toString(36).toUpperCase().slice(0, 6)}-${result.identity.address.slice(2, 8).toUpperCase()}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const isoStr = now.toISOString();

  // Use the Authentic Database Hash from the backend if available
  const docHash = result.report_metadata?.sha256_hash || "UNVERIFIED-LOCAL-HASH";

  const score = result.risk?.score ?? 0;
  const label = result.risk?.label ?? 'UNKNOWN';
  const riskColor = score >= 80 ? '#dc2626' : score >= 60 ? '#ea580c' : score >= 40 ? '#ca8a04' : '#16a34a';
  const riskBg = score >= 80 ? '#fef2f2' : score >= 60 ? '#fff7ed' : score >= 40 ? '#fefce8' : '#f0fdf4';

  // ── Build Risk Factors Table Rows ──
  const factors = result.risk?.factors || [];
  const factorRows = factors.map((f, i) => `
    <tr>
      <td style="color:#64748b;font-family:'Courier New',monospace;font-size:11px">${i + 1}</td>
      <td>${f.icon || '•'}</td>
      <td style="font-family:'Courier New',monospace;font-size:11px;color:${riskColor};font-weight:700">+${f.penalty || 0}</td>
      <td>${_esc(f.reason || '')}</td>
      <td style="font-family:'Courier New',monospace;font-size:10px;color:#64748b">${_esc(f.layer || '')}</td>
    </tr>
  `).join('');

  // ── Build Layer Scores ──
  const layers = result.risk?.layers || {};
  const layerRows = [
    ['L1', 'Behavioral Telemetry', layers.L1 ?? 0],
    ['L2', 'Graph Topology', layers.L2 ?? 0],
    ['L3', 'Economic Signals', layers.L3 ?? 0],
    ['L4', 'Attribution Intelligence', layers.L4 ?? 0],
    ['L5', 'Cross-Axis Correlator', layers.L5 ?? 0],
  ].map(([id, name, val]) => {
    const barColor = val >= 70 ? '#dc2626' : val >= 40 ? '#ea580c' : '#16a34a';
    return `
      <tr>
        <td style="font-family:'Courier New',monospace;font-size:11px;font-weight:700;color:#334155">${id}</td>
        <td>${name}</td>
        <td style="width:120px">
          <div style="background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden">
            <div style="background:${barColor};height:100%;width:${val}%;border-radius:4px"></div>
          </div>
        </td>
        <td style="font-family:'Courier New',monospace;font-size:12px;font-weight:700;text-align:right;color:${barColor}">${val}/100</td>
      </tr>
    `;
  }).join('');

  // ── Build OSINT section ──
  const aliases = (result.osint?.aliases || []).map(a => `<span style="display:inline-block;padding:2px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;font-family:'Courier New',monospace;font-size:11px;margin:2px 4px 2px 0">${_esc(a)}</span>`).join('');

  // ── Build Mixer section ──
  const mixerFindings = (result.mixer?.findings || []).map(f => `
    <tr>
      <td style="font-weight:600">${_esc(typeof f === 'object' ? (f.mixer || f) : f)}</td>
      <td style="font-family:'Courier New',monospace;font-size:11px">${f.txCount != null ? f.txCount.toLocaleString() : 'N/A'}</td>
      <td style="font-family:'Courier New',monospace;font-size:11px;color:#dc2626;font-weight:700">${_esc(f.totalETH || 'N/A')}</td>
      <td style="font-family:'Courier New',monospace;font-size:10px;color:#64748b">${_esc(f.firstUse || 'N/A')}</td>
      <td style="font-family:'Courier New',monospace;font-size:10px;color:#64748b">${_esc(f.lastUse || 'N/A')}</td>
    </tr>
  `).join('');

  // ── Laundering Indicators ──
  const launderingList = (result.mixer?.launderingIndicators || []).map(ind =>
    `<li style="margin-bottom:4px">${_esc(typeof ind === 'string' ? ind : JSON.stringify(ind))}</li>`
  ).join('');

  // ── Exchange Findings ──
  const exchangeFindings = (result.exchange?.findings || []).map(f => `
    <tr>
      <td style="font-weight:600">${_esc(f.exchange || 'Data Not Available')}</td>
      <td style="font-family:'Courier New',monospace;font-size:10px">${_esc(f.address || 'N/A')}</td>
      <td style="font-family:'Courier New',monospace;font-size:11px">${f.confidence || 0}%</td>
      <td>${_esc(f.type || 'N/A')}</td>
      <td style="font-family:'Courier New',monospace;font-size:11px">${_esc(f.volumeETH || 'N/A')} ETH</td>
      <td style="font-family:'Courier New',monospace;font-size:10px;color:#64748b">${_esc(f.date || 'N/A')}</td>
      <td><span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;${f.status === 'FLAGGED' ? 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca' : f.status === 'BLOCKED' ? 'background:#fff7ed;color:#ea580c;border:1px solid #fed7aa' : 'background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0'}">${_esc(f.status || 'UNKNOWN')}</span></td>
    </tr>
  `).join('');

  // ── Graph Node Classification ──
  const graphNodes = (result.graph?.nodes || []).slice(0, 30).map(n => `
    <tr>
      <td style="font-weight:600">${_esc(n.label || 'N/A')}</td>
      <td style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;color:#64748b">${_esc(n.type || 'unknown')}</td>
      <td><span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;${n.risk >= 70 ? 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca' : n.risk >= 40 ? 'background:#fff7ed;color:#ea580c;border:1px solid #fed7aa' : 'background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0'}">${n.risk}/100</span></td>
      <td style="color:${n.risk >= 70 ? '#dc2626' : n.risk >= 40 ? '#ea580c' : '#16a34a'};font-weight:600;font-size:11px">${n.risk >= 70 ? 'HIGH THREAT' : n.risk >= 40 ? 'MODERATE' : 'LOW RISK'}</td>
    </tr>
  `).join('');

  // ── Analytical Engine Forensic Verdict ──
  const analyticalSynthesis = result.risk?.analyticalSynthesis || result.osint?.analyticalSynthesis || {};
  const hypothesis = analyticalSynthesis.hypothesis || 'No Analytical Engine analysis available.';
  const verdict = analyticalSynthesis.verdict || 'No verdict available.';
  const mitreTag = analyticalSynthesis.mitre_tag || 'N/A';

  // ── Scoring metadata ──
  const entityClass = result.risk?.entityClass || result.identity?.entityClass || 'Data Not Available';
  const classModifier = result.risk?.classModifier || result.identity?.classModifier || 1.0;
  const persistenceFloor = result.risk?.persistenceFloor ?? 'N/A';
  const dormancyModifier = result.risk?.dormancyModifier ?? 'N/A';
  const exchangeOverlap = result.risk?.exchangeOverlap != null ? (result.risk.exchangeOverlap * 100).toFixed(1) + '%' : 'N/A';
  const mixerOverlap = result.risk?.mixerOverlap != null ? (result.risk.mixerOverlap * 100).toFixed(1) + '%' : 'N/A';

  // ── Recommended Actions ──
  const actions = score >= 80 ? [
    ['CRITICAL', 'Flag address across all monitored exchange compliance systems for immediate Suspicious Activity Report (SAR) filing.'],
    ['CRITICAL', 'Initiate formal investigation and coordinate with relevant law enforcement agencies (FBI IC3, Europol EC3, NCA).'],
    ['HIGH', 'Freeze associated assets on cooperating exchange platforms per AML/CFT compliance protocols.'],
    ['HIGH', 'Cross-reference all graph topology nodes with OFAC SDN list and international sanctions databases.'],
    ['MEDIUM', 'Deploy continuous monitoring on all identified counterparty addresses for 90 days.'],
  ] : score >= 40 ? [
    ['MEDIUM', 'Add address to enhanced transaction monitoring watchlist.'],
    ['MEDIUM', 'Review associated exchange interactions for suspicious activity patterns.'],
    ['LOW', 'Schedule periodic re-assessment in 30/60/90-day intervals.'],
  ] : [
    ['LOW', 'No immediate action required. Address cleared for normal operations.'],
    ['LOW', 'Retain report for compliance audit trail purposes.'],
  ];

  const actionRows = actions.map(([priority, action], i) => {
    const pColor = priority === 'CRITICAL' ? '#dc2626' : priority === 'HIGH' ? '#ea580c' : priority === 'MEDIUM' ? '#0284c7' : '#16a34a';
    const pBg = priority === 'CRITICAL' ? '#fef2f2' : priority === 'HIGH' ? '#fff7ed' : priority === 'MEDIUM' ? '#f0f9ff' : '#f0fdf4';
    const pBorder = priority === 'CRITICAL' ? '#fecaca' : priority === 'HIGH' ? '#fed7aa' : priority === 'MEDIUM' ? '#bae6fd' : '#bbf7d0';
    return `
      <tr>
        <td style="font-family:'Courier New',monospace;font-size:11px;color:#64748b">${i + 1}</td>
        <td><span style="display:inline-block;padding:1px 8px;border-radius:3px;font-size:10px;font-weight:700;background:${pBg};color:${pColor};border:1px solid ${pBorder}">${priority}</span></td>
        <td>${action}</td>
      </tr>
    `;
  }).join('');

  // ═══════════════════════════════════════════════════════════
  // BUILD THE FULL HTML DOCUMENT
  // ═══════════════════════════════════════════════════════════

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AXON Forensic Report — ${caseId}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; color: #1e293b; font-size: 12px; line-height: 1.6; }

  .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 28px; }
    .no-print { display: none !important; }
    @page { margin: 0.5in; size: A4; }
  }

  .cls-banner { text-align: center; padding: 6px 0; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 3px; color: #dc2626; border-bottom: 2px solid #fecaca; background: #fef2f2; }

  h1 { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.08em; margin: 24px 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
  h2 .bar { width: 4px; height: 18px; border-radius: 2px; flex-shrink: 0; }
  h3 { font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin: 16px 0 8px 0; }

  .mono { font-family: 'JetBrains Mono', 'Courier New', monospace; }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }

  .cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
  .cell .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; font-family: 'JetBrains Mono', monospace; }
  .cell .val { font-size: 12px; color: #0f172a; font-weight: 600; word-break: break-all; }

  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
  th { text-align: left; padding: 6px 10px; font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; font-family: 'JetBrains Mono', monospace; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
  td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }

  .verdict-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; border-radius: 0 6px 6px 0; padding: 16px 20px; margin: 12px 0; }
  .risk-box { background: ${riskBg}; border: 2px solid ${riskColor}20; border-radius: 8px; padding: 20px; text-align: center; }

  .finding { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px; font-size: 11px; }

  .footer { border-top: 2px solid #e2e8f0; padding-top: 16px; margin-top: 24px; }
  .footer p { font-size: 9px; color: #94a3b8; line-height: 1.5; }

  .page-break { page-break-before: always; }
</style>
</head>
<body>

<div class="page">

  <!-- Classification Banner -->
  <div class="cls-banner">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>

  <!-- ═══ COVER HEADER ═══ -->
  <div style="padding:24px 0;border-bottom:2px solid #e2e8f0">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <div style="width:28px;height:28px;border-radius:6px;background:#0f172a;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:800">A</div>
          <span style="font-size:18px;font-weight:800;letter-spacing:0.2em;color:#0f172a">AXON</span>
        </div>
        <div class="mono" style="font-size:9px;color:#64748b;letter-spacing:0.15em">BLOCKCHAIN FORENSIC INTELLIGENCE PLATFORM</div>
      </div>
      <div style="text-align:right">
        <span style="display:inline-block;padding:3px 12px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;margin-bottom:4px;">CONFIDENTIAL</span>
        <div class="mono" style="font-size:8px;color:#94a3b8;text-transform:uppercase;">SHA-256 INTEGRITY HASH</div>
        <div class="mono" style="font-size:9px;color:#64748b;max-width:200px;word-break:break-all;">${docHash}</div>
      </div>
    </div>

    <h1>Wallet Forensic Intelligence Report</h1>
    <p style="color:#64748b;font-size:12px;max-width:560px;margin-bottom:16px">
      Comprehensive blockchain forensic analysis encompassing behavioral risk assessment, transaction topology mapping,
      open-source intelligence, exchange attribution, and mixer/laundering pattern detection.
    </p>

    <div class="grid4">
      <div class="cell"><div class="label">Case Reference</div><div class="val mono" style="color:#0284c7;font-size:11px">${caseId}</div></div>
      <div class="cell"><div class="label">Report Date</div><div class="val">${dateStr}</div></div>
      <div class="cell"><div class="label">Time (UTC)</div><div class="val mono">${timeStr}</div></div>
      <div class="cell"><div class="label">Classification</div><div class="val" style="color:#dc2626">CONFIDENTIAL</div></div>
      <div class="cell"><div class="label">Analyst Engine</div><div class="val">AXON v2.0 Auto</div></div>
      <div class="cell"><div class="label">Network</div><div class="val">Ethereum Mainnet</div></div>
      <div class="cell"><div class="label">Modules Executed</div><div class="val">6 / 6</div></div>
      <div class="cell"><div class="label">Report Status</div><div class="val" style="color:#16a34a">FINAL</div></div>
    </div>
  </div>

  <!-- ═══ 1. EXECUTIVE SUMMARY ═══ -->
  <h2><span class="bar" style="background:#0284c7"></span>1. Executive Summary</h2>
  <div style="display:flex;gap:20px">
    <div class="risk-box" style="flex-shrink:0;width:150px">
      <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Threat Level</div>
      <div class="mono" style="font-size:44px;font-weight:800;color:${riskColor};line-height:1">${score}</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">/100</div>
      <div style="width:100%;height:6px;background:#e2e8f0;border-radius:3px;margin-top:10px;overflow:hidden">
        <div style="width:${score}%;height:100%;border-radius:3px;background:${riskColor}"></div>
      </div>
      <div class="mono" style="font-size:11px;font-weight:700;color:${riskColor};margin-top:6px;letter-spacing:0.15em">${label}</div>
    </div>
    <div style="flex:1">
      <p style="margin-bottom:10px;line-height:1.7">
        This report documents the forensic analysis of Ethereum wallet
        <span class="mono" style="color:#0284c7;font-size:10px">${_esc(result.identity.address)}</span>,
        identified as <strong>${_esc(result.identity.label || 'Unknown Entity')}</strong>.
        ${result.identity.ens ? `ENS resolution: <span style="color:#7c3aed">${_esc(result.identity.ens)}</span>.` : ''}
      </p>
      <p style="margin-bottom:10px;line-height:1.7">
        The automated analysis engine identified <strong>${factors.length} risk factors</strong> contributing
        to a composite threat score of <strong style="color:${riskColor}">${score}/100 (${label})</strong>.
        ML classification: <strong style="color:#7c3aed">${_esc(result.risk?.mlClassification || 'N/A')}</strong>,
        anomaly confidence: <strong style="color:#7c3aed">${result.risk?.anomalyScore || 0}%</strong>.
      </p>
      <div class="grid3" style="margin-top:12px">
        <div class="cell"><div class="label">Total Volume</div><div class="val">${_esc(result.identity.totalVolumeUSD || 'Data Not Available')}</div></div>
        <div class="cell"><div class="label">Transaction Count</div><div class="val">${(result.identity.txCount || 0).toLocaleString()}</div></div>
        <div class="cell"><div class="label">Active Period</div><div class="val">${_esc(result.identity.firstSeen || 'N/A')} → ${_esc(result.identity.lastSeen || 'N/A')}</div></div>
      </div>
    </div>
  </div>

  <!-- ═══ Analytical Engine FORENSIC VERDICT ═══ -->
  <div class="verdict-box" style="margin-top:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="display:inline-block;padding:2px 8px;background:#0f172a;color:#fff;border-radius:3px;font-size:9px;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:0.1em">FORENSIC VERDICT</span>
      <span class="mono" style="font-size:10px;color:#64748b">${_esc(mitreTag)}</span>
    </div>
    <div style="margin-bottom:8px">
      <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">Hypothesis</div>
      <p style="font-size:11px;color:#334155;line-height:1.6">${_esc(hypothesis)}</p>
    </div>
    <div>
      <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">Executive Verdict</div>
      <p style="font-size:12px;color:#0f172a;font-weight:700;line-height:1.5">${_esc(verdict)}</p>
    </div>
  </div>

  <!-- ═══ 2. SUBJECT IDENTIFICATION ═══ -->
  <h2><span class="bar" style="background:#0284c7"></span>2. Subject Identification</h2>
  <div class="grid4">
    ${[
      ['Address', result.identity.address, '#0284c7'],
      ['Label', result.identity.label || 'Unlabeled', '#0f172a'],
      ['Tag', result.identity.tag || label, score >= 80 ? '#dc2626' : '#16a34a'],
      ['ENS', result.identity.ens || 'None', '#7c3aed'],
      ['ETH Balance', (result.identity.ethBalance || '0') + ' ETH', '#0284c7'],
      ['Total Received', result.identity.totalReceived || 'Data Not Available', '#16a34a'],
      ['Total Sent', result.identity.totalSent || 'Data Not Available', '#dc2626'],
      ['Counterparties', result.identity.uniqueCounterparties || 0, '#0f172a'],
      ['First Seen', result.identity.firstSeen || 'N/A', '#64748b'],
      ['Last Active', result.identity.lastSeen || 'N/A', '#64748b'],
      ['Entity Class', entityClass, '#7c3aed'],
      ['Class Modifier', classModifier + 'x', '#64748b'],
    ].map(([lbl, val, color]) => `
      <div class="cell">
        <div class="label">${lbl}</div>
        <div class="val mono" style="color:${color};font-size:${String(val).length > 20 ? '8px' : '11px'}">${_esc(String(val))}</div>
      </div>
    `).join('')}
  </div>

  <!-- ═══ 3. RISK ASSESSMENT ═══ -->
  <h2><span class="bar" style="background:#dc2626"></span>3. Risk Assessment — 5-Layer Behavioral Engine</h2>

  <h3>3.1 Layer Score Breakdown</h3>
  <table>
    <thead><tr><th style="width:40px">Layer</th><th>Analysis Module</th><th style="width:120px">Score Bar</th><th style="width:60px;text-align:right">Score</th></tr></thead>
    <tbody>${layerRows}</tbody>
  </table>

  <div class="grid4" style="margin-top:8px">
    <div class="cell"><div class="label">Base Score</div><div class="val mono">${result.risk?.baseScore ?? 'N/A'}</div></div>
    <div class="cell"><div class="label">Persistence Floor</div><div class="val mono">${persistenceFloor}</div></div>
    <div class="cell"><div class="label">Exchange Overlap</div><div class="val mono">${exchangeOverlap}</div></div>
    <div class="cell"><div class="label">Mixer Overlap</div><div class="val mono">${mixerOverlap}</div></div>
  </div>

  <h3>3.2 Risk Factor Analysis</h3>
  <table>
    <thead><tr><th style="width:30px">#</th><th style="width:30px">Sev</th><th style="width:50px">Wt</th><th>Risk Factor Description</th><th style="width:40px">Layer</th></tr></thead>
    <tbody>
      ${factorRows}
      <tr style="border-top:2px solid #e2e8f0;font-weight:700">
        <td colspan="2" style="color:#0f172a">TOTAL</td>
        <td style="font-family:'Courier New',monospace;color:${riskColor};font-weight:700">${factors.reduce((s, f) => s + (f.penalty || 0), 0)}</td>
        <td colspan="2" style="font-family:'Courier New',monospace;color:${riskColor}">Composite Score: ${score}/100 — ${label}</td>
      </tr>
    </tbody>
  </table>

  <!-- ═══ 4. OSINT INTELLIGENCE ═══ -->
  <h2 class="page-break"><span class="bar" style="background:#7c3aed"></span>4. OSINT Intelligence</h2>
  <div class="verdict-box" style="border-left-color:#7c3aed;margin-bottom:12px">
    <p style="line-height:1.7">
      ${_esc(
        typeof result.osint?.summary === 'string'
          ? result.osint.summary
          : (result.osint?.summary && typeof result.osint.summary === 'object'
            ? `OSINT Sweep completed. Reddit Mentions: ${result.osint.summary.reddit_mentions || 0}, GitHub Mentions: ${result.osint.summary.github_mentions || 0}, Twitter Mentions: ${result.osint.summary.twitter_mentions || 0}, Web Mentions: ${result.osint.summary.web_mentions || 0}.`
            : hypothesis)
      )}
    </p>
  </div>

  ${aliases ? `<h3>4.1 Discovered Aliases</h3><div style="margin-bottom:12px">${aliases}</div>` : ''}

  <h3>4.2 Intelligence Feeds</h3>
  <div class="grid3">
    <div class="cell"><div class="label">Forta Alerts</div><div class="val" style="font-size:18px;color:${(result.holdings?.forta_alerts || 0) > 0 ? '#dc2626' : '#16a34a'}">${result.holdings?.forta_alerts || 0}</div></div>
    <div class="cell"><div class="label">ERC-20 Tokens</div><div class="val" style="font-size:18px">${result.holdings?.erc20_count || 0}</div></div>
    <div class="cell"><div class="label">OSINT Mentions</div><div class="val" style="font-size:18px;color:${(result.osint?.walletMentions || 0) > 0 ? '#ea580c' : '#16a34a'}">${result.osint?.walletMentions || 0}</div></div>
  </div>

  <!-- ═══ 5. FINANCIAL FLOW — EXCHANGE DETECTION ═══ -->
  <h2><span class="bar" style="background:#16a34a"></span>5. Financial Flow Analysis — Exchange Detection</h2>
  <div class="verdict-box" style="border-left-color:#16a34a;margin-bottom:12px">
    <p style="line-height:1.7">${_esc(result.exchange?.summary || 'No exchange interaction data available.')}</p>
  </div>
  <div class="grid3" style="margin-bottom:12px">
    <div class="cell"><div class="label">Exchanges Identified</div><div class="val" style="font-size:18px;color:#ea580c">${(result.exchange?.findings || []).length}</div></div>
    <div class="cell"><div class="label">Cash-Out Events</div><div class="val" style="font-size:18px;color:#16a34a">${result.exchange?.cashOutEvents || 0}</div></div>
    <div class="cell"><div class="label">Total Cashed Out</div><div class="val" style="font-size:16px;color:#dc2626">${_esc(result.exchange?.totalCashOutUSD || '$0')}</div></div>
  </div>
  ${exchangeFindings ? `
  <table>
    <thead><tr><th>Exchange</th><th>Address</th><th>Conf.</th><th>Type</th><th>Volume</th><th>Date</th><th>Status</th></tr></thead>
    <tbody>${exchangeFindings}</tbody>
  </table>` : ''}

  <!-- ═══ 6. MIXER & LAUNDERING ═══ -->
  <h2><span class="bar" style="background:#ea580c"></span>6. Mixer & Laundering Analysis</h2>
  <div class="grid3" style="margin-bottom:12px">
    <div class="cell"><div class="label">Mixers Detected</div><div class="val" style="font-size:18px;color:#dc2626">${(result.mixer?.findings || []).length}</div></div>
    <div class="cell"><div class="label">Bridges Used</div><div class="val" style="font-size:18px;color:#ea580c">${(result.mixer?.bridgeActivity || []).length}</div></div>
    <div class="cell"><div class="label">Total Mixed</div><div class="val" style="font-size:14px;color:#dc2626">${_esc(result.mixer?.totalMixedETH || 'Data Not Available')}</div></div>
  </div>
  ${mixerFindings ? `
  <h3>6.1 Mixer Usage Detail</h3>
  <table>
    <thead><tr><th>Pool</th><th>TXs</th><th>Total ETH</th><th>First Use</th><th>Last Use</th></tr></thead>
    <tbody>${mixerFindings}</tbody>
  </table>` : ''}
  ${launderingList ? `
  <h3>6.2 Laundering Indicators</h3>
  <ul style="padding-left:20px;color:#334155;font-size:11px;line-height:1.7;margin-bottom:12px">${launderingList}</ul>` : ''}

  <!-- ═══ 7. GRAPH TOPOLOGY ═══ -->
  <h2 class="page-break"><span class="bar" style="background:#0284c7"></span>7. Transaction Graph Topology</h2>
  <div class="grid2" style="margin-bottom:12px">
    <div class="cell"><div class="label">Nodes Identified</div><div class="val" style="font-size:18px;color:#0284c7">${(result.graph?.nodes || []).length}</div></div>
    <div class="cell"><div class="label">Edges / Links</div><div class="val" style="font-size:18px;color:#7c3aed">${(result.graph?.edges || []).length}</div></div>
  </div>
  <h3>7.1 Node Classification Matrix</h3>
  <table>
    <thead><tr><th>Node</th><th>Type</th><th>Threat Level</th><th>Classification</th></tr></thead>
    <tbody>${graphNodes}</tbody>
  </table>

  <!-- ═══ 8. CONCLUSIONS ═══ -->
  <h2><span class="bar" style="background:#16a34a"></span>8. Conclusions & Recommended Actions</h2>
  <div class="verdict-box" style="border-left-color:${riskColor};margin-bottom:12px">
    <p style="line-height:1.8;margin-bottom:8px">
      Based on the comprehensive forensic analysis conducted across 6 intelligence modules, wallet
      <strong style="color:#0284c7"> ${_esc(result.identity.address.slice(0, 14))}...${_esc(result.identity.address.slice(-6))} </strong>
      has been classified as <strong style="color:${riskColor}">${label} RISK (Score: ${score}/100)</strong>.
    </p>
    <p style="line-height:1.8">
      ${score >= 80
        ? `This address exhibits critical threat indicators requiring immediate action. ${factors.length} high-severity risk factors were identified. Entity classification: ${_esc(entityClass)} (${classModifier}x modifier). All counterparties should be reviewed for sanctions exposure.`
        : score >= 40
        ? `This address shows moderate risk indicators warranting ongoing monitoring. ${factors.length} risk factors identified. Continued surveillance is advised with periodic re-assessment.`
        : `This address presents low risk indicators consistent with normal blockchain usage. ${factors.length} minor factors noted. No enforcement action required.`
      }
    </p>
  </div>

  <h3>Recommended Actions</h3>
  <table>
    <thead><tr><th style="width:30px">#</th><th style="width:80px">Priority</th><th>Action Item</th></tr></thead>
    <tbody>${actionRows}</tbody>
  </table>

  <!-- ═══ FOOTER ═══ -->
  <div class="footer">
    <p style="margin-bottom:8px">
      <strong style="color:#64748b">DISCLAIMER:</strong> This report was generated by the AXON Blockchain Intelligence Platform automated analysis engine.
      All findings are based on publicly available blockchain data, OSINT databases, and proprietary intelligence feeds. This document is provided for
      informational and investigative purposes only. Findings should be independently verified before use in legal proceedings or enforcement actions.
      Distribution is restricted to authorized personnel per the originating organization's data classification policy.
    </p>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:6px">
        <div style="width:16px;height:16px;border-radius:3px;background:#0f172a;display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px;font-weight:700">A</div>
        <span class="mono" style="font-size:8px;color:#94a3b8;letter-spacing:0.1em">AXON BLOCKCHAIN INTELLIGENCE v2.0</span>
      </div>
      <span class="mono" style="font-size:8px;color:#94a3b8">Case ${caseId} · Generated ${isoStr} · END OF REPORT</span>
    </div>
  </div>

  <div class="cls-banner" style="border-top:2px solid #fecaca;border-bottom:none;margin-top:16px">
    CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY
  </div>

</div>
</body>
</html>`;

  // ── Trigger PDF Download via hidden iframe + print ──
  _triggerPDFDownload(html, `AXON-${caseId}-Wallet-Report`);
}


export async function downloadContractPDF(result) {
  if (!result) return;

  const caseId = result.report_metadata?.report_id || `AXN-${Date.now().toString(36).toUpperCase().slice(0, 6)}-${(result.identity?.address || '000000').slice(2, 8).toUpperCase()}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  // Use the Authentic Database Hash from the backend if available
  const docHash = result.report_metadata?.sha256_hash || "UNVERIFIED-LOCAL-HASH";

  const score = result.risk?.score ?? 0;
  const label = result.risk?.label ?? 'UNKNOWN';
  const riskColor = score >= 80 ? '#dc2626' : score >= 60 ? '#ea580c' : score >= 40 ? '#ca8a04' : '#16a34a';
  const riskBg = score >= 80 ? '#fef2f2' : score >= 60 ? '#fff7ed' : score >= 40 ? '#fefce8' : '#f0fdf4';

  const axes = result.risk?.axes || {};
  const signals = result.risk?.factors || [];
  const goplus = result.goplus?.checks || [];
  const analyticalSynthesis = result.risk?.analyticalSynthesis || {};

  const axisRows = [
    ['A1', 'Code Security', axes.A1 ?? 0],
    ['A2', 'Admin & Economic', axes.A2 ?? 0],
    ['A3', 'Behavioral Fingerprint', axes.A3 ?? 0],
    ['A4', 'Network Topology', axes.A4 ?? 0],
    ['A5', 'Threat Intelligence', axes.A5 ?? 0],
  ].map(([id, name, val]) => {
    const barColor = val >= 70 ? '#dc2626' : val >= 40 ? '#ea580c' : '#16a34a';
    return `
      <tr>
        <td style="font-family:'Courier New',monospace;font-size:11px;font-weight:700">${id}</td>
        <td>${name}</td>
        <td style="width:120px"><div style="background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden"><div style="background:${barColor};height:100%;width:${val}%;border-radius:4px"></div></div></td>
        <td style="font-family:'Courier New',monospace;font-size:12px;font-weight:700;text-align:right;color:${barColor}">${val}/100</td>
      </tr>`;
  }).join('');

  const signalRows = signals.map((s, i) => `
    <tr>
      <td style="font-family:'Courier New',monospace;font-size:11px;color:#64748b">${i + 1}</td>
      <td>${_esc(s.icon || '🔹')}</td>
      <td>${_esc(s.reason || '')}</td>
    </tr>
  `).join('');

  const goplusRows = goplus.map(c => `
    <tr>
      <td style="font-weight:600">${_esc(c.name || '')}</td>
      <td><span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;${c.status === 'RISK' ? 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca' : c.status === 'WARN' ? 'background:#fff7ed;color:#ea580c;border:1px solid #fed7aa' : 'background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0'}">${c.status}</span></td>
      <td style="font-size:11px">${_esc(c.detail || '')}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>AXON Contract Report — ${caseId}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',sans-serif;background:#fff;color:#1e293b;font-size:12px;line-height:1.6}
  .page{max-width:800px;margin:0 auto;padding:40px 48px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:20px 28px}@page{margin:0.5in;size:A4}}
  .cls-banner{text-align:center;padding:6px 0;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:3px;color:#dc2626;border-bottom:2px solid #fecaca;background:#fef2f2}
  h1{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:4px}
  h2{font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;display:flex;align-items:center;gap:8px}
  h2 .bar{width:4px;height:18px;border-radius:2px}
  h3{font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin:16px 0 8px}
  .mono{font-family:'JetBrains Mono',monospace}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}
  .cell{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px}.cell .label{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;font-family:'JetBrains Mono',monospace}.cell .val{font-size:12px;color:#0f172a;font-weight:600;word-break:break-all}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}
  th{text-align:left;padding:6px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-family:'JetBrains Mono',monospace;border-bottom:2px solid #e2e8f0;background:#f8fafc}
  td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:top}
  .verdict-box{background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0284c7;border-radius:0 6px 6px 0;padding:16px 20px;margin:12px 0}
  .risk-box{background:${riskBg};border:2px solid ${riskColor}20;border-radius:8px;padding:20px;text-align:center}
  .footer{border-top:2px solid #e2e8f0;padding-top:16px;margin-top:24px}.footer p{font-size:9px;color:#94a3b8;line-height:1.5}
</style></head><body><div class="page">
  <div class="cls-banner">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>
  <div style="padding:24px 0;border-bottom:2px solid #e2e8f0">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <div style="width:28px;height:28px;border-radius:6px;background:#0f172a;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:800">A</div>
          <span style="font-size:18px;font-weight:800;letter-spacing:0.2em;color:#0f172a">AXON</span>
        </div>
        <div class="mono" style="font-size:9px;color:#64748b;letter-spacing:0.15em">BLOCKCHAIN FORENSIC INTELLIGENCE PLATFORM</div>
      </div>
      <div style="text-align:right">
        <span style="display:inline-block;padding:3px 12px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;margin-bottom:4px;">CONFIDENTIAL</span>
        <div class="mono" style="font-size:8px;color:#94a3b8;text-transform:uppercase;">SHA-256 INTEGRITY HASH</div>
        <div class="mono" style="font-size:9px;color:#64748b;max-width:200px;word-break:break-all;">${docHash}</div>
      </div>
    </div>
    <h1>Contract Forensic Intelligence Report</h1>
    <p style="color:#64748b;font-size:12px;margin-bottom:16px">5-Axis behavioral forensic analysis with GoPlus security integration.</p>
    <div class="grid4">
      <div class="cell"><div class="label">Case Ref</div><div class="val mono" style="color:#0284c7;font-size:11px">${caseId}</div></div>
      <div class="cell"><div class="label">Date</div><div class="val">${dateStr}</div></div>
      <div class="cell"><div class="label">Time</div><div class="val mono">${timeStr}</div></div>
      <div class="cell"><div class="label">Status</div><div class="val" style="color:#16a34a">FINAL</div></div>
    </div>
  </div>

  <h2><span class="bar" style="background:#0284c7"></span>1. Executive Summary</h2>
  <div style="display:flex;gap:20px">
    <div class="risk-box" style="flex-shrink:0;width:150px">
      <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Threat Level</div>
      <div class="mono" style="font-size:44px;font-weight:800;color:${riskColor};line-height:1">${score}</div>
      <div style="font-size:10px;color:#64748b">/100</div>
      <div style="width:100%;height:6px;background:#e2e8f0;border-radius:3px;margin-top:10px;overflow:hidden"><div style="width:${score}%;height:100%;border-radius:3px;background:${riskColor}"></div></div>
      <div class="mono" style="font-size:11px;font-weight:700;color:${riskColor};margin-top:6px;letter-spacing:0.15em">${label}</div>
    </div>
    <div style="flex:1">
      <div class="grid4" style="margin-bottom:12px">
        <div class="cell"><div class="label">Contract</div><div class="val mono" style="font-size:8px;color:#0284c7">${_esc(result.identity?.address || 'N/A')}</div></div>
        <div class="cell"><div class="label">Name</div><div class="val">${_esc(result.identity?.name || 'Data Not Available')}</div></div>
        <div class="cell"><div class="label">Verified</div><div class="val" style="color:${result.identity?.verified ? '#16a34a' : '#dc2626'}">${result.identity?.verified ? 'Yes' : 'No'}</div></div>
        <div class="cell"><div class="label">Proxy</div><div class="val">${result.identity?.proxy ? 'Yes' : 'No'}</div></div>
      </div>
      <div class="verdict-box">
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:2px">Executive Verdict</div>
        <p style="font-size:12px;color:#0f172a;font-weight:700">${_esc(analyticalSynthesis.verdict || 'No verdict available.')}</p>
      </div>
    </div>
  </div>

  <h2><span class="bar" style="background:#dc2626"></span>2. 5-Axis Risk Matrix</h2>
  <table><thead><tr><th style="width:40px">Axis</th><th>Module</th><th style="width:120px">Score</th><th style="width:60px;text-align:right">Value</th></tr></thead><tbody>${axisRows}</tbody></table>
  <div class="grid3" style="margin:8px 0"><div class="cell"><div class="label">Base Score</div><div class="val mono">${result.risk?.baseScore ?? 'N/A'}</div></div><div class="cell"><div class="label">Multiplier</div><div class="val mono">${result.risk?.multiplier ?? 1.0}x</div></div><div class="cell"><div class="label">Confidence ±</div><div class="val mono">${result.risk?.ci ?? 'N/A'}</div></div></div>

  <h3>2.1 Triggered Signals</h3>
  <table><thead><tr><th style="width:30px">#</th><th style="width:30px"></th><th>Signal Description</th></tr></thead><tbody>${signalRows}</tbody></table>

  <h2><span class="bar" style="background:#ea580c"></span>3. GoPlus Security Analysis</h2>
  <table><thead><tr><th>Check</th><th style="width:60px">Status</th><th>Detail</th></tr></thead><tbody>${goplusRows}</tbody></table>

  <div class="footer">
    <p><strong style="color:#64748b">DISCLAIMER:</strong> This report was generated by AXON v2.0. Findings should be independently verified before use in legal proceedings.</p>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <span class="mono" style="font-size:8px;color:#94a3b8">AXON BLOCKCHAIN INTELLIGENCE v2.0</span>
      <span class="mono" style="font-size:8px;color:#94a3b8">Case ${caseId} · END OF REPORT</span>
    </div>
  </div>
  <div class="cls-banner" style="border-top:2px solid #fecaca;border-bottom:none;margin-top:16px">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>
</div></body></html>`;

  _triggerPDFDownload(html, `AXON-${caseId}-Contract-Report`);
}

export async function downloadBulkPDF(report) {
  if (!report) return;

  const caseId = report.report_metadata?.report_id || `AXON-B-${Date.now().toString(36).toUpperCase().slice(0, 6)}-${report.bulk_batch_id.slice(0, 8)}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const isoStr = now.toISOString();

  const docHash = report.report_metadata?.sha256_hash || "UNVERIFIED-LOCAL-HASH";
  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0 } = report.summary || {};
  const total = CRITICAL + HIGH + MEDIUM + LOW;

  const getConsensusMessage = () => {
    if (CRITICAL > 0) return `FORENSIC CONSENSUS: ${CRITICAL} critical threats identified out of ${total} subjects. Immediate isolation and manual review strongly recommended for high-risk assets.`;
    if (HIGH > 0) return `FORENSIC CONSENSUS: Elevated risk detected. ${HIGH} subjects show suspicious behavioral patterns. Proceed with caution and monitor closely.`;
    if (MEDIUM > 0) return `FORENSIC CONSENSUS: Moderate risk profile. Some subjects exhibit anomalous but non-critical behaviors.`;
    return `FORENSIC CONSENSUS: Low risk profile. No immediate threats or sanctions exposure detected in the scanned batch.`;
  };
  
  const consensusMessage = getConsensusMessage();
  const consensusColor = CRITICAL > 0 ? '#dc2626' : HIGH > 0 ? '#ea580c' : MEDIUM > 0 ? '#ca8a04' : '#16a34a';

  const resultsHTML = (report.results || []).map((r, i) => {
    const score = r.data?.risk?.score || 0;
    const isCritical = score >= 80;
    const isHigh = score >= 60 && score < 80;
    const isMedium = score >= 40 && score < 60;
    const rColor = isCritical ? '#dc2626' : isHigh ? '#ea580c' : isMedium ? '#ca8a04' : '#16a34a';
    const rLabel = r.data?.risk?.label || "Data Not Available";
    const name = r.data?.identity?.name || r.address;
    const mitre = r.data?.risk?.analyticalSynthesis?.mitre_tag || 'N/A';

    return `
      <tr>
        <td style="font-family:'Courier New',monospace;font-size:11px;color:#64748b">${i + 1}</td>
        <td style="font-weight:600;font-family:'Courier New',monospace;">${_esc(r.address)}</td>
        <td>${_esc(name)}</td>
        <td><span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;color:${rColor};border:1px solid ${rColor}30;background:${rColor}10">${rLabel} (${score}/100)</span></td>
        <td style="font-family:'Courier New',monospace;font-size:10px;">${_esc(mitre)}</td>
        <td style="font-family:'Courier New',monospace;font-size:10px;color:#64748b">${_esc(r.status)}</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>AXON Bulk Report — ${caseId}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',sans-serif;background:#fff;color:#1e293b;font-size:12px;line-height:1.6}
  .page{max-width:800px;margin:0 auto;padding:40px 48px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:20px 28px}@page{margin:0.5in;size:A4}}
  .cls-banner{text-align:center;padding:6px 0;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:3px;color:#dc2626;border-bottom:2px solid #fecaca;background:#fef2f2}
  h1{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:4px}
  h2{font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;display:flex;align-items:center;gap:8px}
  h2 .bar{width:4px;height:18px;border-radius:2px}
  h3{font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin:16px 0 8px}
  .mono{font-family:'JetBrains Mono',monospace}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}
  .cell{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px}.cell .label{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;font-family:'JetBrains Mono',monospace}.cell .val{font-size:12px;color:#0f172a;font-weight:600;word-break:break-all}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}
  th{text-align:left;padding:6px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-family:'JetBrains Mono',monospace;border-bottom:2px solid #e2e8f0;background:#f8fafc}
  td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:top}
  .verdict-box{background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0284c7;border-radius:0 6px 6px 0;padding:16px 20px;margin:12px 0}
  .risk-box{background:#f8fafc;border:2px solid #e2e8f0;border-radius:8px;padding:20px;text-align:center}
  .footer{border-top:2px solid #e2e8f0;padding-top:16px;margin-top:24px}.footer p{font-size:9px;color:#94a3b8;line-height:1.5}
</style></head><body><div class="page">
  <div class="cls-banner">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>
  <div style="padding:24px 0;border-bottom:2px solid #e2e8f0">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <div style="width:28px;height:28px;border-radius:6px;background:#0f172a;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:800">A</div>
          <span style="font-size:18px;font-weight:800;letter-spacing:0.2em;color:#0f172a">AXON</span>
        </div>
        <div class="mono" style="font-size:9px;color:#64748b;letter-spacing:0.15em">BLOCKCHAIN FORENSIC INTELLIGENCE PLATFORM</div>
      </div>
      <div style="text-align:right">
        <span style="display:inline-block;padding:3px 12px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;margin-bottom:4px;">CONFIDENTIAL</span>
        <div class="mono" style="font-size:8px;color:#94a3b8;text-transform:uppercase;">SHA-256 INTEGRITY HASH</div>
        <div class="mono" style="font-size:9px;color:#64748b;max-width:200px;word-break:break-all;">${docHash}</div>
      </div>
    </div>
    <h1>Bulk Investigation Engine Master Report</h1>
    <p style="color:#64748b;font-size:12px;margin-bottom:16px">High-throughput forensic processing identifying systemic threats and clustered illicit behavior.</p>
    <div class="grid4">
      <div class="cell"><div class="label">Report ID</div><div class="val mono" style="color:#0284c7;font-size:11px">${caseId}</div></div>
      <div class="cell"><div class="label">Date</div><div class="val">${dateStr}</div></div>
      <div class="cell"><div class="label">Time (UTC)</div><div class="val mono">${timeStr}</div></div>
      <div class="cell"><div class="label">Status</div><div class="val" style="color:#16a34a">FINAL</div></div>
    </div>
  </div>

  <h2><span class="bar" style="background:#0284c7"></span>1. Executive Summary</h2>
  <div style="display:flex;gap:20px;margin-bottom:16px;">
    <div style="flex:1">
      <div class="grid4" style="margin-bottom:12px">
        <div class="cell"><div class="label">Total Processed</div><div class="val" style="font-size:18px;">${report.total_processed || 0}</div></div>
        <div class="cell"><div class="label">Successful</div><div class="val" style="font-size:18px;color:#16a34a">${report.successful || 0}</div></div>
        <div class="cell"><div class="label">Failed</div><div class="val" style="font-size:18px;color:#dc2626">${report.failed || 0}</div></div>
        <div class="cell"><div class="label">Batch ID</div><div class="val mono" style="font-size:8px;">${_esc(report.bulk_batch_id || 'N/A')}</div></div>
      </div>
      <div class="verdict-box" style="border-left-color:${consensusColor}">
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:2px">Automated Threat Assessment</div>
        <p style="font-size:12px;color:#0f172a;font-weight:700">${_esc(consensusMessage)}</p>
      </div>
    </div>
  </div>

  <h2><span class="bar" style="background:#dc2626"></span>2. Risk Distribution Matrix</h2>
  <div class="grid4" style="margin-bottom:16px;">
    <div class="risk-box" style="background:#fef2f2;border-color:#fecaca;">
      <div class="val mono" style="font-size:32px;font-weight:800;color:#dc2626;line-height:1">${CRITICAL}</div>
      <div class="label" style="font-size:10px;color:#dc2626;margin-top:6px;font-weight:bold;">CRITICAL</div>
    </div>
    <div class="risk-box" style="background:#fff7ed;border-color:#fed7aa;">
      <div class="val mono" style="font-size:32px;font-weight:800;color:#ea580c;line-height:1">${HIGH}</div>
      <div class="label" style="font-size:10px;color:#ea580c;margin-top:6px;font-weight:bold;">HIGH</div>
    </div>
    <div class="risk-box" style="background:#fefce8;border-color:#fef08a;">
      <div class="val mono" style="font-size:32px;font-weight:800;color:#ca8a04;line-height:1">${MEDIUM}</div>
      <div class="label" style="font-size:10px;color:#ca8a04;margin-top:6px;font-weight:bold;">MEDIUM</div>
    </div>
    <div class="risk-box" style="background:#f0fdf4;border-color:#bbf7d0;">
      <div class="val mono" style="font-size:32px;font-weight:800;color:#16a34a;line-height:1">${LOW}</div>
      <div class="label" style="font-size:10px;color:#16a34a;margin-top:6px;font-weight:bold;">LOW</div>
    </div>
  </div>

  <h2><span class="bar" style="background:#ea580c"></span>3. Entity Roster</h2>
  <table>
    <thead><tr><th style="width:20px">#</th><th style="width:120px">Address</th><th>Name</th><th style="width:120px">Risk Rating</th><th>MITRE/Verdict</th><th style="width:50px">Status</th></tr></thead>
    <tbody>${resultsHTML}</tbody>
  </table>

  <div class="footer">
    <p><strong style="color:#64748b">DISCLAIMER:</strong> This report was generated by AXON v2.0 Bulk Investigation Engine. Findings should be independently verified before use in legal proceedings.</p>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <span class="mono" style="font-size:8px;color:#94a3b8">AXON BLOCKCHAIN INTELLIGENCE v2.0</span>
      <span class="mono" style="font-size:8px;color:#94a3b8">Case ${caseId} · END OF REPORT</span>
    </div>
  </div>
  <div class="cls-banner" style="border-top:2px solid #fecaca;border-bottom:none;margin-top:16px">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>
</div></body></html>`;

  _triggerPDFDownload(html, `AXON-${caseId}-Bulk-Report`);
}

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

/** HTML-escape a string to prevent XSS in the generated document. */
function _esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Creates a new browser window with the HTML content and triggers the
 * browser's native Save as PDF dialog. This works on all deployed sites
 * without needing any server-side PDF generation or npm packages.
 */
function _triggerPDFDownload(html, filename) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Popup blocked — fallback to blob download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Popup was blocked. The report has been downloaded as HTML. Open it in your browser and use Ctrl+P → Save as PDF.');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for fonts to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    try { printWindow.print(); } catch(e) { /* ignore */ }
  }, 2000);
}
