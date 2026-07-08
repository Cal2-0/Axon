# AXON Reports — Final Master Review & Fix Specification
**Status: FINAL — single source of truth. Supersedes all prior review notes.**
**Scope:** Wallet, Contract, Bulk, Case (Master) report types
**Target:** 100/100 on all four, forensically defensible, court/LEO-usable

---

## 0. Read this first — the one finding that changes priority order

Your Wallet report sample target, `0xc8a65fadf0e0ddaf421f28feab69bf6e2e589963`, **is the real, publicly confirmed Poly Network exploiter address** — not a false positive, not a coincidence. It's the ETH address Poly Network itself published as the destination of stolen funds in the <cite index="6-1">August 10, 2021 attack notice</cite>, independently verified by <cite index="10-1">Chainalysis as one of three attacker-controlled addresses</cite> in what became a <cite index="8-1">roughly $600M cross-chain DeFi exploit</cite> — one of the largest in history.

**This means your detection engine is right and your narrative layer is dangerously wrong.** The report says:

> *"The wallet's risk score should be lowered... appears to be a normal Ethereum user with a low-risk profile"*

That sentence sits directly under a header reading **"Risk Band: 80/100 - HIGH"**, in a report about a wallet that received ~$274M in stolen ETH in a single transaction from a top-10 crypto hack. The engine correctly scored it 80/100 and correctly flagged the Threat DB match at High confidence — then the AI narrative layer independently talked itself into "probably nothing, looks normal." If this ships as-is and a real investigator trusts the prose summary over the score, that's a credibility-ending failure for a forensic tool. This is your **#1 fix**, above every wording/polish item below.

**Root cause hypothesis:** narrative generation and score computation are decoupled — the LLM is writing a summary without being constrained to agree with (or explain) the actual computed risk band and entity classification. Fix at the prompt/generation layer: the narrative must be generated *from* the score and threat match, not independently of them, and if it disagrees, that disagreement itself needs to be surfaced as a flag ("model uncertainty — narrative and score diverge, manual review required"), never silently overridden.

This same decoupling is very likely the root cause of the Master Case report's data problems in Section 3 below — worth checking as one shared fix rather than four separate patches.

---

## 1. Systemic bugs — present across multiple or all report types

These aren't per-report polish items — they're platform-level defects. Fix once, fixes everywhere.

### 1.1 Section numbering skips
- **Contract report:** 1, 2, 3, *(4 missing)*, 5, *(6, 7 missing)*, 8, 9
- **Bulk report:** 1, 2, 3, 4, *(5 missing)*, 6, *(7 missing)*, 8
- **Wallet report:** doesn't use numbered sections at all (named headers only) — inconsistent format vs. Contract/Bulk
- **Case report:** numbered sequentially (1, 2, 3) — no gaps, but a different heading scheme (`h2` tags) entirely

**Diagnosis:** section slots are conditionally rendered when data exists, but the numbering isn't recalculated — so empty/skipped sections leave numbering holes. **Fix:** either (a) renumber sequentially after conditional sections drop out, or (b) keep fixed numbering but explicitly render skipped sections as `SECTION N — [NOT APPLICABLE: no data for this entity type]` so a reader knows it's a skip, not a bug. Also unify Wallet report onto the same numbered-section format as Contract/Bulk — right now it's a visibly different template family.

### 1.2 Address display is inconsistent across report types
| Report | Address display |
|---|---|
| Wallet | ✅ Full address shown |
| Contract | ✅ Full address shown |
| Bulk | ❌ Truncated (`0x8589427373...`) everywhere, never resolved |
| Case | ❌ Completely blank |

Full addresses are non-negotiable evidence in a forensic document — a truncated or missing address can't be re-verified independently, which defeats the purpose of an "evidence integrity" report. Bulk and Case both need this fixed before anything else about them matters.

### 1.3 `N/A` / `0` / `None` are being used interchangeably
These mean three different things forensically:
- `N/A` = field doesn't apply to this entity type
- `0` / blank = checked, confirmed zero/none
- `Unknown` = attempted lookup, couldn't resolve

Right now all three render as either `N/A` or `0` depending on report, with no way to tell "we checked and there's nothing" from "we never checked" from "this field doesn't exist for this entity." Example: Wallet report's Asset Inventory shows `NFTs: N/A` — does that mean zero NFTs held, or that NFT lookup wasn't run? A defense attorney will ask exactly that question. **Fix:** three distinct render states, no exceptions, applied uniformly across all four report types.

### 1.4 No chain-of-custody / investigator metadata anywhere
None of the four reports capture: requesting investigator/badge ID, case assignment, query timestamp vs. report-generation timestamp, or which internal case this scan was attached to at request time. Given the Case report's own banner says `CONFIDENTIAL / LEO`, this is a real gap for anything headed toward court use — LEO chain-of-custody standards expect "who requested this, when, under what authority" as a matter of course.

### 1.5 No evidence-source schema on Threat DB / auto-detected matches
Every "Auto-Detected" label across Wallet, Bulk, and (implicitly) Case reports needs three attached fields, every time, no exceptions:
- **Evidence Source** (which corpus / OFAC list / clustering model / manual tag)
- **Confidence** (already present in Wallet, missing elsewhere)
- **Collection Method** (static list match / behavioral clustering / live RPC probe / AI inference)

Right now the "Evidence Reference" column in the Wallet report just repeats the label text back — that's not an evidence reference, it's a restated flag. This is the exact thing a defense attorney will attack first, and correctly so.

### 1.6 No provenance / reproducibility stamp
None of the reports record the block height at scan time or which RPC/data provider answered the query. Forensic reproducibility requires this — a report generated today querying "current" chain state is not re-verifiable six months later without knowing what block height "current" meant at scan time.

### 1.7 QUICK scan depth isn't flagged as a caveat on high-severity output
The Wallet report — which ends up naming a specific, real, $600M-scale exploiter — was run at `Scan Depth: QUICK`. That's almost certainly why the Counterparties table is full of `N/A` and why only inbound dust transactions show up with zero outbound history for an address that's publicly documented moving hundreds of millions. **Fix:** any report crossing a high-risk threshold (say, ≥70/100) should either auto-escalate to a DEEP scan, or visibly warn: *"QUICK scan — corroborate with DEEP scan before relying on this for action."* Don't let a shallow scan produce a confident-sounding HIGH severity report.

### 1.8 No cross-linkage between Case report and its constituent entity reports
The Case master report doesn't list the individual Report IDs (`AXON-B-...`, `AXON-C-...`, `AXON-W-...`) of the entities in its roster, and the individual entity reports don't reference back to a parent Case ID. These are four disconnected documents. An investigator working a case file needs to click/reference from the master roster straight into each full entity report — that link doesn't currently exist anywhere.

---

## 2. Per-report deep fixes

### A. Wallet Report — 96 → target 100

| # | Issue | Fix |
|---|---|---|
| 1 | **Narrative contradicts score** (see §0) — text argues "normal, low-risk" under an 80/100 HIGH band, for a confirmed real-world exploiter address | Root-cause fix: constrain narrative generation to the computed score/classification; surface disagreement as a flag rather than resolving it silently |
| 2 | Entity Classification reads `Normal EOA` while a `High` confidence Threat DB match exists simultaneously | Classification field must be derived *after* threat matching, not independently — a High-confidence hit cannot coexist with "Normal" |
| 3 | Engine-internal phrasing: *"risk score should be lowered..."* | Replace with investigator-voiced observation, e.g. *"Wallet shows minimal exchange counterparty overlap; further review recommended to confirm signal validity."* |
| 4 | Counterparties table: Tx Count / Total Val / Last Seen are `N/A` for every single row | Same on-chain source populates the Timeline table above it (dates are present there) — this is a propagation bug, not a missing-data situation |
| 5 | Timeline shows 10 inbound, mostly dust-value, zero outbound transactions, for an address publicly known to have moved ~$274M | Either the QUICK scan is truncating real history (likely — see §1.7), or this needs an explicit note: *"Only most recent N transactions shown; full transaction history contains additional activity not reflected here."* Don't let a partial timeline imply a complete one |
| 6 | "Evidence Reference" column just repeats the alert label | Needs an actual reference: case ID, external report URL, or clustering/match ID — not restated text |
| 7 | Asset Inventory: Stablecoins/NFTs/Contracts/Protocols all `N/A` | Apply the N/A vs 0 vs Unknown fix from §1.3 |
| 8 | Hash-mismatch disclaimer has no verification instructions | Add: how to independently re-hash and compare, or a link to a verification tool/endpoint |
| 9 | Given confirmed severity here, the report should proactively note the entity is publicly documented in connection with a specific named 2021 exploit, with a link to public sourcing — this is exactly the kind of case where AXON should look *more* authoritative, not less | Add optional "Public OSINT Corroboration" line when a Threat DB match can be cross-referenced against public reporting |

### B. Contract Report — 89 → target 100

Currently the thinnest report by far. Missing fields, not missing polish:

**Add to Contract Profile (Section 3):**
verified-source flag · proxy detection (+ implementation address if proxy) · deployer address · deployer's other known deployments (clustering signal) · creation tx hash · creation block number · compiler version · optimization enabled (bool) · license type · ABI verification status · owner address · owner privileges (mint / pause / blacklist / upgrade authority) · total supply · decimals · holder count · LP lock status

**Fix Section 5 (GoPlus):** currently only shows `Overall: LOW` — GoPlus returns dozens of granular flags (is_honeypot, buy_tax, sell_tax, is_mintable, can_take_back_ownership, hidden_owner, has_selfdestruct, external_call risk, etc.). Show which specific flags fired vs. cleared — a bare "LOW" rollup with no supporting detail isn't an audit trail, it's a label.

**Add or explicitly null a static-analysis section:** your five-layer scoring engine includes a static-analysis pillar — this report shows none of it. If source isn't verified so static analysis couldn't run, say so explicitly (`Static analysis unavailable — source not verified`), don't silently omit the section.

**Add or explicitly null economic/liquidity signals:** another of your five weighted pillars — no LP data, no holder distribution, no volume shown here at all. Same rule: show it or explicitly state why it's absent.

**Add contract interaction/behavioral data:** zero transaction/caller history shown for the contract, unlike the rich transaction section in the Wallet report. Top callers and interaction volume are real forensic signal for a contract, especially for exploit/drainer detection.

**Fix risk-band label inconsistency:** header says `15/100 - LOW/MEDIUM`, body (Section 2) says `LOW` only. Pick one banding vocabulary and use it everywhere.

**Fix Section 8:** *"Unverified bytecode — forensic blindspot"* is a good phrase but zero elaboration — state what checks were attempted (bytecode similarity search, known-malicious opcode pattern match, Slither run attempted/failed) even when inconclusive.

### C. Bulk Report — 84 → target 100

| # | Issue | Fix |
|---|---|---|
| 1 | **Score-propagation bug**: every entity row shows `Score: 0` in both Entity Registry and Priority Queue, while the batch-level Risk Band shows `95/100 - HIGH` | The per-entity score field isn't being written even though the aggregate is computed correctly — same class of bug as the Case report's roster binding failure (§2.D). Fix once, check both |
| 2 | Addresses truncated (`0x8589427373...`) throughout | Show full addresses — see §1.2 |
| 3 | Section numbering skips (5, 7 missing) | See §1.1 |
| 4 | "Primary Indicator" text cut off mid-word (`"OFAC Sanctioned Entity + Mixer/Privacy P"`) | Layout/wrapping bug in the PDF generator — fix column width or wrap behavior so indicator text never truncates |
| 5 | No stated reason for the 95/100 batch score | Add one sentence: *"Batch risk is HIGH because entity #1 is OFAC-linked with mixer exposure; remaining entities are low risk."* — don't make the investigator infer this from a table |
| 6 | No per-entity hash or link back to that entity's own full Wallet/Contract report | Add reference IDs so the bulk summary can route into full detail per address |
| 7 | Section 8 is one throwaway sentence | Expand: list failed queries by address if any occurred, list scan depth used, note if any entities hit rate limits |
| 8 | Priority Queue ordering is actually correct (OFAC hit first, then elevated, then routine) — keep this | No change needed here — just needed to confirm it wasn't also broken |

### D. Case / Master Report — 90 → target 100

This report has a genuine data-binding defect, not just missing polish. Pinpointing it exactly from the raw HTML:

**Bug 1 — Roster table, three specific fields not interpolating:**
In the entity roster loop, `chain` and `risk_score` populate correctly (you can see `5/100`, `80/100`, `mixed`, `ETH` rendering fine) — but **`address`, `class`, and `scanned_at` are empty for every single row.** That's a narrow, specific template/variable-binding bug — likely a field name mismatch (e.g., template expects `entity.address` but the payload key is `entity.wallet_address` or similar) rather than a missing-data issue, since the sibling fields on the same row objects work. This is a quick, mechanical fix once you diff the template's expected keys against the actual payload schema.

**Bug 2 — Executive Summary tile reads from a different (broken) source than the roster table below it:**
- Average Risk tile shows `0` / `N/A`, but the 8 roster rows below it have real scores (5, 5, 2, 80, 0, 80, 5, 2 — actual average ≈ 22.4)
- Total Subjects tile shows `0`, but 8 rows render in the table directly below
- Title shows `N/A`, Category defaults to `General`

This confirms the top-of-report summary block and the roster table are pulling from **two different data paths**, and only one of them is wired up. Same root cause category as Bug 1, different location — worth a single audit pass across the whole template rather than patching tile-by-tile.

**Bug 3 — Forensic Analysis Summary (Section 3) shows `N/A` across Threat Assessment / Money Flow / Compliance:**
Given the pattern above, don't assume this is legitimately empty — verify whether AI synthesis actually ran and was discarded, or never ran at all. If it genuinely didn't run, state why (e.g., *"Cross-entity synthesis requires 2+ entities with resolved classification — insufficient qualifying entities in this case"*) rather than a bare `N/A`.

**Bug 4 — Report promises functionality it doesn't deliver:**
The report's own subtitle states it's *"designed for complex investigations and money laundering visualization,"* but there's no flow diagram, graph, or visualization anywhere in the output — just three text sections. Either build the promised visualization or remove the claim from the subtitle; don't ship a mismatch between what the report says it does and what it renders.

**Bug 5 — Status badge is misleading:**
Header shows `Status: FINAL VERIFIED` in bold green while roughly half the report's fields are empty or `N/A`. That status claim needs to require actual field-completeness validation before it renders — a report with broken bindings should never self-report as "FINAL VERIFIED."

**Bug 6 — Missing its own integrity hash:**
Every entity-level report (Wallet, Contract, Bulk) carries a real SHA-256 hash in its Evidence Integrity section. The Case report's "Integrity Proof" field instead shows the literal placeholder string `VERIFIABLE-AI-DOSSIER` — not a hash, not a unique ID, just static text. This breaks the chain-of-custody pattern the rest of the platform establishes. Generate and display a real hash here too.

**Bug 7 — No sub-report linkage:**
Roster doesn't list the individual `AXON-B-/-C-/-W-` report IDs for its constituent entities — see §1.8.

**Bug 8 — Timestamp format inconsistency:**
Sub-reports use ISO 8601 UTC with `Z` suffix (`2026-07-08T16:05:23Z`). Case report header shows bare `21:35:42` with no date-time format or timezone marker. Standardize on one timestamp format platform-wide.

---

## 3. Definition of Done — 100/100 acceptance checklist

**Wallet**
- [ ] Narrative text agrees with computed score/classification, or explicitly flags disagreement
- [ ] Entity classification cannot read "Normal" alongside a High-confidence threat match
- [ ] All engine-internal phrasing replaced with investigator voice
- [ ] Counterparties table fully populated (no blanket N/A)
- [ ] Timeline explicitly states whether it's partial or complete history
- [ ] Evidence Reference is a real reference, not restated label text
- [ ] Hash verification instructions present

**Contract**
- [ ] Full contract profile fields present (14 fields listed in §2.B) or explicitly nulled with reason
- [ ] GoPlus sub-flags shown, not just rollup
- [ ] Static analysis section present or explicitly nulled with reason
- [ ] Economic/liquidity section present or explicitly nulled with reason
- [ ] Contract interaction/behavioral data included
- [ ] Risk-band vocabulary consistent header-to-body

**Bulk**
- [ ] Per-entity score field populated (matches aggregate logic)
- [ ] Full addresses displayed, no truncation
- [ ] Section numbering has no gaps
- [ ] Primary Indicator text never truncates
- [ ] One-sentence explanation of why batch risk is what it is
- [ ] Per-entity linkage to full sub-reports

**Case**
- [ ] Roster address / class / scanned_at fields populate (Bug 1 fixed)
- [ ] Executive Summary tiles match roster-table data (Bug 2 fixed)
- [ ] Forensic Analysis Summary either populates or states explicit reason for absence
- [ ] Money-flow visualization delivered, or subtitle claim removed
- [ ] "FINAL VERIFIED" status gated behind actual field-completeness check
- [ ] Real integrity hash generated for the Case report itself
- [ ] Sub-report IDs linked in roster

**Platform-wide**
- [ ] N/A vs 0 vs Unknown rendered as three distinct, meaningfully different states everywhere
- [ ] Evidence Source / Confidence / Collection Method attached to every auto-detected flag
- [ ] Chain-of-custody metadata block present on every report type
- [ ] Block height / data-provenance stamp present on every report type
- [ ] High-severity findings from QUICK scans carry a corroboration warning

---

## 4. Build order (P0 → P2)

**P0 — data integrity, ships broken evidence if not fixed:**
Case Bugs 1–2 (roster + summary binding) · Bulk score-propagation bug · Wallet narrative/score contradiction

**P1 — evidentiary defensibility, gets challenged in review/court if not fixed:**
Evidence Source/Confidence/Collection Method schema · Full addresses everywhere · Contract profile completeness · Counterparties table population · Case Bug 6 (missing hash) · Case Bug 5 (misleading status badge)

**P2 — consistency and polish:**
Section numbering · N/A/0/Unknown semantics · timestamp format unification · sub-report cross-linkage · chain-of-custody metadata · QUICK-scan corroboration warnings

Fix in that order and all four reports clear 100.
