# AXON — Blockchain Behavioral Intelligence Report Spec
> The UFED/XRY equivalent for crypto. Pure on-chain data → full investigator-ready report.

---

## WHAT AXON IS

AXON is not a surveillance tool. AXON is not a tracking tool.
AXON is a **post-hoc behavioral intelligence engine**.

By the time AXON runs, the wallet address is already known.
The job is not to find the person. The job is to **understand the person** — their logic, their patterns, their network, their behavior — entirely from on-chain data.

Output: a single structured intelligence report that a digital forensics lab can attach to a case file, present in court, or hand to law enforcement.

No speculation. No surveillance. Pure data → pattern → report.

---

## THE AXON REPORT STRUCTURE

### SECTION 1 — SUBJECT WALLET PROFILE

```
Wallet Address     : 0x... / bc1... / TXxxx...
Chain(s) Active    : Ethereum, Bitcoin, Tron, BSC, ...
First Seen         : [date of first on-chain tx]
Last Seen          : [date of most recent tx]
Wallet Age         : X days / months / years
Total Txs          : N
Classification     : [EOA / Contract Wallet / Exchange Deposit / Mixer Input / ...]
Risk Score         : [0–100] — AXON Proprietary
```

**What this tells investigators:**
- Is this a fresh wallet (created to obfuscate) or aged (long-term operator)?
- Is it a personal wallet, a contract, or an exchange-controlled address?
- First-seen date anchors the timeline to real-world events.

---

### SECTION 2 — ACTIVITY TIMELINE & VELOCITY

```
┌─────────────────────────────────────────────────────────┐
│  ACTIVITY HEATMAP                                       │
│                                                         │
│  Jan ██░░░░░░  Feb ████░░░░  Mar ████████  Apr ██████  │
│  May ░░░░░░░░  Jun ░░░░░░░░  Jul ██░░░░░░  Aug ████░░  │
│                                                         │
│  Peak Activity Period : Mar 2023 – Apr 2023             │
│  Dormancy Periods     : May–Jun 2023 (60 days silent)   │
└─────────────────────────────────────────────────────────┘
```

**Metrics extracted:**
- **Start date** — when did they enter the chain?
- **Transaction frequency** — txs per day / week / month
- **Velocity spikes** — sudden bursts of activity (operational surges)
- **Dormancy gaps** — deliberate pauses (cooling-off behavior)
- **Time-of-day pattern** — what timezone does activity cluster in?
- **Day-of-week pattern** — weekday operator vs weekend activity

**Investigator significance:**
Velocity spikes often correlate with real-world events — a drug shipment, a ransomware campaign payout, a market manipulation window. Dormancy after a spike = deliberate cooling off. Timezone clustering can narrow geography.

---

### SECTION 3 — INFLOW ANALYSIS (WHO IS SENDING TO SUBJECT)

```
TOP INFLOW SOURCES
──────────────────────────────────────────────────────────
Rank  Address            Entity Tag        Total In    Txs
1.    0xABC...           Binance Hot       12.4 ETH    34
2.    0xDEF...           UNKNOWN           8.1 ETH     12
3.    0xGHI...           Tornado Cash      5.9 ETH     3
4.    0xJKL...           UNKNOWN           3.2 ETH     7
──────────────────────────────────────────────────────────
Total Inflow             :  29.6 ETH
Exchange-sourced %       :  41.9%
Mixer-sourced %          :  19.9%
Unknown/Untagged %       :  38.2%
```

**Patterns flagged:**
- High mixer-sourced % → deliberate obfuscation of fund origin
- Exchange inflows with KYC → subpoena target identified
- Repeated untagged senders → possible peer network (other wallets in same operation)

---

### SECTION 4 — OUTFLOW ANALYSIS (WHO IS SUBJECT SENDING TO)

```
TOP OUTFLOW DESTINATIONS
──────────────────────────────────────────────────────────
Rank  Address            Entity Tag        Total Out   Txs
1.    0xRST...           UNKNOWN           9.8 ETH     28
2.    0xUVW...           UNKNOWN           7.4 ETH     19
3.    0xXYZ...           Kraken Deposit    6.2 ETH     4
4.    0xMNO...           UNKNOWN           4.1 ETH     11
──────────────────────────────────────────────────────────
Total Outflow            :  27.5 ETH
To exchanges (cashout)   :  22.5%
To unknown wallets       :  77.5%
```

**Key questions AXON answers here:**
- Selling to many people or few? → Retail distribution vs wholesale
- High-value single transfers or many small ones? → Structured layering behavior
- Are outflow addresses clustered? → Same operator controlling multiple wallets
- Exchange cashout addresses → subpoena targets with real identity behind KYC

---

### SECTION 5 — COUNTERPARTY NETWORK MAP

```
                    [UNKNOWN-A]
                        │
          [Tornado]──[SUBJECT]──[Binance Deposit]
                        │
              ┌─────────┴──────────┐
         [UNKNOWN-B]          [UNKNOWN-C]
              │
         [UNKNOWN-D]──[Kraken Deposit]
```

**What this reveals:**
- **Depth of network** — is subject a hub, a leaf, or a relay?
- **Hub behavior** — receives from many, sends to few = aggregator/collector
- **Relay behavior** — receives and immediately forwards = layering node
- **Leaf behavior** — sends to one destination only = end-user / cashout

Cluster analysis groups unknown wallets that co-spend or co-receive → these are likely controlled by the same entity even if addresses differ.

---

### SECTION 6 — ASSET & CHAIN BEHAVIOR

```
CURRENCIES USED
────────────────────────────────────
Asset       Volume      % of Activity
BTC         4.2 BTC     38%
ETH         29.6 ETH    45%
USDT(TRC20) $4,200      12%
BNB         1.1 BNB     5%
────────────────────────────────────
Cross-chain activity detected: YES
Bridge protocols used: Multichain, Stargate
```

**Significance:**
- Multi-asset usage = sophisticated operator, not casual user
- Stablecoin (USDT) usage = value preservation, peer-to-peer payments, or fiat off-ramping
- Bridge usage = deliberate chain-hopping to break trail
- Single-asset, single-chain = simpler profile, easier to trace

---

### SECTION 7 — BEHAVIORAL FLAGS & ANOMALIES

Each flag is scored by confidence level (HIGH / MEDIUM / LOW).

```
FLAG                              CONFIDENCE   EVIDENCE
─────────────────────────────────────────────────────────────────
Mixer interaction detected        HIGH         3 txs to Tornado Cash
Structured transaction amounts    HIGH         Repeated 0.99 ETH sends (just under round number)
Rapid inflow-outflow cycling      HIGH         Avg hold time < 2 hours
Exchange deposit clustering       MEDIUM       4 deposits to Kraken in 72hr window
Chain-hop via bridge              MEDIUM       ETH→BSC via Stargate x2
Dormancy after high-value tx      MEDIUM       14-day silence after 12 ETH inflow
Round-number avoidance            LOW          No transactions at exact ETH integers
New wallet post-incident          LOW          Wallet created 3 days after known event date
─────────────────────────────────────────────────────────────────
```

---

### SECTION 8 — SUBJECT BEHAVIORAL PROFILE (THE INTELLIGENCE LAYER)

This is the AXON differentiator. Not just data — **interpretation**.

```
OPERATOR CLASS     : Mid-tier distribution node
SOPHISTICATION     : Moderate-High
OPERATIONAL STYLE  : Burst-and-cool (high activity → deliberate pause)
OBFUSCATION LEVEL  : Active (mixer use + chain hopping)
NETWORK ROLE       : Relay/distributor — not origin, not final cashout
GEOGRAPHIC HINT    : UTC+5:30 to UTC+7 activity clustering (Asia timezone band)
LIKELY USE CASE    : [Darknet market payments / Ransomware distribution / 
                       Fraud layering — ranked by pattern match]
```

**Reasoning transparency** — every conclusion maps back to specific flags:
- "Relay/distributor" ← avg hold time < 2hrs + sends to multiple unknowns
- "Moderate-High sophistication" ← mixer use + bridge use + structured amounts
- "Not origin" ← inflows from multiple sources, not a single funding wallet
- "Not final cashout" ← exchange deposits are small % of total outflow

---

### SECTION 9 — EXCHANGE SUBPOENA TARGETS

```
ACTIONABLE LEGAL TARGETS
──────────────────────────────────────────────────────────
Exchange     Deposit Address    Amount     Date        KYC Tier
Kraken       0xXYZ...          6.2 ETH    2023-03-14  Verified (KYC mandatory)
Binance      0xABC...          Inflow     2023-02-08  Likely KYC (>€1000)
──────────────────────────────────────────────────────────
Recommended action: Mutual Legal Assistance Treaty (MLAT) request
or direct subpoena to exchange compliance team.
```

These are the highest-value real-world identity leads from pure on-chain data.

---

### SECTION 10 — TIMELINE RECONSTRUCTION

```
DATE          EVENT                                    SIGNIFICANCE
──────────────────────────────────────────────────────────────────────
2022-11-03    Wallet created                           Activation
2022-11-05    First inflow: 2.0 ETH from Binance      Initial funding
2022-11-10    First outflow: 1.8 ETH to UNKNOWN-A     First distribution
2023-01-15    Tornado Cash interaction (1.9 ETH)       Obfuscation begins
2023-03-01    Velocity spike: 18 txs in 72hrs          Operational surge
2023-03-14    6.2 ETH sent to Kraken deposit           Cashout event
2023-03-28    14-day dormancy begins                   Cooling-off
2023-04-11    Activity resumes                         New operational cycle
──────────────────────────────────────────────────────────────────────
```

---

### SECTION 11 — RISK SCORE BREAKDOWN (AXON PROPRIETARY)

```
DIMENSION                    WEIGHT    SCORE    CONTRIBUTION
─────────────────────────────────────────────────────────────
Mixer / Obfuscation          25%       80/100   20.0
Counterparty Risk            20%       65/100   13.0
Behavioral Anomalies         20%       70/100   14.0
Network Topology Risk        15%       60/100   9.0
Chain Hop / Bridge Use       10%       75/100   7.5
Asset Diversity Risk         10%       50/100   5.0
─────────────────────────────────────────────────────────────
AXON COMPOSITE RISK SCORE :  68.5 / 100   →  HIGH RISK
```

---

### SECTION 12 — INVESTIGATOR SUMMARY (PLAIN LANGUAGE)

> This section is written for non-technical recipients: prosecutors, judges, law enforcement officers.

**Subject wallet `0x...` was active from [date] to [date] across [N] chains.**

The wallet received funds from [exchange] and [mixer], held them briefly (under 2 hours on average), and distributed to [N] unknown wallets before partially cashing out via Kraken. This pattern is consistent with a **layering node** in a money laundering or illicit distribution chain — not the originator of funds, and not the final beneficiary, but a deliberate relay in the middle.

The use of Tornado Cash on [date] and chain-bridging via Stargate indicates the operator was aware of blockchain traceability and actively attempted to obscure the trail. Despite this, exchange cashout points to Kraken and Binance represent actionable identity leads via legal process.

**Confidence level of this assessment: HIGH**
**Recommended next steps: Exchange subpoena (Kraken, Binance) + cluster expansion on UNKNOWN-A through UNKNOWN-D**

---

## AXON DATA SOURCES (PURE BLOCKCHAIN)

```
Source Type              Examples
────────────────────────────────────────────────────────
Block explorers          Etherscan, Blockchair, Tronscan, BSCScan
On-chain tx data         Raw RPC node queries
Entity labeling DB       AXON internal corpus (13,800+ entities)
Mixer/bridge detection   Known contract addresses + heuristic patterns
Cluster analysis         DBSCAN co-spend clustering engine
Risk scoring             5-axis proprietary model
```

No mobile data. No PC data. No surveillance. **Pure blockchain in → intelligence report out.**

---

## WHAT AXON IS NOT

| NOT AXON's job | WHY |
|---|---|
| Identifying the person | That's law enforcement + exchange subpoena |
| Surveillance / tracking | AXON is post-hoc, not real-time monitoring |
| Legal prosecution | AXON produces evidence, lawyers prosecute |
| Physical investigation | Out of scope — blockchain only |

---

## POSITIONING

```
Tool          Scope              AXON Equivalent?
──────────────────────────────────────────────────
Cellebrite    Mobile forensics   YES — for blockchain
XRY           Mobile forensics   YES — for blockchain  
Magnet AXIOM  Multi-source DFIR  Partial — blockchain layer only
Chainalysis   Blockchain intel   DIRECT COMPETITOR — but AXON is deeper behavioral
Elliptic      Blockchain intel   DIRECT COMPETITOR — but AXON adds operator profiling
──────────────────────────────────────────────────
```

**AXON's edge over Chainalysis/Elliptic:**
- Not just entity labeling — full **behavioral profiling**
- Operator class + sophistication + network role = things they don't produce
- Built for DFIR labs and law enforcement report format, not just compliance teams
- Open to smaller jurisdictions that can't afford Chainalysis enterprise licensing

---

*AXON — Blockchain Behavioral Intelligence. One address in. Full picture out.*
