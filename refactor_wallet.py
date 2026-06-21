import re
import os

filepath = r"C:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src\pages\WalletInvestigation.jsx"
backup_filepath = r"C:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src\pages\WalletInvestigation_backup.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

with open(backup_filepath, 'r', encoding='utf-8') as f:
    backup_content = f.read()

# 1. Replace the strict forensic verdict and add Deep Dive button
# Find the Dual Adversarial AI Block in backup:
dual_ai_match = re.search(r'(\{/\* AI Forensic Analysis \*/\}.*?)(?=<div className="text-sm font-bold text-axon-text-dim uppercase tracking-wider mb-3">Risk Factors</div>)', backup_content, re.DOTALL)
if dual_ai_match:
    dual_ai_block = dual_ai_match.group(1)
    
    # Replace in current content
    old_ai_block_regex = r'(\{/\* Strict Forensic Verdict \*/\}.*?)(?=<div className="text-sm font-bold text-axon-text-dim uppercase tracking-wider mb-3">Risk Factors</div>)'
    content = re.sub(old_ai_block_regex, dual_ai_block, content, flags=re.DOTALL)

# 2. Extract Cross-Chain Exposure from Identity panel
cc_regex = r'(\s*\{/\* Cross-Chain Exposure inside Identity \*/\}.*?)(?=\s*</CollapsibleSection>)'
cc_match = re.search(cc_regex, content, re.DOTALL)
cc_block = ""
if cc_match:
    cc_block = cc_match.group(1)
    content = content.replace(cc_block, '')

# 3. Extract ERC-20 Token Holdings and (from backup) Stablecoin flows
stablecoin_regex = r'(\s*\{/\* Stablecoin Flows \*/\}.*?)(?=\s*\{/\* Alchemy Token Holdings \*/\})'
stablecoin_match = re.search(stablecoin_regex, backup_content, re.DOTALL)
stablecoin_block = stablecoin_match.group(1) if stablecoin_match else ""

erc20_regex = r'(\s*\{/\* Alchemy Token Holdings \*/\}.*?)(?=\s*</div>\s*</div>\s*<div className="grid md:grid-cols-2 gap-6 mt-6">)'
erc20_match = re.search(erc20_regex, content, re.DOTALL)
erc20_block = ""
if erc20_match:
    erc20_block = erc20_match.group(1)
    content = content.replace(erc20_block, '')

# 4. Build Financial Intelligence Section
financial_intelligence = f"""
          {{/* ── 3. Financial Intelligence ─────────────────────────────────────────── */}}
          <CollapsibleSection color="green" icon="💵" title="Financial Intelligence" badge="FUNDS TRACKING" defaultOpen={{true}}>
            {cc_block}
            
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {stablecoin_block}
              {erc20_block}
            </div>
          </CollapsibleSection>
"""

# Insert Financial Intelligence below Risk Assessment
risk_end_regex = r'(</CollapsibleSection>\s*)(?=\{/\* ── 4\. OSINT & Threat Alerts ──────────────────────────────────────── \*/\})'
content = re.sub(risk_end_regex, r'\1' + financial_intelligence + '\n', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactoring complete.")
