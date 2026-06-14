# Axon — Proprietary Blockchain Forensics Engine
**Behavioral Security Intelligence Platform**

Axon answers one question before interacting with any wallet or contract: *Can I trust this?* It does this not by relying on static databases, but by running a proprietary **5-Layer Behavioral Forensic Engine**.

## Architecture

This is the Phase 2 Architecture consisting of a React + TailwindCSS frontend and a FastAPI (Python) backend.

### The 5-Layer Forensic Engine
Both the Smart Contract Scanner and Wallet Investigator run on a parallel 5-axis behavioral model:
1. **L1: Behavioral Telemetry** (Code security for contracts; transaction rhythm and patterns for wallets).
2. **L2: Graph Topology** (Fan-out, network centrality, and 1-hop contamination trace).
3. **L3: Economic Signals** (Velocity spikes, accumulate-then-drain patterns).
4. **L4: Attribution Intelligence** (Cross-referencing 13k+ threat corpus and OFAC lists).
5. **L5: Adversarial AI Interpreter** (AI acts as a *defense attorney* to interpret the data, returning a MITRE tag, a plausible hypothesis, and a forensic verdict).

### Pre-Step: Entity Classifier
Wallets are dynamically classified into 8 Entity Classes (e.g., Privacy Mixer, Market Maker, Scam/Distribution) before scoring to apply a risk multiplier.

## Setup & Running

**Environment Variables**
Create a `.env` file in the `backend/` directory:
```env
ETHERSCAN_API_KEY=your_etherscan_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
GROQ_API_KEY=your_groq_api_key
```

**Run the Platform (Windows)**
The platform comes with an automated startup script that handles all port binding and server launches.
```bash
./run.bat
```
The UI will launch at `http://localhost:5173`. The backend runs on `http://localhost:8001`.

### 3. Required Tools (Important!)
To use the Smart Contract Scanner module, you MUST have the Solidity compiler (`solc`) installed and accessible in your system's PATH. Slither and Mythril depend on it to analyze contracts.

## Test Addresses

Use these addresses to demo the platform:
- **USDT Contract** (Safe baseline): `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- **Ronin Hacker Wallet** (High risk): `0x098B716B8Aaf21512996dC57EB0615e2383E2f96`
- **Bitfinex Hacker Wallet** (Flagged): `0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE`
