# AXON v2.0 — FINAL RELEASE BLOCKER AUDIT
**Reviewed by:** Joint Review Board (FBI Blockchain Unit / Europol Crypto Intel / Chainalysis / TRM Labs / DFIR Examiner / Chain Engineers / Backend & Frontend Architects / QA / Security / Procurement)
**Evidence base:** 12 live AXON-generated reports (7 wallet, 3 bulk, 1 contract, 1 case dossier), `03_Engine_and_CrossChain_Implementation.md`, `00_Viva_Interview_Defense_Handbook.md`
**Verdict: REJECT — not production ready. See Final Score.**

---

## EXECUTIVE SUMMARY

The architecture is sound. The 5-axis scoring model, the deterministic address-identification pipeline, and the SHA-256 evidence chain are all well-designed on paper. That is not what's on trial here.

What's on trial is what actually came out of the machine. Twelve real reports were reviewed. The board's finding, in one sentence: **AXON works for Ethereum and silently fails for everything else, and even the Ethereum path has active data-integrity bugs that would not survive cross-examination.**

Three findings drove the REJECT verdict:

1. Bitcoin, Solana, and TRON reports are physically **one-third the size** of Ethereum reports (2.2–2.3 KB vs 6–7 KB) and are missing Evidence Integrity, Executive Summary, Subject Profile, and every findings section. This is not a formatting issue — it is data simply not being collected or not surviving normalization for non-EVM chains.
2. The Case Dossier (`CASE-2026-002`) shows `Total Subjects: 0` while listing 11 subjects, `Average Risk: 0/100` while individual entities score up to 80/100, every `Address` and `Class` column is blank, and every AI narrative section reads `N/A` or "No summary available." This report could not be handed to anyone.
3. A verified contract (USDT — one of the most-verified contracts on Ethereum) is reported as `Source Code Verified: No`. A factual error on a report's most basic field is the kind of thing that gets an entire evidentiary submission thrown out.

---

## FINAL SCORE

```
Blockchain Data Coverage        3 / 10   (EVM only; BTC/SOL/TRON functionally broken)
Report Quality & Completeness   3 / 10   (empty reports, wrong verdicts, case dossier non-functional)
Chain Identification Routing    5 / 10   (Tier 1 deterministic design is correct; execution has routing bugs)
AI / Dual Mode                  4 / 10   (single-agent output masquerading as dual; case AI synthesis dead)
Evidence Integrity               7 / 10   (hash design is correct; failure messaging is opaque)
API Coverage                     6 / 10   (good chain-native choices; no backups, no documented rate-limit handling)
Security                         5 / 10   (no findings of critical vulns, but unverified assumptions throughout)
Performance                      6 / 10   (semaphore-throttled bulk is reasonable; duplicate calls suspected)
Demo Data                        4 / 10   (multiple demo addresses return dead/empty reports)

OVERALL: 4.5 / 10 — REJECT
```

**Recommendation: REJECT. Do not deploy.** The EVM path is close to shippable once the four Critical Blockers below are fixed. The BTC/SOL/TRON path needs re-verification from data-fetch through report-render before those chains can be represented as "supported" anywhere in the product.

---

## CRITICAL RELEASE BLOCKERS

### CB-1 — Non-EVM reports are missing 80% of their content

**Problem:** Wallet reports for BTC (`34xp4vRo...`), TRON (`TXLAQ63X...`), and a second BTC address (`1A1zP1eP...`) contain only the cover line, engine disclaimer, and risk band. No Evidence Integrity section, no Executive Summary, no Subject Profile, no Key Findings, no Counterparties, no Timeline. Compare file sizes directly from the evidence set: `AXON_Report_AXON-W-1784006207-34xp4vRo-9dd057.pdf` = 2,273 bytes vs `AXON_Report_AXON-W-1784005837-0xae2Fc4-c675e3.pdf` (ETH) = 7,062 bytes. Same report template, same engine version, one-third the content.

**Root Cause:** The Normalization Layer (per `00_Viva_Interview_Defense_Handbook.md` §4) is supposed to convert every chain's raw payload — Blockchain.info's UTXO structure, Solscan's SPL transfer history, Tronscan's TRC-20 movements — into the same internal schema (`Incoming Flow`, `Outgoing Flow`, `Timestamps`, `Counterparties`, `Volume`) that `report_generator.py` reads from. The EVM path clearly populates this schema correctly. The BTC/SOL/TRON paths almost certainly do not — either the chain-specific scorer modules (`btc_scorer.py`, `sol_scorer.py`, `tron_scorer.py`) aren't mapping fields into the shared schema, or the normalization step is silently failing per-chain and defaulting to an empty object. Because `report_generator.py`'s "No Empty Shells" rule omits any section with no data, a normalization failure and a genuinely-empty wallet produce **visually identical output** — the report can't tell the investigator which one happened.

**Impact:** Three of AXON's four advertised supported chains are non-functional for investigators. This is not a rough edge — it's the majority of the product's stated scope.

**Exact Files:** `backend/modules/btc_scorer.py`, `backend/modules/sol_scorer.py`, `backend/modules/tron_scorer.py`, the shared normalization layer (unnamed in provided docs — locate the module that maps chain-native responses to `Incoming Flow / Outgoing Flow / Timestamps / Counterparties / Volume`), `backend/modules/report_generator.py`

**Recommended Fix:**
1. Add a normalization-layer unit test per chain: feed a known-good raw payload from Blockchain.info / Solscan / Tronscan and assert the output object has non-null `counterparties`, `first_seen`, `last_active`, `tx_count` fields.
2. Log (not silently swallow) any normalization step that produces an empty object where the raw API response was non-empty — this is the single highest-value diagnostic to add.
3. Do not let "No Empty Shells" apply to a section where the raw upstream data existed but normalization produced nothing — that's a bug state, not an empty state, and should render as an explicit `[DATA NORMALIZATION ERROR — raw data received, mapping incomplete]` rather than silently vanishing.

**Priority: CRITICAL — blocks release**

---

### CB-2 — Case Dossier is non-functional

**Problem:** `AXON-CASE-2026-002-Master-Report.html` shows `Total Subjects: 0` while the roster table lists 11 rows. `Average Risk: 0/100` while individual roster rows show scores up to `80/100`. Every `Address` cell in the roster is blank. Every `Class` cell reads `N/A`. `Executive Verdict Summary: No summary available.` `Threat Assessment: N/A`. `Money Flow Analysis: N/A`. `Compliance & Policy Implications: N/A`.

**Root Cause:** Two independent failures stacked on top of each other. First, the case-level aggregation function is almost certainly reading the wrong field name when pulling `address` and `entity_class` from child reports (e.g. expecting `entity.address` when the child record stores it as `entity.target` or `entity.target_entity` — consistent with the field name `Target Entity` seen at the top of every individual wallet PDF). Second, `Total Subjects: 0` and `Average Risk: 0` while the roster is populated means the summary-statistics calculation is running against a different (empty) collection than the one used to render the roster table — a classic "computed before the async gather completed" or "wrong variable" bug. Third, the case-level AI synthesis call (Groq/OpenRouter) is failing and defaulting to placeholder text instead of surfacing the error.

**Impact:** The single most valuable AXON-native output for an actual multi-entity investigation — the aggregated case report — cannot currently be handed to anyone. It would immediately raise "does this tool even work" doubts in front of a reviewing officer.

**Exact Files:** Case aggregation module (likely `backend/modules/case_manager.py` or similar, not named in provided docs — locate the function that builds the `Master Case Report` payload), case AI synthesis call site

**Recommended Fix:**
1. Fix the field-name mismatch between child-report `target_entity`/`address` and whatever key the case roster template reads.
2. Compute `Total Subjects` and `Average Risk` from the *same* in-memory list that populates the roster table — not a separately-fetched or separately-filtered collection.
3. Wrap the case-level AI synthesis call in the same try/except-with-logging pattern described for per-wallet scans in the Viva handbook (§9, "How resilient is your backend"), and surface the actual failure reason in a small `[AI synthesis unavailable — see engine log]` note instead of a blank "No summary available."

**Priority: CRITICAL — blocks release**

---

### CB-3 — Factually incorrect verification status on a known-verified contract

**Problem:** `AXON_Report_AXON-C-1784005802-0xdAC17F95.pdf` (USDT — `0xdac17f958d2ee523a2206206994597c13d831ec7`) reports `Source Code Verified: No`. USDT is one of the most-verified, most-scrutinized contracts on Ethereum. This is not an edge case; it's the single most recognizable contract address you could test against, and the field is wrong.

**Root Cause:** The Etherscan `getsourcecode` call is either not being made for this report, timing out silently, or the response parsing is checking the wrong field (e.g. treating an empty `ABI` field as "unverified" when `SourceCode` itself is in fact populated).

**Impact:** This is the exact class of error the board's brief specifically warns about: "the data is correct, good format, comes properly displayed" is the bar, and a wrong verification flag on a report's most legally load-bearing field (is this contract's behavior auditable or not) is disqualifying on its own.

**Exact Files:** `backend/modules/contract_scorer.py` (or equivalent), the Etherscan `getsourcecode` integration point

**Recommended Fix:** Add a regression test asserting `Source Code Verified: Yes` for USDT, USDC, and the Uniswap V3 Router (all confirmed verified in earlier testing this cycle) before any contract-report change ships.

**Priority: CRITICAL — blocks release**

---

### CB-4 — ERC-20 transfers still render as "0.00000 ETH" with no token identification

**Problem:** `AXON_Report_AXON-W-1784005837-0xae2Fc4-c675e3.pdf` shows 10 transactions, all `OUT`, all `0.00000 ETH` — yet the Asset Inventory section for the same report shows `ERC-20 Tokens: 41`. The wallet clearly has token activity. The timeline shows none of it. This is the same defect flagged earlier in this engagement (Fix 5 in the prior gameplan) and it has resurfaced — either it was never actually deployed, or it regressed.

**Root Cause:** The timeline-rendering path is reading `tx.value` (native ETH transferred) without checking `tx.input` for an ERC-20 `transfer()` call signature and fetching the corresponding token-transfer record. Native value is correctly `0` for a token transfer — the bug is that nothing else is shown in its place.

**Impact:** An investigator reading this report cannot tell what actually moved. A wallet that sent $50,000 in USDT looks identical in this report to a wallet that sent nothing.

**Exact Files:** `backend/modules/wallet_scorer.py`, timeline construction function

**Recommended Fix:** For any transaction where `value == 0` and `input != '0x'`, resolve the ERC-20 transfer event (Etherscan's `tokentx` endpoint, already available per the API table in the Viva handbook) and render `{amount} {token_symbol}` with a `Transfer Type: ERC-20` tag instead of `0.00000 ETH`.

**Priority: CRITICAL — blocks release**

---

## HIGH PRIORITY ISSUES

### H-1 — "Activity span 0 days" / wallet-age bug has regressed

Both `0xae2Fc4...` (72.8 ETH, "activity span 0 days") and the earlier-cycle Binance Hot Wallet finding show the same defect: age/span is being computed from the most recent activity window, not `first_tx_timestamp` to `last_tx_timestamp`. This was previously identified and marked fixed; evidence shows it is back in the current build. **File:** `wallet_scorer.py`, age/span calculation. **Recommend:** add the regression test from the prior cycle's fix into CI so this cannot silently reappear again.

### H-2 — Bulk entity registry still shows 0 for every score despite correct batch-level risk band

`AXON_Report_AXON-B-1784006069-28714bde.pdf`: header risk band `53/100 — MEDIUM`, but every row in Section 3 Entity Registry shows `Score: 0`. Same defect flagged in the prior cycle (individual scores not populating the registry even when the composite is correct). **File:** `bulk_scanner.py`, entity registry population — likely writing the per-entity score to a different key than the one the registry template reads.

### H-3 — Which-Coin engine: Solana routes to Contract Investigation

Per the board's brief and consistent with the architecture doc's note that `bulk_scanner.py` was updated to "route by family instead of balance-probed resolution" — this fix was applied to the **bulk** path but evidence suggests the **single-address** path (`scan.py` → `cross_chain.py`) still uses the older balance/bytecode-probe routing, which can misclassify a Solana account as a contract. **Files:** `backend/modules/cross_chain.py` → `detect_address_type()`, `backend/routers/scan.py`. **Fix:** apply the same family-first routing used in `bulk_scanner.py` to the single-wallet path — route by deterministic `family` from `coin_identifier.py`'s Tier 1 result, never by a generic bytecode probe that assumes EVM.

### H-4 — Hash verification failures give no reason

Per the board's brief (Part 7) and the report footer text itself ("Hash mismatch = report tampered. Verify before court use.") — there is no visible path for a benign failure (e.g. re-serialization whitespace difference, timezone drift in the stored timestamp, a schema-version mismatch between when the hash was computed and when it's verified) to be distinguished from actual tampering. **Fix:** change the verification response to:
```
Hash verification: FAILED
Reason: [stored hash / recomputed hash mismatch]
Possible causes: report re-exported after schema update · payload re-serialized with different key ordering · timestamp field mutated
Recommended action: re-fetch original report; if mismatch persists, escalate as possible tampering
```
Only escalate to a tampering warning if the recomputed hash fails against the *original, unmodified* stored JSON payload — not against a re-derived or re-fetched version of it.

### H-5 — Dual Mode produces the same report as Normal Mode

Per the board's brief (Part 5), and consistent with the Viva handbook's description of Dual-Agent AI only running "when an investigator runs a Deep Scan" — there's no evidence in the reviewed set that Dual Mode output differs structurally from single-agent output beyond the Prosecutor/Defense/Judge narrative. The brief's requested structure (Evidence Report + Behavioral Analysis + Adversarial Review + Alternative Explanations + Executive Summary + Investigator Recommendations + Confidence Analysis) is not what's landing in the PDF. **Recommended key routing** (4 keys available: 3× Groq, 1× OpenRouter):
```
Groq Key 1 → Fast extraction / normalization narrative (low latency, short prompt)
Groq Key 2 → Prosecutor + Defense adversarial pass (two sequential calls, same key, different system prompt)
Groq Key 3 → Confidence Analysis (data-availability-aware narrative — ties into the existing confidence-curve logic)
OpenRouter → Final Judge synthesis + Investigator Recommendations (highest-quality single pass, most expensive call, runs once)
```
This prevents duplicate prompts on one key while keeping the highest-quality model call to exactly one invocation per Dual Mode scan.

---

## MEDIUM PRIORITY ISSUES

- **M-1** — Entity Classification defaults to `Not Determined` (`0x8575b2...`) even when a wallet has zero transactions; a genuinely empty wallet should say `EOA — No On-Chain Activity`, not leave classification blank, since "Not Determined" implies a lookup failure rather than a confirmed empty state.
- **M-2** — Counterparty `Known Entity` column defaults to `Unclassified` broadly; per the earlier cycle's fix this was supposed to resolve through the threat corpus first — spot-check whether that resolution pipeline still runs for non-EVM counterparties (BTC/TRON counterparty addresses are a different format than the EVM corpus keys and may not match at all).
- **M-3** — Duplicate PDF filenames observed in the evidence set (`AXON_Report_AXON-W-1784005837-0xae2Fc4-c675e3.pdf` appears three times, `AXON_Report_AXON-W-1784005820-0x8575B2-3aa438.pdf` twice) — confirm the frontend isn't firing duplicate export requests per click.
- **M-4** — GoPlus field mapping (per Viva handbook §9) is well-specified (`is_honeypot`, `cannot_sell_all`, `owner_change_balance`, etc.) but none of these specific flags appear anywhere in the reviewed contract report's Section 5 (Protocol Intelligence) — only a flat `Overall: LOW`. Confirm the granular GoPlus flags are actually being surfaced in the report, not just consumed internally for scoring.

## LOW PRIORITY ISSUES

- **L-1** — Report footer says "AI-Assisted... non-evidentiary" on every report even when no AI section is present in that particular report (e.g. the 6-line empty wallet reports) — cosmetic but worth trimming conditionally.
- **L-2** — Timestamp format inconsistency: some reports show `2026-07-14T05:10:20Z` (ISO) in the header and `2026-07-14 05:10` (local, no timezone marker) in the timeline — pick one format per report.

---

## PART 2 — BLOCKCHAIN DATA VALIDATION (Per Chain)

| Field | Ethereum | Bitcoin | Solana | Tron |
|---|---|---|---|---|
| Balance correct | Likely yes (Etherscan) | **Unverified — report too thin to check** | **Unverified — report too thin to check** | **Unverified — report too thin to check** |
| Fiat conversion | Not observed in any reviewed report | Not observed | Not observed | Not observed |
| Tx count correct | Yes (10/10 shown correctly) | **No — reports don't reach this section** | **No — reports don't reach this section** | **No — reports don't reach this section** |
| First seen | **Wrong — "0 days" bug (CB/H-1)** | Not rendered | Not rendered | Not rendered |
| Counterparties extracted | Partial (shows address, no tx count/value) | Not rendered | Not rendered | Not rendered |
| Token transfers parsed | **Broken — shows 0.00000 ETH (CB-4)** | N/A (no native tokens) | Not rendered | Not rendered |
| NFT holdings | Never shown in any report reviewed | N/A | Not rendered | N/A |
| Mixer interaction | Not observed in this sample | Not rendered | Not rendered | Not rendered |
| Address version detected | Not shown (EOA vs Contract only) | Not shown (Legacy/SegWit/Taproot not distinguished in output) | Not shown | Not shown |

**Fiat conversion — exact fix:** No USD/fiat values appear anywhere in the reviewed reports for any chain. Per the board's brief this is explicitly required. **Add:** CoinGecko `simple/price` endpoint (`/api/v3/simple/price?ids=ethereum,bitcoin,solana,tron&vs_currencies=usd`), cached for 5 minutes, applied at render time to every native-asset value shown in a report. CoinGecko free tier is 10–30 calls/min — cache aggressively, do not call per-report.

**Address version detection — exact fix:** `coin_identifier.py`'s Tier 1 output already includes `address_type` (Legacy/P2SH/SegWit/Taproot for BTC; EOA/Contract for EVM) per the architecture doc's JSON schema example (§5.3). This field is being computed but is not flowing into the Subject Profile section of the final report — same class of bug as CB-3 (data computed upstream, dropped before render).

---

## PART 3 — WHICH COIN ENGINE AUDIT

The Tier 1 deterministic design (regex + checksum, no API calls, no LLM) described in `03_Engine_and_CrossChain_Implementation.md` §5.3 is architecturally correct and should not be redesigned. The problems are execution bugs, not design flaws:

1. **Solana → Contract routing (H-3)** — covered above.
2. **EVM ambiguity handling** — confirm `possible_networks` for a `0x` address always returns the full multi-chain list ("Compatible with multiple EVM chains") rather than a guessed single chain; this was the explicit design intent per §5.12 Design Principle 1 and should be verified with a live test against a known multi-chain-active address.
3. **"Doesn't explain WHY"** — the Tier 1 JSON schema (§5.3) already includes a `forensic_notes` field designed exactly for this. Confirm it's being rendered in the Subject Profile section — evidence from the reviewed reports shows only `Network/Coin` and `Explorer Link`, no forensic notes field visible anywhere.

---

## PART 4 — REPORT QUALITY AUDIT

Every report should answer: what was investigated, what type/version of address, first/last activity, value moved and remaining, counterparty count, protocol/exchange usage, suspicious behavior with evidence, and next steps. Scored against the reviewed set:

```
What was investigated?          ✓ (address always shown)
Address type?                   ✓ EVM only / ✗ BTC/SOL/TRON
Address version?                ✗ everywhere (Legacy vs SegWit vs Taproot never distinguished)
First/last active?              ✗ everywhere except partial ETH ("0 days" bug)
Value moved / remaining?        ✗ no fiat conversion anywhere; ETH-native reports show 0.00000 for token txs
Counterparty count?             partial (addresses listed, no tx count/value aggregated — shows literal "N/A")
Protocols/exchanges used?       ✗ not observed in any reviewed report
Suspicious behavior + evidence  ✓ for ETH (burst/velocity findings render correctly with source+confidence)
Next steps for investigator     ✗ not present in any reviewed report — worth adding as a closing section
```

Root cause for the pattern above: the report template is doing its job correctly for the fields the EVM normalization path actually populates, and silently omitting everything else. This is one root cause (CB-1) manifesting across nearly every checklist item in this section, not nine separate problems.

---

## PART 6 — API AUDIT

### Current APIs — sufficiency assessment

| Provider | Purpose | Verdict |
|---|---|---|
| Etherscan v2 | EVM tx/internal/token/ABI | Sufficient, working |
| Blockchain.info | BTC UTXO | Present in design, not confirmed working in practice (CB-1) |
| Solscan | SOL SPL transfers | Present in design, not confirmed working in practice (CB-1) |
| Tronscan | TRX/TRC-20 | Present in design, not confirmed working in practice (CB-1) |
| GoPlus | Contract security | Working at scoring level; granular flags not surfaced in report (M-4) |
| Forta | Threat alerts | Not observed triggering in any reviewed report — untestable from this evidence set |
| Groq / OpenRouter | AI synthesis | Case-level synthesis confirmed broken (CB-2); per-wallet synthesis appears functional |

### Recommended backups / additions

| Provider | Purpose | Data Gained | Priority | Cost | Rate Limit |
|---|---|---|---|---|---|
| Blockstream / Mempool.space | BTC backup | Redundancy for Blockchain.info outages; better fee/confirmation data | High | Free | ~unlimited public, self-hostable |
| TronGrid | TRON backup/primary | Official Tron Foundation API — likely more reliable than Tronscan scraping | High | Free tier + paid | Generous free tier |
| Helius | SOL backup | Enhanced transaction parsing, webhook support for future real-time features | Medium | Free tier + paid | Free tier sufficient for QUICK depth |
| Blockchair | Multi-chain backup | Single API covering BTC/ETH/multiple chains as a fallback layer | Medium | Paid | — |
| CoinGecko | Fiat conversion | Required fix per Part 2 above | **Critical** | Free tier (10–30 req/min) | Must cache |
| Covalent / Moralis | Unified fallback | Only as last-resort fallback — Viva handbook §3 correctly argues against these as primary (they abstract away internal txs needed for forensics) | Low | Paid | — |
| Bitquery | Cross-chain GraphQL | Useful for future cross-chain fund-flow tracing, not needed for current scope | Low (future) | Paid | — |

**Immediate ask:** given the 4 AI keys already provisioned (3× Groq, 1× OpenRouter), no additional AI keys are needed — the routing fix in H-5 solves the stated problem without more keys. The actual gap is chain-data backups (TronGrid, Blockstream) and the CoinGecko fiat-conversion integration, which is currently entirely absent.

---

## PART 8 — DEMO SAMPLE AUDIT

Every demo address tested in this cycle that maps to BTC, SOL, or TRON produced a broken/empty report — not because the addresses are invalid (`34xp4vRo...`, `TXLAQ63X...`, `1A1zP1eP...` are all confirmed real, high-activity addresses from independent verification earlier this engagement) but because of CB-1. **Do not replace the demo addresses again** — replacing addresses will not fix this; it will just produce a different set of empty reports. Fix CB-1 first, then re-validate the existing demo bank.

---

## PART 9 — PERFORMANCE

Evidence doesn't show direct proof of duplicate API calls, but the repeated identical-content PDF exports observed (M-3 — same report exported 2–3 times with different filenames) is circumstantial evidence worth investigating as either a frontend double-submit bug or a caching-key issue causing cache misses on what should be a cache hit.

---

## VERCEL DEPLOYMENT FAILURE

The failed deployment (`dpl_8VY8unfngdwKJAvtrC8o4Es3vG1h`) can't be diagnosed from this side — I don't have access to your Vercel account or build logs. Run:
```
npx vercel inspect dpl_8VY8unfngdwKJAvtrC8o4Es3vG1h --logs
```
and paste the output back. Given everything else in this audit, the most likely categories of failure worth checking first: a missing environment variable (one of the 4 API keys, or `DATABASE_URL`) not set in the Vercel project settings, a build-time dependency mismatch, or a serverless function timeout if any scan endpoint is deployed as a Vercel function rather than the FastAPI backend running on its own host (Render, per earlier architecture docs) — confirm the frontend's API base URL is pointed at the correct backend and not accidentally trying to run Python logic inside a Vercel Node function.

---

## PRODUCTION READINESS CHECKLIST

```
[ ] CB-1: Non-EVM reports produce full content (blocks release)
[ ] CB-2: Case dossier aggregation fixed (blocks release)
[ ] CB-3: Contract verification status regression test added (blocks release)
[ ] CB-4: ERC-20 transfers render with token symbol/amount (blocks release)
[ ] H-1 through H-5 resolved
[ ] Fiat conversion (CoinGecko) integrated
[ ] Address version (Legacy/SegWit/Taproot/EOA/Contract) rendered in every report
[ ] Regression suite: re-run full demo bank across all 4 chains after CB-1 fix
[ ] Hash-failure messaging distinguishes benign vs tampering (H-4)
[ ] Dual Mode produces genuinely differentiated output (H-5)
```

**Until every CB item is checked, this is not a release candidate — it is a working Ethereum prototype with three chains still in the box.**
