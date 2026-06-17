# CLAUDE.md — AXON 3.0 Development Context

This file is read by Claude Code at the start of every session in this repo. It defines what AXON is, what already exists, what we are building next, and the non-negotiable engineering rules for this codebase. Treat this as the system prompt for all work done here.

---

## 0. What AXON Is

AXON is a behavioral forensics engine for blockchain wallets and smart contracts. The core thesis: **label lookup is a dead end**. Chainalysis/TRM-style platforms flag a wallet only if it already appears in a known-bad database. That fails on every zero-day exploit wallet and every freshly generated laundering address. AXON instead scores **behavior** — transaction rhythm, graph topology, economic flow shape, and threat corpus correlation — so a wallet with zero history but textbook peel-chain structuring still gets flagged.

The database is *confirmation*, not *proof*. Never let that principle erode as we add database size and automation. A bigger database is not a smarter engine — it's evidence the engine cross-checks against, never the primary signal.

## 1. Current State (do not re-describe this as a TODO — it is DONE)

- **Frontend:** React 18, TailwindCSS, Vite, D3.js force graph. Pages: Overview, Wallet Investigation, Contract Investigation, Intelligence Databases.
- **Backend:** FastAPI, Uvicorn, SQLAlchemy, httpx. Already split into routers + services (not a monolith main.py) — match this convention for every new module. New domain = `{domain}_router.py` + `{domain}_service.py`, mirroring whatever naming the existing wallet/contract/intel modules use. Do not introduce a different pattern.
- **DB:** SQLite, `axon_intel.db`, 13,847+ labeled entities (hackers, scammers, mixers, exchanges, OFAC-sanctioned).
- **External data sources already wired in:** Etherscan API v2 (tx history, balance, contract source/ABI), Alchemy RPC (ERC-20 balances, on-chain state), Forta Network (GraphQL, real-time alerts), GoPlus Security (token-level honeypot/tax/admin checks), Groq Cloud Llama 3 70B (adversarial AI interpreter), CoinGecko (ETH/USD price).
- **Scoring engine:** 5-Layer behavioral model for wallets (L1 Behavioral Telemetry 30%, L2 Graph Topology 25%, L3 Economic Signals 20%, L4 Attribution Intelligence 15%, L5 Adversarial AI Interpreter 10%), and a parallel 5-Axis model for contracts (A1 Code Security 20%, A2 Admin/Economic Risk 15%, A3 Behavioral Fingerprint 30%, A4 Network Topology 15%, A5 Threat Intelligence 20%). Both feed an 8-class Entity Classifier (0.5x–1.5x modifier) and a cross-axis amplification layer (Rug Vector, Laundering Path, Bad Actor + Blind Code, Honeypot + Admin Drain).
- **Deployed:** Netlify (frontend) + Render (backend).

When working in this repo, assume all of the above is real, running code. Do not regenerate it. Every new feature below is additive — it plugs into this engine, it does not replace it.

## 2. Hard Rules — Read Before Writing Any Code

1. **Hard rules override AI judgment, always.** Honeypot detected → floor risk at 90, no exceptions. Blacklist function present → floor at 85. The L5/A5 AI layer's job is to *explain and contextualize* a verdict, never to override a deterministic rule downward. If you ever find yourself writing `if ai_says_safe: risk = lower`, stop — that's the exact failure mode this platform exists to prevent in competitors.
2. **No automatic, unreviewed learning.** The corpus grows from confirmed analyst feedback only (see §6, Feedback Loop). AXON never self-labels a wallet as malicious and silently writes that into `axon_intel.db` without a human-confirmed flag. Automated ingestion (§7) populates *candidate* labels in a staging table, never directly into the trusted corpus.
3. **Depth over breadth, every time there's a tradeoff.** Default instinct should be: make the Ethereum/EVM investigation deeper before making the platform wider. Full non-EVM chain explorers (Bitcoin's UTXO model, Solana's account model, Tron) are explicitly NOT in scope for this phase — see §3 for why and what we build instead.
4. **Every new DB write path needs a confidence/source field.** Never store a label without knowing whether it came from a paid attribution API, a scraped public list, or analyst feedback. This matters later for trust-weighting and for any audit/evidence-package use case (law enforcement handoff requires provenance).
5. **Performance-gate anything expensive.** Slither/Mythril static analysis is too slow to run on every contract scan. Tier it (see §5) — fast heuristic pass always, deep static analysis only above a risk threshold or on explicit user request.
6. **Match existing patterns, don't invent new ones.** New routers follow the existing router/service split. New DB tables live in the same SQLAlchemy models file/pattern as existing tables unless there's a clear reason (e.g., a new dedicated db file for case management, justified below) to separate them.

## 3. Module: Cross-Chain Holdings (NOT full multi-chain explorers)

This is the corrected version of "build explorers for every chain." Building a UTXO-model Bitcoin explorer, a Solana account-model explorer, and a Tron explorer from scratch is a multi-month effort each, and it dilutes the one thing that makes AXON good: deep EVM behavioral analysis. Don't do it.

What we build instead: a **multi-chain balance/holdings lookup** across EVM chains only, reusing existing provider integrations.

- Etherscan API v2 already supports a multichain endpoint under the same API key — use this as the primary path before reaching for a second provider. Alchemy also has multichain support on the same key as a fallback/cross-check. Don't introduce a third provider for this; you already have two that cover it.
- Target chains for v1: Ethereum, Base, Arbitrum, Polygon, Optimism, BSC, Avalanche — these are all EVM-compatible, meaning the *same* wallet address is valid across all of them and the existing address-parsing/validation logic doesn't change.
- New endpoint: `GET /scan/wallet/{address}/cross-chain-holdings`. Returns native + top-token balances per chain plus a computed total in USD (reuse the CoinGecko pricing integration already in place; extend it to the per-chain native assets).
- Output shape (this is the UX Kend already wants):
  ```
  Cross-Chain Holdings
  Ethereum     $15,000
  Base         $3,200
  Arbitrum     $4,100
  Polygon      $600
  BSC          $0
  Total Net Worth: $22,900
  ```
- This data point should also feed into the wallet's behavioral profile — e.g., a wallet active across 5 chains with synchronized timing might be a bot signature, which is a new lightweight signal for L1 Behavioral Telemetry rather than a separate explorer.
- Non-EVM chains (Bitcoin, Solana, Tron) are explicitly deferred. If asked to add them later, that's a new architecture decision, not an extension of this module — UTXO and account-based chains need fundamentally different transaction graph logic, and that's a Phase 5+ conversation, not something to sneak into this module.

## 4. Module: Transaction & Investigation Logging (Persistent History)

Right now investigations are ephemeral per-session. We need every wallet/contract ever scanned to be logged so old investigations are retrievable without re-scanning.

- New table: `investigation_log` (or matching existing naming convention) — columns at minimum: `entity_address`, `entity_type` (wallet/contract), `chain`, `scan_timestamp`, `risk_score`, `entity_class`, `triggered_signals` (JSON), `scan_depth` (quick/deep — see §5), `case_id` (nullable FK, see §8).
- Every `/scan/wallet/*` and `/scan/contract/*` call writes a row here regardless of whether the result is shown live or just logged. This is the backbone that makes "find old wallets" possible — a new endpoint `GET /investigations/history?address=` or `GET /investigations/search?query=` should let an analyst pull up everything ever scanned for an address without re-running the engine.
- This log is also what feeds the Feedback Loop (§6) and Case Management (§8) — don't build those as separate logging systems; they read from this one table.
- Cache logic: if a wallet was deep-scanned in the last N hours/days (configurable, e.g. 24h for quick, 7 days for deep) and no new on-chain activity has occurred since, serve from `investigation_log` instead of re-hitting Etherscan/Alchemy. This also reduces API quota burn, which matters once Bulk Mode (§9) is live and could otherwise hammer rate limits.

## 5. Module: Quick Scan vs Deep Scan (Re-analysis Engine)

Current scans cap at ~200 transactions. That misses long-tail history on older wallets.

- **Quick Scan** (default, current behavior): up to 200 most recent transactions, runs synchronously, powers the existing live UI.
- **Deep Scan** (new): paginates through full transaction history (5,000+ txs), runs as a background job (use FastAPI `BackgroundTasks` or a proper task queue if volume justifies it — don't block the request thread), updates the L1/L3 behavioral signals with the complete picture once done. UI should show a "Deep Scan in progress" state and notify/update when complete, not block.
- Deep Scan results get written to `investigation_log` with `scan_depth=deep` and should NOT be silently re-run on every page load — once a deep scan exists and no new on-chain txs have landed, serve the cached deep result (see §4 caching logic).
- Apply the same Quick/Deep tiering concept to contracts (§ below) — this is the same engineering pattern reused, not a separate system.

## 6. Module: Contract Deep Scan — Slither/Mythril Tiering

The complaint that "Slither and Mythril take too long" is solved by gating them, not by avoiding them.

- **Tier 1 (always runs, 1-2 seconds):** existing GoPlus Security check + bytecode/ABI/proxy/ownership/blacklist heuristics. This is the current A1/A2 fast path — keep it as-is.
- **Tier 2 (conditional, slow):** Slither + Mythril static analysis. Trigger only when: (a) Tier 1 composite risk > 70, or (b) the user explicitly clicks "Deep Analysis." Run this as a background job exactly like Deep Scan in §5 — don't make the user's browser hang on it.
- Slither/Mythril output should map into the existing A1 (Code Security) and A3 (Behavioral Fingerprint) axes as additional signal inputs, not as a separate scoring system bolted on the side. Keep one scoring engine, more inputs into it.
- This tiering is the direct answer to "people say it takes too long" — it's not that the tools are too slow to use, it's that they're too slow to run unconditionally on every single contract lookup.

## 7. Module: Threat Corpus — Auto-Updating, Phased

Goal: grow past 13,847 entities toward comprehensive exchange/mixer/scam coverage, with auto-updating, but **without** ingesting noise that degrades the corpus (avoid the "200,000 random scraped wallets" trap — volume without confidence is worse than no data).

**Phase A — Schema + Provenance (build first, this is the foundation everything else needs):**
- Extend the entity table (or add a companion table) with: `source` (e.g. `etherscan_label`, `github_osint_list`, `analyst_confirmed`, `paid_api`), `confidence` (numeric or enum), `last_verified`, `category` (exchange/mixer/scam/sanctioned/hacker), and for exchanges specifically, `cluster_id` so addresses can be grouped into entity clusters (e.g. "Binance Cluster — 54,000 addresses") rather than stored as flat unrelated rows.
- Add a `candidate_entities` staging table — this is where automated ingestion (Phase B) lands first. Nothing in `candidate_entities` is treated as ground truth by the scoring engine until promoted.

**Phase B — Free-source ingestion pipeline (build second):**
- Scheduled job (cron/Render scheduled job, or APScheduler if staying in-process) that pulls from free sources: known public exchange label lists, GitHub-maintained OSINT address lists, Etherscan's own public label cloud, OFAC SDN list updates. Each ingested record goes into `candidate_entities` with its `source` and a default low-to-medium confidence.
- Promotion from `candidate_entities` to the trusted corpus happens either via a periodic batch review (analyst spot-checks high-volume sources) or fully automatically only for the highest-trust sources (e.g., OFAC SDN — government sanctions list is trustworthy enough to auto-promote; a random GitHub gist is not). Be explicit in code comments about which sources are auto-promoted and why.

**Phase C — Paid API integration (later, once free sources are exhausted/insufficient):**
- Slot for a paid attribution provider (Chainalysis-style, or similar) feeding directly into the trusted corpus at high confidence, same schema, just a different `source` value. Build Phase A's schema so this slots in without a migration — `source` and `confidence` fields already support it.

This is intentionally phased so Kend can ship Phase A+B now and revisit Phase C when budget/need justifies a paid feed.

## 8. Module: Feedback Loop (Self-Healing Corpus)

This is the actual differentiator over static-database competitors — make sure it's built correctly.

- When an analyst reviews an AI-flagged wallet/contract (from `investigation_log`) and explicitly confirms or overrides the verdict (`confirmed_malicious`, `confirmed_benign`, `confirmed_scam`, `confirmed_honeypot`, `confirmed_phishing`), that confirmation — address, behavioral fingerprint snapshot, confirmed label, analyst-confirmed timestamp — gets written into the trusted corpus directly (not `candidate_entities` — human confirmation is the highest trust tier, skip staging).
- This is also the mechanism for the "stack suspicious wallets" idea from earlier — a critical-rated wallet, once confirmed, doesn't just sit in a log, it becomes a permanent corpus entry with full provenance.
- Never let this loop run unsupervised. The AI proposes, the analyst confirms, the corpus updates. If this constraint gets removed at any point, the corpus degrades into exactly the kind of noisy, untrustworthy database AXON was built to be better than.

## 9. Module: Bulk / Batch Investigation Mode

- New UI entry point: drag-and-drop CSV/TXT upload, or paste-a-blob-of-text-and-extract-addresses (regex extraction of `0x...` patterns from arbitrary report text — this covers the "I got a report with 50 addresses buried in prose" use case directly).
- Backend: new endpoint `POST /scan/bulk` accepting a list of addresses, processes them through the existing single-wallet scan pipeline sequentially or with bounded concurrency (respect external API rate limits — Etherscan/Alchemy/GoPlus all have limits, and bulk mode is the fastest way to blow through them, so add a concurrency cap and a queue, not a naive `asyncio.gather` over 200 addresses at once).
- Each result writes to `investigation_log` exactly as a normal scan would, tagged with a shared `bulk_batch_id` so they can be retrieved together.
- Output: a sorted report, riskiest entities first, structured the way the comparison report style already established for AXON's other PDF outputs (critical/high/medium/low buckets, counts, then per-wallet summary).
- Bulk results should also run the cross-wallet graph correlation logic (shared counterparties, similar behavioral fingerprints) to surface hidden links between the uploaded set — this is where Bulk Mode and Behavioral Clustering (§10) intersect; don't build them as fully separate systems.

## 10. Module: Case Management + Behavioral Clustering

These two are tightly coupled — build them together, with Case Management owning persistence and Clustering owning the intelligence.

- **Case Management:**
  - New table set (can be a dedicated `cases.db` or tables within the main DB — dedicated file is reasonable here since case data has a different lifecycle/access pattern than the threat corpus): `cases`, `case_entities` (join table linking cases to wallets/contracts from `investigation_log`), `case_notes`, `case_evidence`.
  - A case is a persistent workspace: multiple wallets/contracts, analyst notes, flagged transactions, and saved graph layouts, all under one case ID, retrievable across sessions.
  - Bulk Mode (§9) should support "add this entire batch to a case" directly — this is the "case can further lock in with the bulk" connection. A `bulk_batch_id` should be attachable to a `case_id` in one action.
  - Evidence export: compile a case into a structured report (reuse whatever PDF generation approach is already used for AXON's existing report exports) for law-enforcement/compliance handoff. Provenance fields from §7 matter here — an evidence package needs to show *why* each entity was flagged, not just that it was.

- **Behavioral Clustering:**
  - When multiple wallets in a case (or a bulk batch) show matching behavioral fingerprints (round-denomination patterns, fan-out/fan-in shape, timing correlation, peel-chain structuring) above a similarity threshold, auto-group them as a "Likely Single Operator Campaign" — this happens *before* any database label is checked, which is the point: behavioral clustering catches coordinated zero-day wallets that no label lookup would ever connect.
  - This reuses L1 (Behavioral Telemetry) and L2 (Graph Topology) signal data already computed per-wallet — don't recompute from scratch, store the fingerprint vector at scan time (in `investigation_log` or a companion table) so clustering is a comparison operation, not a re-analysis.

## 11. Logging

Separate from `investigation_log` (which is forensic data), add standard application logging across all new modules — structured logs (not print statements) for: bulk batch job start/progress/completion, deep scan background job lifecycle, corpus ingestion pipeline runs (Phase B), and feedback loop promotions. This matters for debugging the background job system once Deep Scan and Bulk Mode are both running async work, and it's cheap to add now versus painful to retrofit later.

## 12. Build Order

This is the order that compounds value fastest and avoids building on shaky foundations:

1. Transaction/Investigation Logging (§4) — everything else reads/writes this table, build it first.
2. Quick/Deep Scan tiering for wallets (§5) — straightforward, immediately useful, no new dependencies.
3. Cross-Chain Holdings (§3) — high visible value, low complexity, reuses existing providers.
4. Bulk Investigation Mode (§9) — depends on §4 for logging, big ROI.
5. Case Management (§10, case half) — depends on §4 and benefits from §9 existing.
6. Threat Corpus Phase A schema (§7) — needed before Phase B ingestion or the Feedback Loop can write anywhere meaningful.
7. Feedback Loop (§8) — depends on §7 schema.
8. Behavioral Clustering (§10, clustering half) — depends on fingerprint data already being stored per §4/§5.
9. Contract Deep Scan tiering / Slither-Mythril (§6) — independent, can slot in anytime, but lower urgency than the wallet-side work.
10. Threat Corpus Phase B (automated free-source ingestion) — do this once Phase A schema has been live long enough to validate it's storing provenance correctly.
11. Threat Corpus Phase C (paid API) — later, budget-dependent.

Do not skip ahead to Bulk Mode or Clustering before the logging table exists — it will mean rebuilding both once §4 lands anyway.

## 13. What This Is Not

To keep scope honest: this phase does not include full non-EVM explorers (§3), unsupervised AI-driven corpus mutation (§2, §8), or running Slither/Mythril unconditionally on every contract (§6). If a future request pushes toward any of these, flag the tradeoff explicitly rather than quietly building it — these were deliberate scope cuts, not oversights.
