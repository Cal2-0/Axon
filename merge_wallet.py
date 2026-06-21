import re

with open('frontend/src/pages/WalletInvestigation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

with open('frontend/src/pages/WalletInvestigation_backup.jsx', 'r', encoding='utf-8') as f:
    backup_content = f.read()

# 1. Update imports
content = content.replace("import { scanWallet } from '../api/axon';", "import { scanWallet, getCrossChainHoldings, performDeepDiveScan } from '../api/axon';")

# 2. Add states
states_to_add = """  const [crossChain, setCrossChain] = useState(null);
  const [isDeepDiveActive, setIsDeepDiveActive] = useState(false);
  const [deepDiveStatus, setDeepDiveStatus] = useState('');
  const [deepDiveError, setDeepDiveError] = useState('');
"""
content = re.sub(r'(const \[loading, setLoading\] = useState\(false\);\n  const \[error, setError\] = useState\(null\);\n)', r'\1' + states_to_add, content)

# 3. Add handleDeepDive function
handle_deep_dive = """
  const handleDeepDive = async () => {
    if (!result || !result.identity || !result.identity.address) return;
    setIsDeepDiveActive(true);
    setDeepDiveStatus('Initializing Dual-Adversarial Deep Scan...');
    setDeepDiveError('');

    try {
      const advancedProfile = await performDeepDiveScan(result.identity.address, caseId);
      setResult(advancedProfile);
      setDeepDiveStatus('');
    } catch (err) {
      console.error(err);
      setDeepDiveError(err.message || 'Deep Dive Scan failed. Check API logs.');
      setDeepDiveStatus('');
    } finally {
      setIsDeepDiveActive(false);
    }
  };
"""
content = content.replace("const handleExport = () => {", handle_deep_dive + "\n  const handleExport = () => {")

# 4. Add CrossChain fetch
cross_chain_fetch = """      getCrossChainHoldings(targetAddress.trim())
        .then(cc => setCrossChain(cc))
        .catch(err => console.error("Cross-chain fetch failed:", err));"""
content = content.replace("const profile = await scanWallet(targetAddress.trim(), caseId);\n      setResult(profile);", "const profile = await scanWallet(targetAddress.trim(), caseId);\n      setResult(profile);\n" + cross_chain_fetch)

# 5. Extract Dual Adversarial Panel from backup
ai_panel_regex = re.compile(r'(\{/\* AI Forensic Analysis \*/\}.*?)(?=</div>\s*</div>\s*<div className="flex-1 min-w-0">|</div>\s*</div>\s*<div className="w-full">)', re.DOTALL)
backup_ai_panel = ai_panel_regex.search(backup_content)

if backup_ai_panel:
    old_ai_panel_regex = re.compile(r'(\{/\* AI Forensic Analysis \*/\}.*?)(?=<div className="text-sm font-bold text-axon-text-dim uppercase tracking-wider mb-3">Risk Factors</div>)', re.DOTALL)
    content = old_ai_panel_regex.sub(backup_ai_panel.group(1) + '\n                ', content)

# 6. Add Cross Chain Intelligence Section
cross_chain_section = """
          {crossChain && (
            <CollapsibleSection color="orange" icon="🌐" title="Cross-Chain Intelligence" badge="BTC / SOL / TRX" defaultOpen={true}>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="p-4 bg-axon-bg border border-[#f7931a]/30 rounded-lg shadow-[0_0_15px_rgba(247,147,26,0.1)]">
                  <div className="flex items-center gap-3 mb-3 border-b border-[#f7931a]/20 pb-2">
                    <span className="text-2xl">₿</span>
                    <span className="font-bold text-white tracking-wider">BITCOIN NETWORK</span>
                  </div>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-axon-text-dim">Associated BTC Balance</span>
                      <span className="text-[#f7931a] font-bold">{crossChain.bitcoin.balance_btc} BTC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-axon-text-dim">Estimated USD Value</span>
                      <span className="text-white">${crossChain.bitcoin.balance_usd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#f7931a]/10 pt-2">
                      <span className="text-axon-text-dim">Known UTXO Entities</span>
                      <span className="text-axon-purple">{crossChain.bitcoin.known_entities.length > 0 ? crossChain.bitcoin.known_entities.join(', ') : 'None Identified'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-axon-bg border border-[#14F195]/30 rounded-lg shadow-[0_0_15px_rgba(20,241,149,0.1)]">
                  <div className="flex items-center gap-3 mb-3 border-b border-[#14F195]/20 pb-2">
                    <span className="text-2xl text-[#14F195]">◎</span>
                    <span className="font-bold text-white tracking-wider">SOLANA NETWORK</span>
                  </div>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-axon-text-dim">Associated SOL Balance</span>
                      <span className="text-[#14F195] font-bold">{crossChain.solana.balance_sol} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-axon-text-dim">Estimated USD Value</span>
                      <span className="text-white">${crossChain.solana.balance_usd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#14F195]/10 pt-2">
                      <span className="text-axon-text-dim">Active SPL Programs</span>
                      <span className="text-axon-cyan">{crossChain.solana.defi_programs_used.length > 0 ? crossChain.solana.defi_programs_used.join(', ') : 'None Active'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          )}
"""

content = content.replace("{/* ── 3. Financial Intelligence ────────────────────────────────────────── */}", cross_chain_section + "\n          {/* ── 3. Financial Intelligence ────────────────────────────────────────── */}")

with open('frontend/src/pages/WalletInvestigation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Merged successfully!")
