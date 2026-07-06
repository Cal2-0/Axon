# Module 02 — Bulk Scanner UX

## Objective
Restore the card-grid bulk view. Remove the stray top summary table that
doesn't belong on this page.

## Observed Defect
`/bulk` currently surfaces a top row of stat tiles ("Highest Risk / Highest
Volume / Most Active / Most Connected / Highest Balance") — this is the
Investigation Dashboard's own header widget (see Module 06), leaking into or
duplicated on the Bulk page. It has no correct behavior here: it's not
scoped to the current batch, and it has no UTXO/BTC-safe path if a Bitcoin
address is in the batch. Remove it from Bulk entirely — don't try to fix its
logic in this context, just delete it from this view.

## Required Bulk UX

Grid of cards, one per submitted address in the batch. Each card shows:

- **Address** — truncated, monospace.
- **Auto-label**, if resolved (e.g. "Auto-Detected: Poly Network Exploiter,"
  "Unlabeled Wallet").
- **Risk score badge**, color-banded:
  - 0–19: low (green/gray)
  - 20–59: medium (amber)
  - 60–100: high (red)
  - Reuse the risk-band function already used on the wallet detail page —
    do not fork a second implementation of the same bands.
- **Network/coin chip** (Ethereum / Bitcoin / etc.) — required now that BTC
  addresses can appear in the same batch (confirmed in report evidence:
  `1P5ZEDWTKTFG...` labeled `Bitcoin (BTC)` alongside EVM addresses in the
  same batch registry).
- **Deep Analyze** button.

No standalone top table/tile row above the grid.

## Acceptance Criteria
- Bulk view has zero references to single-entity summary tiles (no
  "Uniswap V3 Router," no top-N table).
- Every card's Deep Analyze button routes per
  `03-case-entity-resolution.md` — never directly to a raw batch-id page.
