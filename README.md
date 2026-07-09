<p align="center">
  <h1 align="center">AXON</h1>
  <p align="center"><strong>Advanced Blockchain Behavioral Forensics & Threat Intelligence Platform</strong></p>
  <p align="center">
    <em>Axon doesn't ask what a wallet <b>is</b>. It determines what a wallet <b>does</b>.</em>
  </p>
  <p align="center">
    <a href="https://theaxon.netlify.app">🌐 Live Demo</a> · <a href="https://axon-backend-rf6y.onrender.com/docs">📡 API Docs</a>
  </p>
</p>

---

## The Problem

The blockchain forensics industry is built on a fundamentally fragile assumption: **label lookup**. Commercial platforms identify threats by checking if a wallet address appears in a known-bad database. If it does, it's flagged. If it doesn't, it's "clean."

This approach has two critical failure modes:
1. **Zero-day wallets** — freshly generated exploit wallets have no history and pass every check.
2. **Behavioral blindness** — a wallet exhibiting textbook money-laundering patterns (peel chains, mixer interactions, dormancy-then-spike) is rated "safe" simply because no one has labeled it yet.

## The AXON Solution

AXON is an advanced behavioral forensics tool designed to identify on-chain threats dynamically. At its core is a proprietary **5-Stage Mathematical Analytical Engine** that evaluates raw on-chain data across 5 completely different behavioral vectors (A1-A5). 

- **Universal Multi-Chain Support:** Automatically identifies and seamlessly queries EVM, Bitcoin, Solana, and TRON networks.
- **Smart Contract Audits:** Implements static analysis (Slither), live protocol security (GoPlus), and brute-force 4-byte signature decoding for unverified smart contracts.
- **Bulk Batch Processing:** Handles high-volume asynchronous queries for institutional and law enforcement compliance teams.
- **Forensic PDF Engine:** Dynamically generates strictly formatted, legally-sound PDF reports containing cryptographic Evidence Integrity hashes.

## Further Reading
For a deep-dive into the proprietary 5-Stage Mathematical Model, Cross-Chain engine, and 12-Section PDF Architecture, please review the [TECHNICAL_LEARNING.md](./TECHNICAL_LEARNING.md) guide included in this repository.

---

## 🚀 Advanced Platform Features

Axon has been massively upgraded into a full-scale, professional cybercrime investigation lab. Here are the core capabilities:

### 🤖 3-Agent "Dueling AI" Forensic Model
Instead of a single AI model returning a flat verdict, Axon spawns **three distinct AI agents** using the Groq Engine:
1. **Prosecution AI:** Hunts for every red flag, exploiting behavior, and risk vector.
2. **Defense AI:** Attempts to find legitimate, benign explanations for the wallet's behavior.
3. **Chief Judge AI:** Synthesizes the debate into a final, court-ready MITRE ATT&CK forensic verdict.

### 🕸️ BFS Fund Flow Tracing (Trace to Exchange)
Axon's proprietary tracing engine uses a bounded Breadth-First-Search (BFS) algorithm to map the forward flow of funds across multiple hops. 
Crucially, it uses an **Attribution Circuit Breaker**: if the tracer hits a known KYC entity (e.g., a Binance Deposit Wallet) from our Threat Intelligence Database, it automatically flags the node as an **[ATTRIBUTION HIT]** and safely terminates that branch.

### 🛡️ Cryptographically Verifiable Chain of Custody PDFs
When an investigation goes to court or is handed to law enforcement, digital evidence must be tamper-proof.
Axon automatically generates printable PDF dossiers embedded with an authentic, backend-generated **SHA-256 Hash** and an **Environmental Metadata** block (logging Engine Version, Threat DB timestamps, and Node Sources). Any third party can independently hash the raw JSON payload to verify the document hasn't been altered since the scan.

### 🏛️ Court-Safe Defensible Reporting
Axon guarantees legal admissibility by assigning explicit **Confidence Levels** (High/Medium/Low) and **Source Attributions** (e.g., On-Chain Heuristic, OSINT) to every single anomaly detected. It avoids black-box "AI" labels, classifying generative insights under rigorous **Analytical Engine Synthesis**.

### 🕵️‍♂️ The "Etherscan Escape Hatch" (UTF-8 Extractor)
Hackers frequently communicate or leave ransom demands via 0-value transactions. Axon features a robust UTF-8 decoder built directly into the Etherscan ingestion pipeline. It automatically parses hex data, filters out binary noise, and prints plain-text criminal communications directly onto the investigative timeline.

### 🌐 Cross-Chain Coin Identification & Routing
Axon no longer guesses what chain an address belongs to. It uses a **Deterministic Identification Pipeline**:
1. **Syntax Check:** Regex validation for BTC, SOL, TRX, EVM formats.
2. **Cryptographic Checksums:** Verifies base58/bech32 encodings (BTC) or Keccak-256 (EVM).
3. **Live RPC Probes:** In the event of ambiguity, it probes the blockchain directly.
4. **AI Tie-Breaker:** Resolves complex edge cases before routing to the correct specialized chain scorer.

### 🔐 DeFi Protocol Signature Decoder
Say goodbye to raw Hex Calldata. Axon taps into the Openchain 4byte signature database to automatically translate confusing, unverified smart contract calls into plain English (e.g., converting `0x38ed1739` to `Swapped Token A for Token B`).

### 📡 Active Mempool Monitoring & Clustering (Stubbed)
Tracking moving targets. Axon's architecture includes a background engine to subscribe to Webhooks/Mempool events. Combined with Wallet DNA Fingerprinting and BTC Change-Address heuristics, Axon clusters zero-day wallets to known threat actors based purely on behavior.

### 💼 Bulk Scanning & Case Management
Track long-running investigations natively. Create persistent cases, assign specific investigators, and upload 50+ addresses at once. The engine will sequentially investigate each address, throttling automatically to bypass API rate limits, and output a massive CSV to triage threats.

### 🛡️ Production Hardening & API Rate Limiting (`slowapi`)
To prevent Denial of Service (DoS) attacks and mitigate API abuse, Axon implements strict backend protection:
- **Rate Limiting:** Managed via `slowapi` using an IP-based token bucket algorithm (e.g., maximum 15 scans/minute for wallets/contracts, 5/minute for deep-dives).
- **Strict CORS Policy:** Restricted to trusted Netlify/Vercel domains, permitting only specific methods (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`).
- **Pydantic Validation:** All address inputs are checked against exact cryptographic regex filters before hitting downstream scanner logic.

---

## Architecture

Axon is a full-stack intelligence platform built on a **React + TailwindCSS** frontend and a **FastAPI (Python)** backend, deployed on **Netlify** (frontend) and **Render** (backend).

```
┌─────────────────────────────────────────────────────────┐
│                    AXON FRONTEND                        │
│  React · TailwindCSS · D3.js Force/Sankey Graph · Vite  │
│  Pages: Investigation Lab │ Case Management │ Live Data │
├─────────────────────────────────────────────────────────┤
│                     AXON API                            │
│  FastAPI · Uvicorn · SQLAlchemy · httpx · BeautifulSoup │
│  /scan/wallet  · /scan/contract · /scan/bulk · /cases   │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Etherscan│ Alchemy  │  Forta   │ DuckDuck │  Groq LLM   │
│ API v2   │ RPC      │ Network  │ Go OSINT │ (3 Agents)  │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│              AXON THREAT INTELLIGENCE DB                 │
│  13,847+ labeled entities · OFAC sanctions · Mixers     │
│  Exchanges · Hacker wallets · Scam addresses            │
└─────────────────────────────────────────────────────────┘
```

---

## The 5-Layer Behavioral Forensic Engine

Both the **Smart Contract Scanner** and the **Wallet Investigator** are powered by the same parallel multi-axis behavioral model. Each layer operates independently and produces a score from 0–100.

### Wallet Investigation — 5-Layer Model

| Layer | Name | Weight | What It Measures |
|-------|------|--------|-----------------|
| **L1** | Behavioral Telemetry | 30% | Transaction rhythm, round-denomination detection, accumulate-then-drain patterns, bot fingerprinting |
| **L2** | Graph Topology | 25% | Fan-out/fan-in ratios, star topology detection, 1-hop contamination trace from known threat actors |
| **L3** | Economic Signals | 20% | Velocity spikes, peel chain structuring, dormancy-then-spike patterns, pass-through analysis |
| **L4** | Attribution Intelligence | 15% | Cross-reference against 13,847+ entity threat corpus, OFAC sanctions, Forta Network alerts |
| **L5** | Adversarial AI Interpreter | 10% | 3-Agent AI debate (Prosecutor vs Defense vs Judge) delivering the final hypothesis |

---

## Data Sources & Integrations

| Source | Purpose | Integration |
|--------|---------|-------------|
| **Etherscan API v2** | Transaction history, balance, contract source code, ABI | REST API |
| **Alchemy RPC** | ERC-20 token balances, on-chain state queries | JSON-RPC |
| **Forta Network** | Real-time security alerts and threat detection | GraphQL |
| **DuckDuckGo/OSINT** | Live threat intelligence scraping on Reddit/GitHub | Web Scraping |
| **Openchain 4Byte** | Decoding unverified contract calldata | REST API |
| **Groq Engine** | Multi-Agent AI Debate System (Llama 3 / Mixtral) | REST API |
| **Axon Threat DB** | 13,847+ curated threat entities | SQLite (SQLAlchemy) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TailwindCSS · Vite · D3.js |
| Backend | Python · FastAPI · Uvicorn · SQLAlchemy |
| Database | SQLite (axon_intel.db) |
| AI/ML | Groq Cloud (Multi-Agent Architecture) |
| Rate Limiting | slowapi (IP-based token bucket) |
| Deployment | Netlify (frontend) · Render (backend) |

---

## Setup & Running

### Prerequisites
- Python 3.11+
- Node.js 18+

### Environment Variables
Create a `.env` file in the `backend/` directory:
```env
ETHERSCAN_API_KEY=your_etherscan_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
GROQ_API_KEY=your_groq_api_key
```

### Quick Start (Windows)
```bash
./run.bat
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8001`

### Manual Start
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# Frontend
cd frontend
npm install
npm run dev
```

---

## Real-World Asset Testing Bank

Axon ships with a curated `DemoSamples` bank containing real-world historical threats so you can test the algorithmic engine against live, mainnet data:

| Entity | Expected Classification | Address |
|--------|-----------|---------|
| **Lazarus Group** | CRITICAL | `0x098B716B8Aaf21512996dC57EB0615e2383E2f96` |
| **Tornado Cash Router** | MIXER | `0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b` |
| **Binance Hot Wallet 14** | EXCHANGE | `0x28C6c06298d514Db089934071355E5743bf21d60` |
| **vitalik.eth** | EOA / LOW | `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` |

---

## Project Roadmap

### Phase 1 — Research & Architecture `100%`
Documentation, API research, threat corpus compilation, engine design.

### Phase 2 — Core Forensic Modules `100%`
5-Layer Wallet Scorer, 5-Axis Contract Scanner, Intelligence Database.

### Phase 3 — Frontend Dashboard & Deployment `100%`
React dashboard with all investigation views, D3 graph visualization, Netlify/Render CI/CD.

### Phase 4 — Advanced Capabilities `100%`
- Case Management Engine (assignees, threat tags)
- OSINT Scraper & ENS Lookups
- Dueling 3-Agent AI Forensic Debate
- Bulk/Batch Investigation Mode
- Sankey Diagrams & Transaction Maps
- Multi-Chain Portfolio Scraping
- Real-World Demo Data Integration

### Phase 5 — Court-Ready Digital Forensics `100%`
- **Terminology Overhaul**: Purged "AI" and subjective Risk terms for defensible forensic language.
- **Evidence Confidence & Source Attribution**: Every finding lists explicit Confidence (High/Medium) and Source.
- **Environmental Metadata**: Embedded PDF blocks locking in Engine version, DB date, and Node Source.
- **Etherscan Escape Hatch**: Automated UTF-8 extraction of ransom/taunt messages from 0-value transactions.
- **Bulk Triage Matrix**: Instant Boolean flags (Mixer/Exchange exposure) injected into bulk batch scans.
- **Verifiable Backend PDF Engine**: Completely decoupled from frontend HTML rendering, generating strictly formatted ReportLab PDFs directly from the backend for Wallet, Contract, Bulk Batch, and Master Case Dossiers.
- **Bulk Investigation Overlap Matrix**: Injects a high-priority triage queue and a Network Connections/Similarity Matrix directly into the Bulk Batch PDF export.
- **Case Dossier Synthesis**: Extracts and aggregates critical vulnerabilities, key findings, and manual investigator notes across all entities in a case into a single master PDF.
- **Streamlined Dashboard UX**: Refined Case Dashboard workflows, separating direct PDF downloads from on-screen AI Data Generation.

### Phase 6 — Architecture & Concurrency Remediation `100%`
- **Asynchronous Database Boundaries**: Implemented a targeted `run_sync` executor wrapper to offload blocking SQLAlchemy operations (e.g., synchronous `.in_()` batch queries) from the main `asyncio` event loop.
- **Concurrent API Fetching**: Resolved severe pagination bottlenecks by migrating sequential Etherscan fetch loops to concurrent `asyncio.gather` requests, significantly dropping API resolution times for heavy targets.
- **Bulk Target Visualizations**: Improved the Bulk Scanner Dashboard UI to dynamically render Tailwind risk-color mappings and properly distinguish between Entity types directly within the interface.

---

<p align="center"><em>Built by Calvin Dsouza </em></p>
