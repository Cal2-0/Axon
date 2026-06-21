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

The blockchain forensics industry is built on a fundamentally fragile assumption: **label lookup**. Commercial platforms like Chainalysis and TRM Labs identify threats by checking if a wallet address appears in a known-bad database. If it does, it's flagged. If it doesn't, it's "clean."

This approach has two critical failure modes:
1. **Zero-day wallets** — freshly generated exploit wallets have no history and pass every check.
2. **Behavioral blindness** — a wallet exhibiting textbook money-laundering patterns (peel chains, mixer interactions, dormancy-then-spike) is rated "safe" simply because no one has labeled it yet.

## The Solution

**Axon** is an advanced behavioral forensics engine that answers one question before any interaction with a wallet or smart contract: ***Can I trust this?***

Instead of relying on static databases, Axon runs a proprietary **5-Layer Behavioral Forensic Engine** that analyzes *what an entity does on-chain* — its transaction rhythms, network topology, economic flow patterns, and threat intelligence footprint — before arriving at a defensible, auditable risk verdict.

Every risk assessment is generated algorithmically from on-chain evidence. The database is confirmation, not proof.

---

## 🚀 Advanced Platform Features

Axon has been massively upgraded into a full-scale, professional cybercrime investigation lab. Here are the core capabilities:

### 🤖 3-Agent "Dueling AI" Forensic Model
Instead of a single AI model returning a flat verdict, Axon spawns **three distinct AI agents** using the Groq Engine:
1. **Prosecution AI:** Hunts for every red flag, exploiting behavior, and risk vector.
2. **Defense AI:** Attempts to find legitimate, benign explanations for the wallet's behavior.
3. **Chief Judge AI:** Synthesizes the debate into a final, court-ready MITRE ATT&CK forensic verdict.

### 🌐 Multi-Chain Portfolio Exposure
Cross-chain crime requires cross-chain tracking. Axon actively fetches balances across **Bitcoin (BTC)**, **Solana (SOL)**, and **EVM Chains** (Ethereum, BNB, Arbitrum, Base, Optimism, Polygon, Avalanche) to provide a complete global net worth exposure map for any suspect.

### 🕵️ Smart OSINT Intelligence Engine
Axon doesn't just look on-chain. It runs a live Open-Source Intelligence (OSINT) scraper that hunts down mentions of an address across **Reddit, GitHub, Twitter**, and the open web via DuckDuckGo. It also automatically resolves `.eth` domains using the Ethereum Name Service (ENS).

### 🕸️ Interactive Sankey & Force-Directed Graphs
Visualize capital flight and laundering patterns effortlessly. Axon maps 2nd and 3rd degree interactions, identifying choke points, intermediary hops, and star-topology distribution nodes using interactive **D3.js Force Graphs** and **Sankey Diagrams**.

### 💼 Comprehensive Case Management
Track long-running investigations natively. Create persistent cases, assign specific investigators (e.g., "Agent Smith"), tag threats (`Laundering`, `Phishing`, `Critical`), and attach forensic logs and Bulk Scans directly to your digital workspace.

### ⚡ Bulk / Batch Scanning Mode
Upload 50+ addresses at once. The engine will sequentially investigate each address, throttling automatically to bypass API rate limits, and output a massive CSV / Data Table to instantly triage the most dangerous entities in a massive dataset.

### 🔐 DeFi Protocol Signature Decoder
Say goodbye to raw Hex Calldata. Axon taps into the Openchain 4byte signature database to automatically translate confusing, unverified smart contract calls into plain English (e.g., converting `0x38ed1739` to `swapExactTokensForETH`).

### 💵 Stablecoin Flow Tracking
Explicitly scrapes and tracks ERC-20 `tokentx` events for USDT and USDC, mapping how stablecoin liquidity enters and exits a suspect wallet.

### 🛡️ Cryptographically Verifiable Reports
Axon generates tamper-proof PDF dossiers. Every generated report automatically embeds an authentic, backend-generated SHA-256 integrity hash that is permanently sealed in the Verification Database. Any third party can independently verify the hash to ensure the document has not been altered since generation.

### 🧠 Auto-Learning Threat Engine
The platform dynamically learns from its own intelligence gathering. If a previously unknown smart contract or wallet scans with a CRITICAL risk score (80+), Axon's auto-learn mechanism automatically commits it to the internal Threat Database, ensuring future scans immediately recognize the threat without requiring manual analyst intervention.

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

---

<p align="center"><em>Built by Calvin Dsouza </em></p>
