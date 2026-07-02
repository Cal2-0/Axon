# AXON — Bitcoin Forensic Risk Engine Specification
### Build prompt for Claude Code / engineering implementation
### Philosophy: 95% deterministic math, 5% AI adversarial judgment — same doctrine as the AXON Ethereum 5-Layer Engine. The database is confirmation, not proof. The math must independently arrive at the verdict.

---

## 0. The non-negotiable architectural rule

**Bitcoin has no wallets on-chain. It only has addresses. Do not score addresses as if they were entities.**

A single real-world actor routinely controls 10–500+ Bitcoin addresses through HD wallet derivation (BIP32/44/84). If you score raw addresses, a launderer who rotates through 40 receiving addresses will show up as 40 separate "low volume, low risk" addresses instead of one entity moving the real aggregate amount. This is the single most common and most severe Bitcoin forensics error, and it is the reason naive BTC tools fail. **Entity resolution (clustering) must run BEFORE scoring, never after.**

This changes the pipeline order versus the Ethereum engine:

```
ETH:  address → scan txs → score directly
BTC:  address → scan txs → CLUSTER into entity → aggregate cluster txs → score the entity
```

---

## 1. Entity Resolution Layer (Pre-Step — runs before L1)

This is not optional and not part of the weighted score. It is infrastructure every layer depends on.

### 1.1 Common-Input-Ownership Heuristic (near-certain, not probabilistic)

A Bitcoin transaction is cryptographically invalid unless every input address has signed it with its own private key. Therefore:

```
RULE: If addresses {A, B, C, ...} all appear as INPUTS to the same transaction,
      they are controlled by the same entity. This is deterministic, not a guess.

implementation:
  build a graph where every address is a node
  for each transaction: add an edge between every pair of input addresses
  run union-find (disjoint set) over this graph
  each connected component = one entity
```

**Exception to flag, not ignore:** CoinJoin transactions (Wasabi, Samourai/Whirlpool, JoinMarket) deliberately combine inputs from many unrelated parties into one transaction specifically to break this heuristic. Detect CoinJoin patterns (see L1.4) and **exclude those transactions from the union-find graph entirely** — applying common-input-ownership inside a CoinJoin produces false entity merges and is a known failure mode of inferior tools.

### 1.2 Change-Address Detection (probabilistic, confidence-scored)

Each non-CoinJoin transaction with 2 outputs typically sends one to the payee and returns "change" to the sender. Identifying the change output extends the entity graph forward in time.

Score each output as a change-candidate using these signals (combine as weighted heuristics, not a hard rule):

| Signal | Logic | Weight |
|---|---|---|
| **Address freshness** | Change output address has zero prior transaction history; payment address often does too, but a *brand new* address paired with an *old, reused* address strongly suggests the new one is change | 0.30 |
| **Script-type matching** | Change typically matches the address type of the inputs (Bech32 inputs → Bech32 change is common); a mismatched type is more likely the actual payment | 0.25 |
| **Round-number test** | The output that is NOT a round number (e.g. not exactly 0.5 BTC, 1 BTC) is more likely change; payments are often round, change is whatever's left over | 0.20 |
| **No-reuse heuristic** | If one output address has been used as an output in a previous transaction by this same entity, it's more likely the payment (recipient reused) and the never-seen one is change | 0.25 |

```
change_confidence = Σ(signal_weight × signal_fired)
if change_confidence >= 0.6:
    add edge: sender_entity ↔ change_output_address (extends the cluster forward)
```

Store `change_confidence` on the edge. Layers below should weight contributions from low-confidence extensions less than from common-input-ownership edges (which are confidence 1.0).

### 1.3 Entity object

```
Entity {
  entity_id: cluster hash
  member_addresses: [list, with role: input_only | change | mixed]
  confidence: weighted avg of all edges (1.0 if pure common-input clusters)
  first_seen: earliest tx across all member addresses
  last_seen: latest tx across all member addresses
  total_received_btc, total_sent_btc: aggregated, NOT per-address
}
```

**Every layer below operates on the Entity's aggregated transaction set, never on a single address's transactions in isolation**, unless the entity has only one member address.

### 1.4 CoinJoin detection (feeds both clustering exclusion and L1 scoring)

```
CoinJoin signature:
  - N inputs ≈ N outputs (within small variance), N >= 5
  - Multiple outputs of IDENTICAL value (the "equal output" denomination,
    e.g. 8 outputs all exactly 0.1 BTC) — this is the core Wasabi/JoinMarket fingerprint
  - Inputs sourced from many distinct, historically-unrelated addresses

is_coinjoin = (equal_output_count / total_outputs >= 0.6) AND (input_count >= 5)
```

---

## 2. The Five Layers (apply to the resolved Entity, not raw address)

```
BTC_FORENSIC_SCORE = (
    L1_behavioral   × 0.30 +
    L2_graph        × 0.25 +
    L3_economic     × 0.20 +
    L4_attribution  × 0.15 +
    L5_ai_delta     × 0.10
) × entity_class_modifier
```

Same weight distribution as the Ethereum engine — keep the doctrine consistent across chains so case management and cross-chain correlation can compare scores meaningfully. Signal definitions below are reworked for UTXO mechanics; do not reuse the Ethereum signal formulas verbatim, they assume an account model.

### Layer 1 — Behavioral Telemetry (30%) — all derived from the Entity's aggregated UTXO history

**1.1 — UTXO consolidation/fragmentation rhythm (0–8 pts)**
```
fragmentation_ratio = count(outputs_per_tx > 10) / total_txs
# Heavy fragmentation (many small outputs per tx) = mixing prep or distribution to mules
consolidation_ratio = count(inputs_per_tx > 10) / total_txs
# Heavy consolidation (sweeping many UTXOs into one) = often precedes a large cash-out
score = min(8, (fragmentation_ratio + consolidation_ratio) × 8)
```

**1.2 — Equal-output (CoinJoin / structuring) ratio (0–9 pts)**
```
# The strongest single BTC mixer signal — directly reuses 1.4 detection
score = 9 if is_coinjoin else (equal_output_count / total_outputs) × 9
```

**1.3 — Address reuse discipline (0–6 pts)**
```
# Privacy-conscious actors (often illicit) NEVER reuse an address.
# Naive/legitimate users frequently do.
reuse_rate = count(addresses_used_more_than_once) / count(unique_addresses)
score = max(0, (0.15 - reuse_rate) / 0.15) × 6
# reuse_rate near 0 → near-max score (suspicious discipline)
# reuse_rate > 0.15 → 0 (normal user behavior)
```

**1.4 — Dormancy-then-spike (0–7 pts)** — identical concept to ETH L1, computed on entity-level tx timestamps:
```
longest_gap_days = max(gap between consecutive entity transactions)
if longest_gap_days > 180 and post_gap_volume > 10x pre_gap_average:
    score = 7
```

**1.5 — Round-BTC-denomination pattern (0–5 pts)**
```
# Distinct from equal-output ratio: this checks for repeated use of
# "clean" round amounts (0.1, 0.5, 1.0, 5.0 BTC) across DIFFERENT transactions,
# a known structuring/services-pricing fingerprint (e.g. darknet market fee tiers)
round_tx_ratio = count(txs with value in {0.1,0.25,0.5,1,5,10} ± 0.5%) / total_txs
score = min(5, round_tx_ratio × 10)
```

### Layer 2 — Graph Topology (25%) — operates on the entity-to-entity graph, not address-to-address

**2.1 — Entity fan-out (0–8 pts)**
```
distinct_counterparty_entities = count of OTHER resolved entities this entity transacted with
# Note: must be resolved entities, not raw addresses, or a single counterparty
# wallet with 50 addresses will inflate fan-out 50x — this is the most common
# scoring bug in BTC tools that skip step 1.
score = min(8, log10(distinct_counterparty_entities + 1) × 3.5)
```

**2.2 — Hop contamination from known-bad entities (0–9 pts)** — same decay formula as ETH, but traversal is over the entity graph:
```
for each known_bad_entity in corpus:
    hop = shortest_path(this_entity, known_bad_entity, max_hops=3)
    if hop <= 3:
        contamination += known_bad_entity.risk × (0.7 ** hop)
score = min(9, contamination × 9)
```

**2.3 — Peel chain detection (0–8 pts)** — the single most important BTC-specific graph signal, has no clean ETH analog:
```
# A peel chain: entity A sends most value to address X, small "peeled off"
# remainder to address Y (which is actually A's own change). X then repeats
# the same pattern downstream. This is THE classic large-sum laundering
# topology on Bitcoin (used to slowly funnel large illicit sums toward exchanges).
peel_chain_depth = count of consecutive hops where:
    - output_split ratio (large_output / small_output) > 5
    - the small output is later identified as change (re-enters same entity graph)
    - this repeats across >= 3 consecutive transactions
score = min(8, peel_chain_depth × 2)
```

**2.4 — Mixer/Tumbler service interaction (0–5 pts)**
```
# Direct interaction with known mixer entities (Wasabi coordinator addresses,
# ChipMixer historical clusters, etc.) OR indirect via CoinJoin participation
score = 5 if direct_mixer_interaction else (3 if participated_in_coinjoin else 0)
```

### Layer 3 — Economic Signals (20%)

**3.1 — Accumulate-then-drain (0–7 pts)** — identical concept to ETH, computed on entity-aggregated balance history (sum of unspent outputs over time):
```
peak_balance = max(historical entity UTXO sum)
current_balance = current entity UTXO sum
drain_ratio = (peak_balance - current_balance) / peak_balance
if drain_ratio > 0.8 and days_since_peak < 30: score = 7
```

**3.2 — Exchange cash-out velocity (0–6 pts)**
```
# Time from entity's first large inflow to first interaction with a
# known exchange deposit-address cluster. Fast cash-out after a large
# inflow (esp. post-exploit) is a strong laundering urgency signal.
time_to_exchange_hours = first_exchange_interaction_ts - large_inflow_ts
score = 6 if time_to_exchange_hours < 24 else (3 if < 72 else 0)
```

**3.3 — Velocity spike / same-block pass-through (0–7 pts)**
```
# UTXO equivalent of a flash-loan pattern: large inflow and large outflow
# within the same transaction or immediately consecutive transactions —
# this entity is a pass-through/mule, not a destination.
for tx in entity_txs:
    if tx.total_in > threshold and tx.total_out / tx.total_in > 0.9:
        score = max(score, 7)
```

**3.4 — Lightning Network channel anomalies (0–4 pts, optional if LN data available)**
```
# Rapid open-then-force-close channel patterns, or channels opened with
# funds fresh from a known-bad entity, are an emerging laundering vector
# that most BTC forensics tools currently ignore entirely — include if
# your data source surfaces LN channel events.
```

### Layer 4 — Attribution Intelligence (15%)

```
4.1 — Direct entity-level DB match (0–8 pts)
   match against OFAC SDN (BTC addresses ARE listed individually),
   your corpus, known exchange/mixer/darknet-market cluster databases
   IMPORTANT: match at the ENTITY level (any member address matching = entity matches),
   not per-address, or rotated addresses evade detection trivially.

4.2 — Darknet market / known-service fuzzy match (0–7 pts)
   behavior-vector similarity against labeled darknet market deposit
   clusters (payment amount patterns, posting cadence) — same fuzzy
   cosine-similarity approach as the ETH corpus matcher, applied to
   BTC-specific behavior vectors: [round_tx_ratio, reuse_rate,
   coinjoin_participation_rate, avg_peel_chain_depth, fan_out]
```

### Layer 5 — Adversarial AI Verifier (10% — hard ceiling, not negotiable)

**This is the only layer where AI participates. It does not score. It only argues for a downward correction.**

```
PROMPT TEMPLATE:

You are a defense attorney for Bitcoin entity {entity_id} (cluster of
{n} addresses). The algorithmic engine assigned {score}/100 based on:
- L1 behavioral: {l1_score}/30 — fired signals: {l1_reasons}
- L2 graph: {l2_score}/25 — fired signals: {l2_reasons}
- L3 economic: {l3_score}/20 — fired signals: {l3_reasons}
- L4 attribution: {l4_score}/15 — fired signals: {l4_reasons}
- Entity class: {entity_class} (modifier {modifier}×)

Find every LEGITIMATE explanation for these signals. Specifically check:
- Is "no address reuse" explained by this being a modern privacy-respecting
  wallet (Sparrow, BlueWallet) used by an ordinary privacy-conscious user,
  not necessarily illicit?
- Is CoinJoin participation explained by general-purpose privacy tools
  (Wasabi/Samourai) now used by many non-criminal privacy advocates,
  rather than confirmed laundering intent?
- Does the entity_class (exchange / custodial service) make fan-out and
  consolidation patterns expected rather than suspicious?

Output ONLY JSON:
{
  "delta": <integer, -15 to +5>,
  "confidence": <float 0.0-1.0>,
  "mitigations": [...],
  "upheld_flags": [...]
}
If confidence < 0.4, delta MUST be 0 — the algorithmic score stands unchallenged.
```

**Hard rule, mirrors the ETH engine's "honeypot can't be LOW" principle:** the AI delta is capped at ±15 maximum movement and CANNOT move a score across a risk-tier boundary by itself (e.g. cannot take a CRITICAL 82 down to a LOW 19; max single-layer movement keeps CRITICAL entities at minimum HIGH). If the AI's mitigation is strong enough to argue for more than that, it should be surfaced to a human analyst as a flagged review item, not auto-applied.

---

## 3. Entity Class Classifier (pre-step, same role as ETH's modifier table)

| Class | Detection | Modifier |
|---|---|---|
| Known exchange custodial cluster | DB match + high fan-in/fan-out + frequent consolidation | 0.5× |
| Mining pool payout cluster | Extremely regular small payouts to many addresses, near-zero fan-in diversity | 0.6× |
| Lightning Network service node | High channel-open frequency, low on-chain tx count relative to volume | 0.7× |
| Normal entity | Default | 1.0× |
| CoinJoin/mixer participant | Detected via 1.4, no other strong signals | 1.2× |
| Privacy-service operator (coordinator) | Repeated CoinJoin coordination role across many rounds | 1.4× |
| Confirmed darknet market / ransomware cluster | DB-confirmed via L4 | 1.5× |

---

## 4. Data requirements from Bitquery (GraphQL)

The implementation needs, per address/entity:
- Full input/output list per transaction (for union-find clustering) — `inputs { inputAddress } outputs { outputAddress, value }`
- Address first-seen / tx-count (for change-address freshness signal)
- Historical balance snapshots (for accumulate-then-drain)
- Script type per address (P2PKH/P2SH/Bech32) for change-matching heuristic

Cache the resolved entity graph — re-running union-find from scratch on every scan is wasteful; persist `entity_id` per address once resolved and only extend the graph with new transactions on re-scan.

---

## 5. What "correct" looks like — validation targets

| Test case | Expected behavior |
|---|---|
| A known exchange hot wallet's 200 rotating deposit addresses | All 200 resolve to ONE entity via common-input-ownership; entity scores LOW with exchange modifier, not 200 separate "clean" addresses |
| A CoinJoin round with 8 unrelated participants | Engine does NOT merge all 8 into one entity; CoinJoin tx excluded from union-find; each participant's pre/post-CoinJoin addresses still correctly cluster to their own respective entities |
| A darknet market that peels funds through 6 hops to an exchange | L2.3 peel chain detection fires by hop 3; L4 fuzzy match confirms by hop 5; entity scores CRITICAL before any exchange interaction even occurs |
| A privacy-conscious but legitimate user with zero address reuse, occasional CoinJoin use, no DB hits | L1.3 and L2.4 fire moderately; L5 AI mitigates citing privacy-tool prevalence; final score lands MEDIUM, not CRITICAL — this is the calibration check that proves the engine isn't just "privacy = guilty" |
