# Module 03 — Case Entity Resolution (Chain of Custody)

## Objective
When "Deep Analyze" is triggered from a Bulk card, the result added to a Case
must be the resolved wallet/contract entity — never the ephemeral
`BULK_BATCH` placeholder.

## Observed Defect
Directly evidenced in the Case dossier export for `CASE-2026-002`:

```
Address              Type          Label     Risk Score
b041f198-8b5...       BULK_BATCH    Unknown   80
4161c96a-69c...        BULK_BATCH    Unknown   5
37679873-ab9...        BULK_BATCH    Unknown   5
```

These rows are batch-job UUIDs, not addresses. They carry a risk score but no
resolvable identity — useless to an investigator reopening the case later,
and they inflate "Total Entities Analyzed" with non-entities that can't be
looked up on any explorer.

## Required Behavior

1. A `BULK_BATCH` record is a transient job wrapper, never a case-citable
   entity. It must never be written into a case's Entity Registry.
2. When a user clicks Deep Analyze on a bulk card, entity resolution happens
   first: batch job → underlying wallet/contract address. This is already
   known at render time, since the card displays the address.
3. "Add to Case" — whether triggered directly from Deep Analyze or later
   from the wallet page — inserts only the resolved address-level entity
   (`WALLET` / `CONTRACT` / BTC address), carrying forward: address,
   network/coin, label, risk score, and resolution provenance.
4. **Entity Registry schema addition (additive — no existing column
   removed):** `resolved_from` (nullable, e.g. `bulk_batch:<batch_id>`). This
   preserves the audit trail — an investigator can trace which batch job
   originally surfaced this wallet — without the batch itself occupying a
   row in the registry.

## Acceptance Criteria
- Re-exporting any case going forward: zero rows with `Type = BULK_BATCH` in
  the Entity Registry section.
- "Total Entities Analyzed" reflects only real wallets/contracts.
- This is a **write-path fix**, not a backfill. Existing cases that already
  contain `BULK_BATCH` rows are left as-is unless a backfill is explicitly
  requested as a separate task — don't silently rewrite historical case
  files as a side effect of this fix.
