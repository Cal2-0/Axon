# Module 05 — Report Engine Expansion & Wording Scrub

## Objective
Reports — wallet reports especially, since those are already the strongest —
surface more of the data already being collected: full transaction timeline,
pattern analysis, counterparty depth. Additive only. Plus: strip
liability-risk wording.

---

## Part A — Wording Scrub (do first; zero logic risk)

Remove, everywhere user-facing (PDF templates, UI copy, code comments that
generate user-facing text):
- "court-admissible"
- "court-ready"
- "legal-grade"
- "legal exhibit"

Replace with neutral terms: "Investigation Report," "All Available Data,"
"Evidence Summary."

Keep the integrity-warning pattern, just drop the legal framing:
- Before: *"Hash mismatch = report tampered. Verify before court use."*
- After: *"Hash mismatch = report tampered. Verify integrity before relying
  on this report."*

---

## Part B — Data Expansion (additive)

Nothing already rendering correctly gets removed or restructured. New data
gets appended as new sections or extensions of existing ones.

**1. Full Timeline Reconstruction**
Currently truncated (a wallet report showed 10 transactions; the actual
history for that entity is very likely longer). Either paginate / "show
more" in the UI, or export the complete set in the PDF. If capped for size
reasons, state the cap and true total explicitly — e.g. *"Showing 50 of 312
transactions — full list available via CSV export."* Never truncate
silently.

**2. Transaction Pattern Section (new)**
Derive from data already computed for risk scoring — don't re-fetch:
- **Burst detection** — already computed (e.g. "Transaction burst: 100% of
  activity on 2026-07-06 (10 txs)"). Promote this into its own visible
  section instead of leaving it buried inside risk-score rationale text.
- **Dormancy gaps** — timelines already show multi-month gaps between
  activity clusters. Surface this explicitly as "Dormancy periods" instead
  of leaving it implicit in a raw date-sorted table.
- **Round-number / structuring heuristics** — if already part of the
  scoring engine, surface them here.
- **Counterparty concentration** — unique counterparties vs. tx count, to
  show fan-out vs. fan-in shape, if the engine already tracks this. If it
  doesn't, flag as future scope — don't fabricate numbers to fill the
  section.

**3. Counterparty Enrichment**
Currently every counterparty row shows "Unclassified" / "N/A" for tx count,
value, and last-seen — even though the target's own row correctly populates
those same fields. If per-counterparty aggregate data exists anywhere in the
pipeline, populate it. If it's genuinely not collected at the current scan
depth, label it consistently with the phrasing already used correctly
elsewhere (e.g. Asset Inventory's "Not collected at QUICK depth") rather than
a bare "N/A" — it should read as a depth limitation, not a data-quality gap.

**4. Bitcoin-Specific Report Branch (new, required)**
BTC addresses now appear in these reports and cannot reuse the ETH-shaped
schema:
- Do not reuse the "Timeline Reconstruction (Date / Hash / Dir / Value ETH)"
  table with ETH units for a BTC entity.
- Bitcoin timeline section: inputs consumed / outputs created, per-tx BTC
  value, confirmations, and — if available — address clustering /
  common-input-ownership heuristics.
- Asset Inventory for a BTC address should not show "ERC-20 Tokens" /
  "Contracts" / "Protocols" rows at all — those are EVM-only concepts. BTC
  gets its own inventory shape: UTXO set, total received/sent, change-address
  cluster size.
- Risk rationale for BTC entities references BTC-relevant signals (mixer /
  coinjoin exposure, exchange-deposit clustering) — not EVM concepts like
  "upgradeable proxy" or "DeFi trusted protocol."

**5. Scan-Depth Transparency**
Every section capped or skipped due to `QUICK` depth states so explicitly,
using the same phrasing convention already correct in two places (Asset
Inventory, batch summary) — extend that convention everywhere rather than
introducing new phrasing.

## Acceptance Criteria
- A wallet report for an entity with more than 10 historical transactions
  shows the full set, or an explicit stated cap with true total count.
- A Bitcoin address run through Deep Analyze produces a report with
  BTC-appropriate sections — no blank/N/A EVM-shaped tables.
- No "court" language remains anywhere in generated PDFs.
- Every existing report section that worked before this change renders
  identically for an EVM wallet where no new data is available.
