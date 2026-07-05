import os
import re

file_path = os.path.join(os.path.dirname(__file__), "modules", "report_generator.py")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add translate function and dictionary at the top
trans_code = """
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
"""

if "ENGINE_TO_FORENSIC" not in content:
    content = content.replace("def _is_valid(data):", trans_code + "\ndef _is_valid(data):")

# 2. Fix Wallet Report translations
content = content.replace("ai.get('verdict')", "translate(ai.get('verdict'))")
content = content.replace("ai.get('hypothesis')", "translate(ai.get('hypothesis'))")
content = content.replace("risk.get('label', 'LOW')", "translate(risk.get('label', 'LOW'))")

# 3. Fix Wallet Report Key Findings & Threat DB matches
content = content.replace("findings.append(factor.get('reason'))", "findings.append(translate(factor.get('reason')))")
content = content.replace("rows.append([\"Axon Engine\", \"Behavioral\", \"High\", factor.get('reason'), \"Chain Analysis\"])", "rows.append([\"Axon Engine\", \"Behavioral\", \"High\", translate(factor.get('reason')), \"Chain Analysis\"])")
content = content.replace("Story.append(Paragraph(f\"- {factor.get('reason')} \", styles[\"Normal\"]))", "Story.append(Paragraph(f\"- {translate(factor.get('reason'))} \", styles[\"Normal\"]))")

# 4. Fix ERC-20 Timeline (0.0000 ETH)
timeline_old = """                    try: val = f"{(int(tx.get('value', 0)) / 10**18):.5f}"
                    except: val = "0\""""
timeline_new = """                    try:
                        val_num = int(tx.get('value', 0))
                        if val_num == 0 and tx.get('input') not in ['', '0x']:
                            val = "Token Transfer"
                        else:
                            val = f"{(val_num / 10**18):.5f} ETH"
                    except: val = "0 ETH\""""
content = content.replace(timeline_old, timeline_new)

# 5. Fix Counterparties (default -> Unclassified)
cp_old = """rows.append([n.get("id", "")[:12]+"...", n.get("type", "Unknown"), str(n.get("interaction_count", "N/A")), str(n.get("total_value", "N/A")), str(n.get("last_seen", "N/A")), str(n.get("risk", 0))])"""
cp_new = """ctype = n.get("type", "Unknown")
                        if ctype == "default": ctype = "Unclassified"
                        tx_c = str(n.get("interaction_count", n.get("tx_count", "N/A")))
                        rows.append([n.get("id", "")[:12]+"...", ctype, tx_c, str(n.get("total_value", "N/A")), str(n.get("last_seen", "N/A")), str(n.get("risk", 0))])"""
content = content.replace(cp_old, cp_new)

# 6. Fix Asset Inventory
asset_old = """rows.append(["ERC-20 Tokens", str(holdings.get("erc20_count", 0)), "N/A", "N/A", "N/A"])"""
asset_new = """count = holdings.get("erc20_count", 0)
                    count_str = "Not collected at QUICK depth" if str(count) == "0" else str(count)
                    rows.append(["ERC-20 Tokens", count_str, "N/A", "N/A", "N/A"])"""
content = content.replace(asset_old, asset_new)

# 7. Fix Contract Report
contract_risk_old = """Story.append(Paragraph(f"- {factor.get('reason')} ", styles["Normal"]))"""
contract_risk_new = """Story.append(Paragraph(f"- {translate(factor.get('reason'))} ", styles["Normal"]))"""
# Since this string appears a few times, we already replaced it in step 3!
# We just need to make sure `factor` if string is translated too:
contract_risk_str_old = """Story.append(Paragraph(f"- {factor}", styles["Normal"]))"""
contract_risk_str_new = """Story.append(Paragraph(f"- {translate(factor)}", styles["Normal"]))"""
content = content.replace(contract_risk_str_old, contract_risk_str_new)

# 8. Fix Bulk Report Actionable Intelligence
bulk_act_old = """if critical > 0 or high > 0:
                Story.append(Paragraph("<b>SECTION 6 - ACTIONABLE INTELLIGENCE</b>", styles["Heading2"]))
                Story.append(Paragraph(f"Immediate isolation and manual review strongly recommended for the {critical + high} high-risk subjects identified in the batch.", styles["Normal"]))
                Story.append(Spacer(1, 12))"""
bulk_act_new = """if critical > 0 or high > 0:
                Story.append(Paragraph("<b>SECTION 6 - ACTIONABLE INTELLIGENCE</b>", styles["Heading2"]))
                high_addrs = [res.get("address", "") for res in results if res.get("score", 0) >= 60]
                if high_addrs:
                    Story.append(Paragraph(f"Immediate isolation and manual review strongly recommended for the following high-risk subjects:", styles["Normal"]))
                    for ha in high_addrs:
                        Story.append(Paragraph(f"- Priority Review: <b>{ha}</b>", styles["Normal"]))
                else:
                    Story.append(Paragraph(f"Immediate isolation and manual review strongly recommended for the {critical + high} high-risk subjects identified in the batch.", styles["Normal"]))
                Story.append(Spacer(1, 12))"""
content = content.replace(bulk_act_old, bulk_act_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied to report_generator.py")
