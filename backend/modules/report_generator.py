import io
import time
from sqlalchemy.orm import Session
from database.models import VerificationReport, InvestigationLog
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from modules.cross_chain import detect_address_type

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
        inv_log = db.query(InvestigationLog).filter(InvestigationLog.bulk_batch_id == report.entity_address).first()
    else:
        inv_log = db.query(InvestigationLog).filter(InvestigationLog.case_id == report.report_id).first()

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
            Story.append(Paragraph(f"<b>SHA-256 Hash:</b> {inv_log.evidence_hash}", styles["Normal"]))
            Story.append(Paragraph("<b>Signed:</b> Engine v2.0 | Node Source: Primary Intel Node", styles["Normal"]))
            Story.append(Paragraph("<i>Hash mismatch = report tampered. Verify before court use.</i>", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 2 - EXECUTIVE SUMMARY
            Story.append(Paragraph("<b>SECTION 2 - EXECUTIVE SUMMARY</b>", styles["Heading2"]))
            tx_count = identity.get("tx_count") or len(txs)
            Story.append(Paragraph(f"Target is a {report.entity_type} with a {risk.get('label', 'LOW')} risk profile (Score: {report.risk_score}), exhibiting {tx_count} transactions.", styles["Normal"]))
            if ai and _is_valid(ai.get("verdict")):
                Story.append(Paragraph(f"<b>Verdict:</b> {ai.get('verdict')}", styles["Normal"]))
            if ai and _is_valid(ai.get("hypothesis")):
                Story.append(Paragraph(f"<b>Recommended Action:</b> {ai.get('hypothesis')}", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 3 - SUBJECT PROFILE
            Story.append(Paragraph("<b>SECTION 3 - SUBJECT PROFILE</b>", styles["Heading2"]))
            addr_info = detect_address_type(report.entity_address)
            Story.append(Paragraph(f"<b>Network/Coin:</b> {addr_info.get('coin', 'Unknown')}", styles["Normal"]))
            explorer = addr_info.get("explorer", "N/A")
            if _is_valid(explorer):
                Story.append(Paragraph(f"<b>Explorer Link:</b> <a href='{explorer}'>{explorer}</a>", styles["Normal"]))
            Story.append(Paragraph(f"<b>Wallet Type:</b> {identity.get('wallet_type', 'EOA')}", styles["Normal"]))
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

            # SECTION 4 - BEHAVIORAL ANALYSIS
            if _is_valid(risk.get("factors")):
                Story.append(Paragraph("<b>SECTION 4 - BEHAVIORAL ANALYSIS</b>", styles["Heading2"]))
                for factor in risk.get("factors", []):
                    Story.append(Paragraph(f"- {factor.get('reason')} [Penalty: {factor.get('penalty', 0)}]", styles["Normal"]))
                Story.append(Spacer(1, 12))

            # SECTION 5 - FUND FLOW ANALYSIS
            if mixer and _is_valid(mixer.get("totalMixedETH")):
                Story.append(Paragraph("<b>SECTION 5 - FUND FLOW ANALYSIS</b>", styles["Heading2"]))
                Story.append(Paragraph(f"<b>Mixer Exposure:</b> {mixer.get('totalMixedETH')}", styles["Normal"]))
                Story.append(Spacer(1, 12))

            # SECTION 6 - COUNTERPARTY NETWORK
            if graph and _is_valid(graph.get("nodes")):
                nodes = graph.get("nodes", [])
                if len(nodes) > 0:
                    Story.append(Paragraph("<b>SECTION 6 - COUNTERPARTY NETWORK</b>", styles["Heading2"]))
                    rows = []
                    for n in nodes[:10]:
                        rows.append([n.get("id", "")[:12]+"...", n.get("type", "Unknown"), str(n.get("risk", 0))])
                    if rows:
                        Story.append(_build_table(["Counterparty", "Type", "Risk"], rows, [140, 100, 60]))
                    Story.append(Spacer(1, 12))

            # SECTION 7 - ASSET INVENTORY
            if _is_valid(raw.get("holdings")):
                holdings = raw.get("holdings", [])
                if len(holdings) > 0:
                    Story.append(Paragraph("<b>SECTION 7 - ASSET INVENTORY</b>", styles["Heading2"]))
                    rows = []
                    for h in holdings:
                        rows.append([h.get("chain", ""), h.get("balance", "")])
                    if rows:
                        Story.append(_build_table(["Chain", "Balance (Native)"], rows, [150, 150]))
                    Story.append(Spacer(1, 12))

            # SECTION 8 - THREAT INTELLIGENCE
            if osint and _is_valid(osint.get("corpus_match")):
                Story.append(Paragraph("<b>SECTION 8 - THREAT INTELLIGENCE</b>", styles["Heading2"]))
                Story.append(Paragraph(f"<b>Corpus Match:</b> {osint.get('corpus_match')}", styles["Normal"]))
                Story.append(Spacer(1, 12))

            # SECTION 9 - TIMELINE RECONSTRUCTION
            if txs:
                Story.append(Paragraph("<b>SECTION 9 - TIMELINE RECONSTRUCTION</b>", styles["Heading2"]))
                rows = []
                for tx in txs[:15]:
                    ts = tx.get("timeStamp")
                    try:
                        dstr = time.strftime("%Y-%m-%d %H:%M", time.gmtime(int(ts)))
                    except: dstr = "N/A"
                    val = tx.get("value", "0")
                    is_in = tx.get("to", "").lower() == report.entity_address.lower()
                    rows.append([dstr, tx.get("hash", "")[:8]+"...", "IN" if is_in else "OUT", val])
                if rows:
                    Story.append(_build_table(["Date", "Hash", "Dir", "Value"], rows, [100, 80, 40, 80]))
                Story.append(Spacer(1, 12))

            # SECTION 10 - EXCHANGE & KYC EXPOSURE
            if exchange and _is_valid(exchange.get("detected")) and exchange.get("detected"):
                Story.append(Paragraph("<b>SECTION 10 - EXCHANGE & KYC EXPOSURE (SUBPOENA TARGETS)</b>", styles["Heading2"]))
                Story.append(Paragraph(f"<b>Exchange Activity Detected:</b> {exchange.get('summary', '')}", styles["Normal"]))
                Story.append(Paragraph("<b>Recommended legal mechanism:</b> Subpoena / MLAT to exchange compliance.", styles["Normal"]))
                Story.append(Spacer(1, 12))

            # SECTION 11 - RISK SCORE BREAKDOWN
            Story.append(Paragraph("<b>SECTION 11 - RISK SCORE BREAKDOWN</b>", styles["Heading2"]))
            Story.append(Paragraph(f"<b>Overall Score:</b> {report.risk_score} / 100", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 12 - INVESTIGATOR NOTES
            if ai and _is_valid(ai.get("prosecution_summary")):
                Story.append(Paragraph("<b>SECTION 12 - INVESTIGATOR NOTES</b>", styles["Heading2"]))
                Story.append(Paragraph(f"<b>Prosecution:</b> {ai.get('prosecution_summary')}", styles["Normal"]))
                Story.append(Paragraph(f"<b>Defense:</b> {ai.get('defense_summary')}", styles["Normal"]))
                Story.append(Spacer(1, 12))

        elif report.entity_type == "contract":
            info = raw.get("info", {})
            risk = raw.get("risk", {})
            slither = raw.get("slither", [])
            goplus = raw.get("goplus", {})
            abi = raw.get("abi", [])
            
            # SECTION 1 - EVIDENCE INTEGRITY
            Story.append(Paragraph("<b>SECTION 1 - EVIDENCE INTEGRITY</b>", styles["Heading2"]))
            Story.append(Paragraph(f"<b>SHA-256 Hash:</b> {inv_log.evidence_hash}", styles["Normal"]))
            Story.append(Paragraph("<b>Signed:</b> Engine v2.0 | Node Source: Primary Intel Node", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 2 - EXECUTIVE SUMMARY
            Story.append(Paragraph("<b>SECTION 2 - EXECUTIVE SUMMARY</b>", styles["Heading2"]))
            Story.append(Paragraph(f"Target is a Smart Contract with a {risk.get('label', 'LOW')} risk profile (Score: {report.risk_score}).", styles["Normal"]))
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
                        Story.append(Paragraph(f"- {factor}", styles["Normal"]))
                    else:
                        Story.append(Paragraph(f"- {factor.get('reason')} [Penalty: {factor.get('penalty', 0)}]", styles["Normal"]))
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
            Story.append(Paragraph(f"<b>SHA-256 Hash:</b> {inv_log.evidence_hash}", styles["Normal"]))
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
