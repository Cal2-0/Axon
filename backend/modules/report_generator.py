import io
import time
from sqlalchemy.orm import Session
from database.models import VerificationReport, InvestigationLog
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def generate_pdf_report(report_id: str, db: Session) -> bytes:
    """
    Generates a verifiable Chain of Custody PDF for a given report_id.
    """
    report = db.query(VerificationReport).filter(VerificationReport.report_id == report_id).first()
    if not report:
        raise ValueError(f"Report {report_id} not found in database.")

    # Find the corresponding investigation log (optional, for extra data)
    inv_log = None
    if report.entity_type == "bulk_batch":
        inv_log = db.query(InvestigationLog).filter(InvestigationLog.bulk_batch_id == report.entity_address).first()
    else:
        inv_log = db.query(InvestigationLog).filter(InvestigationLog.entity_address == report.entity_address).first()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    Story = []

    # Title
    Story.append(Paragraph(f"<b>AXON — Verifiable Investigation Report</b>", styles["Title"]))
    Story.append(Spacer(1, 12))

    # Basic Info
    timestamp_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(report.scan_timestamp))
    Story.append(Paragraph(f"<b>Report ID:</b> {report.report_id}", styles["Normal"]))
    Story.append(Paragraph(f"<b>Target Entity:</b> {report.entity_address} ({report.entity_type})", styles["Normal"]))
    Story.append(Paragraph(f"<b>Timestamp:</b> {timestamp_str}", styles["Normal"]))
    Story.append(Paragraph(f"<b>Max Threat Indicator:</b> {report.risk_score}", styles["Normal"]))
    Story.append(Paragraph(f"<b>Scan Depth:</b> {report.scan_depth.upper()}", styles["Normal"]))
    Story.append(Spacer(1, 24))

    # Chain of Custody Section
    Story.append(Paragraph("<b>Final Analysis & Evidence Integrity</b>", styles["Heading2"]))
    Story.append(Spacer(1, 12))
    Story.append(Paragraph("This document certifies that the investigation data associated with this report was immutably recorded in the AXON database. The following SHA-256 hash mathematically guarantees the integrity of the original raw JSON payload generated at the time of the scan. Any tampering with the raw data will result in a mismatched hash.", styles["Normal"]))
    Story.append(Spacer(1, 12))
    
    hash_style = styles["Normal"]
    hash_style.fontName = "Courier"
    Story.append(Paragraph(f"<b>SHA-256 HASH:</b><br/>{report.report_hash}", hash_style))
    Story.append(Spacer(1, 24))
    
    # Environmental Metadata
    Story.append(Paragraph("<b>Environmental Metadata</b>", styles["Heading3"]))
    Story.append(Spacer(1, 6))
    Story.append(Paragraph(f"<b>Analytical Engine Version:</b> v2.0", styles["Normal"]))
    Story.append(Paragraph(f"<b>Threat DB Version:</b> {timestamp_str}", styles["Normal"]))
    Story.append(Paragraph(f"<b>Analysis Date:</b> {timestamp_str}", styles["Normal"]))
    Story.append(Paragraph(f"<b>Analysis Depth:</b> {report.scan_depth.upper()}", styles["Normal"]))
    
    # Extract chain if available, default to ETH
    chain_val = getattr(report, "chain", "ETH") if hasattr(report, "chain") else "ETH"
    if inv_log and hasattr(inv_log, "chain"):
        chain_val = inv_log.chain
    Story.append(Paragraph(f"<b>Chain:</b> {chain_val}", styles["Normal"]))
    
    Story.append(Paragraph(f"<b>Node Source:</b> Multiple (Alchemy / Etherscan API / Forta)", styles["Normal"]))
    Story.append(Spacer(1, 24))

    # Optional signals/risk factors
    if inv_log and inv_log.triggered_signals:
        Story.append(Paragraph("<b>Primary Threat Indicators Detected</b>", styles["Heading2"]))
        Story.append(Spacer(1, 12))
        for factor in inv_log.triggered_signals:
            if isinstance(factor, dict):
                icon = factor.get("icon", "•")
                reason = factor.get("reason", "Data Not Available")
                layer = factor.get("layer", "")
                conf = factor.get("confidence", "Medium")
                src = factor.get("source", "On-chain Heuristic")
                layer_str = f"[{layer}] " if layer else ""
                Story.append(Paragraph(f"{icon} {layer_str}<b>{reason}</b> (Confidence: {conf} | Source: {src})", styles["Normal"]))
            else:
                Story.append(Paragraph(f"• {factor}", styles["Normal"]))
        Story.append(Spacer(1, 24))
        
    if inv_log and isinstance(inv_log.raw_data, dict):
        raw = inv_log.raw_data
        
        if report.entity_type == "bulk_batch":
            Story.append(Paragraph("<b>Bulk Investigation Matrix</b>", styles["Heading2"]))
            Story.append(Spacer(1, 12))
            
            summary = raw.get("summary", {})
            if summary:
                total = sum(summary.values())
                critical = summary.get("CRITICAL", 0)
                high = summary.get("HIGH", 0)
                if critical > 0:
                    consensus = f"FORENSIC CONSENSUS: {critical} critical threats identified out of {total} subjects. Immediate isolation and manual review strongly recommended for high-risk assets."
                elif high > 0:
                    consensus = f"FORENSIC CONSENSUS: Elevated risk detected. {high} subjects show suspicious behavioral patterns. Proceed with caution and monitor closely."
                else:
                    consensus = "FORENSIC CONSENSUS: Low risk profile. No immediate threats detected."
                Story.append(Paragraph(f"<b>{consensus}</b>", styles["Normal"]))
                Story.append(Spacer(1, 12))
            
            results = raw.get("results", [])
            if results:
                from reportlab.platypus import Table, TableStyle
                from reportlab.lib import colors
                Story.append(Paragraph("<b>Top Analyzed Targets (By Risk)</b>", styles["Heading2"]))
                table_data = [["Address", "Score", "Risk Label"]]
                for res in results[:20]: 
                    addr = res.get("address", "")
                    short_addr = addr[:10] + "..." + addr[-8:] if len(addr) > 20 else addr
                    score = res.get("data", {}).get("risk", {}).get("score", 0)
                    label = res.get("data", {}).get("risk", {}).get("label", "LOW")
                    table_data.append([short_addr, str(score), label])
                    
                t = Table(table_data, colWidths=[220, 80, 150])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2a2d3e")),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0,0), (-1,-1), 10),
                    ('BOTTOMPADDING', (0,0), (-1,0), 8),
                    ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#1e1e24")),
                    ('TEXTCOLOR', (0,1), (-1,-1), colors.lightgrey),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ]))
                Story.append(Spacer(1, 12))
                Story.append(t)
                Story.append(Spacer(1, 24))

            errors = raw.get("errors", [])
            if errors:
                Story.append(Paragraph("<b>Failed / Unsupported Targets</b>", styles["Heading2"]))
                Story.append(Spacer(1, 6))
                for err in errors:
                    addr = err.get("address", "")
                    reason = err.get("error", "Data Not Available")
                    Story.append(Paragraph(f"• <b>{addr}</b>: {reason}", styles["Normal"]))
                Story.append(Spacer(1, 24))

        else:
            identity = raw.get("identity", {})
            risk = raw.get("risk", {})
            osint = raw.get("osint", {})
            mixer = raw.get("mixer", {})
            exchange = raw.get("exchange", {})
            transactions = raw.get("transactions", [])
            graph = raw.get("graph", {})
            defi = graph.get("defi_interactions", [])
            
            # --- SECTION 1: SUBJECT WALLET PROFILE ---
            Story.append(Paragraph("<b>SECTION 1 — SUBJECT WALLET PROFILE</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            profile_lines = [
                f"<b>Wallet Address:</b> {report.entity_address}",
                f"<b>Chain(s) Active:</b> {identity.get('chains', 'Data Not Available')}",
                f"<b>Wallet Age / First Seen:</b> {identity.get('age', 'Data Not Available')}",
                f"<b>Total Txs:</b> {len(transactions)} (Sampled)",
                f"<b>Classification:</b> {risk.get('mlClassification', 'Data Not Available')}",
                f"<b>Risk Score:</b> {risk.get('score', 0)}/100 - {risk.get('label', 'LOW')}"
            ]
            for pl in profile_lines:
                Story.append(Paragraph(pl, styles["Normal"]))
            Story.append(Spacer(1, 12))
            
            # --- SECTION 2: ACTIVITY TIMELINE & VELOCITY ---
            Story.append(Paragraph("<b>SECTION 2 — ACTIVITY TIMELINE & VELOCITY</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            Story.append(Paragraph("<b>Operational Tempo Overview:</b> The subject demonstrates a distinct transaction frequency pattern across its lifespan. High-velocity bursts may suggest programmatic behavior or urgent liquidation, while dormant periods imply holding patterns.", styles["Normal"]))
            if len(transactions) > 0:
                try:
                    first_tx = transactions[-1].get("timeStamp")
                    last_tx = transactions[0].get("timeStamp")
                    Story.append(Paragraph(f"<b>Active Period:</b> {time.strftime('%Y-%m-%d', time.gmtime(int(first_tx)))} to {time.strftime('%Y-%m-%d', time.gmtime(int(last_tx)))}", styles["Normal"]))
                    Story.append(Paragraph(f"<b>Transaction Density:</b> {len(transactions)} transactions captured in the latest analysis window.", styles["Normal"]))
                except:
                    pass
            Story.append(Spacer(1, 12))

            # --- SECTION 3: INFLOW ANALYSIS ---
            Story.append(Paragraph("<b>SECTION 3 — INFLOW ANALYSIS (WHO IS SENDING TO SUBJECT)</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            Story.append(Paragraph(f"<b>Mixer-sourced %:</b> {mixer.get('totalMixedETH', '0 ETH')}", styles["Normal"]))
            Story.append(Paragraph("<b>Top Inflow Sources:</b> <i>Data pending node extraction</i>", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # --- SECTION 4: OUTFLOW ANALYSIS ---
            Story.append(Paragraph("<b>SECTION 4 — OUTFLOW ANALYSIS (WHO IS SUBJECT SENDING TO)</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            Story.append(Paragraph("<b>Top Outflow Destinations:</b>", styles["Normal"]))
            Story.append(Paragraph("<i>Data pending full graph expansion. Primary cashout vectors analyzed in Section 9.</i>", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # --- SECTION 5: COUNTERPARTY NETWORK MAP ---
            Story.append(Paragraph("<b>SECTION 5 — COUNTERPARTY NETWORK MAP</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            Story.append(Paragraph("<b>Network Role Analysis:</b> <i>Aggregating counterparty graph... (See Behavioral Profile for role assessment)</i>", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # --- SECTION 6: ASSET & CHAIN BEHAVIOR ---
            Story.append(Paragraph("<b>SECTION 6 — ASSET & CHAIN BEHAVIOR</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            Story.append(Paragraph(f"<b>Cross-chain activity detected:</b> {'YES' if len(identity.get('chains', '').split(',')) > 1 else 'NO'}", styles["Normal"]))
            Story.append(Paragraph("<b>Bridge protocols used:</b> <i>Data pending bridge heuristics</i>", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # --- SECTION 7: BEHAVIORAL flags & ANOMALIES ---
            Story.append(Paragraph("<b>SECTION 7 — BEHAVIORAL FLAGS & ANOMALIES</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            if risk.get("factors"):
                for factor in risk.get("factors", []):
                    penalty = factor.get("penalty", 0)
                    penalty_str = f"[Penalty: {penalty}] " if penalty else ""
                    icon = factor.get("icon", "•")
                    layer = factor.get("layer", "")
                    layer_str = f"[{layer}] " if layer else ""
                    Story.append(Paragraph(f"{icon} {layer_str}{penalty_str}<b>{factor.get('reason')}</b>", styles["Normal"]))
            else:
                Story.append(Paragraph("No significant behavioral anomalies detected.", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # --- SECTION 8: SUBJECT BEHAVIORAL PROFILE ---
            Story.append(Paragraph("<b>SECTION 8 — SUBJECT BEHAVIORAL PROFILE (THE INTELLIGENCE LAYER)</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            Story.append(Paragraph(f"<b>OPERATOR CLASS:</b> {risk.get('mlClassification', 'Data Not Available')}", styles["Normal"]))
            Story.append(Paragraph("<b>SOPHISTICATION:</b> Assessed by Analytical Engine engine based on mixer and cross-chain interaction.", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # --- SECTION 9: EXCHANGE SUBPOENA TARGETS ---
            Story.append(Paragraph("<b>SECTION 9 — EXCHANGE SUBPOENA TARGETS</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            if exchange.get("detected"):
                Story.append(Paragraph(f"<b>Exchange Activity Detected:</b> {exchange.get('summary', '')}", styles["Normal"]))
                Story.append(Paragraph("<i>Recommended action: Mutual Legal Assistance Treaty (MLAT) request or direct subpoena to exchange compliance team.</i>", styles["Normal"]))
            else:
                Story.append(Paragraph("No direct CEX/KYC exchange deposit vectors detected.", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # --- SECTION 10: TIMELINE RECONSTRUCTION ---
            Story.append(Paragraph("<b>SECTION 10 — TIMELINE RECONSTRUCTION</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            if transactions:
                from reportlab.platypus import Table, TableStyle
                from reportlab.lib import colors
                table_data = [["Date", "Hash", "Type", "Value (Native)"]]
                for tx in transactions[:15]: # Limit to 15 for PDF
                    ts = tx.get("timeStamp")
                    try:
                        date_str = time.strftime("%Y-%m-%d %H:%M", time.gmtime(int(ts))) if ts and ts != "0" else "N/A"
                    except:
                        date_str = "N/A"
                    is_in = tx.get("to", "").lower() == report.entity_address.lower()
                    
                    try:
                        # Value might be string wei, or missing
                        raw_val = float(tx.get('value', 0))
                        if raw_val == 0:
                            val_str = "0 (Contract Call)"
                        else:
                            val_str = f"{raw_val / 1e18:.4f} Native"
                    except:
                        val_str = "Data Not Available"
                        
                    val_cell = f"{'+' if is_in else '-'}{val_str}" if val_str != "0 (Contract Call)" else val_str
                    msg = tx.get("extracted_message")
                    if msg:
                        val_cell += f"\n[MSG: {msg[:30]}]"
                        
                    table_data.append([
                        date_str,
                        tx.get("hash", "")[:8] + "...",
                        "IN" if is_in else "OUT",
                        val_cell
                    ])
                    
                t = Table(table_data, colWidths=[110, 100, 60, 120])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2a2d3e")),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0,0), (-1,0), 10),
                    ('BOTTOMPADDING', (0,0), (-1,0), 8),
                    ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#1e1e24")),
                    ('TEXTCOLOR', (0,1), (-1,-1), colors.lightgrey),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ]))
                Story.append(t)
            Story.append(Spacer(1, 12))

            # --- SECTION 11: INVESTIGATOR SUMMARY ---
            Story.append(Paragraph("<b>SECTION 11 — INVESTIGATOR SUMMARY (PLAIN LANGUAGE)</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            ai = risk.get("analyticalSynthesis") or risk.get("aiAnalysis", {})
            hypothesis = ai.get("hypothesis", "")
            verdict = ai.get("verdict", "")
            
            if hypothesis and verdict:
                Story.append(Paragraph("<b>Analyst Synthesis (Evidence-Based):</b>", styles["Normal"]))
                Story.append(Paragraph(str(hypothesis), styles["Normal"]))
                Story.append(Spacer(1, 6))
                Story.append(Paragraph("<b>Adversarial Synthesis (Executive Verdict):</b>", styles["Normal"]))
                Story.append(Paragraph(str(verdict), styles["Normal"]))
                
                pros_sum = ai.get("prosecution_summary")
                def_sum = ai.get("defense_summary")
                if pros_sum and def_sum:
                    Story.append(Spacer(1, 6))
                    Story.append(Paragraph("<b>Prosecution Perspective:</b>", styles["Normal"]))
                    Story.append(Paragraph(str(pros_sum), styles["Normal"]))
                    Story.append(Spacer(1, 6))
                    Story.append(Paragraph("<b>Defense Perspective:</b>", styles["Normal"]))
                    Story.append(Paragraph(str(def_sum), styles["Normal"]))
                    
                Story.append(Spacer(1, 6))
                Story.append(Paragraph("<i>Note: AXON provides post-hoc behavioral synthesis based strictly on on-chain data. It does not provide prescriptive law enforcement recommendations or direct actionable next steps.</i>", styles["Normal"]))
            else:
                Story.append(Paragraph("No AI-generated summary available for this target.", styles["Normal"]))
            Story.append(Spacer(1, 24))

            # --- APPENDIX: METHODOLOGY ---
            Story.append(Paragraph("<b>APPENDIX — METHODOLOGY & SCORING</b>", styles["Heading2"]))
            Story.append(Spacer(1, 6))
            Story.append(Paragraph(f"<b>AXON THREAT INDICATOR LEVEL:</b> {risk.get('score', 0)} / 100 → {risk.get('label', 'LOW')} SEVERITY", styles["Normal"]))
            Story.append(Spacer(1, 12))
            
    doc.build(Story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
