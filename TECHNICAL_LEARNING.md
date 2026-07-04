# AXON: The Mathematical 5-Stage Analytical Engine (Technical Deep-Dive)

AXON is an advanced behavioral forensics tool designed to identify on-chain threats dynamically by observing how wallets and contracts act, rather than relying solely on static, known-bad blocklists. 

At the core of the system is a proprietary **5-Stage Mathematical Analytical Engine**. This document explains the internal mechanisms, the cross-chain intelligence routing, and the evidence-based presentation layer (PDF Generation).

---

## 1. The Core Analytical Engine (The 5-Stage Mathematical Model)

When a wallet address is submitted, AXON retrieves the transaction history, current balances, and raw on-chain data. It passes this data through a rigid 5-axis scoring model. Each axis (`A1` through `A5`) evaluates a completely different behavioral vector. The maximum score per axis varies based on its forensic severity, culminating in a maximum composite score of **100**.

### Axis 1 (A1): Temporal Anomaly Assessment (Max 20 Points)
- **Goal:** Detect programmatic bursts, sybil behavior, or immediate liquidation.
- **Logic:** AXON evaluates the overall age of the wallet versus its transaction density. A wallet that executes a massive volume of transactions within seconds or minutes of its very first transaction is highly indicative of an automated script, flash loan exploit, or zero-day liquidation.

### Axis 2 (A2): Fund Velocity & Liquidation Vector (Max 30 Points)
- **Goal:** Track the speed and direction of funds leaving the wallet.
- **Logic:** The engine monitors for immediate dispersal patterns. If funds flow into the wallet and are instantly distributed outward into dozens of different addresses (peel chains), or immediately bridged to other chains to sever the trace, A2 triggers massive penalties. Cross-chain bridging (hopping networks to lose trackers) heavily impacts this axis.

### Axis 3 (A3): Counterparty Network Toxicity (Max 20 Points)
- **Goal:** Measure the company the wallet keeps.
- **Logic:** AXON maps the immediate graph of interacting wallets. It cross-references these counterparties against the Threat Intelligence Corpus and known attack patterns. If the subject interacts heavily with known exploiters, sanctioned entities, or high-risk protocols, the "toxicity" of the wallet increases through guilt-by-association heuristics.

### Axis 4 (A4): Mixer & Privacy Protocol Exposure (Max 20 Points)
- **Goal:** Identify intentional obfuscation.
- **Logic:** The engine scans all incoming and outgoing flows for direct or indirect interactions with mixers (like Tornado Cash, Sinbad, or Blender). The penalty scales linearly with the proportion of the wallet's total volume that was routed through these obfuscation protocols. Direct mixer inflow guarantees a near-max penalty on this axis.

### Axis 5 (A5): Active Threat Intelligence (Max 10 Points)
- **Goal:** Layer standard deterministic intelligence on top of behavioral anomalies.
- **Logic:** If the wallet directly hits an active flag in the AXON Threat Corpus or third-party intelligence layers (like Forta Network alerts for malicious smart contracts), it receives an immediate flat penalty. 

### Composite Scoring & Confidence Intervals
The final **AXON Threat Indicator** score is the sum of `A1 + A2 + A3 + A4 + A5`.
A penalty curve based on **data availability** establishes the confidence of this score. If the wallet only has 2 transactions, the confidence is severely reduced compared to a wallet with 1,000 transactions, preventing false positives on idle wallets.

---

## 2. Multi-Architecture Blockchain Detection (Cross-Chain Engine)

AXON operates as a universal scanner. The `cross_chain.py` module acts as a routing engine that automatically identifies which blockchain architecture a subject belongs to.

- **EVM (Ethereum / L2s):** Identifies 42-character `0x` strings. Axon inherently queries Ethereum, Binance Smart Chain, Polygon, Arbitrum, Optimism, Avalanche, and Base.
- **Bitcoin (BTC):** Identifies `1`, `3`, or `bc1` prefixes.
- **Solana (SOL):** Identifies Base58 encoded addresses (approx 44 characters).
- **Tron (TRX):** Identifies `T` prefixed 34-character strings.

This routing engine instantly queries the appropriate nodes and automatically resolves the correct block explorer URLs (Etherscan, Solscan, Tronscan, Blockchain.com) to embed natively into the PDF reports, saving investigators from manual cross-referencing.

---

## 3. The Contract & Bulk Processing Modules

### Smart Contract Forensic Audit
When the cross-chain router identifies that an EVM address holds bytecode (`wt == "Contract"`), AXON bypasses the standard Wallet Engine and initiates a **Contract Scan**.
1. **Static Analysis (Slither Simulation):** Scans the raw Solidity source code for vulnerabilities (reentrancy, self-destructs, tx.origin bypasses).
2. **GoPlus Labs Integration:** Interfaces with live protocol-level security checks to detect hidden minting functions, honey-pots, and admin backdoors.
3. **4-Byte Signature Decoding:** If a contract is unverified (no source code or ABI), AXON analyzes historical transactions, extracts the raw 4-byte interaction hashes, and queries `api.openchain.xyz` to brute-force the hidden functions the contract executes.

### Bulk Intelligence Processing
AXON supports asynchronous bulk queries for institutional compliance teams. It queues an array of addresses, processes them through the 5-Stage Mathematical Engine in parallel, and returns a high-level **Batch Intelligence Summary**, highlighting only the most critical threats in the dataset.

---

## 4. Evidence Presentation Layer (The 12-Section PDF Engine)

AXON utilizes a massive `reportlab` generation script (`report_generator.py`) designed strictly for legal/forensic use.

### The Canonical Rules
1. **No Empty Shells:** If an investigative section returns empty or missing data, the PDF engine gracefully omits the section entirely. You will never see "Data Pending" or `{}` in a final report.
2. **Evidence Integrity:** Every single PDF begins with a cryptographic SHA-256 hash. If a single pixel or character of the PDF is altered post-generation, the hash fails, preventing evidence tampering in a court setting.
3. **Template Rigidity:** 
   - Wallets always output a **12-Section** report (Activity Velocity, Fund Flow, Timeline Reconstruction, Exchange Subpoena Targets, etc.).
   - Contracts always output a **9-Section** report (Code Intelligence, Protocol Security, High-Risk Interactees, etc.).
   - Bulk Batches always output an **8-Section** report.

By combining deep behavioral mathematics, automatic cross-chain routing, and legally sound evidence presentation, AXON represents the bleeding edge of blockchain DFIR tools.

---

## 5. Address Intelligence Engine (Wallet Investigation)

This section documents the **Address Intelligence** redesign — replacing the old "Which Coin?" / "AI Coin Identification" flow with a forensic-grade, two-tier identification pipeline.

### 5.1 Problem We Solved

The old UI felt like ChatGPT:

```
Which Coin? → AI Coin Identification → Confidence 78% → Analytical Summary
```

Investigators don't want AI to **guess** which blockchain an address belongs to. They want AXON to **identify** it — deterministically, from the address specification (regex + checksum), with AI only as a fallback when the pattern database doesn't have a match.

### 5.2 New Investigator Workflow

```
Paste Address
    ↓
Analyze Format  (button in Wallet Investigation)
    ↓
Step 1: Deterministic engine (regex + checksum + pattern DB)
    ↓
Identified?  →  Show forensic result  →  Supported?  →  Launch Investigation
    ↓ No
Step 2: AI Pattern Fallback (OpenRouter / Groq)
    ↓
Show best-guess family + basic info + trusted explorer link
```

### 5.3 Tier 1 — Deterministic Identification (Primary)

**File:** `backend/modules/coin_identifier.py` → `analyze_address_format()`

This runs **first, always**. No API calls. No LLM. Pure specification validation.

| Chain / Family | How It's Detected | Address Types | Checksum |
|---|---|---|---|
| **Bitcoin** | Base58Check + Bech32/Bech32m | P2PKH (`1…`), P2SH (`3…`), SegWit (`bc1q…`), Taproot (`bc1p…`) | Base58Check / Bech32 / Bech32m |
| **EVM** | `0x` + 40 hex chars | EVM Externally Owned Account | EIP-55 (if mixed case) |
| **Solana** | 32-byte Base58 decode | Ed25519 Public Key | Length + charset |
| **Tron** | `T` + 33 chars | TRON Account | Base58Check `0x41` |
| **Litecoin** | `L`/`M` or `ltc1…` | Legacy / SegWit | Base58Check / Bech32 |
| **Dogecoin** | `D…` prefix | P2PKH | Base58Check `0x1E` |

**Response fields (forensic JSON):**

```json
{
  "valid": true,
  "family": "Bitcoin",
  "possible_networks": ["Bitcoin"],
  "address_type": "Taproot",
  "encoding": "Bech32m",
  "checksum": "Valid",
  "length": 62,
  "prefix": "bc1p",
  "supported": true,
  "axon_support": {
    "supported": ["Bitcoin"],
    "coming_soon": [],
    "unsupported": []
  },
  "forensic_notes": "This address matches the Bitcoin Taproot (P2TR) specification...",
  "confidence": "Deterministic",
  "identification_method": "deterministic"
}
```

**EVM special case:** A `0x` address is valid on **all** EVM networks. AXON lists every compatible network (Ethereum, Base, Polygon, Arbitrum, Optimism, BSC, Avalanche) and explicitly states that **the specific chain cannot be determined from the address alone**.

### 5.4 Tier 2 — AI Pattern Fallback (Secondary)

**File:** `backend/modules/ai_analyst.py` → `generate_address_pattern_fallback()`

Runs **only when Tier 1 fails** (`valid: false`). Used for chains not yet in the pattern database:

- Cardano (`addr1…`)
- XRP (`r…`)
- Cosmos (`cosmos1…`)
- Polkadot, Stellar, Algorand, etc.

The AI analyzes prefix, length, and encoding patterns and returns:

```json
{
  "valid": true,
  "family": "Cardano",
  "possible_networks": ["Cardano"],
  "address_type": "Shelley",
  "encoding": "Bech32",
  "checksum": "Unverified",
  "forensic_notes": "...",
  "confidence": "AI Assisted"
}
```

The UI shows an **"AI Assisted"** badge and notes that checksum was **not verified** by the deterministic engine.

**API routing** (`ai_analyst.py` → `_call_api()`):

| Model name contains `/` | Provider | Env variable |
|---|---|---|
| Yes (e.g. `meta-llama/llama-3.1-8b-instruct`) | **OpenRouter** | `OPENROUTER_API_KEY` |
| No (e.g. `llama-3.3-70b-versatile`) | **Groq** | `GROQ_API_KEY`, `GROQ_API_KEY1`, `GROQ_API_KEY2` |

**Current fallback model:** `meta-llama/llama-3.1-8b-instruct` (OpenRouter, via `MODELS["fast"]`)

**Recommended upgrade:** OpenRouter's free **GLM** models (e.g. `z-ai/glm-4.5` or newer GLM variants) can be swapped into `MODELS["fast"]` in `ai_analyst.py` for better pattern recognition on exotic address formats. Groq keys in `.env` work as a fallback provider for non-slash model names.

### 5.5 AXON Investigation Support Matrix

| Coin / Family | Analyze Format | Launch Investigation | Scanner Module |
|---|---|---|---|
| **Bitcoin** | ✅ Deterministic | ✅ Works | `btc_scorer.py` |
| **Ethereum / EVM** | ✅ Deterministic | ✅ Works | `wallet_scorer.py` |
| **Solana** | ✅ Deterministic | ✅ Works | `sol_scorer.py` |
| **Tron** | ✅ Deterministic | ✅ Works | `tron_scorer.py` |
| **Polygon** | ✅ (via EVM family) | ✅ Works | `wallet_scorer.py` + cross-chain |
| **Base, Optimism, Arbitrum, BSC, Avalanche** | ✅ Listed as EVM | 🔜 Coming Soon | — |
| **Litecoin, Dogecoin** | ✅ Deterministic | ❌ Not supported | — |
| **Cardano, XRP, Cosmos, etc.** | 🤖 AI Fallback | ❌ Info only | — |

**Investigate button** (`POST /scan/wallet`) routes via `cross_chain.detect_address_type()` to the correct scorer for BTC, SOL, TRON, and EVM.

**Analyze Format button** (`GET /scan/chain-resolution/{address}`) calls `resolve_chain_identity()` which runs the full two-tier pipeline.

### 5.6 Trusted Block Explorers

**File:** `backend/modules/verified_domains.json`

After identification (deterministic or AI), AXON attaches a trusted explorer URL via `get_explorer_url(chain, address)`:

| Chain | Explorer |
|---|---|
| Bitcoin | mempool.space / blockstream.info |
| Ethereum | etherscan.io |
| Polygon | polygonscan.com |
| Solana | solscan.io |
| Tron | tronscan.org |
| Cardano | cardanoscan.io |
| XRP | xrpscan.com |
| Cosmos | mintscan.io |
| Polkadot | subscan.io |

For unsupported chains, Analyze Format still gives the investigator a **verified explorer link** so they can manually continue the investigation off-platform.

### 5.7 Frontend Changes

**File:** `frontend/src/pages/WalletInvestigation.jsx`

| Before | After |
|---|---|
| "Which Coin?" button | **"Analyze Format"** button |
| "AI Coin Identification" card | **Address Intelligence** card |
| "Most Likely Crypto — 78%" | Address family, type, encoding, checksum, AXON support |
| AI guessing primary | Deterministic primary, AI fallback badge |

**Component:** `AddressIntelligenceCard` — renders the full forensic panel including:
- Format validity badge
- AXON support status (Supported / Coming Soon / Not Supported)
- Possible networks list
- Forensic notes
- **Launch Investigation** button (only when `supported: true`)

**API client:** `frontend/src/api/axon.js`
- `analyzeAddressFormat(address)` — new primary export
- `resolveChainAI` — deprecated alias, points to same endpoint

### 5.8 Backend API

```
GET /scan/chain-resolution/{address}
```

**Handler:** `backend/routers/scan.py` → `get_chain_resolution()`

**Pipeline:**

```python
async def resolve_chain_identity(address, ai_fallback=True):
    result = analyze_address_format(address)       # Step 1: deterministic

    if not result["valid"] and ai_fallback:
        ai_result = await generate_address_pattern_fallback(address)  # Step 2: AI
        if ai_result:
            merge_into(result, ai_result)
            result["identification_method"] = "ai_fallback"
            result["confidence"] = "AI Assisted"

    return result
```

### 5.9 Files Changed (Summary)

| File | Change |
|---|---|
| `backend/modules/coin_identifier.py` | Full rewrite — deterministic engine + AI fallback orchestration |
| `backend/modules/ai_analyst.py` | Added `generate_address_pattern_fallback()` |
| `backend/routers/scan.py` | Updated endpoint docstring |
| `backend/modules/bulk_scanner.py` | Routes by `family` instead of balance-probed resolution |
| `frontend/src/pages/WalletInvestigation.jsx` | Address Intelligence UI |
| `frontend/src/api/axon.js` | `analyzeAddressFormat()` export |
| `frontend/src/pages/BulkInvestigation.jsx` | Uses deterministic/AI format analysis for failed addresses |

### 5.10 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Wallet Investigation UI                   │
│                                                              │
│  [Paste Address]  [Analyze Format]  [Investigate]            │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
             ▼                      ▼
   GET /chain-resolution/{addr}   POST /scan/wallet
             │                      │
             ▼                      ▼
   ┌─────────────────┐    ┌──────────────────┐
   │ coin_identifier │    │  cross_chain.py  │
   │                 │    │  detect_address  │
   │ Step 1: Regex   │    │  _type()         │
   │ + Checksum      │    └────────┬─────────┘
   │ + Pattern DB    │             │
   │                 │    ┌────────┴─────────┐
   │ Step 2 (fail):  │    │ BTC │ SOL │ TRON │
   │ AI Fallback     │    │     EVM scorer   │
   │ (OpenRouter/    │    └──────────────────┘
   │  Groq)          │
   └────────┬────────┘
            │
            ▼
   verified_domains.json → Trusted Explorer URL
```

### 5.11 Environment Setup

Add to `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...     # Primary for AI fallback (slash models)
GROQ_API_KEY=gsk_...                # Fallback provider (non-slash models)
GROQ_API_KEY1=gsk_...               # Optional rotation keys
GROQ_API_KEY2=gsk_...
```

Without API keys, Tier 1 (deterministic) still works fully. Tier 2 (AI fallback) silently fails and returns `Unrecognized`.

### 5.12 Design Principles

1. **Deterministic first** — If AXON says "Valid Bitcoin Taproot", it's because the address passed Bech32m checksum validation, not because a model thought it looked like Bitcoin.
2. **AI only as fallback** — LLM runs when regex/checksum can't identify the format. It never overrides a successful deterministic result.
3. **No confidence percentages for deterministic results** — Confidence is either `"Deterministic"` or `"AI Assisted"`.
4. **Investigate only supported chains** — BTC, EVM (ETH), SOL, TRON get full 5-module investigation. Everything else gets format info + explorer link.
5. **Trusted explorers only** — Explorer URLs come from `verified_domains.json`, not from AI hallucination.

### 5.13 Future Improvements

- [ ] Add Cardano, XRP, Cosmos to deterministic pattern DB (remove need for AI on common chains)
- [ ] Swap AI fallback model to OpenRouter free GLM for better exotic-format recognition
- [ ] Return `official_website` and chain metadata in AI fallback response
- [ ] Enable Base / Optimism / Arbitrum investigation (currently "Coming Soon")
- [ ] Optional on-chain activity probe for EVM chain disambiguation (separate from format analysis)

