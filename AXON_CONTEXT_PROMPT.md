# AXON — Master Context Prompt
> Drop this at the top of any AI session. This is the full context of what AXON is.

---

## WHAT IS AXON?

AXON is a **blockchain behavioral intelligence platform** — the Cellebrite/XRY equivalent for crypto forensics.

It takes a wallet address as input and produces a full investigator-ready intelligence report as output. It does not track people in real time, does not do surveillance, and does not identify suspects. By the time AXON runs, the wallet is already known. AXON's job is to **understand the operator behind the wallet** — their patterns, behavior, logic, network, and risk — entirely from on-chain data.

AXON is built for:
- Digital forensics labs
- Law enforcement & cybercrime units
- DFIR consultants
- Intelligence analysts
- Court-admissible evidence preparation

---

## THE CORE LOOP

```
Wallet Address (input)
        ↓
On-chain data pull (multi-chain)
        ↓
Entity labeling (AXON corpus — 13,800+ known entities)
        ↓
Behavioral analysis (velocity, counterparties, patterns, anomalies)
        ↓
Risk scoring (5-axis proprietary model)
        ↓
Intelligence Report (output) — structured, plain-language, court-ready
```

---

## WHAT AXON ANALYZES (BLOCKCHAIN ONLY)

| Dimension | What AXON extracts |
|---|---|
| Activity timeline | First seen, last seen, dormancy gaps, velocity spikes |
| Transaction frequency | Txs per day/week/month, time-of-day clustering |
| Inflow sources | Who funds the wallet, exchange vs mixer vs unknown |
| Outflow destinations | Who receives funds, how many, how often, in what amounts |
| Counterparty network | Hub / relay / leaf classification, co-spend clustering |
| Asset behavior | Which currencies, which chains, bridge/cross-chain usage |
| Obfuscation signals | Mixer use, structured amounts, chain-hopping, rapid cycling |
| Exchange interactions | Subpoena-actionable deposit addresses with KYC implications |

---

## THE 12-SECTION AXON REPORT

1. **Subject Wallet Profile** — address, chains, age, classification, risk score
2. **Activity Timeline & Velocity** — heatmap, frequency, dormancy, timezone hints
3. **Inflow Analysis** — who funds the subject, exchange vs mixer vs unknown %
4. **Outflow Analysis** — who subject pays, volume per counterparty, cashout %
5. **Counterparty Network Map** — visual graph, hub/relay/leaf role determination
6. **Asset & Chain Behavior** — currencies used, cross-chain bridges, chain-hop patterns
7. **Behavioral Flags & Anomalies** — scored flags: mixer use, structuring, rapid cycling, etc.
8. **Behavioral Profile** — operator class, sophistication, network role, geographic hints
9. **Exchange Subpoena Targets** — actionable KYC leads for law enforcement
10. **Timeline Reconstruction** — chronological event log with investigative significance
11. **Risk Score Breakdown** — 5-axis composite score with per-dimension weighting
12. **Investigator Summary** — plain-language narrative for prosecutors, judges, non-technical recipients

---

## AXON RISK SCORING — 5 AXES

```
Axis                        Weight
─────────────────────────────────
Mixer / Obfuscation          25%
Counterparty Risk            20%
Behavioral Anomalies         20%
Network Topology Risk        15%
Chain Hop / Bridge Use       10%
Asset Diversity Risk         10%
─────────────────────────────────
Output: 0–100 composite score
Bands: LOW (0–35) / MEDIUM (36–65) / HIGH (66–85) / CRITICAL (86–100)
```

---

## AXON'S POSITIONING

AXON is NOT Chainalysis. AXON is NOT Elliptic.

Those tools do **entity labeling** — they tell you "this address is Binance."
AXON does **operator profiling** — it tells you who the *person* behind the address behaves like, what role they play in the network, and what that means for an investigation.

```
Tool          What it does              AXON's edge
──────────────────────────────────────────────────────────────────
Chainalysis   Entity labeling, compliance   AXON adds behavioral profiling + operator class
Elliptic      Risk scoring, compliance      AXON adds network role + investigator narrative
Cellebrite    Mobile device forensics       AXON is the blockchain equivalent
XRY           Mobile device forensics       AXON is the blockchain equivalent
```

AXON is built for **forensics labs and law enforcement**, not compliance teams. The output format is a case-file-ready report, not a dashboard for a bank's AML team.

---

## TECH STACK (CURRENT)

- **Backend**: Python / FastAPI — deployed on Render
- **Frontend**: React — deployed on Netlify
- **Chains supported**: EVM (Ethereum, BSC, Polygon), Bitcoin, Tron (expanding)
- **Entity corpus**: 13,800+ labeled entities (exchanges, mixers, darknet markets, bridges, etc.)
- **Clustering engine**: DBSCAN co-spend clustering with normalized Euclidean distance
- **Data sources**: Public block explorers + RPC nodes (Etherscan, Blockchair, Tronscan, BSCScan)

---

## ENGINEERING RULES (ALWAYS FOLLOW)

- Every report output must be traceable to specific on-chain evidence — no speculation
- Risk scores must show per-axis breakdown, never just a final number
- Behavioral conclusions must map to the specific flags that produced them
- The investigator summary (Section 12) must always be written in plain English, no jargon
- All entity labels must cite source (AXON corpus / heuristic / confirmed exchange tag)
- Chain-hop detection must log the bridge contract address used, not just flag "bridge used"
- Mixer detection must distinguish: input-to-mixer vs output-from-mixer vs both

---

## WHAT AXON IS NOT / NEVER BUILDS

- Real-time surveillance or monitoring
- Identity resolution (AXON flags subpoena targets, does not dox)
- Legal prosecution tools (AXON produces evidence, lawyers use it)
- Mobile / PC forensics (blockchain data only)
- Price prediction or trading tools

---

## ONE-LINE PITCH

> AXON: one wallet address in, full behavioral intelligence report out — built for the forensics lab, not the compliance team.
