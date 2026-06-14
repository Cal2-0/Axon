# AXON — CLAUDE.md
## Blockchain Security Intelligence Platform
### Complete Pipeline Architecture, Efficiency Strategy & Development Specification

---

## 0. HOW TO READ THIS FILE

This is the single source of truth for building AXON. Every architectural decision is
documented here with its reasoning. Before writing any code, read the relevant section.
Sections are ordered by build priority — Phase 1 first, then refinements.

---

## 1. PROJECT CONTEXT

AXON is a blockchain forensics platform. The core loop is:

```
User submits a wallet address or contract address
       ↓
System fetches ALL available data from blockchain APIs
       ↓
System runs analysis (rules + ML + AI + DB lookup) in PARALLEL
       ↓
Results render progressively — graph and raw data first, AI verdict when ready
       ↓
Investigator sees a unified risk report with full evidence
```

The target user is a security analyst or forensic investigator who needs:
- Full transaction history (not sampled — every transaction)
- Risk score with explainable reasons
- Visual money flow graph
- AI-generated plain-English analysis
- Status visibility into which APIs are live

---

## 2. DIRECTORY STRUCTURE

```
axon/
├── backend/
│   ├── main.py                  # FastAPI entry point, routes, lifespan
│   ├── config.py                # API keys, constants, feature flags
│   ├── models.py                # Pydantic request/response models
│   ├── database.py              # SQLite init, connection, queries
│   │
│   ├── core/
│   │   ├── pipeline.py          # Master orchestrator — runs all stages in parallel
│   │   ├── health.py            # API health checker, background polling
│   │   └── cache.py             # In-memory LRU cache layer
│   │
│   ├── modules/
│   │   ├── fetcher.py           # All Etherscan + Alchemy API calls
│   │   ├── wallet_scorer.py     # Risk rules + Isolation Forest
│   │   ├── contract_scanner.py  # Slither + Mythril runner + parser
│   │   ├── graph_builder.py     # NetworkX graph construction
│   │   ├── malicious_db.py      # 13K+ address set, lookup logic
│   │   └── ai_analyst.py       # Grok API integration
│   │
│   └── data/
│       ├── malicious_wallets.json   # 13K+ known bad addresses (loaded at startup)
│       ├── exchange_wallets.json    # Known exchange deposit/hot wallets
│       └── mixer_addresses.json    # Tornado Cash + known mixer contracts
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── SearchBar.jsx
│   │   │   ├── StatusSidebar.jsx    # API health lights
│   │   │   ├── RiskCard.jsx
│   │   │   ├── TransactionGraph.jsx # D3.js force graph
│   │   │   ├── TransactionTable.jsx # Full tx list below graph
│   │   │   ├── AiAnalysis.jsx      # Grok response panel
│   │   │   ├── ContractReport.jsx
│   │   │   └── WalletReport.jsx
│   │   └── hooks/
│   │       ├── useAnalysis.js       # Polling hook for progressive loading
│   │       └── useHealth.js         # 60s interval API status poller
│
├── data_scripts/
│   └── build_malicious_db.py    # One-time script to compile address databases
│
└── CLAUDE.md                    # This file
```

---

## 3. THE EFFICIENCY PROBLEM & SOLUTION

### The Problem
Checking a wallet against 13,000+ addresses naively (a Python `for` loop) = O(n).
For 1000 transactions × 13,000 addresses = **13 million comparisons**.
That's slow and unacceptable.

Additionally:
- Etherscan rate-limits to 5 req/sec on free tier
- Multiple API calls for one wallet analysis (transactions, balance, labels, contract check)
- AI analysis takes 2–5 seconds
- Graph building on large tx sets can be CPU-heavy

### The Solution — Three-Layer Strategy

#### Layer 1: O(1) Malicious Address Lookup

Load ALL 13K+ addresses into a Python `set` at application startup (not per-request).
A Python set uses a hash table internally — lookup is O(1) regardless of set size.

```python
# malicious_db.py — loaded ONCE when the server starts

class MaliciousDB:
    _instance = None

    def __init__(self):
        self.malicious: set[str] = set()
        self.exchanges: dict[str, str] = {}   # address → exchange name
        self.mixers: dict[str, str] = {}      # address → mixer name
        self._load()

    def _load(self):
        with open("data/malicious_wallets.json") as f:
            raw = json.load(f)
            # Normalize all addresses to lowercase for case-insensitive matching
            self.malicious = {addr.lower() for addr in raw}

        with open("data/exchange_wallets.json") as f:
            raw = json.load(f)
            self.exchanges = {k.lower(): v for k, v in raw.items()}

        with open("data/mixer_addresses.json") as f:
            raw = json.load(f)
            self.mixers = {k.lower(): v for k, v in raw.items()}

    def check(self, address: str) -> dict:
        addr = address.lower()
        return {
            "is_malicious":  addr in self.malicious,
            "exchange":      self.exchanges.get(addr),
            "mixer":         self.mixers.get(addr),
        }

    @classmethod
    def get(cls):
        if cls._instance is None:
            cls._instance = MaliciousDB()
        return cls._instance
```

At startup in `main.py`:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load everything into memory before accepting requests
    MaliciousDB.get()           # loads 13K+ addresses into set
    HealthChecker.start()       # begins background API polling
    yield
```

**Result:** Checking 1000 transaction counterparties against 13K addresses takes
~0.2ms total. This is essentially free.

---

#### Layer 2: Parallel Async Pipeline

All independent API calls and processing stages run concurrently using `asyncio.gather()`.

```
WITHOUT parallelism (sequential):
  Fetch tx history    → 1.2s
  Fetch balance       → 0.4s
  Fetch labels        → 0.4s
  Check GoPlus API    → 0.6s
  Run ML scoring      → 0.3s
  Build graph         → 0.2s
  TOTAL               → 3.1s

WITH asyncio.gather() (parallel):
  [Fetch tx history + Fetch balance + Fetch labels + Check GoPlus] → 1.2s (longest wins)
  Run ML scoring + Build graph simultaneously                       → 0.3s
  TOTAL                                                             → ~1.5s
```

The full pipeline structure (see Section 5 for complete code pattern):

```python
# pipeline.py

async def run_wallet_analysis(address: str) -> dict:

    # STAGE 1: Fetch all data in parallel
    tx_history, balance, labels, goplus = await asyncio.gather(
        fetcher.get_transactions(address),
        fetcher.get_balance(address),
        fetcher.get_etherscan_labels(address),
        fetcher.get_goplus_risk(address),
        return_exceptions=True   # ← CRITICAL: one API failure doesn't kill the rest
    )

    # Handle partial failures gracefully
    tx_history = tx_history if not isinstance(tx_history, Exception) else []
    balance    = balance    if not isinstance(balance,    Exception) else "0"
    labels     = labels     if not isinstance(labels,     Exception) else {}
    goplus     = goplus     if not isinstance(goplus,     Exception) else {}

    # STAGE 2: Process in parallel (no API calls needed here)
    risk_score, graph_data, db_hits = await asyncio.gather(
        wallet_scorer.score(address, tx_history, balance, labels, goplus),
        graph_builder.build(address, tx_history),
        malicious_db.scan_transactions(tx_history),
    )

    # STAGE 3: AI analysis — runs LAST, non-blocking from user perspective
    # Returns immediately as a background task — frontend polls for it
    ai_task_id = await ai_analyst.submit_async(
        address=address,
        tx_history=tx_history,
        risk_score=risk_score,
        db_hits=db_hits,
        labels=labels,
    )

    return {
        "address":    address,
        "risk_score": risk_score,
        "graph":      graph_data,
        "db_hits":    db_hits,
        "labels":     labels,
        "balance":    balance,
        "tx_count":   len(tx_history),
        "transactions": tx_history,     # full list
        "ai_task_id": ai_task_id,       # frontend polls GET /ai/{task_id}
        "status":     "partial",        # full = all done including AI
    }
```

**Key rule:** `return_exceptions=True` on every `asyncio.gather()`. This ensures one
broken API (Etherscan timeout, Alchemy rate limit) returns `None` or `[]` instead of
crashing the entire analysis. The UI shows a yellow warning for that data point instead
of a 500 error.

---

#### Layer 3: Response Caching

Same wallet should not hit APIs twice within a short window.

```python
# cache.py — simple in-memory TTL cache (no Redis needed for MVP)

from functools import lru_cache
import time

_cache: dict[str, tuple[dict, float]] = {}
CACHE_TTL = 300  # 5 minutes

def cache_get(key: str) -> dict | None:
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
        del _cache[key]
    return None

def cache_set(key: str, data: dict):
    _cache[key] = (data, time.time())

# Usage in pipeline.py:
async def run_wallet_analysis(address: str) -> dict:
    cached = cache_get(f"wallet:{address}")
    if cached:
        return {**cached, "from_cache": True}
    result = await _run_full_pipeline(address)
    cache_set(f"wallet:{address}", result)
    return result
```

---

## 4. ETHERSCAN PAGINATION — FETCHING ALL TRANSACTIONS

The free Etherscan API returns max 10,000 transactions per request with pagination.
Never sample. Always fetch everything.

```python
# fetcher.py

async def get_transactions(address: str, max_pages: int = 10) -> list[dict]:
    """
    Paginate through all transactions for an address.
    Etherscan returns up to 10,000 per page, offset by page number.
    max_pages=10 gives up to 100,000 transactions before we cap.
    """
    all_txs = []
    page = 1
    per_page = 10000

    async with aiohttp.ClientSession() as session:
        while page <= max_pages:
            params = {
                "module":     "account",
                "action":     "txlist",
                "address":    address,
                "startblock": 0,
                "endblock":   99999999,
                "page":       page,
                "offset":     per_page,
                "sort":       "asc",
                "apikey":     ETHERSCAN_API_KEY,
            }
            try:
                async with session.get(ETHERSCAN_BASE, params=params, timeout=10) as r:
                    data = await r.json()

                if data["status"] == "0":
                    break  # No more transactions

                txs = data.get("result", [])
                all_txs.extend(txs)

                if len(txs) < per_page:
                    break  # Last page — fewer results than requested

                page += 1

            except asyncio.TimeoutError:
                break  # Return what we have, don't crash

    return all_txs
```

Also fetch internal transactions (ETH moved inside contract calls) and ERC-20 token
transfers separately — these are separate Etherscan endpoints.

```python
# Fetch all three in parallel
normal_txs, internal_txs, token_txs = await asyncio.gather(
    get_transactions(address),
    get_internal_transactions(address),
    get_token_transfers(address),
    return_exceptions=True
)
```

---

## 5. MALICIOUS DB SCAN — FULL TRANSACTION SET

Run every counterparty address from the full transaction list through the DB.
This catches wallets that never directly touched a scam address but sent to one.

```python
# malicious_db.py

def scan_transactions(transactions: list[dict]) -> dict:
    db = MaliciousDB.get()
    hits = {
        "direct_malicious":  [],  # target itself is in DB
        "counterparty_hits": [],  # a wallet it transacted with is in DB
        "exchange_hits":     [],  # funds landed at a known exchange
        "mixer_hits":        [],  # mixer interaction found
    }

    for tx in transactions:
        from_addr = tx.get("from", "").lower()
        to_addr   = tx.get("to",   "").lower()

        for addr in [from_addr, to_addr]:
            if not addr:
                continue

            result = db.check(addr)

            if result["is_malicious"]:
                hits["counterparty_hits"].append({
                    "address": addr,
                    "tx_hash": tx.get("hash"),
                    "value":   tx.get("value"),
                    "type":    "malicious_counterparty",
                })

            if result["exchange"]:
                hits["exchange_hits"].append({
                    "address":  addr,
                    "exchange": result["exchange"],
                    "tx_hash":  tx.get("hash"),
                    "value":    tx.get("value"),
                })

            if result["mixer"]:
                hits["mixer_hits"].append({
                    "address": addr,
                    "mixer":   result["mixer"],
                    "tx_hash": tx.get("hash"),
                })

    return hits
```

This function runs on the full tx list in ~5ms for 1000 transactions.
Every lookup is O(1) because of the pre-loaded set.

---

## 6. WALLET RISK SCORING LOGIC

```python
# wallet_scorer.py

RULES = [
    # (label, condition_fn, points)
    ("New wallet (< 30 days)",    lambda f: f["wallet_age_days"] < 30,           15),
    ("Very few transactions",     lambda f: f["tx_count"] < 5,                   10),
    ("Large first transaction",   lambda f: f["first_tx_value_eth"] > 10,        20),
    ("Dormancy break",            lambda f: f["dormancy_days"] > 180,            15),
    ("Few unique counterparties", lambda f: f["unique_counterparties"] < 3,      15),
    ("High volume sudden spike",  lambda f: f["volume_spike_ratio"] > 10,        20),
    ("Malicious counterparty",    lambda f: f["malicious_counterparty_count"] > 0, 40),
    ("Mixer interaction",         lambda f: f["mixer_hit_count"] > 0,            35),
    ("Exchange cashout",          lambda f: f["exchange_hit_count"] > 0,         10),
    ("Round number transfers",    lambda f: f["round_number_ratio"] > 0.8,       10),
]

def extract_features(address: str, transactions: list, balance: str, ...) -> dict:
    if not transactions:
        return default_features()

    sorted_txs = sorted(transactions, key=lambda x: int(x["timeStamp"]))
    now = int(time.time())

    first_ts = int(sorted_txs[0]["timeStamp"])
    last_ts  = int(sorted_txs[-1]["timeStamp"])

    # Dormancy: longest gap with no activity
    timestamps = [int(tx["timeStamp"]) for tx in sorted_txs]
    gaps = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps)-1)]
    max_gap_days = max(gaps) / 86400 if gaps else 0

    # Volume spike: compare last 10 tx avg vs overall avg
    values = [int(tx["value"]) / 1e18 for tx in sorted_txs]
    overall_avg = sum(values) / len(values) if values else 0
    recent_avg  = sum(values[-10:]) / min(10, len(values))
    spike_ratio = recent_avg / overall_avg if overall_avg > 0 else 1

    return {
        "wallet_age_days":           (now - first_ts) / 86400,
        "tx_count":                  len(transactions),
        "unique_counterparties":     len({tx["to"] for tx in transactions} | {tx["from"] for tx in transactions}),
        "first_tx_value_eth":        int(sorted_txs[0]["value"]) / 1e18,
        "dormancy_days":             max_gap_days,
        "volume_spike_ratio":        spike_ratio,
        "total_volume_eth":          sum(values),
        "malicious_counterparty_count": 0,  # filled in by pipeline after DB scan
        "mixer_hit_count":           0,
        "exchange_hit_count":        0,
        "round_number_ratio":        sum(1 for v in values if v == int(v)) / len(values) if values else 0,
    }

async def score(address: str, transactions: list, balance: str,
                labels: dict, goplus: dict) -> dict:
    features = extract_features(address, transactions, balance, labels)
    triggered_rules = []
    total_score = 0

    for label, condition, points in RULES:
        try:
            if condition(features):
                triggered_rules.append({"rule": label, "points": points})
                total_score += points
        except Exception:
            pass  # Malformed feature value — skip rule, don't crash

    # Isolation Forest anomaly contribution (0–30 bonus points)
    anomaly_contribution = await run_isolation_forest(features, transactions)
    total_score += anomaly_contribution

    # GoPlus override — if GoPlus flags it, floor at HIGH
    if goplus.get("is_honeypot") or goplus.get("is_malicious"):
        total_score = max(total_score, 50)

    total_score = min(total_score, 100)

    return {
        "score":            total_score,
        "level":            score_to_level(total_score),
        "triggered_rules":  triggered_rules,
        "anomaly_score":    anomaly_contribution,
        "features":         features,
    }

def score_to_level(score: int) -> str:
    if score <= 10:  return "SAFE"
    if score <= 20:  return "LOW"
    if score <= 45:  return "MEDIUM"
    if score <= 70:  return "HIGH"
    return "CRITICAL"
```

---

## 7. TRANSACTION GRAPH BUILDER

```python
# graph_builder.py

import networkx as nx

async def build(seed_address: str, transactions: list[dict]) -> dict:
    """
    Build a directed graph from the full transaction list.
    Nodes = wallet addresses
    Edges = individual transactions
    Node color = risk level (computed from DB hits)
    """
    db = MaliciousDB.get()
    G = nx.DiGraph()

    # Track node metadata
    node_meta: dict[str, dict] = {}

    def get_or_create_node(addr: str):
        if addr not in node_meta:
            check = db.check(addr)
            node_meta[addr] = {
                "address":   addr,
                "is_seed":   addr.lower() == seed_address.lower(),
                "malicious": check["is_malicious"],
                "exchange":  check["exchange"],
                "mixer":     check["mixer"],
                "color":     _node_color(addr, check),
                "tx_count":  0,
                "volume":    0.0,
            }
        return node_meta[addr]

    for tx in transactions:
        from_addr = tx.get("from", "").lower()
        to_addr   = tx.get("to",   "").lower()
        value_eth = int(tx.get("value", 0)) / 1e18
        ts        = int(tx.get("timeStamp", 0))

        if not from_addr or not to_addr:
            continue

        get_or_create_node(from_addr)
        get_or_create_node(to_addr)

        node_meta[from_addr]["tx_count"] += 1
        node_meta[to_addr]["tx_count"]   += 1
        node_meta[from_addr]["volume"]   += value_eth

        G.add_edge(from_addr, to_addr, **{
            "hash":      tx.get("hash", ""),
            "value_eth": value_eth,
            "timestamp": ts,
            "block":     tx.get("blockNumber", ""),
        })

    # Serialize to D3-compatible format
    nodes = [{"id": addr, **meta} for addr, meta in node_meta.items()]
    links = [
        {
            "source":    u,
            "target":    v,
            "value":     d.get("value_eth", 0),
            "hash":      d.get("hash"),
            "timestamp": d.get("timestamp"),
        }
        for u, v, d in G.edges(data=True)
    ]

    return {
        "nodes":      nodes,
        "links":      links,
        "node_count": len(nodes),
        "edge_count": len(links),
        "seed":       seed_address.lower(),
    }

def _node_color(addr: str, check: dict) -> str:
    if check["mixer"]:    return "#EF4444"   # red — mixer
    if check["exchange"]: return "#F59E0B"   # amber — exchange
    if check["is_malicious"]: return "#DC2626" # dark red — confirmed malicious
    return "#6366F1"                          # indigo — unknown
```

**Frontend note:** The graph must show the FULL transaction list as the edge set.
If a wallet has 1000 transactions, all 1000 edges render. For wallets with > 500 txs,
enable the "cluster mode" toggle that groups edges by counterparty and shows weight.

---

## 8. AI ANALYSIS — GROK INTEGRATION

Grok is called AFTER the data pipeline completes. It receives structured context and
returns a plain-English investigator verdict. It is non-blocking — the UI renders
graph + scores first, then the AI panel fills in when ready.

```python
# ai_analyst.py

import aiohttp
import asyncio
import uuid
from typing import Optional

GROK_API_URL = "https://api.x.ai/v1/chat/completions"
GROK_MODEL   = "grok-3-mini"   # use mini for speed; upgrade to grok-3 for accuracy

# Task store — simple in-memory dict (upgrade to Redis for multi-worker)
_tasks: dict[str, dict] = {}

async def submit_async(address: str, tx_history: list, risk_score: dict,
                       db_hits: dict, labels: dict) -> str:
    task_id = str(uuid.uuid4())
    _tasks[task_id] = {"status": "pending", "result": None}

    # Run in background — don't await here
    asyncio.create_task(_run_grok(task_id, address, tx_history, risk_score, db_hits, labels))
    return task_id

async def _run_grok(task_id: str, address: str, tx_history: list,
                    risk_score: dict, db_hits: dict, labels: dict):
    try:
        prompt = _build_prompt(address, tx_history, risk_score, db_hits, labels)

        async with aiohttp.ClientSession() as session:
            payload = {
                "model":       GROK_MODEL,
                "max_tokens":  600,
                "temperature": 0.2,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a senior blockchain forensic analyst. "
                            "Analyze the provided wallet data and give a clear, "
                            "structured investigation verdict. Be precise and factual. "
                            "Structure your response as: "
                            "1. VERDICT (one sentence) "
                            "2. KEY FINDINGS (bullet points) "
                            "3. RECOMMENDED ACTIONS (bullet points)"
                        )
                    },
                    {"role": "user", "content": prompt}
                ]
            }
            headers = {
                "Authorization": f"Bearer {GROK_API_KEY}",
                "Content-Type":  "application/json",
            }
            async with session.post(GROK_API_URL, json=payload,
                                    headers=headers, timeout=30) as r:
                if r.status == 200:
                    data = await r.json()
                    text = data["choices"][0]["message"]["content"]
                    _tasks[task_id] = {"status": "complete", "result": text}
                else:
                    _tasks[task_id] = {"status": "error", "result": f"HTTP {r.status}"}

    except Exception as e:
        _tasks[task_id] = {"status": "error", "result": str(e)}

def _build_prompt(address: str, tx_history: list, risk_score: dict,
                  db_hits: dict, labels: dict) -> str:
    n_malicious    = len(db_hits.get("counterparty_hits", []))
    n_mixers       = len(db_hits.get("mixer_hits", []))
    n_exchanges    = len(db_hits.get("exchange_hits", []))
    exchange_names = list({h["exchange"] for h in db_hits.get("exchange_hits", [])})
    mixer_names    = list({h["mixer"]    for h in db_hits.get("mixer_hits",    [])})

    return f"""
WALLET ANALYSIS REQUEST

Target Address: {address}
Risk Score: {risk_score['score']}/100 — {risk_score['level']}
Total Transactions: {len(tx_history)}

TRIGGERED RISK RULES:
{chr(10).join(f"- {r['rule']} (+{r['points']}pts)" for r in risk_score.get('triggered_rules', []))}

DATABASE HITS:
- Malicious counterparty interactions: {n_malicious}
- Mixer interactions: {n_mixers} {('('+', '.join(mixer_names)+')') if mixer_names else ''}
- Exchange cashout detected: {n_exchanges} {('('+', '.join(exchange_names)+')') if exchange_names else ''}

WALLET FEATURES:
- Age: {risk_score.get('features', {}).get('wallet_age_days', 0):.0f} days
- Unique counterparties: {risk_score.get('features', {}).get('unique_counterparties', 0)}
- Total volume: {risk_score.get('features', {}).get('total_volume_eth', 0):.4f} ETH
- Anomaly score: {risk_score.get('anomaly_score', 0)}/30

Known labels from Etherscan/Arkham: {labels if labels else 'None'}

Provide your forensic verdict.
""".strip()

def get_task(task_id: str) -> dict:
    return _tasks.get(task_id, {"status": "not_found"})
```

---

## 9. API HEALTH CHECKER

One background task pings all four services every 60 seconds.
Results are stored in memory and served via `/health`.
Frontend reads `/health` on load and every 60 seconds.

```python
# health.py

import asyncio
import aiohttp
import time

_status = {
    "etherscan": {"ok": None, "latency_ms": None, "checked_at": None},
    "alchemy":   {"ok": None, "latency_ms": None, "checked_at": None},
    "goplus":    {"ok": None, "latency_ms": None, "checked_at": None},
    "grok":      {"ok": None, "latency_ms": None, "checked_at": None},
}

CHECKS = {
    "etherscan": {
        "url": "https://api.etherscan.io/api",
        "params": {
            "module": "stats", "action": "ethsupply",
            "apikey": "{ETHERSCAN_API_KEY}"
        },
        "ok_check": lambda d: d.get("status") == "1"
    },
    "alchemy": {
        "url": "{ALCHEMY_URL}",
        "method": "POST",
        "json": {"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1},
        "ok_check": lambda d: "result" in d
    },
    "goplus": {
        "url": "https://api.gopluslabs.io/api/v1/token_security/1",
        "params": {"contract_addresses": "0xdac17f958d2ee523a2206206994597c13d831ec7"},
        "ok_check": lambda d: d.get("code") == 1
    },
    "grok": {
        "url": "https://api.x.ai/v1/models",
        "headers": {"Authorization": "Bearer {GROK_API_KEY}"},
        "ok_check": lambda d: "data" in d
    },
}

async def _check_one(name: str, config: dict):
    start = time.time()
    try:
        async with aiohttp.ClientSession() as session:
            method = config.get("method", "GET").upper()
            kwargs = {
                "url":     config["url"],
                "timeout": 8,
                "headers": config.get("headers", {}),
            }
            if method == "GET":
                kwargs["params"] = config.get("params", {})
                resp = await session.get(**kwargs)
            else:
                kwargs["json"] = config.get("json", {})
                resp = await session.post(**kwargs)

            data = await resp.json()
            ok   = config["ok_check"](data)
            latency = int((time.time() - start) * 1000)

            _status[name] = {
                "ok":         ok,
                "latency_ms": latency,
                "checked_at": int(time.time()),
            }
    except Exception as e:
        _status[name] = {
            "ok":         False,
            "latency_ms": None,
            "checked_at": int(time.time()),
            "error":      str(e),
        }

async def _poll_loop():
    while True:
        await asyncio.gather(*[_check_one(name, cfg) for name, cfg in CHECKS.items()])
        await asyncio.sleep(60)

def start():
    asyncio.create_task(_poll_loop())

def get_status() -> dict:
    return _status
```

**Frontend Status Sidebar:**
```jsx
// StatusSidebar.jsx
const STATUS_COLORS = { true: "bg-green-500", false: "bg-red-500", null: "bg-gray-400" }
const SERVICES = ["etherscan", "alchemy", "goplus", "grok"]

export default function StatusSidebar({ status }) {
  return (
    <div className="fixed right-4 top-20 flex flex-col gap-2 z-50">
      {SERVICES.map(name => (
        <div key={name} className="flex items-center gap-2 bg-[#0F0F1A] px-3 py-1.5 rounded-full border border-[#1E1E2E] text-xs text-gray-400">
          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status[name]?.ok ?? null]}`} />
          {name}
          {status[name]?.latency_ms && (
            <span className="text-gray-600">{status[name].latency_ms}ms</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## 10. API ENDPOINTS (FastAPI)

```python
# main.py

from fastapi import FastAPI, BackgroundTasks, HTTPException
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    MaliciousDB.get()       # load 13K addresses into memory
    health.start()          # begin background polling
    yield

app = FastAPI(title="AXON", lifespan=lifespan)

# ── Wallet Analysis ────────────────────────────────────────────────────────────

@app.post("/scan/wallet")
async def scan_wallet(body: WalletRequest):
    """
    Full wallet analysis. Returns immediately with data + ai_task_id.
    AI result fetched separately via GET /ai/{task_id}
    """
    result = await pipeline.run_wallet_analysis(body.address)
    return result

# ── Contract Analysis ──────────────────────────────────────────────────────────

# main.py

@app.post("/scan/contract")
async def scan_contract(body: ContractRequest):
    """
    Returns immediately with GoPlus verdict + task IDs for Slither/Mythril.
    Frontend polls separately for deep analysis.
    """
    result = await contract_scanner.run_contract_analysis(body.address)
    return result

@app.get("/analysis/{task_id}")
async def get_analysis_task(task_id: str):
    """
    Poll for Slither or Mythril results.
    Returns status: "pending" | "complete" | "error" | "timeout"
    """
    return contract_scanner.get_analysis_task(task_id)
# ── Transaction Graph ─────────────────────────────────────────────────────────

@app.get("/graph/{address}")
async def get_graph(address: str):
    """
    Returns D3-compatible graph JSON for a wallet address.
    Cached after first computation.
    """
    cached = cache_get(f"graph:{address}")
    if cached:
        return cached
    txs = await fetcher.get_all_transactions(address)
    graph = await graph_builder.build(address, txs)
    cache_set(f"graph:{address}", graph)
    return graph

# ── AI Results ────────────────────────────────────────────────────────────────

@app.get("/ai/{task_id}")
async def get_ai_result(task_id: str):
    """
    Poll for AI analysis result. Frontend calls this every 2s until status=complete.
    """
    return ai_analyst.get_task(task_id)

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def get_health():
    return health.get_status()
```

---

## 11. CONTRACT SCANNER PIPELINE

```python
# contract_scanner.py
# contract_scanner.py

import subprocess, json, tempfile, os, asyncio

async def run_contract_analysis(address: str) -> dict:
    """
    Fast response: fetch source + run GoPlus immediately.
    Slow response: Slither + Mythril run in background.
    """

    # STAGE 1: Fetch metadata FAST (all parallel, ~1–2s total)
    source_code, abi, metadata, goplus_check = await asyncio.gather(
        fetcher.get_contract_source(address),
        fetcher.get_contract_abi(address),
        fetcher.get_contract_metadata(address),
        fetcher.get_goplus_contract_risk(address),  # ← INSTANT risk score
        return_exceptions=True
    )

    if isinstance(source_code, Exception) or not source_code:
        return {
            "error": "Contract source not verified on Etherscan",
            "address": address,
            "metadata": metadata if not isinstance(metadata, Exception) else {},
            "abi": abi if not isinstance(abi, Exception) else {}
        }

    # STAGE 2: Return immediately with GoPlus verdict
    fast_result = {
        "address":           address,
        "metadata":          metadata if not isinstance(metadata, Exception) else {},
        "abi":               abi if not isinstance(abi, Exception) else {},
        "goplus_risk":       goplus_check if not isinstance(goplus_check, Exception) else {},
        "slither_task_id":   None,
        "mythril_task_id":   None,
        "status":            "partial",  # ← flag that deeper analysis is still running
    }

    # STAGE 3: Submit Slither + Mythril to background (non-blocking)
    # These run asynchronously; frontend polls for results separately
    slither_id = await _submit_slither_async(source_code, address)
    mythril_id = await _submit_mythril_async(source_code, address)

    fast_result["slither_task_id"] = slither_id
    fast_result["mythril_task_id"] = mythril_id

    return fast_result


# ── Background Task Storage ─────────────────────────────────────────────────────

_analysis_tasks: dict[str, dict] = {}

async def _submit_slither_async(source_code: str, address: str) -> str:
    """Submit Slither to background. Returns task_id for polling."""
    import uuid
    task_id = f"slither_{uuid.uuid4().hex[:8]}"
    _analysis_tasks[task_id] = {"status": "pending", "result": None}

    asyncio.create_task(_run_slither_task(task_id, source_code, address))
    return task_id

async def _run_slither_task(task_id: str, source_code: str, address: str):
    try:
        with tempfile.NamedTemporaryFile(suffix=".sol", mode="w", delete=False) as f:
            f.write(source_code)
            temp_path = f.name

        proc = await asyncio.create_subprocess_exec(
            "slither", temp_path, "--json", "-",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        os.unlink(temp_path)

        try:
            raw_json = json.loads(stdout.decode())
            findings = _parse_slither(raw_json)
            risk_score = _calculate_slither_score(findings)

            _analysis_tasks[task_id] = {
                "status":  "complete",
                "result":  {
                    "findings":   findings,
                    "risk_score": risk_score,
                    "raw_output": raw_json,
                }
            }
        except json.JSONDecodeError:
            _analysis_tasks[task_id] = {
                "status": "error",
                "result": "Invalid JSON from Slither"
            }

    except asyncio.TimeoutError:
        _analysis_tasks[task_id] = {"status": "timeout", "result": None}
    except Exception as e:
        _analysis_tasks[task_id] = {"status": "error", "result": str(e)}


async def _submit_mythril_async(source_code: str, address: str) -> str:
    """Submit Mythril to background. Returns task_id for polling."""
    import uuid
    task_id = f"mythril_{uuid.uuid4().hex[:8]}"
    _analysis_tasks[task_id] = {"status": "pending", "result": None}

    asyncio.create_task(_run_mythril_task(task_id, source_code, address))
    return task_id

async def _run_mythril_task(task_id: str, source_code: str, address: str):
    try:
        with tempfile.NamedTemporaryFile(suffix=".sol", mode="w", delete=False) as f:
            f.write(source_code)
            temp_path = f.name

        proc = await asyncio.create_subprocess_exec(
            "myth", "analyze", temp_path, "-o", "json",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=180)
        os.unlink(temp_path)

        try:
            raw_json = json.loads(stdout.decode())
            findings = _parse_mythril(raw_json)
            risk_score = _calculate_mythril_score(findings)

            _analysis_tasks[task_id] = {
                "status":  "complete",
                "result":  {
                    "findings":   findings,
                    "risk_score": risk_score,
                    "raw_output": raw_json,
                }
            }
        except json.JSONDecodeError:
            _analysis_tasks[task_id] = {
                "status": "error",
                "result": "Invalid JSON from Mythril"
            }

    except asyncio.TimeoutError:
        _analysis_tasks[task_id] = {"status": "timeout", "result": None}
    except Exception as e:
        _analysis_tasks[task_id] = {"status": "error", "result": str(e)}


def get_analysis_task(task_id: str) -> dict:
    return _analysis_tasks.get(task_id, {"status": "not_found"})

## 12. FRONTEND PROGRESSIVE LOADING PATTERN

The UI renders in stages. Never wait for everything before showing anything.

### Wallet Scan Progressive Loading
```
Stage 1 (instant)   → Search bar clears, loading skeleton appears
Stage 2 (~1.5s)     → Risk score card, wallet stats, raw transaction table appear
Stage 3 (~2s)       → Transaction graph renders (D3)
Stage 4 (~5-10s)    → AI analysis panel fills in (polls /ai/{task_id} every 2s)
```

### Contract Scan Progressive Loading
```
Stage 1 (1-2s)      → Instant response: GoPlus API verdict + contract metadata
Stage 2 (Background)→ Slither + Mythril run in parallel
Stage 3 (Polling)   → Frontend shows loading spinner, polls every 3s
Stage 4 (30-120s)   → Deep analysis panels populate as tools finish
```

```jsx
// ContractReport.jsx

import { useState, useEffect } from "react"

export default function ContractReport({ address, initialData }) {
  const [slitherResult, setSlitherResult] = useState(null)
  const [mythrilResult, setMythrilResult] = useState(null)
  const [slitherStatus, setSlitherStatus] = useState("pending")
  const [mythrilStatus, setMythrilStatus] = useState("pending")

  // Poll for Slither
  useEffect(() => {
    if (!initialData.slither_task_id) return
    
    const interval = setInterval(async () => {
      const res = await fetch(`/analysis/${initialData.slither_task_id}`)
      const data = await res.json()
      setSlitherStatus(data.status)
      if (data.status === "complete") {
        setSlitherResult(data.result)
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [initialData.slither_task_id])

  // Poll for Mythril
  useEffect(() => {
    if (!initialData.mythril_task_id) return
    
    const interval = setInterval(async () => {
      const res = await fetch(`/analysis/${initialData.mythril_task_id}`)
      const data = await res.json()
      setMythrilStatus(data.status)
      if (data.status === "complete") {
        setMythrilResult(data.result)
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [initialData.mythril_task_id])

  return (
    <div className="space-y-6">
      {/* Instant: GoPlus Risk Card */}
      <div className="bg-[#1A1A2E] border border-[#2D2D3A] rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">GoPlus Quick Risk Check</h3>
        <div className="text-sm text-gray-300">
          <p>Is Honeypot: {initialData.goplus_risk?.is_honeypot ? "⚠️ YES" : "✓ NO"}</p>
          <p>Risk Level: {initialData.goplus_risk?.risk_level || "N/A"}</p>
        </div>
      </div>

      {/* Slither Results (appears after 30–60s) */}
      <div className="bg-[#1A1A2E] border border-[#2D2D3A] rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">
          Slither Analysis {slitherStatus === "pending" && "⏳"}
          {slitherStatus === "complete" && "✓"}
          {slitherStatus === "timeout" && "⏱️"}
        </h3>
        {slitherStatus === "pending" && <p className="text-gray-500">Running static analysis...</p>}
        {slitherResult && (
          <div className="space-y-2 text-sm text-gray-300">
            {slitherResult.findings.map((f, i) => (
              <div key={i} className="p-2 bg-[#0F0F1A] rounded">
                <p className="font-semibold text-orange-400">{f.impact}</p>
                <p>{f.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mythril Results (appears after 60–120s) */}
      <div className="bg-[#1A1A2E] border border-[#2D2D3A] rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">
          Mythril Symbolic Execution {mythrilStatus === "pending" && "⏳"}
          {mythrilStatus === "complete" && "✓"}
          {mythrilStatus === "timeout" && "⏱️"}
        </h3>
        {mythrilStatus === "pending" && <p className="text-gray-500">Simulating attack paths...</p>}
        {mythrilResult && (
          <div className="space-y-2 text-sm text-gray-300">
            {mythrilResult.findings.map((f, i) => (
              <div key={i} className="p-2 bg-[#0F0F1A] rounded">
                <p className="font-semibold text-red-400">{f.type}</p>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

```jsx
// useAnalysis.js hook

export function useAnalysis() {
  const [state, setState] = useState({
    loading: false,
    data: null,
    aiResult: null,
    aiLoading: false,
  })

  const analyze = async (address) => {
    setState(s => ({ ...s, loading: true, data: null, aiResult: null }))

    // Stage 2+3: main analysis
    const result = await fetch(`/scan/wallet`, {
      method: "POST",
      body: JSON.stringify({ address }),
      headers: { "Content-Type": "application/json" }
    }).then(r => r.json())

    setState(s => ({ ...s, loading: false, data: result }))

    // Stage 4: poll for AI
    if (result.ai_task_id) {
      setState(s => ({ ...s, aiLoading: true }))
      pollAI(result.ai_task_id, setState)
    }
  }

  return { ...state, analyze }
}

async function pollAI(taskId, setState) {
  for (let i = 0; i < 15; i++) {         // max 30s of polling
    await new Promise(r => setTimeout(r, 2000))
    const res = await fetch(`/ai/${taskId}`).then(r => r.json())
    if (res.status === "complete") {
      setState(s => ({ ...s, aiResult: res.result, aiLoading: false }))
      return
    }
    if (res.status === "error") {
      setState(s => ({ ...s, aiResult: null, aiLoading: false }))
      return
    }
  }
  setState(s => ({ ...s, aiLoading: false }))   // timeout
}
```

---

## 13. DATA — BUILDING THE MALICIOUS ADDRESS DATABASE

Run this once to compile all address sources into your JSON files.

```python
# data_scripts/build_malicious_db.py

"""
Sources:
1. ethereum-etl labeled addresses (GitHub)
2. CryptoScamDB API
3. Etherscan Labels (manual export / scrape)
4. Tornado Cash contract addresses (manually verified)
5. Known exchange wallets (Arkham / Etherscan Labels)
"""

import requests, json

TORNADO_CASH_ADDRESSES = [
    "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",  # Tornado 0.1 ETH
    "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",  # Tornado 1 ETH
    "0xa160cdab225685da1d56aa342ad8841c3b53f291",  # Tornado 10 ETH
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",  # Tornado 100 ETH (add full list)
    "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936",  # Tornado Cash Router
    "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",
    "0x1e34a77868e19a6647b1f2f47b51ed72dede95dd",
]

EXCHANGE_WALLETS = {
    "0x28c6c06298d514db089934071355e5743bf21d60": "Binance",
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance",
    "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Binance",
    "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": "Coinbase",
    "0x503828976d22510aad0201ac7ec88293211d23da": "Coinbase",
    "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740": "Coinbase",
    "0x2910543af39aba0cd09dbb2d50200b3e800a63d2": "Kraken",
    "0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13": "Kraken",
    "0xe853c56864a2ebe4576a807d26fdc4a0ada51919": "Bybit",
    # Add more from Etherscan Labels / Arkham export
}

def fetch_cryptoscamdb():
    """CryptoScamDB has a public endpoint with known scam addresses."""
    try:
        r = requests.get("https://api.cryptoscamdb.org/v1/addresses", timeout=15)
        data = r.json()
        return [entry["address"] for entry in data.get("result", {}).values()
                if entry.get("address")]
    except Exception:
        return []

def build():
    print("Fetching CryptoScamDB...")
    scam_addresses = fetch_cryptoscamdb()
    print(f"Got {len(scam_addresses)} scam addresses")

    all_malicious = set(addr.lower() for addr in scam_addresses)

    print(f"Total malicious addresses: {len(all_malicious)}")

    with open("../backend/data/malicious_wallets.json", "w") as f:
        json.dump(list(all_malicious), f)

    with open("../backend/data/exchange_wallets.json", "w") as f:
        json.dump({k.lower(): v for k, v in EXCHANGE_WALLETS.items()}, f, indent=2)

    with open("../backend/data/mixer_addresses.json", "w") as f:
        json.dump({addr.lower(): "Tornado Cash" for addr in TORNADO_CASH_ADDRESSES}, f, indent=2)

    print("Done. Database files written.")

if __name__ == "__main__":
    build()
```

---

## 14. ENVIRONMENT VARIABLES (.env)

```env
# Etherscan — free tier, 100k req/day
ETHERSCAN_API_KEY=your_key_here

# Alchemy — free tier, very generous
ALCHEMY_API_KEY=your_key_here
ALCHEMY_URL=https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}

# GoPlus — free, no key needed for basic endpoints
# GOPLUS_API_KEY=optional

# Grok (xAI)
GROK_API_KEY=your_key_here

# App config
CACHE_TTL_SECONDS=300
MAX_TX_PAGES=10
PORT=8000
```

---

## 15. PHASE BUILD ORDER

### Phase 1A — Core Infrastructure (build first)
1. `database.py` — SQLite init
2. `config.py` — env vars
3. `malicious_db.py` — load address set into memory
4. `health.py` — API status checker
5. `fetcher.py` — Etherscan pagination
6. `main.py` — FastAPI skeleton with /health endpoint
7. `StatusSidebar.jsx` — just the health lights, wired to /health

Checkpoint: `/health` returns live API statuses on the frontend.

### Phase 1B — Wallet Analysis
1. `wallet_scorer.py` — features + rules
2. `graph_builder.py` — NetworkX + D3 JSON
3. `pipeline.py` — asyncio.gather orchestration
4. `RiskCard.jsx`, `TransactionTable.jsx`, `TransactionGraph.jsx`

Checkpoint: paste a wallet address, get risk score + graph + tx table.

### Phase 1C — AI Layer
1. `ai_analyst.py` — Grok integration, background task
2. `AiAnalysis.jsx` — polling panel

Checkpoint: AI verdict appears 5-10s after scan without blocking the rest of the UI.

### Phase 1D — Contract Scanner (MVP)
1. `contract_scanner.py` — GoPlus integration (Instant risk score)
2. `ContractReport.jsx` — Basic UI showing GoPlus verdict

Checkpoint: paste a contract address, get instant basic risk report (1-2s response).

### Phase 2 — Deep Contract Analysis (Async)
1. `contract_scanner.py` — Add Slither + Mythril background tasks
2. `ContractReport.jsx` — Add polling logic and async UI updates
3. AI verdict (Grok) on the full audit findings

Checkpoint: Background static analysis and symbolic execution running without blocking UI.

### Phase 3 — OSINT + Exchange & Mixers
- OSINT module: search GitHub/Reddit/Twitter APIs for address mentions
- Exchange Identifier: already partially done via exchange_wallets.json
- Mixer detection: already partially done via mixer_addresses.json
- Case Management: SQLite CRUD — create case, attach wallets, export PDF

---

## 16. CRITICAL RULES FOR THIS CODEBASE

1. **Always `return_exceptions=True`** in every `asyncio.gather()` call.
   One broken API must never kill a full analysis.

2. **Normalize addresses to lowercase** before any DB lookup or comparison.
   `0xABC` and `0xabc` are the same address. Inconsistency causes false negatives.

3. **Never block the event loop** with subprocess calls.
   Always use `asyncio.create_subprocess_exec`, never `subprocess.run`.

4. **Load the malicious DB once at startup**, not per-request.
   The set lookup is O(1) but loading from disk repeatedly is wasteful.

5. **The graph shows ALL transactions**. Do not sample or truncate the tx list.
   If a wallet has 1000 txs, all 1000 render. Use D3 zoom/pan for navigation.

6. **AI analysis is always optional**. If Grok is down or rate-limited,
   the rest of the platform still works perfectly. The AI panel shows
   "Analysis unavailable" — not an error page.

7. **Cache aggressively**. A 5-minute cache on wallet results means
   a mentor demoing the same wallet twice doesn't hit API limits.

8. **Never hardcode API keys**. All secrets live in `.env`.
   The `.env` file is in `.gitignore`.

---

## 17. QUICK REFERENCE — COMPLEXITY MAP

| Operation                          | Complexity | Notes                            |
|------------------------------------|-----------|----------------------------------|
| Malicious DB lookup (single addr)  | O(1)      | Python set, loaded at startup    |
| Scan 1000 txs against 13K DB       | O(1000)   | 1000 × O(1) lookups              |
| Build graph from 1000 txs          | O(1000)   | One pass through tx list         |
| Etherscan pagination (1000 txs)    | O(pages)  | ~1-2 API calls, async            |
| Isolation Forest scoring           | O(n)      | n = feature vector length (~15)  |
| Slither analysis                   | O(LOC)    | Subprocess, parallel with Mythril|
| AI analysis (Grok)                 | O(tokens) | Background, non-blocking         |

Total expected response time for Phase 1 wallet scan:
- **Fast wallet (< 100 txs):** ~1.5–2s
- **Normal wallet (100–500 txs):** ~2–3s
- **Heavy wallet (1000+ txs):** ~3–5s
- **AI verdict arrives:** +5–10s (non-blocking, polling)

---

*Last updated: AXON Phase 1 build — refer to AXON_PHASE1.md for detailed module specs.*
