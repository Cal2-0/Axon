<p align="center">
  <h1 align="center">AXON</h1>
  <p align="center"><strong>Blockchain Behavioral Forensics & Threat Intelligence Platform</strong></p>
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

**Axon** is a behavioral forensics engine that answers one question before any interaction with a wallet or smart contract: ***Can I trust this?***

Instead of relying on static databases, Axon runs a proprietary **5-Layer Behavioral Forensic Engine** that analyzes *what an entity does on-chain* — its transaction rhythms, network topology, economic flow patterns, and threat intelligence footprint — before arriving at a defensible, auditable risk verdict.

Every risk assessment is generated algorithmically from on-chain evidence. The database is confirmation, not proof.

---

## Architecture

Axon is a full-stack intelligence platform built on a **React + TailwindCSS** frontend and a **FastAPI (Python)** backend, deployed on **Netlify** (frontend) and **Render** (backend).

```
┌─────────────────────────────────────────────────────────┐
│                    AXON FRONTEND                        │
│  React · TailwindCSS · D3.js Force Graph · Vite        │
│  Pages: Overview │ Wallet Investigation │ Contract      │
│         Investigation │ Intelligence Databases          │
├─────────────────────────────────────────────────────────┤
│                     AXON API                            │
│  FastAPI · Uvicorn · SQLAlchemy · httpx                 │
│  /scan/wallet  · /scan/contract · /graph · /intel       │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Etherscan│ Alchemy  │  Forta   │  GoPlus  │  Groq LLM   │
│ API v2   │ RPC      │ Network  │ Security │  (Llama 3)   │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│              AXON THREAT INTELLIGENCE DB                 │
│  13,847+ labeled entities · OFAC sanctions · Mixers     │
│  Exchanges · Hacker wallets · Scam addresses            │
└─────────────────────────────────────────────────────────┘
```

---

## The 5-Layer Behavioral Forensic Engine

Both the **Smart Contract Scanner** and the **Wallet Investigator** are powered by the same parallel multi-axis behavioral model. Each layer operates independently and produces a score from 0–100. The final risk verdict is a weighted composite with cross-axis amplification.

### Wallet Investigation — 5-Layer Model

| Layer | Name | Weight | What It Measures |
|-------|------|--------|-----------------|
| **L1** | Behavioral Telemetry | 30% | Transaction rhythm, round-denomination detection, accumulate-then-drain patterns, bot fingerprinting (coefficient of variation), wallet age vs. value anomalies |
| **L2** | Graph Topology | 25% | Fan-out/fan-in ratios, star topology detection, 1-hop contamination trace from known threat actors, mixer contract interaction mapping |
| **L3** | Economic Signals | 20% | Velocity spikes (single-day burst detection), peel chain structuring, dormancy-then-spike patterns, pass-through analysis (high volume + low retention) |
| **L4** | Attribution Intelligence | 15% | Cross-reference against 13,847+ entity threat corpus, OFAC sanctions matching, Forta Network real-time alerts, known mixer contract interaction count |
| **L5** | Adversarial AI Interpreter | 10% | LLM acts as a *forensic defense attorney* — attempts to find legitimate explanations for triggered signals. Returns a MITRE ATT&CK tag, a plausible hypothesis, and an executive verdict |

### Smart Contract Scanner — 5-Axis Model

| Axis | Name | Weight | What It Measures |
|------|------|--------|-----------------|
| **A1** | Code Security | 20% | Honeypot detection, unverified bytecode, self-destruct capability, transfer pausability, external call risk |
| **A2** | Admin & Economic Risk | 15% | Proxy upgradeability, buy/sell tax analysis, mint authority, blacklist functions, hidden ownership, balance manipulation |
| **A3** | Behavioral Fingerprint | 30% | Deposit uniformity (mixer signature via CV analysis), drain ratios, high-volume zero-balance contracts |
| **A4** | Network Topology | 15% | Star-in/star-out detection, edge concentration, choke-point identification |
| **A5** | Threat Intelligence | 20% | Threat DB matching, sanctioned protocol keyword detection, Forta Network alerts |

### Pre-Step: Entity Class Classifier

Before scoring begins, every wallet is dynamically classified into one of **8 entity classes** based on its behavioral fingerprint. Each class carries a risk modifier (0.5x–1.5x) that contextualizes the final score:

| Entity Class | Modifier | Detection Logic |
|-------------|----------|-----------------|
| Exchange Hot Wallet | 0.5x | >500 counterparties + high round-trip ratio |
| DAO / Treasury | 0.6x | Low tx count + high balance + few counterparties |
| Market Maker / Bot | 0.7x | >5,000 txs + tight counterparty set |
| Normal EOA | 1.0x | Default classification |
| Scam / Distribution | 1.3x | High outflow to many fresh wallets + low round-trip |
| Privacy Mixer | 1.4x | >60% equal-denomination deposits |
| Exploit / Drainer | 1.5x | Sudden massive inflow + low tx count |
| Confirmed Threat Actor | 1.5x | DB-confirmed critical threat |

### Cross-Axis Amplification

When multiple axes trigger simultaneously, Axon applies **correlated risk multipliers** to prevent dangerous entities from hiding behind a single clean layer:

- **Rug Vector** (A2 > 60 + A5 > 70): 1.7x — admin powers combined with known threat intelligence
- **Laundering Path** (A3 > 50 + A4 > 50): 1.6x — suspicious behavior + suspicious topology
- **Bad Actor + Blind Code** (A5 > 60 + A1 > 50): 1.8x — known threat + unverified contract
- **Honeypot + Admin Drain** (A1 > 80 + A2 > 60): 1.5x — trap contract with extraction capability

---

## Platform Modules

### 1. Wallet Investigation
Full-depth forensic analysis of any Ethereum wallet address. Runs all 5 layers in parallel, producing:
- **Identity Profile** — ENS resolution, balance, volume, wallet age, counterparty count
- **Risk Assessment** — Composite score with per-layer breakdown and triggered signal list
- **Transaction Graph** — Interactive D3.js force-directed graph with mixer/exchange/threat coloring
- **OSINT & Threat Alerts** — Forta Network alerts, ERC-20 token holdings (Alchemy), threat mentions
- **Exchange Detection** — Identifies cash-out events to known exchange deposit addresses
- **Mixer Detection** — Maps interactions with Tornado Cash, RenBridge, and other privacy protocols
- **Forensic Report** — Exportable structured intelligence report

### 2. Smart Contract Investigation
Automated security and risk analysis for any deployed smart contract:
- **Contract Identity** — Name, compiler version, verification status, proxy detection, license type
- **Source Code Analysis** — Fetches verified Solidity source from Etherscan
- **GoPlus Security Engine** — Live token security checks (honeypot, mint, blacklist, tax analysis)
- **5-Axis Risk Matrix** — Independent scoring across code, admin, behavior, topology, and intelligence
- **AI Forensic Verdict** — MITRE ATT&CK tagged assessment with executive summary

### 3. Intelligence Databases
Searchable, filterable access to Axon's curated threat intelligence corpus:
- **13,847+ labeled wallet entities** across hackers, scammers, mixers, exchanges, and sanctioned addresses
- **OFAC sanctions cross-reference**
- **Category and threat-level filtering**
- **Fuzzy search across labels, addresses, and aliases**

### 4. Live Dashboard
Real-time platform overview with:
- Live ETH price, gas tracker, and block height
- API health monitoring for all external data sources
- Platform statistics and threat corpus metrics

---

## Data Sources & Integrations

| Source | Purpose | Integration |
|--------|---------|-------------|
| **Etherscan API v2** | Transaction history, balance, contract source code, ABI | REST API |
| **Alchemy RPC** | ERC-20 token balances, on-chain state queries | JSON-RPC |
| **Forta Network** | Real-time security alerts and threat detection | GraphQL |
| **GoPlus Security** | Token-level security analysis (honeypot, tax, admin) | REST API |
| **Groq (Llama 3)** | Adversarial AI forensic interpreter (L5/A5) | REST API |
| **CoinGecko** | Real-time ETH/USD pricing | REST API |
| **Axon Threat DB** | 13,847+ curated threat entities | SQLite (SQLAlchemy) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TailwindCSS · Vite · D3.js |
| Backend | Python · FastAPI · Uvicorn · SQLAlchemy |
| Database | SQLite (axon_intel.db) |
| AI/ML | Groq Cloud (Llama 3 70B) |
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
- API Docs: `http://localhost:8001/docs`

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

## Live Deployment

| Service | URL |
|---------|-----|
| Frontend | [theaxon.netlify.app](https://theaxon.netlify.app) |
| Backend API | [axon-backend-rf6y.onrender.com](https://axon-backend-rf6y.onrender.com) |
| API Documentation | [axon-backend-rf6y.onrender.com/docs](https://axon-backend-rf6y.onrender.com/docs) |

---

## Test Addresses

| Entity | Risk Level | Address |
|--------|-----------|---------|
| USDT (Tether) | LOW | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| vitalik.eth | LOW | `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` |
| Ronin Bridge Exploiter | CRITICAL | `0x098B716B8Aaf21512996dC57EB0615e2383E2f96` |
| FTX Drainer | CRITICAL | `0x3cbded43efdaf0fc77b9c55f6fc9988fcc9b37d9` |

---

## Project Roadmap

### Phase 1 — Research & Architecture `100%`
Documentation, API research, threat corpus compilation, engine design.

### Phase 2 — Core Forensic Modules `100%`
5-Layer Wallet Scorer, 5-Axis Contract Scanner, Intelligence Database, AI Interpreter.

### Phase 3 — Frontend Dashboard & Deployment `100%`
React dashboard with all investigation views, D3 graph visualization, live deployment on Netlify + Render. Currently in testing and fine-tuning.

### Phase 4 — Advanced Capabilities `30%`
- Case Management Engine (persistent investigation workspaces)
- Behavioral Clustering & Campaign Detection
- Bulk/Batch Investigation Mode
- Deep-Dive Transaction Analysis (full history pagination)
- Sankey Diagrams for money flow visualization
- Automated Alerting & Webhooks
- Court-Ready PDF Dossier Export

---

<p align="center"><em>Built by Calvin Dsouza  · CERT-Army Malware Desk</em></p>
