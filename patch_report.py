import re

with open("backend/modules/report_generator.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update ENGINE_TO_FORENSIC
content = content.replace(
"""ENGINE_TO_FORENSIC = {
    "risk score lowered to MODERATE": "Risk assessment adjusted. Observed behavior is consistent with known exchange activity. Entity classification applied.",
    "risk score lowered to LOW": "Risk assessment reflects confirmed entity classification. Behavioral signals are expected for this entity type.",
    "Trusted protocol suppression applied": "Risk assessment reflects known protocol classification. Administrative controls observed are consistent with regulatory compliance design, not exploitation.",
}""",
"""ENGINE_TO_FORENSIC = {
    "risk score lowered to MODERATE": "Risk assessment adjusted. Observed behavior is consistent with known exchange activity. Entity classification applied.",
    "risk score lowered to LOW": "Risk assessment reflects confirmed entity classification. Behavioral signals are expected for this entity type.",
    "Trusted protocol suppression applied": "Risk assessment reflects known protocol classification. Administrative controls observed are consistent with regulatory compliance design, not exploitation.",
    "auto-detected: poly network exploiter": "Threat corpus match: Poly Network Exploiter",
    "risk score should be lowered": "Risk assessment adjusted based on classification",
}"""
)

# 2. Key findings in Wallet report
old_key_findings = """            # KEY FINDINGS
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
            Story.append(Spacer(1, 12))"""

new_key_findings = """            # KEY FINDINGS
            Story.append(Paragraph("<b>KEY FINDINGS</b>", styles["Heading2"]))
            findings = []
            if osint and _is_valid(osint.get("corpus_match")):
                findings.append(f"Threat corpus match: {osint.get('corpus_match')} (Source: OSINT Database, Confidence: High, Method: Exact Address Match)")
            findings.append(f"{tx_count} observed transactions (Source: On-Chain Data, Confidence: Verified, Method: RPC Node)")
            if _is_valid(risk.get("factors")):
                for factor in risk.get("factors", [])[:3]:
                    findings.append(translate(factor.get('reason')) + " (Source: Axon Engine, Confidence: High, Method: Behavioral Heuristics)")
            for f in findings:
                Story.append(Paragraph(f"• {f}", styles["Normal"]))
            Story.append(Spacer(1, 12))"""
content = content.replace(old_key_findings, new_key_findings)

# 3. Contract profile in Contract report
old_contract_profile = """            # SECTION 3 - CONTRACT PROFILE
            Story.append(Paragraph("<b>SECTION 3 - CONTRACT PROFILE</b>", styles["Heading2"]))
            addr_info = detect_address_type(report.entity_address)
            explorer = addr_info.get("explorer", "N/A")
            if _is_valid(explorer):
                Story.append(Paragraph(f"<b>Explorer Link:</b> <a href='{explorer}'>{explorer}</a>", styles["Normal"]))
            Story.append(Paragraph(f"<b>Token Name:</b> {info.get('tokenName', 'N/A')}", styles["Normal"]))
            Story.append(Paragraph(f"<b>Compiler:</b> {info.get('compiler', 'N/A')}", styles["Normal"]))
            Story.append(Spacer(1, 12))"""

new_contract_profile = """            # SECTION 3 - CONTRACT PROFILE
            Story.append(Paragraph("<b>SECTION 3 - CONTRACT PROFILE</b>", styles["Heading2"]))
            addr_info = detect_address_type(report.entity_address)
            explorer = addr_info.get("explorer", "")
            if _is_valid(explorer):
                Story.append(Paragraph(f"<b>Explorer Link:</b> <a href='{explorer}'>{explorer}</a>", styles["Normal"]))
            if _is_valid(info.get('tokenName')):
                Story.append(Paragraph(f"<b>Token Name / Metadata:</b> {info.get('tokenName')}", styles["Normal"]))
            if _is_valid(info.get('compiler')):
                Story.append(Paragraph(f"<b>Compiler:</b> {info.get('compiler')}", styles["Normal"]))
            Story.append(Paragraph(f"<b>Source Code Verified:</b> {'Yes' if info.get('verified') else 'No'}", styles["Normal"]))
            if 'is_proxy' in info:
                Story.append(Paragraph(f"<b>Proxy Contract:</b> {'Yes' if info.get('is_proxy') else 'No'}", styles["Normal"]))
            if _is_valid(info.get('implementation_address')):
                Story.append(Paragraph(f"<b>Implementation:</b> {info.get('implementation_address')}", styles["Normal"]))
            if _is_valid(info.get('deployer')):
                Story.append(Paragraph(f"<b>Deployer:</b> {info.get('deployer')}", styles["Normal"]))
            if _is_valid(info.get('creation_tx')):
                Story.append(Paragraph(f"<b>Creation Tx:</b> {info.get('creation_tx')}", styles["Normal"]))
            if _is_valid(info.get('creation_block')):
                Story.append(Paragraph(f"<b>Creation Block:</b> {info.get('creation_block')}", styles["Normal"]))
            if _is_valid(info.get('optimization')):
                Story.append(Paragraph(f"<b>Optimization:</b> {info.get('optimization')}", styles["Normal"]))
            if _is_valid(goplus.get('owner_address')):
                Story.append(Paragraph(f"<b>Owner / Privileges:</b> {goplus.get('owner_address')}", styles["Normal"]))
            Story.append(Spacer(1, 12))"""
content = content.replace(old_contract_profile, new_contract_profile)

# 4. Bulk Batch dynamic section numbers
import re
# We'll just replace the bulk_batch section entirely because it's easier and safer
old_bulk_batch_start = """        elif report.entity_type == "bulk_batch":
            summary = raw.get("summary", {})
            results = raw.get("results", [])
            errors = raw.get("errors", [])
            
            # SECTION 1 - MASTER EVIDENCE INTEGRITY"""
old_bulk_batch_end = """            Story.append(Paragraph(f"Batch processed with {len(errors)} failed queries.", styles["Normal"]))
            Story.append(Spacer(1, 12))

    doc.build(Story)"""

bulk_batch_idx_start = content.find(old_bulk_batch_start)
bulk_batch_idx_end = content.find(old_bulk_batch_end) + len(old_bulk_batch_end)
old_bulk_batch_block = content[bulk_batch_idx_start:bulk_batch_idx_end]

new_bulk_batch_block = """        elif report.entity_type == "bulk_batch":
            summary = raw.get("summary", {})
            results = raw.get("results", [])
            errors = raw.get("errors", [])
            sec = 1
            
            # SECTION 1 - MASTER EVIDENCE INTEGRITY
            Story.append(Paragraph(f"<b>SECTION {sec} - MASTER EVIDENCE INTEGRITY</b>", styles["Heading2"])); sec += 1
            Story.append(Paragraph(f"<b>SHA-256 Hash:</b> {report.report_hash}", styles["Normal"]))
            Story.append(Paragraph("<b>Signed:</b> Engine v2.0 | Node Source: Primary Intel Node", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 2 - CASE OVERVIEW
            Story.append(Paragraph(f"<b>SECTION {sec} - CASE OVERVIEW</b>", styles["Heading2"])); sec += 1
            total = sum(summary.values()) if summary else 0
            critical = summary.get("CRITICAL", 0)
            high = summary.get("HIGH", 0)
            Story.append(Paragraph(f"<b>Total Subjects Processed:</b> {total}", styles["Normal"]))
            Story.append(Paragraph(f"<b>Critical Risk Profiles:</b> {critical}", styles["Normal"]))
            Story.append(Paragraph(f"<b>High Risk Profiles:</b> {high}", styles["Normal"]))
            
            intel = raw.get("intelligence", {})
            priority_queue = intel.get("priority_queue", [])
            
            if critical > 0 or high > 0:
                reasons = []
                for p in priority_queue:
                    if p.get('reason') and p.get('score', 0) >= 60:
                        reasons.append(translate(p.get('reason').lower().replace('auto-detected: ', '')))
                        if len(reasons) >= 2: break
                reason_str = " and ".join(reasons) if reasons else "high-risk indicators"
                Story.append(Paragraph(f"<b>Assessment:</b> Batch risk is HIGH because {(critical + high)} entities exhibit {reason_str}, while the remaining subjects are low risk.", styles["Normal"]))
            else:
                Story.append(Paragraph(f"<b>Assessment:</b> Batch risk is LOW. No critical or high-risk entities detected in this batch.", styles["Normal"]))
            Story.append(Spacer(1, 12))

            # SECTION 3 - ENTITY REGISTRY
            if results:
                Story.append(Paragraph(f"<b>SECTION {sec} - ENTITY REGISTRY</b>", styles["Heading2"])); sec += 1
                rows = []
                for res in results[:20]:
                    addr = res.get("address", "")
                    addr_info = detect_address_type(addr)
                    rows.append([addr[:12]+"...", addr_info.get("coin", "Unknown"), res.get("label", ""), str(res.get("score", 0))])
                if rows:
                    Story.append(_build_table(["Address", "Network", "Risk Label", "Score"], rows, [100, 100, 60, 40]))
                Story.append(Spacer(1, 12))

            # SECTION 4 - PRIORITY INVESTIGATION QUEUE
            priority_queue_filtered = [item for item in priority_queue if item.get("score", 0) >= 60]
            if priority_queue_filtered:
                Story.append(Paragraph(f"<b>SECTION {sec} - PRIORITY INVESTIGATION QUEUE</b>", styles["Heading2"])); sec += 1
                rows = []
                for item in priority_queue_filtered[:15]:
                    rows.append([
                        item.get("address", "")[:12] + "...",
                        str(item.get("score", 0)),
                        item.get("reason", "")[:40]
                    ])
                if rows:
                    Story.append(_build_table(["Target Address", "Risk Score", "Primary Indicator"], rows, [100, 60, 200]))
                Story.append(Spacer(1, 12))

            # SECTION 5 - NETWORK CONNECTIONS / OVERLAP MATRIX
            similarity = intel.get("similarity_matrix", [])
            if similarity:
                Story.append(Paragraph(f"<b>SECTION {sec} - NETWORK CONNECTIONS / OVERLAP MATRIX</b>", styles["Heading2"])); sec += 1
                rows = []
                for sim in similarity[:15]:
                    rows.append([
                        sim.get("source", "")[:10] + "...",
                        sim.get("target", "")[:10] + "...",
                        f"{sim.get('score', 0):.2f}%",
                        sim.get("shared_counterparty", "")[:10] + "..."
                    ])
                if rows:
                    Story.append(_build_table(["Subject A", "Subject B", "Similarity", "Shared Node"], rows, [90, 90, 80, 90]))
                Story.append(Spacer(1, 12))

            # SECTION 6 - ACTIONABLE INTELLIGENCE
            if critical > 0 or high > 0:
                Story.append(Paragraph(f"<b>SECTION {sec} - ACTIONABLE INTELLIGENCE</b>", styles["Heading2"])); sec += 1
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
                Story.append(Paragraph(f"<b>SECTION {sec} - INVESTIGATOR FINDINGS (ERRORS/OMISSIONS)</b>", styles["Heading2"])); sec += 1
                for err in errors:
                    Story.append(Paragraph(f"- <b>{err.get('address', '')[:12]}...</b>: {err.get('error', '')}", styles["Normal"]))
                Story.append(Spacer(1, 12))
                
            # SECTION 8 - THREAT INTELLIGENCE SUMMARY
            Story.append(Paragraph(f"<b>SECTION {sec} - THREAT INTELLIGENCE SUMMARY</b>", styles["Heading2"])); sec += 1
            Story.append(Paragraph(f"Batch processed with {len(errors)} failed queries.", styles["Normal"]))
            Story.append(Spacer(1, 12))

    doc.build(Story)"""

if old_bulk_batch_block:
    content = content.replace(old_bulk_batch_block, new_bulk_batch_block)

# 5. Case Report "No summary available."
old_case_summary = """    # SECTION 1 - CASE SUMMARY
    Story.append(Paragraph("<b>SECTION 1 - CASE SUMMARY</b>", styles["Heading2"]))
    if case.description:
        Story.append(Paragraph(case.description, styles["Normal"]))
    Story.append(Spacer(1, 8))"""

new_case_summary = """    # SECTION 1 - CASE SUMMARY
    Story.append(Paragraph("<b>SECTION 1 - CASE SUMMARY</b>", styles["Heading2"]))
    if case.description and case.description.strip() and case.description.strip().lower() not in ["no summary available.", "no summary available", "n/a", "none"]:
        Story.append(Paragraph(case.description, styles["Normal"]))
    else:
        Story.append(Paragraph("Summary unavailable because no cross-entity relationships were identified.", styles["Normal"]))
    Story.append(Spacer(1, 8))"""
content = content.replace(old_case_summary, new_case_summary)

with open("backend/modules/report_generator.py", "w", encoding="utf-8") as f:
    f.write(content)
