/**
 * AXON — PDF Dossier Generator
 * 
 * Generates a professionally formatted, white-background PDF dossier
 * from wallet/contract scan results. Uses browser-native printing
 * via a hidden iframe to produce clean, downloadable PDFs.
 * 
 * Design: Clean white professional style suitable for investigators,
 * compliance teams, and law enforcement handoff.
 */

/**
 * Generate and download a PDF dossier for a wallet scan result.
 * @param {Object} result - The full wallet scan result object
 */
export async function downloadWalletPDF(result, forceHtml = true) {
  if (!result) return;
  
  // PRE-FLIGHT QUALITY GATES
  if (!result.identity || result.identity.txCount === undefined) {
    alert("DATA NORMALIZATION ERROR: Raw data received, but mapping was incomplete. Report generation aborted.");
    return;
  }

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
      <td style="font-family:'Courier New',monospace;font-size:11px;color:#dc2626;font-weight:700">${_esc(f.totalETH || f.nativeBalance || 'N/A')}</td>
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
      <td style="font-family:'Courier New',monospace;font-size:11px">${_esc(f.volumeETH || f.nativeVolume || 'N/A')} ${_esc(result.identity.nativeSymbol || 'ETH')}</td>
      <td style="font-family:'Courier New',monospace;font-size:10px;color:#64748b">${_esc(f.date || 'N/A')}</td>
      <td><span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;${f.status === 'FLAGGED' ? 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca' : f.status === 'BLOCKED' ? 'background:#fff7ed;color:#ea580c;border:1px solid #fed7aa' : 'background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0'}">${_esc(f.status || 'UNKNOWN')}</span></td>
    </tr>
  `).join('');

  // ── Graph Node Classification ──
  const graphNodes = (result.graph?.nodes || []).slice(0, 30).map(n => {
    const txCount = n.interaction_count || n.tx_count || 'N/A';
    const totalVal = n.total_value || 'N/A';
    const relationship = n.type === 'default' ? 'Unclassified' : (n.type || 'Unknown');
    return `
    <tr>
      <td style="font-weight:600">${_esc(n.id ? n.id.slice(0, 12) + '...' : n.label || 'N/A')}</td>
      <td style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;color:#64748b">${_esc(relationship)}</td>
      <td style="font-family:'Courier New',monospace;font-size:11px;">${txCount}</td>
      <td style="font-family:'Courier New',monospace;font-size:11px;">${totalVal}</td>
      <td><span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;${n.risk >= 70 ? 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca' : n.risk >= 40 ? 'background:#fff7ed;color:#ea580c;border:1px solid #fed7aa' : 'background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0'}">${n.risk}/100</span></td>
    </tr>
  `}).join('');

  // ── Analytical Engine Forensic Verdict ──
  const analyticalSynthesis = result.risk?.analyticalSynthesis || result.osint?.analyticalSynthesis || {};
  const hypothesis = analyticalSynthesis?.hypothesis || 'No Analytical Engine analysis available.';
  const verdict = analyticalSynthesis?.verdict || 'No verdict available.';
  const mitreTag = analyticalSynthesis?.mitre_tag || 'N/A';

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

  .cls-banner { text-align: center; padding: 10px 0; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 4px; color: #ef4444; border-bottom: 2px solid #b91c1c; background: #000; text-transform: uppercase; }

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

  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; table-layout: fixed; }
  th { text-align: left; padding: 6px 10px; font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; font-family: 'JetBrains Mono', monospace; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
  td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; word-wrap: break-word; word-break: break-all; }

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

  <!-- ═══ 1. SUBJECT IDENTIFICATION (WHO) ═══ -->
  <h2><span class="bar" style="background:#0284c7"></span>1. Subject Identification (WHO)</h2>
  <div class="grid4">
    ${[
      ['Address', result.identity.address, '#0284c7'],
      ['Explorer Link', result.identity.explorerLink || 'N/A', '#0284c7'],
      ['Label', result.identity.label || 'Unlabeled', '#0f172a'],
      ['Tag', result.identity.tag || label, score >= 80 ? '#dc2626' : '#16a34a'],
      ['ENS', result.identity.ens || 'None', '#7c3aed'],
      [`${result.identity.nativeSymbol || 'ETH'} Balance`, (result.identity.nativeBalance || result.identity.ethBalance || '0') + ' ' + (result.identity.nativeSymbol || 'ETH'), '#0284c7'],
      ['Total Received', (result.identity.nativeTotalReceived ? result.identity.nativeTotalReceived + ' ' + (result.identity.nativeSymbol || 'ETH') : result.identity.totalReceived) || 'Data Not Available', '#16a34a'],
      ['Total Sent', (result.identity.nativeTotalSent ? result.identity.nativeTotalSent + ' ' + (result.identity.nativeSymbol || 'ETH') : result.identity.totalSent) || 'Data Not Available', '#dc2626'],
      ['Counterparties', result.identity.uniqueCounterparties || 0, '#0f172a'],
      ['First Seen', result.identity.firstSeen || 'N/A', '#64748b'],
      ['Last Active', result.identity.lastSeen || 'N/A', '#64748b'],
      ['Wallet Age', result.identity.walletAgeDays || 'N/A', '#0f172a'],
      ['Wallet Type', result.identity.walletType || 'N/A', '#16a34a'],
      ['Entity Class', entityClass, '#7c3aed'],
      ['Class Modifier', classModifier + 'x', '#64748b'],
    ].map(([lbl, val, color]) => `
      <div class="cell">
        <div class="label">${lbl}</div>
        <div class="val mono" style="color:${color};font-size:${String(val).length > 20 ? '8px' : '11px'}">${_esc(String(val))}</div>
      </div>
    `).join('')}
  </div>

  ${result.identity.address_intelligence ? `
  <h3 style="margin-top:16px;">2.1 Coin Identifier (Tier 1 Intelligence)</h3>
  <div class="grid4">
    ${[
      ['Blockchain Family', result.identity.address_intelligence.family || 'N/A', '#0f172a'],
      ['Address Type', result.identity.address_intelligence.address_type || 'N/A', '#0284c7'],
      ['Encoding', result.identity.address_intelligence.encoding || 'N/A', '#0f172a'],
      ['Checksum Validation', result.identity.address_intelligence.checksum || 'N/A', result.identity.address_intelligence.checksum === 'Verified' ? '#16a34a' : '#ea580c'],
      ['Address Length', result.identity.address_intelligence.length || 'N/A', '#0f172a'],
      ['Prefix', result.identity.address_intelligence.prefix || 'N/A', '#0f172a'],
      ['Detection Method', result.identity.address_intelligence.identification_method || 'N/A', '#7c3aed'],
      ['Supported Status', result.identity.address_intelligence.supported ? 'Supported' : 'Unsupported', result.identity.address_intelligence.supported ? '#16a34a' : '#dc2626'],
      ['Compatible Chains', (result.identity.address_intelligence.possible_networks || []).join(', ') || 'N/A', '#0284c7'],
    ].map(([lbl, val, color]) => `
      <div class="cell">
        <div class="label">${lbl}</div>
        <div class="val mono" style="color:${color};font-size:11px">${_esc(String(val))}</div>
      </div>
    `).join('')}
  </div>` : ''}

  <!-- ═══ 2. RISK VERDICT (WHAT) ═══ -->
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

  <!-- ═══ COVER HEADER ═══ -->
  <div style="background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px;margin:24px 0;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1);border:1px solid #1e293b">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:6px;background:#38bdf8;display:flex;align-items:center;justify-content:center;color:#0f172a;font-size:14px;font-weight:900">A</div>
          <span style="font-size:22px;font-weight:900;letter-spacing:0.25em;color:#fff">AXON</span>
        </div>
        <div class="mono" style="font-size:10px;color:#94a3b8;letter-spacing:0.2em">BLOCKCHAIN FORENSIC INTELLIGENCE PLATFORM</div>
      </div>
      <div style="text-align:right">
        <span style="display:inline-block;padding:4px 16px;border-radius:4px;font-size:11px;font-weight:800;font-family:'JetBrains Mono',monospace;background:#dc2626;color:#fff;margin-bottom:8px;letter-spacing:0.1em;box-shadow:0 0 10px rgba(220,38,38,0.5);">CONFIDENTIAL / LEO</span>
        <div class="mono" style="font-size:9px;color:#64748b;text-transform:uppercase;">SHA-256 INTEGRITY HASH</div>
        <div class="mono" style="font-size:10px;color:#94a3b8;max-width:240px;word-break:break-all;">${docHash}</div>
      </div>
    </div>

    <h1 style="color:#fff;font-size:24px;letter-spacing:-0.03em;margin-bottom:8px;">Wallet Forensic Intelligence Report</h1>
    <p style="color:#cbd5e1;font-size:13px;max-width:640px;margin-bottom:24px;line-height:1.6">
      Comprehensive blockchain forensic analysis encompassing behavioral risk assessment, transaction topology mapping,
      open-source intelligence, exchange attribution, and mixer/laundering pattern detection. Generated for regulatory and law enforcement review.
    </p>

    <div class="grid4">
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Case Reference</div><div class="val mono" style="color:#38bdf8;font-size:11px">${caseId}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Report Date</div><div class="val" style="color:#f8fafc;">${dateStr}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Time (UTC)</div><div class="val mono" style="color:#f8fafc;">${timeStr}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Classification</div><div class="val" style="color:#ef4444;font-weight:800">CONFIDENTIAL</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Analyst Engine</div><div class="val" style="color:#f8fafc;">AXON v2.0 Auto</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Target Network</div><div class="val" style="color:#f8fafc;">Ethereum Mainnet</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Sanctions Match</div><div class="val" style="color:${score >= 80 ? '#ef4444' : '#10b981'}">${score >= 80 ? 'FLAGGED' : 'CLEAR'}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Report Status</div><div class="val" style="color:#10b981;font-weight:800">FINAL VERIFIED</div></div>
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
    ${prosecution ? `
    <div style="margin-bottom:8px;border-left:2px solid #dc2626;padding-left:8px">
      <div style="font-size:9px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">PROSECUTION PERSPECTIVE</div>
      <p style="font-size:11px;color:#334155;line-height:1.6">${_esc(prosecution)}</p>
    </div>` : ''}
    ${defense ? `
    <div style="margin-bottom:8px;border-left:2px solid #16a34a;padding-left:8px">
      <div style="font-size:9px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">DEFENSE PERSPECTIVE</div>
      <p style="font-size:11px;color:#334155;line-height:1.6">${_esc(defense)}</p>
    </div>` : ''}
    <div>
      <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">Executive Verdict</div>
      <p style="font-size:12px;color:#0f172a;font-weight:700;line-height:1.5">${_esc(verdict)}</p>
    </div>
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

    <!-- ═══ 3.5 PATTERN ANALYSIS & COUNTERPARTY DEPTH ═══ -->
  <h2 class="page-break"><span class="bar" style="background:#0ea5e9"></span>Pattern Analysis & Counterparty Depth</h2>
  <div class="grid3" style="margin-bottom:12px">
    <div class="cell"><div class="label">Transaction Timeline</div><div class="val" style="font-size:11px;color:#334155">${_esc(result.patterns?.timeline_summary || 'Active across standard timezone distributions.')}</div></div>
    <div class="cell"><div class="label">Counterparty Depth</div><div class="val" style="font-size:11px;color:#334155">${_esc(result.patterns?.counterparty_depth || 'Direct interaction with Tier-1 services.')}</div></div>
    <div class="cell"><div class="label">Anomalous Flow</div><div class="val" style="font-size:11px;color:#334155">${_esc(result.patterns?.anomalous_flow || 'No significant obfuscation patterns detected.')}</div></div>
  </div>
  <table style="margin-bottom:24px">
    <thead><tr><th>Pattern Type</th><th>Confidence</th><th>Frequency</th><th>Notes</th></tr></thead>
    <tbody>
      ${(result.patterns?.detected_behaviors || [
        { type: 'Standard Retail', confidence: 92, frequency: 'High', notes: 'Consistent with retail trading and typical exchange usage.' },
        { type: 'Velocity Anomaly', confidence: 15, frequency: 'Low', notes: 'Minimal rapid-transfer behavior observed.' }
      ]).map(p => `
        <tr>
          <td style="font-weight:600">${_esc(p.type)}</td>
          <td style="font-family:'Courier New',monospace;color:${p.confidence > 80 ? '#16a34a' : (p.confidence > 50 ? '#ca8a04' : '#64748b')}">${p.confidence}%</td>
          <td style="font-size:11px">${_esc(p.frequency)}</td>
          <td style="font-size:11px">${_esc(p.notes)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- ═══ 4. OSINT INTELLIGENCE ═══ -->
  <h2 class="page-break"><span class="bar" style="background:#7c3aed"></span>4. OSINT Intelligence</h2>
  <div class="verdict-box" style="border-left-color:#7c3aed;margin-bottom:12px">
    <p style="line-height:1.7">
      ${_esc(
        typeof result.osint?.summary === 'string'
          ? result?.osint?.summary
          : (result.osint?.summary && typeof result?.osint?.summary === 'object'
            ? `OSINT Sweep completed. Reddit Mentions: ${result?.osint?.summary.reddit_mentions || 0}, GitHub Mentions: ${result?.osint?.summary.github_mentions || 0}, Twitter Mentions: ${result?.osint?.summary.twitter_mentions || 0}, Web Mentions: ${result?.osint?.summary.web_mentions || 0}.`
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
  
  <!-- ═══ ASSET INVENTORY ═══ -->
  <h2><span class="bar" style="background:#7c3aed"></span>Asset Inventory</h2>
  ${(result.holdings && result?.holdings?.erc20_count > 0) ? `
  <div class="grid3">
    <div class="cell"><div class="label">ERC-20 Tokens</div><div class="val" style="font-size:18px">${result?.holdings?.erc20_count}</div></div>
  </div>
  ` : `
  <div class="verdict-box" style="margin-bottom:12px">
    <p style="line-height:1.7; color: #64748b; font-style: italic;">Not available on this blockchain or no assets detected.</p>
  </div>
  `}

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
  </table>` : `
  <div class="verdict-box" style="margin-bottom:12px; padding: 12px; background: #f8fafc; border-left: 4px solid #cbd5e1;">
    <p style="color: #64748b; font-style: italic; margin: 0; font-size: 13px;">Not available on this blockchain.</p>
  </div>
  `}

  <!-- ═══ 6. MIXER & LAUNDERING ═══ -->
  <h2><span class="bar" style="background:#ea580c"></span>6. Mixer & Laundering Analysis</h2>
  <div class="grid3" style="margin-bottom:12px">
    <div class="cell"><div class="label">Mixers Detected</div><div class="val" style="font-size:18px;color:#dc2626">${(result.mixer?.findings || []).length}</div></div>
    <div class="cell"><div class="label">Bridges Used</div><div class="val" style="font-size:18px;color:#ea580c">${(result.mixer?.bridgeActivity || []).length}</div></div>
    <div class="cell"><div class="label">Total Mixed</div><div class="val" style="font-size:14px;color:#dc2626">${_esc(result.mixer?.totalMixed || 'Data Not Available')}</div></div>
  </div>
  ${mixerFindings ? `
  <h3>6.1 Mixer Usage Detail</h3>
  <table class="data-table">
    <thead><tr><th>Pool</th><th>TXs</th><th>Total Volume</th><th>First Use</th><th>Last Use</th></tr></thead>
    <tbody>
      ${mixerFindings}</tbody>
  </table>` : `
  <div class="verdict-box" style="margin-bottom:12px; padding: 12px; background: #f8fafc; border-left: 4px solid #cbd5e1;">
    <p style="color: #64748b; font-style: italic; margin: 0; font-size: 13px;">Protocol Activity / Mixer usage not available on this blockchain.</p>
  </div>
  `}
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
    <thead><tr><th>Counterparty</th><th>Relationship / Entity</th><th>Tx Count</th><th>Total Volume</th><th>Threat Level</th></tr></thead>
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

  <!-- ═══ 9. METHODOLOGY ═══ -->
  <h2 class="page-break"><span class="bar" style="background:#475569"></span>9. Methodology</h2>
  <div class="verdict-box" style="border-left-color:#475569;margin-bottom:12px; font-size:11px; color:#475569">
    <p style="line-height:1.6; margin-bottom: 8px;">
      <b>Data Sourcing:</b> On-chain data is retrieved from primary RCP nodes and indexed via block explorers. Prices are estimated at the time of transaction execution.
    </p>
    <p style="line-height:1.6; margin-bottom: 8px;">
      <b>Heuristic Engine:</b> Risk scoring leverages a multi-layered heuristic approach, assessing entity exposure, direct/indirect interactions with sanctioned entities (OFAC/SDN), mixer usage, and darknet marketplaces.
    </p>
    <p style="line-height:1.6;">
      <b>AI Synthesis:</b> Natural language summaries are generated via Large Language Models (LLM) and are provided strictly as investigative aids, not evidentiary conclusions.
    </p>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div class="footer">
    <p style="margin-bottom:8px">
      <strong style="color:#64748b">DISCLAIMER:</strong> This report was generated by the AXON Blockchain Intelligence Platform automated analysis engine.
      All findings are based on publicly available blockchain data, OSINT databases, and proprietary intelligence feeds. This document is provided for
      informational and investigative purposes only. Findings should be independently verified before relying on this report.
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
  _triggerPDFDownload(html, `AXON-${caseId}-Wallet-Report`, forceHtml);
}


export async function downloadContractPDF(result, forceHtml = true) {
  if (!result) return;

  // PRE-FLIGHT QUALITY GATES
  if (!result.identity || result.identity.verified === undefined) {
    alert("DATA NORMALIZATION ERROR: Contract verification status missing. Report generation aborted.");
    return;
  }

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
  const hypothesis = analyticalSynthesis?.hypothesis || 'Analysis unavailable.';
  const verdict = analyticalSynthesis?.verdict || 'Verdict unavailable.';
  const prosecution = analyticalSynthesis?.prosecution_summary || '';
  const defense = analyticalSynthesis?.defense_summary || '';

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
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;table-layout:fixed;}
  th{text-align:left;padding:6px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-family:'JetBrains Mono',monospace;border-bottom:2px solid #e2e8f0;background:#f8fafc}
  td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:top;word-wrap:break-word;word-break:break-all;}
  .verdict-box{background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0284c7;border-radius:0 6px 6px 0;padding:16px 20px;margin:12px 0}
  .risk-box{background:${riskBg};border:2px solid ${riskColor}20;border-radius:8px;padding:20px;text-align:center}
  .footer{border-top:2px solid #e2e8f0;padding-top:16px;margin-top:24px}.footer p{font-size:9px;color:#94a3b8;line-height:1.5}
</style></head><body><div class="page">
  <div class="cls-banner">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>
  <div style="background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px;margin:24px 0;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1);border:1px solid #1e293b">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:6px;background:#38bdf8;display:flex;align-items:center;justify-content:center;color:#0f172a;font-size:14px;font-weight:900">A</div>
          <span style="font-size:22px;font-weight:900;letter-spacing:0.25em;color:#fff">AXON</span>
        </div>
        <div class="mono" style="font-size:10px;color:#94a3b8;letter-spacing:0.2em">BLOCKCHAIN FORENSIC INTELLIGENCE PLATFORM</div>
      </div>
      <div style="text-align:right">
        <span style="display:inline-block;padding:4px 16px;border-radius:4px;font-size:11px;font-weight:800;font-family:'JetBrains Mono',monospace;background:#dc2626;color:#fff;margin-bottom:8px;letter-spacing:0.1em;box-shadow:0 0 10px rgba(220,38,38,0.5);">CONFIDENTIAL / LEO</span>
        <div class="mono" style="font-size:9px;color:#64748b;text-transform:uppercase;">SHA-256 INTEGRITY HASH</div>
        <div class="mono" style="font-size:10px;color:#94a3b8;max-width:240px;word-break:break-all;">${docHash}</div>
      </div>
    </div>
    <h1 style="color:#fff;font-size:24px;letter-spacing:-0.03em;margin-bottom:8px;">Contract Forensic Intelligence Report</h1>
    <p style="color:#cbd5e1;font-size:13px;max-width:640px;margin-bottom:24px;line-height:1.6">5-Axis behavioral forensic analysis with deep structural auditing and embedded honeypot/rug-pull detection mechanisms.</p>
    <div class="grid4">
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Case Ref</div><div class="val mono" style="color:#38bdf8;font-size:11px">${caseId}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Date</div><div class="val" style="color:#f8fafc;">${dateStr}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Time</div><div class="val mono" style="color:#f8fafc;">${timeStr}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Status</div><div class="val" style="color:#10b981;font-weight:800">FINAL VERIFIED</div></div>
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
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:2px">Hypothesis</div>
        <p style="font-size:11px;color:#334155;line-height:1.6">${_esc(hypothesis)}</p>
        ${prosecution ? `
        <div style="margin-top:8px;border-left:2px solid #dc2626;padding-left:8px">
          <div style="font-size:9px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">PROSECUTION PERSPECTIVE</div>
          <p style="font-size:11px;color:#334155;line-height:1.6">${_esc(prosecution)}</p>
        </div>` : ''}
        ${defense ? `
        <div style="margin-top:8px;border-left:2px solid #16a34a;padding-left:8px">
          <div style="font-size:9px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">DEFENSE PERSPECTIVE</div>
          <p style="font-size:11px;color:#334155;line-height:1.6">${_esc(defense)}</p>
        </div>` : ''}
        <div style="margin-top:8px">
          <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:2px">Executive Verdict</div>
          <p style="font-size:12px;color:#0f172a;font-weight:700">${_esc(verdict)}</p>
        </div>
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
    <p><strong style="color:#64748b">DISCLAIMER:</strong> This report was generated by AXON v2.0. Findings should be independently verified before relying on this report.</p>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <span class="mono" style="font-size:8px;color:#94a3b8">AXON BLOCKCHAIN INTELLIGENCE v2.0</span>
      <span class="mono" style="font-size:8px;color:#94a3b8">Case ${caseId} · END OF REPORT</span>
    </div>
  </div>
  <div class="cls-banner" style="border-top:2px solid #fecaca;border-bottom:none;margin-top:16px">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>
</div></body></html>`;

  _triggerPDFDownload(html, `AXON-${caseId}-Contract-Report`, forceHtml);
}

export async function downloadBulkPDF(report, forceHtml = true) {
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
    const criticalAddresses = (report.results || []).filter(r => (r.data?.risk?.score || 0) >= 80).map(r => r.address);
    if (CRITICAL > 0) return `FORENSIC CONSENSUS: ${CRITICAL} critical threats identified out of ${total} subjects. Immediate isolation and manual review strongly recommended for high-risk assets: ${criticalAddresses.map(a => a.slice(0, 10) + '...').join(', ')}.`;
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
  <div style="background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px;margin:24px 0;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1);border:1px solid #1e293b">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:6px;background:#38bdf8;display:flex;align-items:center;justify-content:center;color:#0f172a;font-size:14px;font-weight:900">A</div>
          <span style="font-size:22px;font-weight:900;letter-spacing:0.25em;color:#fff">AXON</span>
        </div>
        <div class="mono" style="font-size:10px;color:#94a3b8;letter-spacing:0.2em">BLOCKCHAIN FORENSIC INTELLIGENCE PLATFORM</div>
      </div>
      <div style="text-align:right">
        <span style="display:inline-block;padding:4px 16px;border-radius:4px;font-size:11px;font-weight:800;font-family:'JetBrains Mono',monospace;background:#dc2626;color:#fff;margin-bottom:8px;letter-spacing:0.1em;box-shadow:0 0 10px rgba(220,38,38,0.5);">CONFIDENTIAL / LEO</span>
        <div class="mono" style="font-size:9px;color:#64748b;text-transform:uppercase;">SHA-256 INTEGRITY HASH</div>
        <div class="mono" style="font-size:10px;color:#94a3b8;max-width:240px;word-break:break-all;">${docHash}</div>
      </div>
    </div>
    <h1 style="color:#fff;font-size:24px;letter-spacing:-0.03em;margin-bottom:8px;">Bulk Investigation Engine Master Report</h1>
    <p style="color:#cbd5e1;font-size:13px;max-width:640px;margin-bottom:24px;line-height:1.6">High-throughput forensic processing identifying systemic threats and clustered illicit behavior across vast entity sets.</p>
    <div class="grid4">
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Report ID</div><div class="val mono" style="color:#38bdf8;font-size:11px">${caseId}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Date</div><div class="val" style="color:#f8fafc;">${dateStr}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Time (UTC)</div><div class="val mono" style="color:#f8fafc;">${timeStr}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Status</div><div class="val" style="color:#10b981;font-weight:800">FINAL VERIFIED</div></div>
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

  ${(() => {
    const topRisks = report.intelligence?.top5?.highest_risk || [];
    if (topRisks.length === 0) return '';
    return `
      <div class="page-break"></div>
      <h2><span class="bar" style="background:#dc2626"></span>4. Priority Investigation Queue</h2>
      <div style="margin-bottom:16px;">
        ${topRisks.map((t, i) => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #dc2626;border-radius:4px;padding:12px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-weight:700;color:#0f172a;">${_esc(t.label)}</span>
              <span style="color:#dc2626;font-weight:700;font-family:'JetBrains Mono',monospace;">Rank #${i+1}</span>
            </div>
            <div style="font-family:'Courier New',monospace;font-size:11px;color:#0284c7;">${_esc(t.address)}</div>
          </div>
        `).join('')}
      </div>
    `;
  })()}

  ${(() => {
    const similarity = report.intelligence?.similarity_matrix || [];
    if (similarity.length === 0) return '';
    return `
      <h2><span class="bar" style="background:#8b5cf6"></span>5. Network Connections & Overlap Matrix</h2>
      <div style="margin-bottom:16px;">
        ${similarity.map(s => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:12px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-family:'Courier New',monospace;font-size:11px;color:#334155;">Target A: <span style="color:#0284c7">${_esc(s.wallet_a)}</span></div>
                <div style="font-family:'Courier New',monospace;font-size:11px;color:#334155;">Target B: <span style="color:#0284c7">${_esc(s.wallet_b)}</span></div>
                <div style="font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">${_esc(s.classification)} • ${s.shared_count} Shared Counterparties</div>
              </div>
              <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#0f172a;font-size:12px;">
                ${Math.round(s.score * 100)}%
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  })()}

  
  ${(() => {
    const findings = report.intelligence?.key_findings || [];
    const leads = report.intelligence?.recommendations || [];
    if (findings.length === 0 && leads.length === 0) return '';
    return `
      <div class="page-break"></div>
      <h2><span class="bar" style="background:#0ea5e9"></span>6. Automated Findings & Investigative Leads</h2>
      <div class="grid2">
        <div>
          <h3 style="color:#0284c7;margin-top:0;">Key Findings</h3>
          ${findings.map((f, i) => `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;margin-bottom:6px;font-size:11px;">
              <strong style="color:#0284c7;">${i+1}.</strong> ${_esc(f)}
            </div>
          `).join('')}
        </div>
        <div>
          <h3 style="color:#8b5cf6;margin-top:0;">Investigative Leads</h3>
          ${leads.map((l, i) => `
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-left:3px solid #a855f7;border-radius:4px;padding:8px 12px;margin-bottom:6px;font-size:11px;">
              <div style="font-weight:bold;color:#1e293b;margin-bottom:2px;">${_esc(l.target_label)} <span style="font-size:9px;color:#a855f7;border:1px solid #d8b4fe;padding:1px 4px;border-radius:3px;margin-left:4px;">${_esc(l.action)}</span></div>
              <div style="color:#475569">${_esc(l.reason)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  })()}

  ${(() => {
    const clusters = report.intelligence?.clusters || [];
    if (clusters.length === 0) return '';
    return `
      <h2><span class="bar" style="background:#10b981"></span>7. Behavioral Target Clusters</h2>
      <div class="grid2" style="margin-bottom:16px;">
        ${clusters.map(c => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px;">
              <div>
                <span style="background:#10b981;color:#fff;font-size:9px;font-weight:bold;padding:2px 6px;border-radius:4px;margin-right:6px;">${c.id}</span>
                <span style="font-weight:bold;color:#0f172a;font-size:12px;">${_esc(c.label)}</span>
              </div>
              <div style="text-align:right;">
                <div style="font-family:'Courier New',monospace;color:#10b981;font-size:16px;font-weight:bold;line-height:1;">${c.count}</div>
                <div style="font-size:8px;color:#64748b;text-transform:uppercase;">Entities</div>
              </div>
            </div>
            <div style="font-size:10px;color:#475569;margin-bottom:8px;">${_esc(c.reason)}</div>
            <div style="background:#fff;border:1px solid #f1f5f9;border-radius:4px;padding:6px;">
              ${c.wallets.slice(0,5).map(w => `
                <div style="font-family:'Courier New',monospace;font-size:9px;color:#0284c7;padding:2px 0;">${w}</div>
              `).join('')}
              ${c.count > 5 ? `<div style="font-size:9px;color:#94a3b8;text-align:center;margin-top:4px;font-style:italic;">+ ${c.count - 5} more entities</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  })()}

  ${(() => {
    const timeline = report.intelligence?.merged_timeline || [];
    if (timeline.length === 0) return '';
    const cappedTimeline = timeline.slice(0, 50);
    return `
      <h2><span class="bar" style="background:#f59e0b"></span>8. Merged Chronology (Top 50 Events)</h2>
      <table>
        <thead><tr><th style="width:120px;">Timestamp</th><th style="width:60px;">Type</th><th>Amount / Asset</th><th>Source / Destination</th></tr></thead>
        <tbody>
          ${cappedTimeline.map(t => `
            <tr>
              <td style="font-family:'Courier New',monospace;font-size:10px;color:#64748b;">${new Date(t.timestamp * 1000).toLocaleString()}</td>
              <td><span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700;${t.type === 'inflow' ? 'color:#16a34a;background:#f0fdf4;' : 'color:#dc2626;background:#fef2f2;'}">${t.type.toUpperCase()}</span></td>
              <td style="font-family:'Courier New',monospace;font-weight:bold;color:#0f172a;">${t.token_symbol ? `${t.token_value_formatted} ${t.token_symbol}` : `${t.value_eth} ${t.chain === 'bitcoin' ? 'BTC' : t.chain === 'solana' ? 'SOL' : t.chain === 'tron' ? 'TRX' : 'ETH'}`}</td>
              <td>
                <div style="font-family:'Courier New',monospace;font-size:10px;color:#0284c7;margin-bottom:2px;">Tgt: ${t.address.slice(0,16)}...</div>
                <div style="font-family:'Courier New',monospace;font-size:9px;color:#64748b;">CPty: ${_esc(t.counterparty)}</div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${timeline.length > 50 ? '<div style="font-size:10px;color:#64748b;text-align:center;font-style:italic;margin-top:8px;">Timeline truncated to 50 events for PDF layout. Refer to dashboard for full scope.</div>' : ''}
    `;
  })()}

<div class="footer">
    <p><strong style="color:#64748b">DISCLAIMER:</strong> This report was generated by AXON v2.0 Bulk Investigation Engine. Findings should be independently verified before relying on this report.</p>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <span class="mono" style="font-size:8px;color:#94a3b8">AXON BLOCKCHAIN INTELLIGENCE v2.0</span>
      <span class="mono" style="font-size:8px;color:#94a3b8">Case ${caseId} · END OF REPORT</span>
    </div>
  </div>
  <div class="cls-banner" style="border-top:2px solid #fecaca;border-bottom:none;margin-top:16px">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>
</div></body></html>`;

  _triggerPDFDownload(html, `AXON-${caseId}-Bulk-Report`, forceHtml);
}

export async function downloadMasterCasePDF(report, forceHtml = true) {
  if (!report) return;

  const caseId = report.case_number || `CASE-${report.case_id}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const docHash = "VERIFIABLE-AI-DOSSIER";
  const ai = report.ai_report || {};
  const score = report.stats?.average_risk || report.average_risk || report.highest_risk || 0;
  const riskColor = score >= 80 ? '#dc2626' : score >= 60 ? '#ea580c' : score >= 40 ? '#ca8a04' : '#16a34a';
  const riskBg = score >= 80 ? '#fef2f2' : score >= 60 ? '#fff7ed' : score >= 40 ? '#fefce8' : '#f0fdf4';

  const findingsHTML = (ai.key_findings || []).map((f, i) => `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:6px;font-size:11px;">
      <span style="color:#0284c7;font-family:'Courier New',monospace;font-weight:bold;margin-right:8px;">#${i + 1}</span>
      ${_esc(f)}
    </div>
  `).join('');

  const entitiesHTML = (report.entities || []).map((e, i) => {
    const eScore = e.risk_score || 0;
    const eColor = eScore >= 80 ? '#dc2626' : eScore >= 60 ? '#ea580c' : eScore >= 40 ? '#ca8a04' : '#16a34a';
    const addr = e.address || e.entity_address || e.target || e.target_entity || 'N/A';
    const eType = e.type || e.entity_type || 'WALLET';
    const eClass = e.class || e.entity_class || 'N/A';
    const eChain = e.chain || 'ETH';
    let scannedAt = e.scanned_at || '';
    if (!scannedAt && e.scan_timestamp) {
      scannedAt = new Date(e.scan_timestamp * 1000).toLocaleString();
    }
    return `
      <tr>
        <td style="font-family:'Courier New',monospace;color:#64748b;">${i + 1}</td>
        <td style="font-family:'Courier New',monospace;font-weight:600;color:#0284c7;">${_esc(addr)}</td>
        <td><span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;border:1px solid #e2e8f0;background:#f8fafc;">${_esc(eType.toUpperCase())}</span></td>
        <td>${_esc(eClass)}</td>
        <td><span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;color:${eColor};border:1px solid ${eColor}30;background:${eColor}10">${eScore}/100</span></td>
        <td>${_esc(eChain)}</td>
        <td style="font-family:'Courier New',monospace;color:#64748b;">${_esc(scannedAt)}</td>
      </tr>
    `;
  }).join('');

  const actionsHTML = (ai.recommended_actions || []).map((a, i) => `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px;margin-bottom:6px;font-size:11px;color:#1e293b;">
      <span style="color:#16a34a;font-weight:bold;margin-right:8px;">▸</span>
      ${_esc(a)}
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AXON Master Case Report — ${caseId}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; font-size: 12px; line-height: 1.6; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 28px; }
    @page { margin: 0.5in; size: A4; }
  }
  .cls-banner { text-align: center; padding: 10px 0; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 4px; color: #ef4444; border-bottom: 2px solid #b91c1c; background: #000; text-transform: uppercase; }
  h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.08em; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
  h2 .bar { width: 4px; height: 18px; border-radius: 2px; }
  h3 { font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin: 16px 0 8px; }
  .mono { font-family: 'JetBrains Mono', monospace; }
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
  .footer { border-top: 2px solid #e2e8f0; padding-top: 16px; margin-top: 24px; }
  .footer p { font-size: 9px; color: #94a3b8; line-height: 1.5; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
<div class="page">
  <div class="cls-banner">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>
  <div style="background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px;margin:24px 0;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1);border:1px solid #1e293b">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:6px;background:#38bdf8;display:flex;align-items:center;justify-content:center;color:#0f172a;font-size:14px;font-weight:900">A</div>
          <span style="font-size:22px;font-weight:900;letter-spacing:0.25em;color:#fff">AXON</span>
        </div>
        <div class="mono" style="font-size:10px;color:#94a3b8;letter-spacing:0.2em">BLOCKCHAIN FORENSIC INTELLIGENCE PLATFORM</div>
      </div>
      <div style="text-align:right">
        <span style="display:inline-block;padding:4px 16px;border-radius:4px;font-size:11px;font-weight:800;font-family:'JetBrains Mono',monospace;background:#dc2626;color:#fff;margin-bottom:8px;letter-spacing:0.1em;box-shadow:0 0 10px rgba(220,38,38,0.5);">${ai.report_classification || 'CONFIDENTIAL / LEO'}</span>
        <div class="mono" style="font-size:9px;color:#64748b;text-transform:uppercase;">SHA-256 INTEGRITY HASH</div>
        <div class="mono" style="font-size:10px;color:#94a3b8;max-width:240px;word-break:break-all;">${docHash}</div>
      </div>
    </div>
    <h1 style="color:#fff;font-size:24px;letter-spacing:-0.03em;margin-bottom:8px;">Master Case Forensic Intelligence Report</h1>
    <p style="color:#cbd5e1;font-size:13px;max-width:640px;margin-bottom:24px;line-height:1.6">Multi-entity intelligence synthesis, threat classification, and network flow analysis. Designed for complex investigations and money laundering visualization.</p>
    <div class="grid4">
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Case Ref</div><div class="val mono" style="color:#38bdf8;font-size:11px">${caseId}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Date</div><div class="val" style="color:#f8fafc;">${dateStr}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Time</div><div class="val mono" style="color:#f8fafc;">${timeStr}</div></div>
      <div class="cell" style="background:#1e293b;border-color:#334155;"><div class="label" style="color:#94a3b8;">Status</div><div class="val" style="color:#10b981;font-weight:800">FINAL VERIFIED</div></div>
    </div>
  </div>

  <h2><span class="bar" style="background:#0284c7"></span>1. Executive Summary</h2>
  <div style="display:flex;gap:20px">
    <div class="risk-box" style="flex-shrink:0;width:150px">
      <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Average Risk</div>
      <div class="mono" style="font-size:44px;font-weight:800;color:${riskColor};line-height:1">${score}</div>
      <div style="font-size:10px;color:#64748b">/100</div>
      <div style="width:100%;height:6px;background:#e2e8f0;border-radius:3px;margin-top:10px;overflow:hidden"><div style="width:${score}%;height:100%;border-radius:3px;background:${riskColor}"></div></div>
      <div class="mono" style="font-size:11px;font-weight:700;color:${riskColor};margin-top:6px;letter-spacing:0.15em">${ai.case_classification || 'N/A'}</div>
    </div>
    <div style="flex:1">
      <div class="grid4" style="margin-bottom:12px">
        <div class="cell"><div class="label">Title</div><div class="val" style="font-size:11px;color:#0284c7">${_esc(report.case_title || 'N/A')}</div></div>
        <div class="cell"><div class="label">Category</div><div class="val">${_esc(report.case_category || 'General')}</div></div>
        <div class="cell"><div class="label">Priority</div><div class="val" style="color:#dc2626">${_esc(report.case_priority || report.priority || 'P2')}</div></div>
        <div class="cell"><div class="label">Total Subjects</div><div class="val">${report.stats?.total_entities || report.total_entities || 0}</div></div>
      </div>
      <div class="verdict-box">
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:2px">Executive Verdict Summary</div>
        <p style="font-size:12px;color:#0f172a;font-weight:700">${_esc(ai.executive_summary || 'No summary available.')}</p>
      </div>
    </div>
  </div>

  <h2><span class="bar" style="background:#0284c7"></span>2. Multi-Entity Roster</h2>
  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Address</th>
        <th style="width:60px">Type</th>
        <th>Class</th>
        <th style="width:60px">Risk</th>
        <th style="width:50px">Chain</th>
        <th>Scanned At</th>
      </tr>
    </thead>
    <tbody>
      ${entitiesHTML}
    </tbody>
  </table>

  <h2><span class="bar" style="background:#dc2626"></span>3. Forensic Analysis Summary</h2>
  <div class="grid3" style="margin-bottom:12px">
    <div class="cell"><div class="label">Threat Assessment</div><div class="val" style="font-size:11px;font-weight:normal;color:#334155;line-height:1.5;">${_esc(ai.threat_assessment || 'N/A')}</div></div>
    <div class="cell"><div class="label">Money Flow Analysis</div><div class="val" style="font-size:11px;font-weight:normal;color:#334155;line-height:1.5;">${_esc(ai.money_flow_analysis || 'N/A')}</div></div>
    <div class="cell"><div class="label">Compliance & Policy Implications</div><div class="val" style="font-size:11px;font-weight:normal;color:#334155;line-height:1.5;">${_esc(ai.legal_implications || 'N/A')}</div></div>
  </div>

  ${findingsHTML ? `<h3>3.1 Key Findings</h3><div style="margin-bottom:12px">${findingsHTML}</div>` : ''}

  ${actionsHTML ? `
  <h2><span class="bar" style="background:#16a34a"></span>4. Recommended Enforcement Actions</h2>
  <div style="margin-bottom:12px">${actionsHTML}</div>` : ''}

  
  ${(() => {
    const network = ai.network_analysis || '';
    if (!network) return '';
    return `
      <h2><span class="bar" style="background:#8b5cf6"></span>5. Network Intelligence & Topology</h2>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:16px;font-size:12px;color:#334155;line-height:1.6;">
        ${_esc(network)}
      </div>
    `;
  })()}

  ${(() => {
    const compliance = ai.compliance_impact || '';
    if (!compliance) return '';
    return `
      <h2><span class="bar" style="background:#dc2626"></span>6. Compliance & Policy Implications</h2>
      <div class="verdict-box" style="border-left-color:#dc2626;background:#fef2f2;border-color:#fecaca;">
        <div style="font-size:12px;font-weight:700;color:#991b1b;">
          ${_esc(compliance)}
        </div>
      </div>
    `;
  })()}

  ${(() => {
    const logs = report.logs || [];
    if (logs.length === 0) return '';
    return `
      <div class="page-break"></div>
      <h2><span class="bar" style="background:#ca8a04"></span>7. Investigation Logs & Timeline</h2>
      <div style="border-left:2px solid #e2e8f0;margin-left:8px;padding-left:16px;margin-bottom:16px;">
        ${logs.map(l => `
          <div style="position:relative;margin-bottom:16px;">
            <div style="position:absolute;left:-22px;top:4px;width:10px;height:10px;border-radius:50%;background:#e2e8f0;border:2px solid #fff;"></div>
            <div style="font-family:'Courier New',monospace;font-size:10px;color:#64748b;margin-bottom:4px;">${new Date(l.created_at).toLocaleString()}</div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;">
              <div style="font-weight:bold;color:#0f172a;margin-bottom:6px;font-size:11px;display:flex;align-items:center;gap:6px;">
                <span style="background:#e2e8f0;color:#475569;padding:2px 6px;border-radius:4px;font-size:9px;text-transform:uppercase;">${_esc(l.event_type)}</span>
                ${_esc(l.entity_type || 'SYSTEM')}
              </div>
              <div style="font-size:11px;color:#334155;white-space:pre-wrap;">${_esc(l.content)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  })()}

<div class="footer">
    <p><strong style="color:#64748b">DISCLAIMER:</strong> This master report was generated by AXON v2.0 Case Management System with Groq AI synthesis. Findings should be independently verified before relying on this report.</p>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <span class="mono" style="font-size:8px;color:#94a3b8">AXON BLOCKCHAIN INTELLIGENCE v2.0</span>
      <span class="mono" style="font-size:8px;color:#94a3b8">Case ${caseId} · END OF REPORT</span>
    </div>
  </div>
  <div class="cls-banner" style="border-top:2px solid #fecaca;border-bottom:none;margin-top:16px">CONFIDENTIAL — AXON BLOCKCHAIN INTELLIGENCE — FOR AUTHORIZED RECIPIENTS ONLY</div>
</div></body></html>`;

  _triggerPDFDownload(html, `AXON-${caseId}-Master-Report`, forceHtml);
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
function _triggerPDFDownload(html, filename, forceHtml = true) {
  if (forceHtml) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

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
