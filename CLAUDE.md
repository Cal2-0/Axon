# AXON — Fix Cycle Governance Index

Single source of truth for this fix cycle. Load this file first in any Claude
Code session touching these issues — the non-negotiables below apply across
every module, regardless of which one the session is focused on.

## Non-Negotiables

1. **No regression.** Existing passing case / report / bulk flows must keep
   working identically for entities that are already correct. Before changing
   any shared logic (hashing, risk scoring, entity resolution), write or
   confirm a fixture-based regression test first — same discipline as the
   existing cosine-similarity → normalized-Euclidean-distance guard in the
   AXON v2.0 behavioral correlation engine.
2. **Additive-only for the report engine.** Never remove a field or section
   that already renders correctly. New data gets appended in new sections.
3. **No liability-risk wording.** Never use "court-admissible," "court-ready,"
   "legal-grade," or "legal exhibit" anywhere user-facing (PDF templates, UI
   copy, code comments that generate text). Use "Investigation Report," "All
   Available Data," "Evidence Summary" instead. AXON reports data — they don't
   certify a legal standard.
4. **Chain of custody on entity resolution.** Any time an entity's identity
   changes across the pipeline (e.g., a bulk batch ID resolving to a wallet
   address), log source, timestamp, and resolution method. Never silently
   swap or discard the link.
5. **Bitcoin is not Ethereum with blank fields.** UTXO-model entities get
   their own schema branch. Never render a wall of "N/A" across a row where a
   BTC-specific field should be computed instead.
6. **Scan-depth transparency.** Anything capped or skipped due to scan depth
   (e.g. `QUICK`) says so explicitly and consistently, using the same phrasing
   already correct in the Asset Inventory section — extend that convention,
   don't invent a new one.

## Module Map (build order — each depends on the one before it holding)

| # | File | Fixes |
|---|------|-------|
| 1 | `01-deployment-routing.md` | 404 on reload / direct link / new tab |
| 2 | `02-bulk-scanner-ux.md` | Card-grid restore, remove stray top table |
| 3 | `03-case-entity-resolution.md` | Bulk batch IDs leaking into Case Entity Registry |
| 4 | `04-evidence-integrity-hash.md` | SHA-256 mismatch between normal/dual mode |
| 5 | `05-report-engine-expansion.md` | Timeline truncation, missing patterns, BTC branch, wording scrub |
| 6 | `06-dashboard-ui-redesign.md` | Cosmetic dashboard refresh (do last) |

Each module file is self-contained enough to hand to a session on its own —
but always load this index first for the non-negotiables above.
