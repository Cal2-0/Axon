# AXON v1.0 — Final Gameplan
**Based on:** Live report audit (Binance Hot Wallet · USDT Contract · Bulk Batch · Architecture Review)
**Status:** Engine frozen. Presentation, correctness, and bulk intelligence are the only remaining work.
**Rule:** No new features. No new heuristics. Fix what exists. Ship what works.

---

## WHAT THE REPORTS REVEALED (HONEST AUDIT)

### Wallet Report (Binance Hot Wallet — 0x28C6c0…)
```
GOOD
✓ SHA-256 integrity block present and prominent
✓ Entity classification correct — "Exchange Hot Wallet (Source: Threat Corpus)"
✓ Timeline reconstruction present with tx hashes
✓ Risk score correctly suppressed to LOW (3/100) for known exchange
✓ Executive summary present
✓ Report structure is sound

BROKEN
✗ "HIGH VALUE + NEW WALLET: 272323.7 ETH in wallet aged 0 days"
  → Binance Hot Wallet 14 is years old. Age calculated from wrong source.
  → Fix: wallet age = earliest tx timestamp on-chain, not block creation date.

✗ "risk score lowered to MODERATE" in executive summary
  → Engine wording leaked directly into report output.
  → Fix: translation layer — engine state → forensic language.

✗ Counterparties: all showing "default" as Known Entity
  → 0xdac17f958d... IS in AXON corpus (USDT contract — proven by contract report).
  → The corpus match is not flowing back to the counterparty table.
  → Fix: counterparty lookup must query corpus before rendering label.

✗ Counterparty columns: Tx Count, Total Val, Last Seen all showing N/A
  → Data exists (timeline has 10 txs with hashes). Not being aggregated.
  → Fix: derive counterparty stats from collected transaction list.

✗ Asset Inventory: "ERC-20 Tokens 0" for Binance Hot Wallet
  → This wallet holds significant ERC-20 volume. Not queried at QUICK depth.
  → Acceptable at QUICK — but must say "Not collected at QUICK scan depth"
  → not "0" which implies it was checked and found nothing.

✗ Timeline: 9 of 10 transactions show "0.00000 ETH"
  → These are ERC-20 token transfers — ETH value is correctly 0 for token txs.
  → But report shows no token value, no token name, no contract.
  → Fix: ERC-20 transfers must show token symbol + amount, not 0.00000 ETH.
```

### Contract Report (USDT — 0xdAC17F95…)
```
GOOD
✓ SHA-256 integrity present
✓ Risk score correct (3/100 — legitimate stablecoin)
✓ OFAC/threat suppression applied correctly for known protocol
✓ GoPlus integration present

BROKEN
✗ Token Name: N/A — this is Tether USDT, largest stablecoin by market cap
  → Name is in AXON corpus (Section 8 says "STABLECOIN — Largest stablecoin")
  → The corpus label is not populating the Token Name field.
  → Fix: corpus match → populate contract metadata fields.

✗ Compiler: N/A — Etherscan has full verification data for this contract
  → This is a verified contract. Compiler version is publicly available.
  → Fix: Etherscan getsourcecode response must populate Compiler field.

✗ Missing contract metadata entirely:
  → Verified: YES (it is verified on Etherscan)
  → Token Symbol: USDT
  → Decimals: 6
  → Total Supply: ~$140B circulating
  → Proxy: NO (direct implementation)
  → Deployer: publicly known
  → Deployment date: 2017-11-28
  → These are all free Etherscan API fields. None are present.

✗ "Trusted protocol suppression applied" — engine language in report
  → Replace with: "Risk assessment reflects known stablecoin protocol.
     Centralized freeze capability is by design for regulatory compliance."
```

### Bulk Report (4-address batch)
```
GOOD
✓ SHA-256 present
✓ Multi-chain detection working (BTC, TRX, ETH, SOL identified)
✓ Failed address flagged (addr1qx2fxv2 — Cardano, unsupported chain)

CRITICAL GAPS
✗ Entity Registry shows all risk scores as 0
  → 3 of 4 addresses returned no scores. Only 1 high-risk flagged (Solana JUP6L…)
  → Likely rate-limit or timeout during batch processing.
  → Fix: retry logic per address + explicit failure reason per row.

✗ Sections 4 and 5 entirely missing from report
  → Priority Investigation Queue → absent
  → Network Connections → absent
  → These are the two highest-value bulk sections. Not rendered at all.

✗ "Immediate isolation and manual review strongly recommended for 1 subject"
  → Which one? Report does not say.
  → Actionable intelligence must name the address, not count it.

✗ Cross-batch analysis: zero
  → No check for shared counterparties across batch
  → No timing correlation
  → No cluster detection
  → Fix: post-processing pass after all individual scans complete

✗ No triage ranking — addresses listed in submission order, not risk order

✗ Section 6 jumps straight to "Actionable Intelligence" with no priority queue
  → The report skips from entity registry directly to a vague recommendation
  → Fix: Priority Queue section must render between registry and intelligence
```

---

## THE FIXES — ORDERED BY IMPACT

### FIX 1 — Wallet age calculation (1 hour)
**File:** `wallet_scorer.py`
**Problem:** Age calculated from block/contract creation, not first transaction.
**Fix:**
```python
# WRONG — current
wallet_age_days = (now - contract_deploy_block.timestamp).days

# CORRECT
txlist = etherscan.get_txlist(address, sort='asc', limit=1)
first_tx_date = txlist[0].timestamp if txlist else None

if first_tx_date:
    wallet_age_days = (now - first_tx_date).days
    wallet_age_display = f"{wallet_age_days} days"
else:
    wallet_age_display = "Not determined at QUICK scan depth"

# NEVER display "0 days" for a wallet with transaction history
# If first_tx_date exists and age = 0, it means created today — say that explicitly
# If txlist is empty, omit age field entirely
```

### FIX 2 — Engine language translation layer (2 hours)
**File:** `report_generator.py` — add before any string reaches template
**Problem:** Internal engine state strings leaking into report output.
**Fix:** Create `language.py` — a single translation dictionary:

```python
ENGINE_TO_FORENSIC = {

    # Risk adjustments
    "risk score lowered to MODERATE":
        "Risk assessment adjusted. Observed behavior is consistent with "
        "known exchange activity. Entity classification applied.",

    "risk score lowered to LOW":
        "Risk assessment reflects confirmed entity classification. "
        "Behavioral signals are expected for this entity type.",

    "Trusted protocol suppression applied":
        "Risk assessment reflects known protocol classification. "
        "Administrative controls observed are consistent with "
        "regulatory compliance design, not exploitation.",

    # Wallet age
    "NEW WALLET":
        # Do not render this flag if entity is in corpus as exchange/protocol
        # Only render if wallet has NO corpus match AND age < 7 days
        None,  # suppress for known entities

    # Counterparty labels
    "default":
        # Replace with classification logic (see FIX 3)
        None,

    # Asset inventory
    "0":  # when it means "not queried"
        "Not collected at QUICK scan depth",

    # Scan artifacts
    "N/A":
        # Context-dependent — see FIX 4
        None,
}

def translate(text: str, context: dict = None) -> str:
    return ENGINE_TO_FORENSIC.get(text, text)
```

### FIX 3 — Counterparty label resolution (3 hours)
**File:** `report_generator.py` — counterparty table rendering
**Problem:** "default" showing for all counterparties including known corpus entities.
**Fix:** Counterparty label resolution pipeline:

```python
def resolve_counterparty_label(address: str) -> str:
    # Step 1: Check AXON corpus first (local DB — no API call)
    corpus_match = threat_db.lookup(address)
    if corpus_match:
        return corpus_match.entity_name  # e.g. "Tether: USDT Contract"

    # Step 2: Check address type
    bytecode = eth_getCode(address)
    if bytecode and bytecode != "0x":
        # Has bytecode — it's a contract
        # Check if ERC-20 (has transfer event signature)
        if is_erc20(address):
            return "ERC-20 Token Contract"
        return "Smart Contract (Unclassified)"

    # Step 3: EOA with no corpus match
    return "Unclassified Address"

# Labels available (in priority order):
# [corpus name]          → exact corpus match
# "Exchange Wallet"      → corpus match, type = exchange
# "Mixer Contract"       → corpus match, type = mixer
# "ERC-20 Token Contract"→ has bytecode + ERC-20 signature
# "Smart Contract"       → has bytecode, unknown type
# "Unclassified Address" → EOA, no corpus match
# Never: "default"
```

### FIX 4 — Contract metadata population (2 hours)
**File:** `contract_scorer.py` + `report_generator.py`
**Problem:** Token Name, Compiler, verification status all showing N/A despite corpus match.
**Fix:** Two-source population — corpus first, Etherscan API second:

```python
def build_contract_metadata(address: str) -> dict:
    meta = {}

    # Source 1: AXON corpus (instant, no API)
    corpus = threat_db.lookup(address)
    if corpus:
        meta['token_name']   = corpus.name        # "Tether USD"
        meta['token_symbol'] = corpus.symbol       # "USDT"
        meta['category']     = corpus.category     # "STABLECOIN"

    # Source 2: Etherscan getsourcecode (1 API call)
    source = etherscan.get_source_code(address)
    if source:
        meta['verified']       = source.SourceCode != ""
        meta['compiler']       = source.CompilerVersion or "Not available"
        meta['proxy']          = source.Proxy == "1"
        meta['implementation'] = source.Implementation or None
        meta['license']        = source.LicenseType or "Not specified"

    # Source 3: Etherscan token info (1 API call — only for ERC-20)
    if meta.get('category') in ['STABLECOIN', 'TOKEN', 'ERC20']:
        token_info = etherscan.get_token_info(address)
        if token_info:
            meta['decimals']      = token_info.decimals
            meta['total_supply']  = token_info.totalSupply

    return meta

# Required contract metadata fields (all reports):
# Token Name       → corpus.name or etherscan or "Not available"
# Token Symbol     → corpus.symbol or etherscan or "Not available"
# Verified         → YES / NO (never N/A — this is deterministic)
# Compiler         → from etherscan or "Not available"
# Proxy            → YES / NO
# Deployer         → from etherscan creation tx
# Deployment Date  → from etherscan creation tx
# Decimals         → from etherscan (ERC-20 only)
```

### FIX 5 — ERC-20 transfers in timeline (2 hours)
**File:** `wallet_scorer.py` — transaction ingestion
**Problem:** ERC-20 transfers showing as "0.00000 ETH" — technically correct but forensically useless.
**Fix:**

```python
def format_transaction_value(tx: dict) -> tuple[str, str]:
    if tx['value'] == '0' and tx.get('input') != '0x':
        # Likely ERC-20 transfer — fetch token transfer data
        token_tx = etherscan.get_token_transfers(
            address=wallet_address,
            tx_hash=tx['hash']
        )
        if token_tx:
            return (
                f"{token_tx.value} {token_tx.tokenSymbol}",
                "ERC-20 Transfer"
            )
        return ("Token transfer", "ERC-20 (amount requires token query)")

    # Standard ETH transfer
    eth_value = wei_to_eth(tx['value'])
    return (f"{eth_value} ETH", "ETH Transfer")

# Timeline column should be:
# Value: "50,000 USDT" not "0.00000 ETH"
# Type:  "ERC-20 Transfer" not blank
```

### FIX 6 — Bulk: Priority Queue + Triage Rank (4 hours)
**File:** `bulk_scanner.py` + bulk report template
**Problem:** No priority ordering, no cross-batch analysis, no triage output.
**Fix:**

```python
# Step 1: Score all wallets (existing — keep as-is)
results = [scan(address) for address in batch]

# Step 2: Triage rank (NEW — runs after all scans complete)
def triage_rank(wallet) -> int:
    score = wallet.risk_score

    # Hard escalations
    if wallet.ofac_hit:              score += 50
    if wallet.mixer_exposure:        score += 20
    if wallet.cex_deposit_found:     score += 15
    if wallet.fresh_wallet:          score += 10  # only if NOT in corpus

    # Hard suppressions
    if wallet.entity_type == "EXCHANGE":      score -= 30
    if wallet.entity_type == "STABLECOIN":    score -= 25
    if wallet.entity_type == "DEFI_MAJOR":    score -= 15

    return min(100, max(0, score))

ranked = sorted(results, key=triage_rank, reverse=True)

# Step 3: Cross-batch relationship detection (NEW)
def find_batch_relationships(results: list) -> list:
    relationships = []

    # Check 1: Direct transactions between batch addresses
    all_addresses = {r.address for r in results}
    for wallet in results:
        shared = all_addresses.intersection(wallet.counterparty_addresses)
        shared.discard(wallet.address)
        if shared:
            relationships.append({
                'type': 'DIRECT_TRANSACTION',
                'wallets': [wallet.address] + list(shared),
                'note': f"{wallet.address[:10]}… transacted directly with "
                        f"{len(shared)} other address(es) in this batch"
            })

    # Check 2: Shared counterparties outside the batch
    counterparty_frequency = {}
    for wallet in results:
        for cp in wallet.counterparty_addresses - all_addresses:
            if cp not in counterparty_frequency:
                counterparty_frequency[cp] = []
            counterparty_frequency[cp].append(wallet.address)

    for cp, wallets in counterparty_frequency.items():
        if len(wallets) >= 2:
            label = threat_db.lookup(cp).name if threat_db.lookup(cp) else cp[:12] + "…"
            relationships.append({
                'type': 'SHARED_COUNTERPARTY',
                'shared_address': cp,
                'shared_label': label,
                'wallets': wallets,
                'note': f"{len(wallets)} batch addresses share counterparty: {label}"
            })

    return relationships

# Step 4: Bulk summary block (renders FIRST in report)
def build_bulk_summary(ranked, relationships, failed):
    critical = [w for w in ranked if w.triage_rank >= 86]
    high     = [w for w in ranked if 66 <= w.triage_rank < 86]
    medium   = [w for w in ranked if 36 <= w.triage_rank < 66]
    low      = [w for w in ranked if w.triage_rank < 36]

    return {
        'total': len(ranked) + len(failed),
        'critical': critical,
        'high': high,
        'medium': medium,
        'low': low,
        'failed': failed,
        'relationships': relationships,
        'skip_count': len(low),
        # The headline: "Ignore N wallets. Focus on these M."
    }
```

### FIX 7 — Bulk: actionable output naming addresses (1 hour)
**Problem:** "Immediate isolation recommended for 1 subject" — doesn't name the subject.
**Fix:** Every bulk recommendation must name the address:

```
NEVER:
"Immediate isolation recommended for 1 high-risk subject."

ALWAYS:
"Priority 1 — JUP6LkbZbjS1zKH… (Solana)
 Risk: HIGH (triage score: 78)
 Primary flag: [flag text]
 Recommended action: Full investigation + manual review"
```

---

## DUAL MODE HASH FIX

**Problem:** Wallet scan and dual mode (wallet + contract) produce identical SHA-256.
**Root cause:** Dual mode hashes only the wallet payload. Contract analysis not included.

**Fix:**
```python
# WRONG — current
hash_payload = json.dumps(wallet_data)
sha256 = hashlib.sha256(hash_payload.encode()).hexdigest()

# CORRECT — dual mode
if mode == 'dual':
    combined_payload = {
        'wallet': wallet_data,
        'contract': contract_data,
        'mode': 'DUAL',
        'scan_timestamp': timestamp
    }
    hash_payload = json.dumps(combined_payload, sort_keys=True)
else:
    hash_payload = json.dumps(wallet_data, sort_keys=True)

sha256 = hashlib.sha256(hash_payload.encode()).hexdigest()

# sort_keys=True is mandatory — dict ordering must be deterministic
# otherwise same data produces different hashes on different runs
```

---

## WHAT DOES NOT GET TOUCHED

```
✗ Risk engine (L1–L5)
✗ Isolation Forest
✗ DBSCAN clustering
✗ Threat corpus (13,847 entities)
✗ BFS fund flow tracer
✗ 3-agent AI debate
✗ GoPlus integration
✗ Forta Network alerts
✗ Chain identification pipeline
✗ SHA-256 integrity architecture
✗ Any new heuristics
✗ Any new API integrations
✗ Any new chains
```

---

## COMPLETE PRIORITY ORDER

```
WEEK 1 — Correctness (trust-critical)
  Day 1:  FIX 1 — Wallet age from first TX date
  Day 1:  FIX 7 — Dual mode hash includes all payloads
  Day 2:  FIX 2 — Engine language translation layer
  Day 3:  FIX 3 — Counterparty label resolution pipeline
  Day 4:  FIX 4 — Contract metadata population
  Day 5:  FIX 5 — ERC-20 transfers in timeline

WEEK 2 — Bulk intelligence
  Day 1–2: FIX 6a — Triage rank formula
  Day 3:   FIX 6b — Cross-batch relationship detection
  Day 4:   FIX 6c — Bulk summary block
  Day 5:   FIX 7 — Named addresses in bulk recommendations

WEEK 3 — Validation
  Run against: Binance Hot Wallet, Tornado Cash, Lazarus Group,
               vitalik.eth, USDT contract, Uniswap router
  For each: verify age, verify score, verify counterparty labels,
            verify metadata, verify no engine strings in output
  Fix any regressions. Do not add features.

WEEK 3 END — Ship v1.0
```

---

## THE ONE-LINE TEST FOR EACH REPORT

Before shipping, every report type must pass this:

```
Wallet:   "Can an investigator read this to a prosecutor in 60 seconds?"
Contract: "Does this tell me what the contract is and who is using it?"
Bulk:     "Does this tell me which 8 wallets matter out of 100?"
Case:     "Could this be submitted as a court exhibit today?"
```

If any answer is no — it's not ready.

---

## WHAT v1.0 IS

```
AXON v1.0 is not the most feature-rich blockchain tool.
It is the most trustworthy.

Every finding has a source.
Every score has a breakdown.
Every report has a verified hash.
Every label is either confirmed or honestly declared unknown.
No engine artifacts. No false ages. No silent failures.

That is what earns it a place in a forensics lab.
```

---
*AXON v1.0 Gameplan — July 2026*
*Based on live report audit: Binance Hot Wallet · USDT Contract · Bulk Batch*
*Engine frozen. Correctness and bulk intelligence are the finish line.*
