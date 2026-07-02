# AXON — Tron Forensic Risk Engine Specification
### Build prompt for Claude Code / engineering implementation
### Philosophy: ~93% deterministic math, ~7% AI adversarial judgment. The database is confirmation, not proof.

---

## 0. The non-negotiable architectural rule

**On Tron, the asset that matters most for forensics is almost never native TRX. It's TRC-20 USDT.** Tron is the dominant rail for real-world USDT movement globally — a large share of actual crime-adjacent stablecoin flow (darknet markets, pig-butchering scam proceeds, sanctions evasion) runs on Tron specifically *because* fees are near-zero and KYC-free on/off-ramps exist in higher numbers than on Ethereum. **If your engine scores native TRX balance/activity and treats TRC-20 USDT as a secondary "token holdings" tab, you are scoring the wrong asset for the majority of real Tron forensic cases.**

```
RULE: TRC-20 token transfer events (especially USDT: contract
TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t) are FIRST-CLASS data for every layer
below, not an afterthought. Pull TRC-20 Transfer events with the same
priority as native TRX transactions, and weight USDT volume into every
volume-based signal alongside TRX.
```

**Second rule: Tron's resource model (Bandwidth and Energy) is itself a forensic signal, not noise to filter out.** Tron transactions consume Bandwidth (for the tx itself) and Energy (for smart contract execution, e.g. a TRC-20 transfer). Accounts can either burn TRX to pay for these, or **freeze TRX for resources** (stake-like mechanism) to get them for free. A wallet's resource-acquisition strategy reveals operational sophistication:

```
- An account that freezes TRX specifically to get free Energy for repeated
  USDT transfers is optimizing for high-volume, low-cost movement — this
  is a meaningful sophistication signal (see L1.3) that has no equivalent
  on Ethereum or Solana, where there's no "stake-for-free-gas" mechanism.
- Energy-rental services exist on Tron specifically so launderers can move
  USDT without ever holding/freezing TRX themselves — renting energy from
  a third party to move funds is itself worth detecting (see L2.4).
```

---

## 1. Pre-Step: Asset Surface Resolution

```
Account {
  address: Tron base58 address (starts with 'T', 34 chars)
  trx_balance: native TRX
  trc20_balances: {contract_address: balance}, MUST include USDT, USDC at minimum
  resource_model: { frozen_trx_for_bandwidth, frozen_trx_for_energy,
                     energy_rented_in, energy_rented_out }
  account_age: first tx timestamp
}
```

Pull both TRX-native transfers AND TRC-20 Transfer events for this address before any layer runs. Aggregate volume signals (L1, L3) must use USD-normalized value across BOTH asset types combined, not TRX alone.

---

## 2. The Five Layers

```
TRX_FORENSIC_SCORE = (
    L1_behavioral   × 0.28 +
    L2_graph        × 0.24 +
    L3_economic      × 0.23 +
    L4_attribution  × 0.15 +
    L5_ai_delta     × 0.10
) × entity_class_modifier
```

L3 weighted slightly above the ETH baseline (23% vs 20%) for the same structural reason as Solana: near-zero fees remove the cost-deterrence that naturally limits structuring/layering frequency on Ethereum, making volume/velocity patterns more discriminating here.

### Layer 1 — Behavioral Telemetry (28%)

**1.1 — TRC-20 USDT transfer rhythm (0–9 pts)** — the single highest-weighted individual signal in this engine, because it's the dominant real-world laundering rail on this chain:
```
usdt_round_ratio = count(USDT transfers in {100,500,1000,5000,10000,50000} ± 0.5%) / total_usdt_transfers
usdt_regularity = 1 - coefficient_of_variation(inter_transfer_time_deltas)
score = min(9, (usdt_round_ratio × 5) + (usdt_regularity × 4))
```

**1.2 — Resource acquisition sophistication (0–6 pts, Tron-specific, no analog elsewhere)**
```
# Freezing TRX for Energy specifically to enable repeated free USDT
# transfers is an operational-sophistication signal: casual/legitimate
# users typically just burn TRX per-transaction; operators running
# sustained transfer campaigns optimize cost via freezing or energy rental.
uses_frozen_energy = frozen_trx_for_energy > 0
uses_rented_energy = energy_rented_in_events > 5  # repeated rentals, not one-off
score = (4 if uses_frozen_energy else 0) + (2 if uses_rented_energy else 0)
```

**1.3 — Account age vs combined asset value anomaly (0–8 pts)** — same logic as ETH/BTC/SOL, computed on TRX + USDT combined USD value:
```
account_age_days = (now - first_tx_ts) / 86400
total_value_usd = trx_balance_usd + Σ(trc20_balances_usd)
age_score = max(0, 8 - account_age_days / 5)
value_multiplier = log10(total_value_usd + 1) / 5
score = min(8, age_score × value_multiplier × 2)
```

**1.4 — Burst-then-dormant cycle (0–5 pts)** — same concept as other chains, computed on combined TRX+TRC-20 activity timeline.

### Layer 2 — Graph Topology (24%)

**2.1 — Counterparty fan-out, TRC-20-inclusive (0–8 pts)**
```
# Must count distinct counterparties across BOTH native TRX sends AND
# TRC-20 transfer events. A wallet with low TRX fan-out but massive USDT
# fan-out is still a high fan-out entity — scoring TRX-only undercounts
# the real distribution pattern.
distinct_counterparties = unique(trx_counterparties ∪ usdt_counterparties ∪ other_trc20_counterparties)
score = min(8, log10(distinct_counterparties + 1) × 3.5)
```

**2.2 — Hop contamination from known-bad entities (0–9 pts)** — same decay formula as all other chain engines:
```
contamination = Σ source_risk × (0.7 ** hop_count), for hop_count <= 3
score = min(9, contamination × 9)
```

**2.3 — Peel chain / layering depth across USDT (0–7 pts)**
```
# Same conceptual pattern as Bitcoin's peel chain (2.3 in BTC spec), but
# applied to TRC-20 transfer chains: large USDT amount in, smaller "peeled"
# amount sent onward repeatedly across consecutive hops, common in
# pig-butchering scam fund consolidation chains specifically on Tron.
peel_depth = count of consecutive hops where output_split_ratio > 4,
             tracked across USDT Transfer events specifically
score = min(7, peel_depth × 2)
```

**2.4 — Energy-rental marketplace interaction (0–5 pts, Tron-specific)**
```
# Renting energy from a third-party energy marketplace (rather than
# freezing one's own TRX) lets an operator move large USDT volume while
# keeping minimal TRX exposure/footprint — a known operational pattern
# for high-volume, fast-turnover laundering operations.
score = 5 if frequent_energy_rental_from_marketplace_contracts else 0
```

### Layer 3 — Economic Signals (23%)

**3.1 — Accumulate-then-drain across TRX+USDT (0–7 pts)** — same formula as other chains, on combined balance history.

**3.2 — Exchange cash-out velocity (0–6 pts)**
```
# Tron has a dense landscape of CEX hot wallets directly reachable —
# time from large inflow to first known-CEX-deposit interaction.
time_to_exchange_hours = first_exchange_interaction_ts - large_inflow_ts
score = 6 if time_to_exchange_hours < 12 else (3 if < 48 else 0)
# Tighter thresholds than ETH/BTC/SOL specs — Tron's near-zero fees and
# fast finality make rapid cash-out operationally easier here, so the
# "fast" threshold for genuine suspicion is correspondingly tighter.
```

**3.3 — Velocity spike / same-block pass-through (0–6 pts)** — identical pattern to other chain engines, computed across combined TRX+USDT in/out within the same or immediately consecutive transactions.

**3.4 — Cross-chain bridge-out signal (0–4 pts)**
```
# Tron frequently serves as a layering hop before bridging USDT to
# Ethereum or BSC (via official or third-party bridges) specifically to
# break the audit trail across chains. Detect interaction with known
# bridge contract addresses as a moderate signal, especially when
# immediately following a large unexplained inflow.
score = 4 if bridge_interaction_within_24h_of_large_inflow else 0
```

### Layer 4 — Attribution Intelligence (15%)

```
4.1 — Direct address-level DB match (0–8 pts)
   OFAC SDN, your corpus, known darknet-market/pig-butchering-scam
   cluster databases — Tron-specific threat intel sources matter here
   more than on other chains given the scam-proceeds concentration.

4.2 — Known energy-marketplace / mixer-adjacent service match (0–4 pts)
   interaction with flagged energy rental services or Tron-native mixing
   services (less mature than ETH mixers, but a growing category).

4.3 — Fuzzy behavioral corpus match (0–3 pts)
   cosine similarity against labeled Tron behavior vectors:
   [usdt_round_ratio, resource_sophistication_score, fan_out,
    peel_depth, bridge_interaction_rate]
```

### Layer 5 — Adversarial AI Verifier (10% — hard ceiling)

```
PROMPT TEMPLATE:

You are a defense attorney for Tron address {address}. The algorithmic
engine assigned {score}/100 based on:
- L1 behavioral: {l1_score}/28 — fired signals: {l1_reasons}
- L2 graph: {l2_score}/24 — fired signals: {l2_reasons}
- L3 economic: {l3_score}/23 — fired signals: {l3_reasons}
- L4 attribution: {l4_score}/15 — fired signals: {l4_reasons}
- Entity class: {entity_class} (modifier {modifier}×)

Find every LEGITIMATE explanation. Specifically check:
- Is "resource acquisition sophistication" (frozen TRX / rented energy)
  explained by this being a legitimate high-volume business (payroll
  service, exchange-adjacent payment processor) rather than a laundering
  operation? Frozen-energy usage alone is common among legitimate
  high-throughput TRC-20 senders.
- Is fast exchange cash-out explained by this being a known liquidity
  provider or OTC desk with routine high-velocity flow, rather than
  urgent post-exploit laundering?
- Does bridge interaction reflect normal cross-chain arbitrage/portfolio
  management rather than audit-trail evasion?

Output ONLY JSON:
{ "delta": <-15 to +5>, "confidence": <0.0-1.0>, "mitigations": [...], "upheld_flags": [...] }
If confidence < 0.4, delta = 0.
```

Same hard cap as all other chain engines: AI cannot move a score across a risk-tier boundary alone; strong mitigation gets surfaced for human review instead of auto-applied.

---

## 3. Entity Class Classifier

| Class | Detection | Modifier |
|---|---|---|
| Known CEX hot wallet | DB match + very high fan-in/out, frequent sweeps | 0.5× |
| Payment processor / payroll service | High frequency, consistent recipient set, regular cadence, frozen-energy use | 0.6× |
| OTC desk / liquidity provider | High velocity, tight bid/ask-like counterparty pattern | 0.7× |
| Normal EOA | Default | 1.0× |
| Heavy energy-rental user, no other flags | L2.4 fires alone | 1.1× |
| USDT structuring pattern wallet | L1.1 + L2.3 fire together | 1.3× |
| Confirmed pig-butchering / darknet cluster | DB-confirmed via L4 | 1.5× |

---

## 4. Data requirements

- **TronGrid API** (official, free tier available) for native TRX transactions and account resource data
- **TronGrid TRC-20 transfer event endpoint** (`/v1/accounts/{address}/transactions/trc20`) — pull this with equal priority to native tx history, not as a secondary call
- Resource data (`getaccountresource` via TronGrid) for L1.2 frozen-energy detection
- A maintained list of TRC-20 contract addresses to track beyond USDT (USDC-Tron, and any chain-specific stablecoins relevant to your corpus) — hardcode the major ones, don't rely on auto-discovery alone since dust/spam tokens will pollute the signal otherwise

---

## 5. Validation targets

| Test case | Expected behavior |
|---|---|
| Wallet with near-zero TRX, $500k in USDT volume over 30 days | Scores based on combined asset value, not flagged as "low activity" due to TRX-only inspection |
| Legitimate payroll wallet sending fixed USDT amounts to 200 employees biweekly | L1.1 round-ratio fires moderately but entity classifier catches the regular cadence + consistent recipient set, applies 0.6× modifier, lands LOW-MEDIUM not HIGH |
| Pig-butchering scam consolidation wallet, USDT peeled through 5 hops to an exchange | L2.3 peel-depth fires by hop 3, L3.2 fast cash-out fires at the exchange hop, L4 fuzzy match likely confirms — CRITICAL before any DB exact-match needed |
| Wallet using rented energy for one-off small transfer | L2.4 alone doesn't escalate to HIGH — frequency threshold in 2.4 requires repeated/marketplace-pattern rental, not a single rental event |
