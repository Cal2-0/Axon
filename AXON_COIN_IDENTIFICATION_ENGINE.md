# AXON — Coin/Chain Identification Engine
### Build prompt for Claude Code / engineering implementation
### Philosophy: same doctrine as the BTC/ETH forensic engines — deterministic math decides, AI only narrates and breaks residual ties. Never let an LLM "guess" a chain from vibes. A wrong chain identification means every downstream forensic query (clustering, scoring, explorer links) is run against the wrong ledger and silently produces garbage.

---

## 0. The core problem you're actually solving

"Identify the coin from a pasted string" is not one problem, it's three, and your current prompt is probably collapsing them into one AI call, which is why it's unreliable:

1. **Syntactic classification** — what address formats is this string *structurally compatible with*? (regex + length + alphabet)
2. **Cryptographic validation** — of the compatible formats, which ones does it *actually pass checksum for*? (this is where most false positives die)
3. **Existential disambiguation** — if it's still valid on more than one chain (this is common, not rare — see §2), which chain(s) does it *actually have activity on*? (requires a live query, not pattern matching)

AI should only ever touch the output of step 3, to summarize and to break a tie when two chains both show activity. If you're asking AI to do step 1 or step 2, that's the bug. Regex and checksum math are 100% deterministic and an LLM will hallucinate edge cases on them.

---

## 1. Pipeline order (non-negotiable)

```
input_string
   → normalize (trim, strip "chain:" prefixes, strip URI schemes like "bitcoin:")
   → STEP 1: syntactic candidate set (regex/length/alphabet match, can return >1 candidate)
   → STEP 2: checksum validation (eliminates candidates that fail crypto validation — usually narrows to 1)
   → STEP 3a: if exactly 1 candidate survives → DONE, confidence = checksum-tier (see §4)
   → STEP 3b: if >1 candidate survives (structurally ambiguous family, e.g. all EVM chains) →
        live existence probe across candidate chains (balance/tx-count via RPC or indexer)
   → STEP 4: AI tie-break ONLY if step 3b returns activity on 2+ chains simultaneously
   → output: {chain, confidence, evidence, explorer_links}
```

Never skip 1→2 to go straight to a "looks like" AI guess. Never let AI override a passed/failed checksum.

---

## 2. Why "100% correct" is the wrong target — and what to say instead

Be precise with whoever you're reporting to: for several address families, **the string alone cannot be 100% attributed**, because the formats are byte-for-byte identical across chains. This isn't a flaw in your engine, it's a property of the address spaces. Your engine's job is to be honest about *which* of these two situations it's in:

- **Deterministically resolvable** (≈100%): version-byte / HRP / checksum makes the chain unique. Example: a Bech32 string with HRP `bc1` cannot also be a valid Litecoin address (LTC uses HRP `ltc1`) — the checksum is computed over the HRP, so cross-chain reuse fails cryptographically, not just visually.
- **Structurally ambiguous, existentially resolvable**: the string is a valid address on N chains simultaneously (most commonly all EVM chains share the exact same `0x` + 20-byte format). Here "which coin" is the wrong question — the honest answer is "this address exists, identically, as a credential on every EVM chain; here's which ones show on-chain activity." Confidence should be reported per-chain-with-activity, not as a single coin label.

Build your UI/output to reflect this distinction explicitly. Forcing a single "100% this coin" answer on an EVM address is the most common credibility-killing bug in amateur forensic tools — a senior reviewer will catch it instantly.

---

## 3. Address family reference table (syntactic layer — Step 1)

| Chain | Format | Regex (illustrative) | Checksum mechanism | Cross-chain collision risk |
|---|---|---|---|---|
| Bitcoin legacy (P2PKH) | `1...` | `^1[1-9A-HJ-NP-Za-km-z]{25,34}$` | Base58Check (version byte 0x00) | None — version byte unique to BTC mainnet |
| Bitcoin P2SH | `3...` | `^3[1-9A-HJ-NP-Za-km-z]{25,34}$` | Base58Check (version byte 0x05) | Shares 0x05 with some legacy alts; verify network magic if available |
| Bitcoin SegWit | `bc1q...` | `^bc1q[02-9ac-hj-np-z]{38,58}$` | Bech32 (HRP `bc`) | None — HRP-bound |
| Bitcoin Taproot | `bc1p...` | `^bc1p[02-9ac-hj-np-z]{58}$` | Bech32m (HRP `bc`) | None |
| Litecoin legacy | `L...`/`M...` | `^[LM][1-9A-HJ-NP-Za-km-z]{26,33}$` | Base58Check (0x30/0x32) | None |
| Litecoin SegWit | `ltc1...` | `^ltc1[02-9ac-hj-np-z]{38,58}$` | Bech32 (HRP `ltc`) | None |
| Dogecoin | `D...` | `^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$` | Base58Check (0x1E) | None |
| Bitcoin Cash (legacy fmt) | `1...`/`3...` | same as BTC | Base58Check | **Collides visually with BTC** — BCH legacy-format addresses are byte-identical to BTC; always prefer CashAddr form |
| Bitcoin Cash (CashAddr) | `bitcoincash:q...` | `^(bitcoincash:)?[qp][a-z0-9]{41}$` | CashAddr checksum (BCH polymod) | Low once prefix present |
| Ethereum + ALL EVM chains | `0x...` | `^0x[0-9a-fA-F]{40}$` | EIP-55 mixed-case checksum (optional — many wallets emit all-lowercase) | **High — identical across Ethereum, BSC, Polygon, Avalanche C-Chain, Arbitrum, Optimism, Base, Fantom, etc.** This is the same key/address on every one of them. Resolvable only by Step 3b. |
| Tron | `T...` | `^T[1-9A-HJ-NP-Za-km-z]{33}$` | Base58Check (0x41) | None |
| Solana | base58, no fixed prefix | `^[1-9A-HJ-NP-Za-km-z]{32,44}$` | Ed25519 pubkey, no checksum byte | Low collision with other base58 chains due to length, but no internal checksum — validate by decode-length (32 bytes) only, confidence capped lower than checksum-bearing chains |
| Ripple/XRP | `r...` | `^r[1-9A-HJ-NP-Za-km-z]{24,34}$` | Base58Check (XRPL alphabet, ripple-specific) | None |
| Cardano (Shelley) | `addr1...` | `^addr1[02-9ac-hj-np-z]{50,103}$` | Bech32 (HRP `addr`) | None |
| Cardano (Byron, legacy) | `Ae2...`/`DdzFF...` | varies | CBOR + CRC32 | None, but legacy — flag as deprecated era |
| Polkadot | `1...` (SS58, generic prefix 0) | `^1[1-9A-HJ-NP-Za-km-z]{46,47}$` | SS58 (Blake2b checksum) | **Collides visually with BTC legacy** — SS58 prefix byte differs but raw string can overlap in shape; always run SS58 checksum, not just regex |
| Kusama | `C.../D.../F...`/etc (SS58 prefix 2) | varies | SS58 | Low |
| Monero | `4...` (standard) / `8...` (subaddress) | `^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$` | Base58 (Monero variant) + integrated checksum | None |
| Stellar | `G...` | `^G[A-Z2-7]{55}$` | Base32 + CRC16 | None |
| Cosmos (and SDK chains) | `cosmos1...`/`osmo1...`/etc | `^[a-z]+1[02-9ac-hj-np-z]{38}$` | Bech32, HRP varies **per chain** | HRP itself disambiguates — treat each Cosmos-SDK chain's HRP as its own family, not one "Cosmos" bucket |
| Algorand | 58-char base32 | `^[A-Z2-7]{58}$` | Internal checksum (last 4 bytes) | Low |

Maintain this as a structured table (JSON/YAML) in code, not hardcoded if/else — you will keep adding chains, and the table format makes Step 1 a single lookup loop instead of a growing chain of regex branches.

---

## 4. Checksum validation tier (Step 2) — this is where confidence numbers come from

Define confidence **only** from what was actually verified, never from "looks right":

| Tier | Condition | Confidence band |
|---|---|---|
| A — Cryptographically confirmed | Address decodes and checksum byte(s) validate against the chain's exact algorithm | 0.97–1.00 |
| B — Structurally valid, no checksum exists for this format | e.g. raw Solana base58 pubkey — correct length and alphabet but the format has no embedded checksum to verify | 0.55–0.70 |
| C — Structurally ambiguous, unresolved | Passes syntax for 2+ chains and existence probe (Step 3b) hasn't run yet or returned no activity on any | 0.30–0.50, must be presented as multi-candidate, never collapsed to one |
| D — Failed all known formats | No regex match, or matched but checksum failed everywhere | 0.0 — report as "unrecognized format," do not force a guess |

**Hard rule:** never let Step 4 (AI) push a Tier C/D result up into Tier A/B confidence language. AI commentary can narrow *which* chain among an already-validated set is most likely active, but it cannot manufacture cryptographic certainty that the math didn't produce. This mirrors the AXON L5 adversarial-verifier rule: AI argues a delta within a capped band, it never overrides the deterministic floor.

---

## 5. Existential disambiguation (Step 3b) — for EVM and other format-colliding families

When Step 2 leaves multiple valid candidates (almost always: an EVM-format address), do not ask an LLM "which chain is this." Query reality:

```
for chain in [ethereum, bsc, polygon, avalanche_c, arbitrum, optimism, base, fantom, ...]:
    result = probe(chain, address)   # tx_count, balance, first_seen via that chain's
                                       # indexer/RPC (Etherscan-family API, or a
                                       # multichain indexer like Covalent/Moralis/Blockscout)
    candidates.append({chain, tx_count, balance, first_seen})

active_chains = [c for c in candidates if c.tx_count > 0 or c.balance > 0]
```

Output policy:
- **0 active chains** → report as "valid EVM-format credential, no on-chain activity detected on probed networks" — do not assign a single coin.
- **1 active chain** → that's your answer, Tier A confidence (existence-confirmed), cite the probe result as evidence, not the regex.
- **2+ active chains** → this is the genuinely correct outcome for a huge number of real addresses (same EOA used on Ethereum mainnet and a few L2s/sidechains). Report all of them ranked by tx_count/recency. This is where Step 4 AI is actually useful: have it write one sentence summarizing the cross-chain footprint ("primarily active on Ethereum mainnet with a single bridging transaction into Base") — pure narration of numbers you already computed, not a fresh judgment call.

For non-EVM ambiguous collisions (BTC-legacy-format vs BCH-legacy-format, SS58 lookalikes), the same probe pattern applies: query both chains' explorers/indexers for tx history rather than guessing from shape.

---

## 6. AI's role — boxed in, same doctrine as your scoring engines

```
PROMPT TEMPLATE (only invoked at Step 4, only when active_chains >= 2,
or when Tier B/C confidence needs a plain-language caveat written for the report):

You are writing one short forensic-report sentence about an address whose
chain identity has ALREADY been determined by deterministic checksum
validation and live on-chain probing — you are not deciding the chain.

Evidence (already computed, do not contradict it):
- candidates: {ranked list of {chain, tx_count, balance, first_seen, confidence_tier}}

Write 1-2 sentences summarizing this for a forensic report. Do not invent
any chain, balance, or activity not present in the evidence. Do not
hedge below the given confidence tier, and do not state higher certainty
than the given tier.

Output ONLY JSON:
{ "summary": "...", "flagged_for_human_review": <bool> }
flagged_for_human_review = true only if active_chains >= 3, or if the
top two candidates' tx_count are within 20% of each other (genuinely
ambiguous primary chain).
```

If you find yourself wanting AI to do anything other than phrase already-computed evidence, that's a sign the deterministic layer is incomplete — fix Step 1–3, don't patch it with a smarter prompt.

---

## 7. Trusted explorer link table (output layer)

Hardcode this. Never let AI generate or guess an explorer URL — a hallucinated explorer domain pointed at a phishing/clone site is a real and embarrassing failure mode for a forensics tool. Build links programmatically from address + chain, off a fixed allowlist:

| Chain | Canonical explorer | URL pattern |
|---|---|---|
| Bitcoin | mempool.space | `https://mempool.space/address/{addr}` |
| Bitcoin (alt) | blockstream.info | `https://blockstream.info/address/{addr}` |
| Ethereum | etherscan.io | `https://etherscan.io/address/{addr}` |
| BSC | bscscan.com | `https://bscscan.com/address/{addr}` |
| Polygon | polygonscan.com | `https://polygonscan.com/address/{addr}` |
| Avalanche C-Chain | snowtrace.io | `https://snowtrace.io/address/{addr}` |
| Arbitrum | arbiscan.io | `https://arbiscan.io/address/{addr}` |
| Optimism | optimistic.etherscan.io | `https://optimistic.etherscan.io/address/{addr}` |
| Base | basescan.org | `https://basescan.org/address/{addr}` |
| Litecoin | blockchair.com/litecoin | `https://blockchair.com/litecoin/address/{addr}` |
| Dogecoin | blockchair.com/dogecoin | `https://blockchair.com/dogecoin/address/{addr}` |
| Bitcoin Cash | blockchair.com/bitcoin-cash | `https://blockchair.com/bitcoin-cash/address/{addr}` |
| Tron | tronscan.org | `https://tronscan.org/#/address/{addr}` |
| Solana | solscan.io | `https://solscan.io/account/{addr}` |
| XRP | xrpscan.com | `https://xrpscan.com/account/{addr}` |
| Cardano | cardanoscan.io | `https://cardanoscan.io/address/{addr}` |
| Polkadot | polkadot.subscan.io | `https://polkadot.subscan.io/account/{addr}` |
| Kusama | kusama.subscan.io | `https://kusama.subscan.io/account/{addr}` |
| Monero | N/A — privacy chain | no public address explorer; do not link a "Monero explorer" claiming to show balance/history, this is a known scam-site pattern |
| Stellar | stellar.expert | `https://stellar.expert/explorer/public/account/{addr}` |
| Cosmos Hub | mintscan.io/cosmos | `https://www.mintscan.io/cosmos/address/{addr}` |
| Algorand | allo.info | `https://allo.info/account/{addr}` |

Add a `verified_domains.json` allowlist file; any explorer link the engine emits must come from this file by chain key, never freeform-constructed by AI text generation.

---

## 8. Output contract (what the UI actually renders)

```json
{
  "input": "0x71C7...",
  "resolution": "multi_chain_active",   // one of: single_deterministic | single_existence_confirmed | multi_chain_active | unresolved_ambiguous | unrecognized
  "candidates": [
    {
      "chain": "ethereum",
      "confidence": 0.99,
      "tier": "A",
      "evidence": ["checksum_valid", "tx_count=4821", "first_seen=2019-03-11"],
      "explorer_url": "https://etherscan.io/address/0x71C7..."
    },
    {
      "chain": "base",
      "confidence": 0.92,
      "tier": "A",
      "evidence": ["checksum_valid", "tx_count=3", "first_seen=2024-08-02"],
      "explorer_url": "https://basescan.org/address/0x71C7..."
    }
  ],
  "ai_summary": "Primarily active on Ethereum mainnet since March 2019, with limited recent activity on Base.",
  "flagged_for_human_review": false
}
```

Never collapse this to a single `"coin": "Ethereum"` field — that's the structure that was making your prompting "not work," because you were asking the model to force a single label onto something that is, correctly, a multi-chain answer.

---

## 9. Validation test set — what "working" looks like

| Test input | Expected resolution |
|---|---|
| `bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq` | single_deterministic, Bitcoin, tier A — Bech32 HRP `bc` is unambiguous |
| `LQ3JQvfXoGwGzPGbVMVm3vKt5xdKL5XbVz`-style L-address | single_deterministic, Litecoin, tier A |
| A real Vitalik-style `0x...` EOA address known to be active on Ethereum + Polygon + Arbitrum | multi_chain_active, 3 candidates ranked by tx_count, flagged_for_human_review only if top two are close |
| A freshly generated, never-broadcast `0x...` keypair | resolution = unresolved_ambiguous or "valid format, zero activity on all probed chains" — must NOT confidently claim "Ethereum" with no evidence |
| A string that's valid Base58Check but with a checksum that fails on every known version byte | unrecognized, tier D, confidence 0 — must not let AI rescue this with a guess |
| An SS58 Polkadot address that visually resembles BTC legacy format | single_deterministic, Polkadot, tier A — proves checksum layer (not regex shape) is doing the real work |
