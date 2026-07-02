# AXON — Solana Forensic Risk Engine Specification
### Build prompt for Claude Code / engineering implementation
### Philosophy: ~92% deterministic math, ~8% AI adversarial judgment. The database is confirmation, not proof.

---

## 0. The non-negotiable architectural rule

**A Solana wallet address is NOT where its tokens live. Do not score the wallet address's "balance" directly for anything except native SOL.**

Solana uses the SPL Token Program: every token a wallet holds (USDC, USDT, any SPL token) lives in a separate **Associated Token Account (ATA)** — a deterministic PDA (Program Derived Address) derived from `(wallet_pubkey, token_mint, token_program_id)`. The ATA is a distinct on-chain account with its own address. If you only fetch the wallet's native SOL balance and transaction history, you will completely miss stablecoin flows — which on Solana, as on Tron, are often the actual laundering rail, not native SOL.

```
RULE: For any wallet address W, before scoring:
  1. Resolve native SOL account (W itself)
  2. Derive/discover all ATAs owned by W (one per token mint it has ever held)
  3. Treat the UNION of {W, ATA_1, ATA_2, ...} as the entity's full asset surface
  4. Score on the AGGREGATE of all of these, not W alone
```

**Second non-negotiable rule: Program Derived Addresses (PDAs) are not wallets.** A PDA is a deterministic, non-keypair address controlled entirely by program logic — it cannot sign transactions itself. Many Solana addresses that "receive and send funds" are actually PDAs belonging to DeFi protocols (vaults, pools, escrow accounts), not EOA wallets controlled by a person. **Classify every address as EOA vs PDA before applying any wallet-behavior signal** (L1 telemetry assumes a human or bot operator decides when to transact — this assumption is false for a PDA, whose "transactions" are just program logic executing).

```
is_pda = address_is_off_curve(pubkey)  # PDAs are deliberately NOT valid ed25519 curve points
# This is a deterministic cryptographic check, not a heuristic.
# If is_pda == True: route to PDA/program classification path, do NOT run L1 wallet-behavior signals on it.
```

---

## 1. Pre-Step: Account Resolution & Classification

```
Account {
  address: pubkey
  type: EOA | PDA | TOKEN_ACCOUNT | PROGRAM
  owner_program: (if PDA) which program controls it
  linked_atas: [if EOA] all associated token accounts discovered
  rent_exempt_since: first activation slot (Solana's equivalent of "wallet age")
}
```

Classification logic:
```
1. is_off_curve(address) → PDA candidate
2. if account.owner == TOKEN_PROGRAM_ID and parsed as TokenAccount → TOKEN_ACCOUNT
   (extract owner wallet + mint from account data — this is how you reverse-resolve
    "which EOA does this ATA belong to" if starting from a token account address)
3. if account.executable == true → PROGRAM
4. else → EOA (a real signer-capable wallet)
```

---

## 2. The Five Layers (apply to the resolved EOA + its full ATA set)

```
SOL_FORENSIC_SCORE = (
    L1_behavioral   × 0.28 +
    L2_graph        × 0.25 +
    L3_economic      × 0.22 +
    L4_attribution  × 0.15 +
    L5_ai_delta     × 0.10
) × entity_class_modifier
```

Weight on L3 nudged slightly higher than the ETH/BTC baseline (22% vs 20%) because Solana's near-zero fee structure makes *volume and frequency* economic signals more discriminating than on fee-heavy chains — bad actors don't get cost-deterred from high-frequency structuring the way they do on Ethereum, so the structuring signal is both more common and more informative here.

### Layer 1 — Behavioral Telemetry (28%)

**1.1 — Transaction frequency anomaly relative to Solana's baseline (0–8 pts)**
```
# Solana's ~400ms block time and near-zero fees mean "high frequency" has
# a completely different baseline than Ethereum. A legitimate human user
# might do 5-20 tx/day; a bot or laundering script can do thousands.
tx_per_day = total_txs / account_age_days
score = 0 if tx_per_day < 20 else min(8, log10(tx_per_day / 20) × 5)
```

**1.2 — Priority fee anomaly (0–6 pts)**
```
# Solana's congestion-pricing equivalent to ETH gas anomaly: paying
# abnormally high priority fees to guarantee inclusion ahead of others
# is a front-running/MEV/sandwich signal, same logic as ETH but on
# Solana's priority fee market instead of gas price.
priority_fee_percentile = this_account's avg priority fee vs network distribution
score = min(6, max(0, (priority_fee_percentile - 0.9) × 60))
```

**1.3 — Round SOL/USDC denomination pattern (0–7 pts)**
```
round_tx_ratio = count(txs with value in {1,5,10,50,100,500} SOL or
                        {100,500,1000,5000} USDC, ± 0.5%) / total_txs
score = min(7, round_tx_ratio × 12)
```

**1.4 — Account age vs ATA-aggregate value anomaly (0–8 pts)**
```
# Same "fresh wallet, large value" logic as ETH/BTC, computed across
# the FULL asset surface (native SOL + all ATAs), not just SOL balance —
# this is the check that catches a 2-day-old wallet holding $400k in
# USDC that looks "empty" if you only check native SOL.
account_age_days = (now - rent_exempt_since) / 86400
total_value_usd = sol_balance_usd + Σ(ata_balances_usd)
age_score = max(0, 8 - account_age_days / 3)
value_multiplier = log10(total_value_usd + 1) / 5
score = min(8, age_score × value_multiplier × 2)
```

**1.5 — Burst-then-dormant cycle (0–6 pts)** — same concept as ETH/BTC, computed on full tx history including all linked ATAs.

### Layer 2 — Graph Topology (25%)

**2.1 — Counterparty fan-out, EOA-resolved only (0–8 pts)**
```
# CRITICAL: when computing fan-out, resolve every counterparty TOKEN_ACCOUNT
# back to its owning EOA before counting. A wallet that sends to 50 different
# ATAs but those ATAs are all owned by 3 real wallets has fan-out 3, not 50.
# Skipping this resolution is the most common Solana forensics bug — it
# wildly overstates fan-out for completely normal token transfer patterns.
distinct_eoa_counterparties = count(unique resolved owner EOAs, post-ATA-resolution)
score = min(8, log10(distinct_eoa_counterparties + 1) × 3.5)
```

**2.2 — Hop contamination from known-bad entities (0–9 pts)** — identical decay formula to ETH/BTC, traversed over the EOA-resolved graph:
```
contamination = Σ source_risk × (0.7 ** hop_count), for hop_count <= 3
score = min(9, contamination × 9)
```

**2.3 — Program interaction risk profile (0–6 pts, Solana-specific, no ETH/BTC analog)**
```
# Solana wallets interact with on-chain PROGRAMS far more directly and
# frequently than Ethereum EOAs interact with contracts (composability
# is the default UX). Score based on which program categories this
# wallet's transactions route through:
high_risk_programs = {known_mixer_programs, anonymized_swap_aggregators_with_no_kyc_rails}
score = 6 if interacted_with(high_risk_programs) else
        3 if interacted_with(unverified_unaudited_programs_only) else 0
```

**2.4 — Cross-token wash pattern (0–6 pts)**
```
# Rapid swap-in/swap-out across multiple SPL tokens within the same
# wallet in a short window — a structuring pattern unique to AMM-heavy
# chains, used to obscure the origin token of funds.
swap_chain_depth = count of consecutive token swaps (via Jupiter/Raydium/Orca
                    program calls) within a 10-minute window, same wallet
score = min(6, swap_chain_depth)
```

### Layer 3 — Economic Signals (22%)

**3.1 — Accumulate-then-drain across full ATA set (0–7 pts)** — same formula as ETH/BTC, but `balance` = native SOL + all ATA balances summed at USD value, not SOL alone.

**3.2 — Velocity spike / same-slot pass-through (0–8 pts)**
```
# Solana's equivalent of a flash-loan/pass-through signal: large inflow
# and outflow within the same transaction (Solana transactions can contain
# multiple instructions atomically) or within the same slot.
for tx in account_txs:
    if tx.total_in_usd > threshold and tx.total_out_usd / tx.total_in_usd > 0.9:
        score = max(score, 8)
```

**3.3 — Exchange/CEX cash-out velocity (0–4 pts)** — identical concept to ETH/BTC: time from large inflow to first known-CEX-deposit-address interaction.

**3.4 — Stablecoin-dominant flow ratio (0–3 pts)**
```
# If >80% of this wallet's value movement is in USDC/USDT rather than
# native SOL or other SPL tokens, weight slightly upward — stablecoin-
# dominant wallets are statistically overrepresented in laundering flows
# (price stability removes the "exposure risk" objection to holding funds
# mid-transfer), same logic that motivates Tron's TRC-20 USDT focus below.
score = 3 if stablecoin_ratio > 0.8 else 0
```

### Layer 4 — Attribution Intelligence (15%)

```
4.1 — Direct EOA-level DB match (0–8 pts)
   OFAC SDN (Solana addresses are listed), your corpus, known exchange
   deposit-wallet clusters — match against the resolved EOA, and propagate
   the match to all of that EOA's linked ATAs.

4.2 — Known-program association (0–4 pts)
   has this wallet interacted with a program address that is itself
   flagged (a known mixer program, a sanctioned protocol's contract)?

4.3 — Fuzzy behavioral corpus match (0–3 pts)
   cosine similarity against labeled Solana behavior vectors:
   [tx_per_day, round_tx_ratio, program_risk_category, swap_chain_depth,
    stablecoin_ratio]
```

### Layer 5 — Adversarial AI Verifier (10% — hard ceiling)

```
PROMPT TEMPLATE:

You are a defense attorney for Solana wallet {address} (EOA, {n} linked
token accounts). The algorithmic engine assigned {score}/100 based on:
- L1 behavioral: {l1_score}/28 — fired signals: {l1_reasons}
- L2 graph: {l2_score}/25 — fired signals: {l2_reasons}
- L3 economic: {l3_score}/22 — fired signals: {l3_reasons}
- L4 attribution: {l4_score}/15 — fired signals: {l4_reasons}
- Entity class: {entity_class} (modifier {modifier}×)

Find every LEGITIMATE explanation. Specifically check:
- Is high tx_per_day explained by this being a known MEV/arbitrage bot
  operator (legal, if disclosed business activity) rather than laundering?
- Is "program interaction risk" explained by interacting with a legitimate
  but new/unaudited DeFi protocol during its early, pre-audit period —
  common and not itself evidence of wrongdoing?
- Does swap_chain_depth reflect normal DeFi yield-farming/arbitrage
  behavior rather than wash/obfuscation intent?

Output ONLY JSON:
{ "delta": <-15 to +5>, "confidence": <0.0-1.0>, "mitigations": [...], "upheld_flags": [...] }
If confidence < 0.4, delta = 0.
```

Same hard cap as the BTC/ETH engines: AI cannot move a score across a risk-tier boundary alone (CRITICAL cannot become LOW from L5 alone); strong mitigation gets surfaced to a human reviewer instead of auto-applied.

---

## 3. Entity Class Classifier

| Class | Detection | Modifier |
|---|---|---|
| Known CEX deposit wallet | DB match + high fan-in, regular sweep-out pattern | 0.5× |
| MEV/arbitrage bot (disclosed/known) | Extremely high tx_per_day + tight latency patterns + DB-tagged | 0.6× |
| DAO treasury / multisig (Squads, etc.) | Low tx count, high value, multisig program interaction | 0.6× |
| Market maker | High frequency + tight counterparty set + consistent spread capture | 0.7× |
| Normal EOA | Default | 1.0× |
| Unaudited-protocol-heavy wallet | Majority of program interactions are unverified/new | 1.2× |
| Cross-token wash pattern wallet | L2.4 fires repeatedly across many sessions | 1.3× |
| Confirmed threat actor | DB-confirmed via L4 | 1.5× |

---

## 4. Data requirements (RPC + indexer)

Native Solana JSON-RPC alone is insufficient for forensic-grade history (no easy historical tx search by address beyond signature pagination, no built-in ATA reverse-resolution). Recommended stack:
- **getSignaturesForAddress** + **getTransaction** (native RPC) for raw tx pagination
- An indexer (Helius, QuickNode's enhanced APIs, or SolanaFM/Solscan API) for: ATA discovery per wallet, parsed instruction data (so you don't hand-decode every program's instruction format), and token metadata
- Off-curve check for PDA classification can be done locally with `PublicKey.isOnCurve()` (no RPC call needed) — do this first, it's free and instant, before spending RPC calls on accounts that turn out to be PDAs

---

## 5. Validation targets

| Test case | Expected behavior |
|---|---|
| Wallet holding $200k in USDC via ATA, near-zero native SOL | Full asset surface correctly aggregated; does NOT score as "empty/clean" due to checking SOL balance only |
| Wallet sending to 40 different token accounts, all owned by the same 2 real people | Fan-out resolves to 2, not 40, after ATA owner resolution |
| Legitimate Jupiter-routed multi-hop swap (normal DeFi user) | L2.4 swap_chain_depth fires mildly; L5 AI correctly identifies as normal arbitrage/yield behavior; does not over-escalate to CRITICAL |
| PDA vault address mistakenly queried as if it were a wallet | Classifier correctly flags as PDA before L1 runs; routes to program-level analysis instead of wallet-behavior scoring |
