# Module 06 — Dashboard UI Redesign (Cosmetic Only)

## Objective
Refresh the Investigation Dashboard's visual layer only. No data or logic
change in this module. Do this last — it's cosmetic and shouldn't block the
functional fixes in Modules 01–05.

## Observed State
Five equal-width stat tiles ("Highest Risk / Highest Volume / Most Active /
Most Connected / Highest Balance") in a flat row on a plain dark background —
reads as generic and cramped. Also worth flagging: in the current screenshot,
4 of the 5 tiles show the identical address (`0x28C6c06298...1d60`). That may
be a data/ranking bug rather than a design issue — confirm whether "Most
Active / Most Connected / Highest Balance" are computing distinct rankings
or all falling back to the same default entity. **Don't silently fix that
inside this UI-only pass** — flag it and, if it's real, route the actual fix
through whichever backend logic computes these rankings (out of scope for
this module).

## Design Direction
Dark, premium, forensic-tool aesthetic — consistent with the existing
palette (`#0F1419` / `#0A0E14` backgrounds, `#5B8CFF` / `#3DDC97` / `#B45BFF`
/ `#FF8A3D` accents):

1. Give the five tiles visual hierarchy instead of five identical boxes —
   e.g., lead with "Highest Risk" as a larger or accented card (it's the
   most actionable), the rest as a secondary row.
2. Increase card padding and internal spacing — current tiles feel cramped
   with label / address / name stacked tightly.
3. Each tile's address should be a tappable link straight into that entity's
   report, not static display text.
4. Keep "New Batch" / "Export Master PDF" actions where they are, top-right.
5. Add a subtle skeleton/loading state per tile for when a ranking hasn't
   resolved yet, instead of showing a stale or duplicate address.

## Acceptance Criteria
- No change to underlying dashboard data-fetching logic in this module — if
  the duplicate-address issue is a real ranking bug, it gets logged as a
  separate item referencing this file, not silently patched here.
- Visual density and hierarchy improved per the direction above; all five
  metrics remain, none removed.
