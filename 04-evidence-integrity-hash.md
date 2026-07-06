# Module 04 — Evidence Integrity Hash (Normal vs Dual Mode Mismatch)

## Objective
SHA-256 must match for a given report's underlying findings regardless of
whether it was generated via normal (single) mode or dual/batch mode.

## Observed Defect
Hash mismatch between modes indicates the hash is being computed after
mode-specific serialization/formatting diverges, rather than on one
canonical representation of the data.

## Required Behavior

1. One function, one call site, used by both modes:
   `compute_report_hash(canonical_data: dict) -> str`.
2. `canonical_data` must be:
   - The **same field set** regardless of mode. The mode label itself should
     not be part of the hashed payload — the same underlying findings
     shouldn't hash differently just because of which UI path produced them.
     (If mode is actually meant to be part of the report's identity, that's
     a deliberate product decision to confirm explicitly — the default
     assumption here is that it should not be.)
   - Serialized deterministically: recursively sort all dict keys, fix float
     formatting (don't let `80` vs `80.0` vs `80.00` diverge), fix timestamp
     format, no locale-dependent formatting.
   - Hashed **before** any template/HTML/PDF rendering touches it. Rendering
     must be a pure read of already-finalized data, never a mutation step.
3. Add a fixture-based regression test: identical underlying findings run
   through normal mode and dual mode → identical hash. This becomes a
   permanent guard — same pattern as the existing cosine-similarity →
   normalized-Euclidean-distance regression guard from AXON v2.0's
   behavioral correlation engine.

## Acceptance Criteria
- Same target entity, run once in normal mode and once in dual mode with
  identical underlying data → identical SHA-256.
- This is a **going-forward** integrity fix. Existing already-issued reports
  are not expected to retroactively match the new hash — note this clearly
  in the changelog so past reports aren't mistakenly treated as "tampered"
  when compared against a hash computed under the new scheme.
