# AXON: Master Project Analysis & Architectural Context

> **Single Source of Truth**  
> This document synthesizes the entirety of AXON’s architecture, master logic, problem statement, core features, workflows, and strict engineering governance into a definitive master context.

---

## 1. Vision & The Problem Statement

### The Fragility of the Status Quo
The commercial blockchain forensics and threat intelligence industry is built on a fundamentally fragile assumption: **label lookup**. Commercial platforms identify threats by checking if a wallet address appears in a known-bad database. If it does, it's flagged. If it doesn't, it's deemed "clean." 

This reliance on static blocklists introduces two critical failure modes:
1. **Zero-Day Wallets:** Freshly generated exploit wallets or intermediary mixers have no history and pass every static check.
2. **Behavioral Blindness:** A wallet exhibiting textbook money-laundering patterns (e.g., peel chains, mixer interactions, dormancy-then-spike) is rated "safe" simply because no one has manually labeled it yet.

### The AXON Solution
AXON is an **Advanced Blockchain Behavioral Forensics & Threat Intelligence Platform**. Its foundational philosophy is simple but revolutionary:  
*Axon doesn't ask what a wallet **is**. It determines what a wallet **does**.*

By replacing static lookups with dynamic behavioral mathematics, automated smart contract auditing, and deterministic blockchain pattern recognition, AXON operates as a proactive, full-scale professional cybercrime investigation lab.

---

## 2. Core Value Proposition: What AXON Gives & How It Gives It

AXON delivers court-ready, cryptographically verifiable forensic intelligence. It gives compliance teams, law enforcement, and security researchers the ability to:
- Instantly determine the true nature of an unknown wallet based purely on its transaction rhythms and counterparty networks.
- Trace fund flows forward using a Bounded Breadth-First-Search (BFS) with attribution circuit breakers.
- Perform automated security audits on unverified smart contracts (extracting hidden function calls).
- Process massive bulk lists of addresses to triage critical threats visually through similarity matrices and D3 network graphs.
- Export everything into strict, tamper-proof, 12-section PDF dossiers embedded with environmental metadata and SHA-256 evidence hashes.

---

## 3. The Master Logic: The 5-Layer Analytical Engine

At the core of the system is a proprietary **5-Stage Mathematical Analytical Engine**. When an entity is submitted, AXON retrieves its transaction history, balances, and raw on-chain data, passing it through a 5-axis scoring model. Each axis evaluates a different behavioral vector, generating a final **AXON Threat Indicator** (0–100 score).

| Axis | Name | Weight | What It Measures | Core Logic & Penalties |
|---|---|---|---|---|
| **A1** | Behavioral Telemetry | 30% | Temporal Anomalies & Bot Fingerprinting | Evaluates wallet age vs. transaction density. A massive volume of txs within minutes of wallet creation heavily indicates automated scripts, flash loans, or zero-day liquidation. |
| **A2** | Graph Topology | 25% | Fund Velocity & Liquidation Vector | Tracks speed and direction of outbound funds. Triggers massive penalties for immediate dispersal (peel chains), star topology fan-outs, or cross-chain bridging meant to sever tracking. |
| **A3** | Economic Signals | 20% | Counterparty Network Toxicity | Cross-references 1-hop counterparties. If the subject interacts heavily with known exploiters or sanctioned entities, toxicity increases via guilt-by-association heuristics. |
| **A4** | Attribution Intelligence | 15% | Mixer & Privacy Protocol Exposure | Scans flows for interactions with Tornado Cash, Sinbad, etc. The penalty scales linearly with the proportion of total volume routed through obfuscation protocols. |
| **A5** | Adversarial AI Interpreter | 10% | Active Threat Intelligence | Layers standard deterministic intelligence on top of behavior. Flat penalties for direct hits in the AXON Threat Corpus (13,847+ entities) or third-party alerts (Forta Network). |

### Confidence Intervals
A penalty curve based on data availability establishes the confidence of the score. A wallet with 2 transactions has severely reduced confidence compared to a wallet with 1,000 transactions, preventing false positives on idle wallets.

---

## 4. Platform Features (The A to Z Arsenal)

### A. Address Intelligence & Format Reference (Two-Tier Pipeline)
AXON avoids "guessing" what chain an address belongs to. It uses a rigorous, deterministic identification pipeline before launching an investigation:
1. **Tier 1 (Deterministic Primary):** Pure specification validation without API calls. Validates regex and checksums (e.g., Base58Check/Bech32m for Bitcoin; Keccak-256 for EVM). Confirms Address Family, Type, Encoding, and native AXON support status. 
2. **Tier 2 (AI Fallback):** Only runs if Tier 1 fails (for exotic chains like Cardano, XRP). Uses Groq/OpenRouter LLMs to provide pattern-recognition fallbacks (labeled explicitly as "AI Assisted").
3. **Forensic Reference UI:** A searchable, offline database table (`address_formats`) functioning like a MITRE ATT&CK or NIST handbook for investigating crypto evidence formats.

### B. "Dueling AI" Forensic Model
Instead of a single LLM returning a flat verdict, AXON spawns a Multi-Agent AI Debate System (via Groq/OpenRouter):
1. **Prosecution AI:** Hunts for exploiting behavior and risk vectors.
2. **Defense AI:** Attempts to find legitimate, benign explanations.
3. **Chief Judge AI:** Synthesizes the debate into a final forensic verdict.

### C. Smart Contract Forensic Audit
If AXON detects bytecode (`wt == "Contract"`), it bypasses standard wallet logic for a 3-stage contract scan:
1. **Static Analysis (Slither):** Scans source code for vulnerabilities (reentrancy, self-destructs).
2. **Live Security (GoPlus):** Detects hidden mints, honeypots, and admin backdoors.
3. **4-Byte Signature Decoder:** If a contract is unverified (no source code), AXON analyzes historical txs, extracts 4-byte interaction hashes, and queries Openchain to brute-force the hidden functions.

### D. XDR-Style Bulk Intelligence Processing
Handles high-volume asynchronous queries for compliance teams.
- **Priority Queue:** Sorts targets automatically by Risk Score (Critical → Low).
- **Similarity Matrix:** Mathematically compares all wallets in the batch against each other to find behavioral overlaps (e.g., Wallet A and B share 3 signals).
- **D3 Network Graph:** Force-directed layout prioritizing high-risk connections.

### E. Advanced Fund Tracing & Subpoena Targets
- **BFS Fund Flow Tracing:** Maps forward flows across multiple hops.
- **Attribution Circuit Breaker:** If the tracer hits a known KYC entity (e.g., Binance Deposit Wallet), it flags it as an **[ATTRIBUTION HIT]** and terminates the branch, providing investigators with immediate Subpoena Targets.
- **The Etherscan Escape Hatch (UTF-8 Extractor):** Parses hex data in 0-value transactions to automatically print plain-text criminal communications or ransom demands.

---

## 5. Evidence Presentation: The Cryptographic PDF Engine

AXON’s PDF engine (`reportlab`) is designed strictly for digital forensics and incident response (DFIR) use. 
- **Template Rigidity:** Wallets always output a 12-Section report. Contracts output 9 sections. Bulk Batches output 8 sections.
- **No Empty Shells:** If an investigative section returns empty data, the PDF engine gracefully omits the section. You will never see "Data Pending" or a wall of `N/A`.
- **Evidence Integrity (Tamper-Proof PDFs):** Every PDF begins with a cryptographic SHA-256 hash generated by dumping and sorting the raw JSON data payload on the backend. Any post-generation pixel/character alteration breaks the hash. The hash is saved to a `VerificationReport` DB table for external validation.
- **Defensible Reporting & Terminology:** All subjective "AI" terms are purged. Findings list explicit **Confidence Levels** (High/Medium) and **Source Attributions**. AXON provides "Investigation Reports" and "Evidence Summaries"—it does not use liability-risk wording like "court-admissible" or "legal-grade."
- **Environmental Metadata:** PDF blocks embed the Engine version, Threat DB timestamps, and Node Sources, logging the exact state of the environment during the scan.

---

## 6. Engineering & Governance Non-Negotiables (CLAUDE.md)

Any development, maintenance, or feature expansion on AXON must adhere to the following strict governance rules:

1. **No Regression:** Shared logic (hashing, risk scoring, entity resolution) must be validated via fixture-based regression tests. Existing passing workflows must remain identical.
2. **Additive-Only Report Engine:** Never remove a field or section that already renders correctly. New data is always appended in new sections.
3. **No Liability-Risk Wording:** Never use terms like "court-ready," "legal exhibit," or "court-admissible" in UI copy, PDF templates, or text-generating comments.
4. **Chain of Custody on Entity Resolution:** Any time an entity's identity changes across the pipeline (e.g., resolving a Bulk Batch ID to a Wallet Address), the source, timestamp, and resolution method must be strictly logged. Links must never be silently discarded.
5. **Bitcoin is Not Ethereum with Blank Fields:** UTXO-model entities (like Bitcoin) have their own schema branch. Never render a wall of "N/A" for EVM fields; compute BTC-specific fields instead.
6. **Scan-Depth Transparency:** Scans capped or skipped due to limits (e.g., `QUICK` scan mode) must explicitly log this truncation in the final report using established conventions.

---

## 7. Technology Stack & Integrations

**Architecture Overview:**
- **Frontend:** React 18, TailwindCSS, D3.js (Force/Sankey Graphs), Vite. Deployed on Netlify.
- **Backend:** Python 3.11+, FastAPI, Uvicorn, SQLAlchemy. Deployed on Render.
- **Database:** SQLite (`axon_intel.db`) containing the 13,847+ entity Threat Intelligence Corpus and Address Formats reference table.

**Data Source Integrations:**
- **Etherscan API v2:** Tx history, contract source code, ABIs.
- **Alchemy RPC:** ERC-20 balances, on-chain state queries.
- **Forta Network:** Real-time security alerts.
- **DuckDuckGo / Web Scraping:** Live OSINT threat intelligence.
- **Openchain 4Byte:** Decoding unverified contract calldata.
- **Groq Engine / OpenRouter:** Multi-Agent AI Debate System (Llama 3.1 / Mixtral).

---

## 8. Real-World Asset Testing Bank
AXON includes a built-in demo dataset (`DemoSamples.jsx`) populated with historical, real-world threats for algorithm testing, spanning from **Lazarus Group** and **Tornado Cash Routers** to **Binance Hot Wallets** and **Benign Whales (vitalik.eth)**. It also includes unsupported formats (Litecoin, Dash) to explicitly demonstrate AXON's failure-handling and identification circuit breakers in a safe environment.

---

## 9. Technical Deep-Dive Documentation
For an exhaustive, step-by-step breakdown of how each core engine operates (Wallet Analysis, Contract Auditing, OSINT Sweeps, Bulk Cases, Report Hashes, and the Dual-Mode AI), please reference the [AXON Deep Technical Explainer](./AXON_Deep_Technical_Explainer.md) file. This supplemental master document serves as the ultimate engineering guide for the internal state of the 5-Stage Mathematical Engine.
