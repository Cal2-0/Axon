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
