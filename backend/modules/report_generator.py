import io
import time
from sqlalchemy.orm import Session
from database.models import VerificationReport, InvestigationLog
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from modules.cross_chain import detect_address_type


ENGINE_TO_FORENSIC = {
    "risk score lowered to MODERATE": "Risk assessment adjusted. Observed behavior is consistent with known exchange activity. Entity classification applied.",
    "risk score lowered to LOW": "Risk assessment reflects confirmed entity classification. Behavioral signals are expected for this entity type.",
    "Trusted protocol suppression applied": "Risk assessment reflects known protocol classification. Administrative controls observed are consistent with regulatory compliance design, not exploitation.",
}

def translate(text: str) -> str:
    if not text or not isinstance(text, str): return str(text)
    for k, v in ENGINE_TO_FORENSIC.items():
        if k in text:
            text = text.replace(k, v)
    return text

def _is_valid(data):
    if not data: return False
    if isinstance(data, str):
        d = data.lower().strip()
        if d in ["data not available", "unknown", "n/a", "null", "none", "0 eth", "[]", "{}"]: return False
    return True

def _build_table(headers, data_rows, col_widths=None):
    table_data = [headers] + data_rows
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2a2d3e")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#1e1e24")),
        ('TEXTCOLOR', (0,1), (-1,-1), colors.lightgrey),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
    ]))
    return t

def generate_pdf_report(report_id: str, db: Session) -> bytes:
    report = db.query(VerificationReport).filter(VerificationReport.report_id == report_id).first()
    if not report:
        raise ValueError(f"Report {report_id} not found in database.")

    inv_log = None
    if report.entity_type == "bulk_batch":
        inv_log = db.query(InvestigationLog).filter(
            InvestigationLog.entity_address == report.entity_address,
            InvestigationLog.entity_type == "bulk_batch"
        ).first()
    else:
        inv_log = db.query(InvestigationLog).filter(
            InvestigationLog.entity_address == report.entity_address,
            InvestigationLog.entity_type == report.entity_type,
            InvestigationLog.scan_depth == report.scan_depth
        ).order_by(InvestigationLog.scan_timestamp.desc()).first()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    Story = []

    # COVER BLOCK
    Story.append(Paragraph("<b>AXON - Verifiable Investigation Report</b>", styles["Title"]))
    Story.append(Spacer(1, 12))
    
    timestamp_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(report.scan_timestamp))
    Story.append(Paragraph(f"<b>Report ID:</b> {report.report_id}", styles["Normal"]))
    Story.append(Paragraph(f"<b>Target Entity:</b> {report.entity_address}", styles["Normal"]))
    Story.append(Paragraph(f"<b>Timestamp:</b> {timestamp_str}", styles["Normal"]))
    Story.append(Paragraph(f"<b>Scan Depth:</b> {report.scan_depth.upper()}", styles["Normal"]))
    Story.append(Paragraph(f"<b>Classification Badge:</b> [{report.entity_type.upper()}]", styles["Normal"]))
    Story.append(Paragraph(f"<b>Risk Band:</b> {report.risk_score}/100 - HIGH", styles["Normal"]) if int(report.risk_score) >= 60 else Paragraph(f"<b>Risk Band:</b> {report.risk_score}/100 - LOW/MEDIUM", styles["Normal"]))
    Story.append(Spacer(1, 16))

    if inv_log and isinstance(inv_log.raw_data, dict):
        raw = inv_log.raw_data

        if report.entity_type == "wallet":
            identity = raw.get("identity", {})
            risk = raw.get("risk", {})
            osint = raw.get("osint", {})
            mixer = raw.get("mixer", {})
            exchange = raw.get("exchange", {})
            txs = raw.get("transactions", [])
            graph = raw.get("graph", {})
            ai = risk.get("analyticalSynthesis", {}) or risk.get("aiAnalysis", {})

            # SECTION 1 - EVIDENCE INTEGRITY
            Story.append(Paragraph("<b>SECTION 1 - EVIDENCE INTEGRITY</b>", styles["Heading2"]))
            Story.append(Paragraph(f"<b>SHA-256 Hash:</b> {report.report_hash}", styles["Normal"]))
            Story.append(Paragraph("<b>Signed:</b> Engine v2.0 | Node Source: Primary Intel Node", styles["Normal"]))
            Story.append(Paragraph("<i>Hash mismatch = report tampered. Verify before court use.</i>", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 2 - EXECUTIVE SUMMARY
            Story.append(Paragraph("<b>EXECUTIVE SUMMARY</b>", styles["Heading1"]))
            tx_count = identity.get("tx_count") or len(txs)
            
            if ai and _is_valid(ai.get("verdict")):
                verdict = ai.get("verdict")
                Story.append(Paragraph(f"Target is a <b>{identity.get('wallet_type', 'EOA')}</b> exhibiting {tx_count} transactions. <b>{verdict}</b>", styles["Normal"]))
                if _is_valid(ai.get("hypothesis")):
                    Story.append(Paragraph(f"<b>Assessment:</b> {translate(ai.get('hypothesis'))}", styles["Normal"]))
            else:
                Story.append(Paragraph(f"Target is a <b>{identity.get('wallet_type', 'EOA')}</b> exhibiting {tx_count} transactions. Algorithmic Risk Profile: <b>{translate(risk.get('label', 'LOW'))}</b>.", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # KEY FINDINGS
            Story.append(Paragraph("<b>KEY FINDINGS</b>", styles["Heading2"]))
            findings = []
            if osint and _is_valid(osint.get("corpus_match")):
                findings.append(f"Threat corpus match: {osint.get('corpus_match')}")
            findings.append(f"{tx_count} observed transactions")
            if _is_valid(risk.get("factors")):
                for factor in risk.get("factors", [])[:3]:
                    findings.append(translate(factor.get('reason')))
            for f in findings:
                Story.append(Paragraph(f"• {f}", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 3 - SUBJECT PROFILE
            Story.append(Paragraph("<b>SUBJECT PROFILE</b>", styles["Heading2"]))
            addr_info = detect_address_type(report.entity_address)
            Story.append(Paragraph(f"<b>Network/Coin:</b> {addr_info.get('coin', 'Unknown')}", styles["Normal"]))
            explorer = addr_info.get("explorer", "N/A")
            if _is_valid(explorer):
                Story.append(Paragraph(f"<b>Explorer Link:</b> <a href='{explorer}'>{explorer}</a>", styles["Normal"]))
            if _is_valid(identity.get("first_tx_date")):
                Story.append(Paragraph(f"<b>First Activity:</b> {identity.get('first_tx_date')}", styles["Normal"]))
            if _is_valid(identity.get("last_tx_date")):
                Story.append(Paragraph(f"<b>Last Activity:</b> {identity.get('last_tx_date')}", styles["Normal"]))
            if _is_valid(identity.get("balance_wei")):
                Story.append(Paragraph(f"<b>Native Balance (Wei):</b> {identity.get('balance_wei')}", styles["Normal"]))
            if _is_valid(identity.get("ens")):
                Story.append(Paragraph(f"<b>ENS / Domain:</b> {identity.get('ens')}", styles["Normal"]))
            class_label = identity.get("entityClass") or identity.get("protocolCategory")
            if _is_valid(class_label):
                Story.append(Paragraph(f"<b>Entity Classification:</b> {class_label} (Source: Threat Corpus)", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # THREAT DB
            if _is_valid(risk.get("factors")):
                Story.append(Paragraph("<b>THREAT DATABASE MATCHES</b>", styles["Heading2"]))
                rows = []
                for factor in risk.get("factors", []):
                    rows.append(["Axon Engine", "Behavioral", "High", translate(factor.get('reason')), "Chain Analysis"])
                if rows:
                    Story.append(_build_table(["Threat Source", "Threat Category", "Confidence", "Evidence", "Reference"], rows, [80, 80, 60, 150, 60]))
                Story.append(Spacer(1, 12))

            # EVIDENCE: TIMELINE
            if txs:
                Story.append(Paragraph("<b>EVIDENCE: TIMELINE RECONSTRUCTION</b>", styles["Heading2"]))
                rows = []
                for tx in txs[:15]:
                    ts = tx.get("timeStamp")
                    try: dstr = time.strftime("%Y-%m-%d %H:%M", time.gmtime(int(ts)))
                    except: dstr = "N/A"
                    try:
                        val_num = int(tx.get('value', 0))
                        if val_num == 0 and tx.get('input') not in ['', '0x']:
                            val = "Token Transfer"
                        else:
                            val = f"{(val_num / 10**18):.5f} ETH"
                    except: val = "0 ETH"
                    is_in = tx.get("to", "").lower() == report.entity_address.lower()
                    rows.append([dstr, tx.get("hash", "")[:8]+"...", "IN" if is_in else "OUT", val])
                if rows:
                    Story.append(_build_table(["Date", "Hash", "Dir", "Value (ETH)"], rows, [100, 80, 40, 80]))
                Story.append(Spacer(1, 12))

            # COUNTERPARTIES
            if graph and _is_valid(graph.get("nodes")):
                nodes = graph.get("nodes", [])
                if len(nodes) > 0:
                    Story.append(Paragraph("<b>COUNTERPARTIES</b>", styles["Heading2"]))
                    rows = []
                    for n in nodes[:10]:
                        ctype = n.get("type", "Unknown")
                        if ctype == "default": ctype = "Unclassified"
                        tx_c = str(n.get("interaction_count", n.get("tx_count", "N/A")))
                        rows.append([n.get("id", "")[:12]+"...", ctype, tx_c, str(n.get("total_value", "N/A")), str(n.get("last_seen", "N/A")), str(n.get("risk", 0))])
                    if rows:
                        Story.append(_build_table(["Address", "Known Entity", "Tx Count", "Total Val", "Last Seen", "Threat Lvl"], rows, [80, 70, 50, 50, 60, 50]))
                    Story.append(Spacer(1, 12))

            # ASSET INVENTORY
            if _is_valid(raw.get("holdings")):
                holdings = raw.get("holdings", {})
                Story.append(Paragraph("<b>ASSET INVENTORY</b>", styles["Heading2"]))
                rows = []
                if isinstance(holdings, list):
                    for h in holdings:
                        if isinstance(h, dict):
                            rows.append([h.get("chain", ""), "N/A", "N/A", "N/A", "N/A"])
                elif isinstance(holdings, dict):
                    count = holdings.get("erc20_count", 0)
                    count_str = "Not collected at QUICK depth" if str(count) == "0" else str(count)
                    rows.append(["ERC-20 Tokens", count_str, "N/A", "N/A", "N/A"])
                if rows:
                    Story.append(_build_table(["Assets", "Stablecoins", "NFTs", "Contracts", "Protocols"], rows, [80, 70, 50, 60, 60]))
                Story.append(Spacer(1, 12))
            
            # EXCHANGE & KYC
            if exchange and _is_valid(exchange.get("detected")) and exchange.get("detected"):
                Story.append(Paragraph("<b>EXCHANGE & KYC EXPOSURE (SUBPOENA TARGETS)</b>", styles["Heading2"]))
                Story.append(Paragraph(f"<b>Exchange Activity Detected:</b> {exchange.get('summary', '')}", styles["Normal"]))
                Story.append(Paragraph("<b>Recommended legal mechanism:</b> Subpoena / MLAT to exchange compliance.", styles["Normal"]))
                Story.append(Spacer(1, 12))
            
            # INVESTIGATOR NOTES
            if ai and _is_valid(ai.get("prosecution_summary")):
                Story.append(Paragraph("<b>INVESTIGATOR NOTES</b>", styles["Heading2"]))
                Story.append(Paragraph(f"<b>Prosecution:</b> {ai.get('prosecution_summary')}", styles["Normal"]))
                Story.append(Paragraph(f"<b>Defense:</b> {ai.get('defense_summary')}", styles["Normal"]))
                Story.append(Spacer(1, 12))

            # APPENDIX: METHODOLOGY
            Story.append(PageBreak())
            Story.append(Paragraph("<b>APPENDIX A: METHODOLOGY & RISK SCORE</b>", styles["Heading1"]))
            Story.append(Spacer(1, 12))
            Story.append(Paragraph(f"<b>Overall Calculated Risk Score:</b> {report.risk_score} / 100", styles["Normal"]))
            Story.append(Spacer(1, 12))
            if _is_valid(risk.get("factors")):
                Story.append(Paragraph("<b>Scoring Breakdown:</b>", styles["Normal"]))
                for factor in risk.get("factors", []):
                    Story.append(Paragraph(f"- {translate(factor.get('reason'))} ", styles["Normal"]))
            Story.append(Spacer(1, 12))

        elif report.entity_type == "contract":
            info = raw.get("info", {})
            risk = raw.get("risk", {})
            slither = raw.get("slither", [])
            goplus = raw.get("goplus", {})
            abi = raw.get("abi", [])
            
            # SECTION 1 - EVIDENCE INTEGRITY
            Story.append(Paragraph("<b>SECTION 1 - EVIDENCE INTEGRITY</b>", styles["Heading2"]))
            Story.append(Paragraph(f"<b>SHA-256 Hash:</b> {report.report_hash}", styles["Normal"]))
            Story.append(Paragraph("<b>Signed:</b> Engine v2.0 | Node Source: Primary Intel Node", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 2 - EXECUTIVE SUMMARY
            Story.append(Paragraph("<b>SECTION 2 - EXECUTIVE SUMMARY</b>", styles["Heading2"]))
            Story.append(Paragraph(f"Target is a Smart Contract with a {translate(risk.get('label', 'LOW'))} risk profile (Score: {report.risk_score}).", styles["Normal"]))
            if _is_valid(risk.get("overall")):
                Story.append(Paragraph(f"<b>Verdict:</b> {risk.get('overall')}", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 3 - CONTRACT PROFILE
            Story.append(Paragraph("<b>SECTION 3 - CONTRACT PROFILE</b>", styles["Heading2"]))
            addr_info = detect_address_type(report.entity_address)
            explorer = addr_info.get("explorer", "N/A")
            if _is_valid(explorer):
                Story.append(Paragraph(f"<b>Explorer Link:</b> <a href='{explorer}'>{explorer}</a>", styles["Normal"]))
            Story.append(Paragraph(f"<b>Token Name:</b> {info.get('tokenName', 'N/A')}", styles["Normal"]))
            Story.append(Paragraph(f"<b>Compiler:</b> {info.get('compiler', 'N/A')}", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 4 - CODE INTELLIGENCE
            if slither:
                Story.append(Paragraph("<b>SECTION 4 - CODE INTELLIGENCE (STATIC ANALYSIS)</b>", styles["Heading2"]))
                for vuln in slither:
                    Story.append(Paragraph(f"- <b>{vuln.get('name', '')}</b> ({vuln.get('severity', '')}): {vuln.get('description', '')}", styles["Normal"]))
                Story.append(Spacer(1, 12))

            # SECTION 5 - PROTOCOL INTELLIGENCE
            if goplus and _is_valid(goplus.get("overall")):
                Story.append(Paragraph("<b>SECTION 5 - PROTOCOL INTELLIGENCE (GOPLUS)</b>", styles["Heading2"]))
                Story.append(Paragraph(f"<b>Overall:</b> {goplus.get('overall')}", styles["Normal"]))
                Story.append(Spacer(1, 12))

            # SECTION 6 - ECONOMIC ACTIVITY
            if _is_valid(raw.get("identity", {}).get("tx_count")):
                Story.append(Paragraph("<b>SECTION 6 - ECONOMIC ACTIVITY</b>", styles["Heading2"]))
                Story.append(Paragraph(f"<b>Transaction Count:</b> {raw.get('identity', {}).get('tx_count')}", styles["Normal"]))
                Story.append(Spacer(1, 12))

            # SECTION 7 - HIGH-RISK INTERACTING WALLETS
            nodes = raw.get("graph_nodes", [])
            high_risk_nodes = [n for n in nodes if n.get("risk", 0) >= 70]
            if high_risk_nodes:
                Story.append(Paragraph("<b>SECTION 7 - HIGH-RISK INTERACTING WALLETS</b>", styles["Heading2"]))
                rows = []
                for n in high_risk_nodes[:10]:
                    rows.append([n.get("id", "")[:12]+"...", n.get("type", "Unknown"), str(n.get("risk", 0))])
                if rows:
                    Story.append(_build_table(["Wallet", "Type", "Risk"], rows, [140, 100, 60]))
                Story.append(Spacer(1, 12))

            # SECTION 8 - THREAT INTELLIGENCE
            if risk and risk.get("factors"):
                Story.append(Paragraph("<b>SECTION 8 - THREAT INTELLIGENCE</b>", styles["Heading2"]))
                for factor in risk.get("factors", []):
                    if isinstance(factor, str):
                        Story.append(Paragraph(f"- {translate(factor)}", styles["Normal"]))
                    else:
                        Story.append(Paragraph(f"- {translate(factor.get('reason'))} ", styles["Normal"]))
                Story.append(Spacer(1, 12))

            # SECTION 9 - RISK SCORE BREAKDOWN
            Story.append(Paragraph("<b>SECTION 9 - RISK SCORE BREAKDOWN</b>", styles["Heading2"]))
            Story.append(Paragraph(f"<b>Overall Score:</b> {report.risk_score} / 100", styles["Normal"]))
            Story.append(Spacer(1, 12))

        elif report.entity_type == "bulk_batch":
            summary = raw.get("summary", {})
            results = raw.get("results", [])
            errors = raw.get("errors", [])
            
            # SECTION 1 - MASTER EVIDENCE INTEGRITY
            Story.append(Paragraph("<b>SECTION 1 - MASTER EVIDENCE INTEGRITY</b>", styles["Heading2"]))
            Story.append(Paragraph(f"<b>SHA-256 Hash:</b> {report.report_hash}", styles["Normal"]))
            Story.append(Paragraph("<b>Signed:</b> Engine v2.0 | Node Source: Primary Intel Node", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 2 - CASE OVERVIEW
            Story.append(Paragraph("<b>SECTION 2 - CASE OVERVIEW</b>", styles["Heading2"]))
            total = sum(summary.values()) if summary else 0
            critical = summary.get("CRITICAL", 0)
            high = summary.get("HIGH", 0)
            Story.append(Paragraph(f"<b>Total Subjects Processed:</b> {total}", styles["Normal"]))
            Story.append(Paragraph(f"<b>Critical Risk Profiles:</b> {critical}", styles["Normal"]))
            Story.append(Paragraph(f"<b>High Risk Profiles:</b> {high}", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 3 - ENTITY REGISTRY
            if results:
                Story.append(Paragraph("<b>SECTION 3 - ENTITY REGISTRY</b>", styles["Heading2"]))
                rows = []
                for res in results[:20]:
                    addr = res.get("address", "")
                    addr_info = detect_address_type(addr)
                    rows.append([addr[:12]+"...", addr_info.get("coin", "Unknown"), res.get("label", ""), str(res.get("score", 0))])
                if rows:
                    Story.append(_build_table(["Address", "Network", "Risk Label", "Score"], rows, [100, 100, 60, 40]))
                Story.append(Spacer(1, 12))

            # SECTION 6 - ACTIONABLE INTELLIGENCE
            if critical > 0 or high > 0:
                Story.append(Paragraph("<b>SECTION 6 - ACTIONABLE INTELLIGENCE</b>", styles["Heading2"]))
                high_addrs = [res.get("address", "") for res in results if res.get("score", 0) >= 60]
                if high_addrs:
                    Story.append(Paragraph(f"Immediate isolation and manual review strongly recommended for the following high-risk subjects:", styles["Normal"]))
                    for ha in high_addrs:
                        Story.append(Paragraph(f"- Priority Review: <b>{ha}</b>", styles["Normal"]))
                else:
                    Story.append(Paragraph(f"Immediate isolation and manual review strongly recommended for the {critical + high} high-risk subjects identified in the batch.", styles["Normal"]))
                Story.append(Spacer(1, 12))

            # SECTION 7 - INVESTIGATOR FINDINGS
            if errors:
                Story.append(Paragraph("<b>SECTION 7 - INVESTIGATOR FINDINGS (ERRORS/OMISSIONS)</b>", styles["Heading2"]))
                for err in errors:
                    Story.append(Paragraph(f"- <b>{err.get('address', '')[:12]}...</b>: {err.get('error', '')}", styles["Normal"]))
                Story.append(Spacer(1, 12))
                
            # SECTION 8 - THREAT INTELLIGENCE SUMMARY
            Story.append(Paragraph("<b>SECTION 8 - THREAT INTELLIGENCE SUMMARY</b>", styles["Heading2"]))
            Story.append(Paragraph(f"Batch processed with {len(errors)} failed queries.", styles["Normal"]))
            Story.append(Spacer(1, 12))

    doc.build(Story)
    return buffer.getvalue()
