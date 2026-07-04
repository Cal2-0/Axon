import re
import os

files_to_patch = [
    ("backend/modules/btc_scorer.py", "bitcoin"),
    ("backend/modules/sol_scorer.py", "solana"),
    ("backend/modules/tron_scorer.py", "tron")
]

metadata_code = """
    # ── Server-Side Hash & Report Metadata (tamper-proof) ──
    import uuid, time, hashlib, json
    report_meta = {
        "report_id": f"AXON-W-{int(time.time())}-{address[:8]}-{uuid.uuid4().hex[:6]}",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "generated_timestamp": time.time(),
        "scan_depth": depth,
        "entity_address": address.lower(),
        "entity_type": "wallet",
        "engine_version": "2.0",
    }
    hash_payload = json.dumps(response_data, sort_keys=True, default=str)
    report_meta["sha256_hash"] = hashlib.sha256(hash_payload.encode()).hexdigest()
    report_meta["hash_algorithm"] = "SHA-256"
    report_meta["hash_scope"] = "Full response_data payload (sorted keys, pre-metadata)"
    response_data["report_metadata"] = report_meta

    if db:
        try:
            from database.models import VerificationReport
            report_entry = VerificationReport(
                report_id=report_meta["report_id"],
                report_hash=report_meta["sha256_hash"],
                entity_address=address.lower(),
                entity_type="wallet",
                risk_score=final_score,
                scan_timestamp=time.time(),
                scan_depth=depth
            )
            db.add(report_entry)
            db.commit()
        except Exception as e:
            print(f"[SCAN] Error saving to report DB: {e}")
            db.rollback()

    return response_data
"""

for filepath, chain in files_to_patch:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix "default" node type
    content = content.replace('"type": "default"', '"type": "Unknown Wallet"')
    
    # Fix HIGH VALUE logic (wallet age)
    content = content.replace("HIGH VALUE + NEW WALLET:", "HIGH VALUE + RECENT ACTIVITY:")
    content = content.replace("wallet aged {:.0f} days", "activity span {:.0f} days")

    # Add metadata if not present
    if "report_metadata" not in content and "return response_data" in content:
        content = re.sub(r'^\s*return response_data\s*$', metadata_code, content, flags=re.MULTILINE)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Patched {filepath}")

# Also patch wallet_scorer.py
with open("backend/modules/wallet_scorer.py", 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('"type": "default"', '"type": "Unknown Wallet"')
content = content.replace("HIGH VALUE + NEW WALLET:", "HIGH VALUE + RECENT ACTIVITY:")
content = content.replace("wallet aged {:.0f} days", "activity span {:.0f} days")
with open("backend/modules/wallet_scorer.py", 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched backend/modules/wallet_scorer.py")

# Also patch frontend DEMO_PROFILES node types
with open("frontend/src/pages/WalletInvestigation.jsx", 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("type: 'default'", "type: 'Unknown Wallet'")
with open("frontend/src/pages/WalletInvestigation.jsx", 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched frontend/src/pages/WalletInvestigation.jsx")

# Remove Penalty and fix Reference in report_generator.py
with open("backend/modules/report_generator.py", 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'\[Penalty:\s*\{factor\.get\(\'penalty\',\s*0\)\}\]', '', content)
content = content.replace('Reference = N/A', 'Source = Chain Analysis')
with open("backend/modules/report_generator.py", 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched backend/modules/report_generator.py")

# Also patch ai_analyst.py to fix executive summary
with open("backend/modules/ai_analyst.py", 'r', encoding='utf-8') as f:
    content = f.read()
# Find the prompt that says "low risk profile" or "risk score lowered"
content = content.replace("Provide a very brief investigator verdict (1-2 sentences) starting with '<LABEL> RISK'", "Provide a very brief forensic investigator summary (1-2 sentences). Do not mention internal risk scores or penalties. Sound like a forensic examiner.")
with open("backend/modules/ai_analyst.py", 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched backend/modules/ai_analyst.py")
