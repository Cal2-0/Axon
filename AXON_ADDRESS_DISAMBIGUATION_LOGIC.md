# AXON Address Intelligence — Disambiguation Logic Upgrade
> Based on direct analysis of `axon-address-formats.csv` (42 formats).
> The fix is not "add more coins." The fix is a smarter matching strategy on what you already have.

---

## THE CORE MISTAKE TO AVOID

Your instinct was "add as many as possible" to fix wrong guesses. That makes it worse, not better.

More rows without a matching strategy upgrade = more candidates competing for the same regex match = more wrong guesses, not fewer. The database is not the problem. The problem is that right now, every collision is probably treated the same way — first match wins. But collisions in your own CSV are not all the same difficulty. There are three completely different tiers, and each needs a different fix.

---

## THE THREE TIERS OF COLLISION

### TIER A — Fake Ambiguity (100% solvable, you just need the right table)

These *look* identical but actually have a hidden discriminator your current logic probably isn't using.

**Cosmos-SDK Bech32 family** — from your own CSV:
```
cosmos1   → Cosmos Hub (ATOM)
osmo1     → Osmosis (OSMO)
celestia1 → Celestia (TIA)
inj1      → Injective (INJ)
sei1      → Sei (SEI)
```
All five use identical bech32 encoding, identical polymod checksum, near-identical length (39–50 chars). This looks like a 5-way collision. **It is not.** Bech32's data-part alphabet (`qpzry9x8gf2tvdw0s3jn54khce6mua7l`) deliberately excludes the digit `1`. That means the *only* `1` character in a valid bech32 string is the HRP/data separator — placed by spec at the **last** `1` in the string, never the first. So the human-readable prefix (`cosmos`, `osmo`, `celestia`, `inj`, `sei`) is always cleanly extractable and globally unique by design (SLIP-0173 registry). If your code is doing something loose like "starts with a letter, contains a 1" — that's the bug. It should be doing an **exact string match** against a maintained HRP table.

**SS58 Substrate family** — from your own CSV:
```
Polkadot  → prefix "1"
Kusama    → prefix "C,D,E,F,G,H,J"
```
Same base58 alphabet, same checksum algorithm, same address length range. But SS58 addresses encode an actual **network ID byte** before the checksum — that's *why* Polkadot and Kusama render with different leading characters in the first place. This is already a solved discriminator. Your CSV note even says it correctly: *"Do not infer Polkadot from SS58 length alone."* The fix is: don't infer from length — decode the network ID byte and match it against Polkadot's registered ID (0) vs Kusama's (2).

**Most Base58Check version-byte forks** — Litecoin `L`, Namecoin `N`, Peercoin `P`, Ravencoin `R` — these are all *supposed* to have unique version bytes baked into the Base58Check encoding. If your logic is checking only the rendered leading character rather than decoding the actual version byte, you're relying on a side effect instead of the real discriminator.

**The fix for all of Tier A is the same fix**: stop matching on rendered prefix characters. Decode down to the actual embedded identifier (HRP string, SS58 network byte, Base58Check version byte) and match that exactly. This removes the ambiguity completely for this entire tier — no probability, no guessing, no AI needed.

---

### TIER B — Genuine Partial Ambiguity (needs a secondary signal, format alone won't do it)

These are real collisions your CSV data reveals, and no amount of table-lookup on the address string alone fixes them.

**Bitcoin / Bitcoin SV — literally identical**
Your own CSV lists Bitcoin SV with prefix `"1,3"` — the *exact same* version bytes as Bitcoin itself. This isn't a formatting coincidence. BSV forked from BTC and kept the original version bytes on purpose. A legacy `1...` or `3...` address is **structurally indistinguishable** between BTC, BCH-legacy, and BSV. Your CSV notes already admit this: *"Format alone cannot reliably separate BTC, BCH legacy, and BSV."* This is correct and should stay flagged as an honest limitation — not something to "fix" by picking one.

**Ravencoin `r` vs XRP `r` — same prefix, different alphabet**
This is a subtle one worth catching. Ravencoin uses `R,r` and XRP uses `r` — same lowercase prefix, similar length range (25–35 vs 26–35). But XRP does **not** use the standard Bitcoin Base58 alphabet — it uses its own reordered alphabet (`rpshnaf39wBUDNEGHJKLM4PQRSTVWXYZ2bcdeCg65jkm8oFqi1tuvAxyz`). Ravencoin uses standard Base58. If your decoder tries the standard alphabet on an XRP address, it will either fail to decode or silently produce garbage that might coincidentally still pass a loose length check. **This is a real bug risk, not just a display collision** — check which alphabet you're decoding with before trusting a `r`-prefixed result.

**Aptos vs Sui — same VM family, same hex format**
Both Move-based chains, both use `0x` + hex. Your CSV correctly notes Aptos is variable length (3–66, due to leading-zero truncation) while Sui is fixed at 66. That length difference actually helps — a `0x` address shorter than 66 chars can only be Aptos. But a full 66-char address is genuinely ambiguous between the two with format alone.

**Fix for Tier B**: never collapse to a single guess. Return a ranked confusion set with the specific reason stated — *"Shares identical version byte with Bitcoin — cannot be resolved by format"* is a completely different and more useful statement than a wrong single answer.

---

### TIER C — Unresolvable by Format, Period (route elsewhere, don't guess)

**All-EVM-chains** — your CSV already handles this one correctly (`"Possible chains include Ethereum, BNB Smart Chain, Polygon, Base, Optimism, Arbitrum, Avalanche C, Fantom, Linea, Scroll, Mantle, and many others"`). `0x` + 40 hex is identical across 19+ chains with zero format-level discriminator. There is nothing to fix here — the honest "can't tell from format alone" answer is the correct answer. Keep it exactly as is.

**Solana vs any other no-checksum Base58 string** — Solana addresses have **no checksum at all**. Any syntactically valid Base58 string of 32–44 bytes decoded length "looks like" a Solana account, including garbage. This is a real weakness worth flagging explicitly in the tool output: *"No checksum exists for this format — validity of the underlying key cannot be confirmed from the string alone."*

**Fix for Tier C**: these are exactly the cases that belong in AXON's *live* investigation pipeline — the existing four-step engine (syntax → checksum → existential RPC probing → AI narration) that already does live chain probing. The Address Intelligence Reference page is explicitly the offline, format-only tool. Tier C ambiguity is not a bug in that tool — it's the correct signal to hand off to "Investigate" instead of trying to force an answer out of "Analyze Format."

---

## WHAT TO ACTUALLY BUILD

### 1. A new discriminator table (additive, doesn't touch your existing `address_formats` schema)

```
address_discriminators
─────────────────────────────────────────────
id
chain                  -- "Osmosis"
symbol                 -- "OSMO"
discriminator_type      -- "hrp" | "ss58_prefix" | "version_byte" | "alphabet"
discriminator_value     -- "osmo" | "2" | "0x1E" | "xrp_custom_b58"
confidence              -- "exact" | "probabilistic"
notes
```

This sits alongside your existing `address_formats` table — you're not replacing anything, just adding the layer that lets you go from "candidate list" to "confirmed answer" for Tier A cases.

### 2. Matching pipeline — replace "first match wins" with staged resolution

```
Input address
    ↓
Stage 1 — Structural fingerprint (your existing logic)
    → produces a CANDIDATE SET, not a single answer
    → e.g. for "cosmos1p8s4e8h..." candidates = [Cosmos Hub] (only one HRP matches)
    → e.g. for "0x742d35Cc..." candidates = [Ethereum, BSC, Polygon, Base, ... 15 more]
    ↓
Stage 2 — Exact discriminator pass (NEW — Tier A resolver)
    → if discriminator_type = "hrp": extract substring before LAST '1', exact match
    → if discriminator_type = "ss58_prefix": decode network ID byte, exact match
    → if discriminator_type = "version_byte": decode Base58Check version byte, exact match
    → if exactly one candidate survives → CONFIRMED, return single answer
    → if multiple candidates share the same discriminator value → genuine Tier B collision
    ↓
Stage 3 — Confidence-tagged output
    → Tier A resolved:     { confirmed: true,  chain: "Osmosis", method: "hrp_exact_match" }
    → Tier B collision:    { confirmed: false, candidates: [...], reason: "shared version byte" }
    → Tier C unresolvable: { confirmed: false, candidates: [19 EVM chains], reason: "format-invariant, requires live probe" }
```

### 3. Output language — never silently guess

```
BAD  (current likely behavior):
  "Detected: Osmosis" ← even if the logic got lucky, this reads as confident when
                          it might just be first-match-wins

GOOD (Tier A, resolved):
  "Confirmed: Osmosis — exact HRP match (osmo)"

GOOD (Tier B, genuine collision):
  "Cannot distinguish from format alone: Bitcoin / Bitcoin SV / Bitcoin Cash (legacy)
   — these three chains share identical version bytes by design. Requires
   transaction-history lookup to confirm which chain this address is active on."

GOOD (Tier C, format-invariant):
  "19+ EVM-compatible chains share this exact format. Use Investigate to run a
   live RPC probe, or check known transaction history."
```

---

## SPECIFIC BUGS YOUR CSV ALREADY HINTS AT (worth checking directly)

| Collision pair | Your CSV's own note | Actual fix needed |
|---|---|---|
| Bitcoin `1,3` vs Bitcoin SV `1,3` | *"Format alone cannot reliably separate BTC, BCH legacy, and BSV"* | Already correctly flagged as unresolvable — don't try to fix, just make sure the UI actually surfaces this note prominently, not buried |
| Litecoin `M` vs Namecoin `M` | Not flagged in notes | Decode actual version byte — Litecoin P2SH ≠ Namecoin's byte, should resolve cleanly once you decode instead of matching the display character |
| Dogecoin `D` vs Decred `Ds`/`Dc` | Not flagged in notes | Naive single-character prefix match would incorrectly treat any `D...` as ambiguous between these — fix is checking the full 2-char prefix for Decred, not just first letter |
| Ravencoin `r` vs XRP `r` | Not flagged in notes | **This is the one to check first** — different Base58 alphabets, real risk of silent misdecoding |
| Polkadot `1` vs Bitcoin `1` | Not flagged, but low real risk | Different length (47–48 vs 26–35) and different encoding (SS58 vs Base58Check) already separates these if length is checked — just confirm your logic checks length+encoding together, not prefix alone |

---

## WHAT NOT TO DO

Don't add more coins to the CSV as the first move. You have 42 well-documented formats already — that's a solid reference set. Adding row #43, #44, #45 without fixing the matching strategy just adds more candidates to Tier C's confusion pile.

Don't try to build a "confidence percentage" system (e.g. "78% likely Osmosis"). Tier A cases should be 100% confirmed or not attempted. Tier B/C cases should be an honest list of candidates with a stated reason, not a probability score pretending to be precise about something that is genuinely undecidable from format alone.

Don't try to solve Tier C in this tool. That's what the live investigation engine (RPC probing) is for. The Address Intelligence Reference page's job is to be honest about what it can and can't determine from a string alone — that honesty *is* the forensic value here, more than trying to force a guess.

---

## PRIORITY ORDER

```
1. Ravencoin/XRP alphabet check       — actual latent bug risk, fix first
2. HRP exact-match table (Cosmos-SDK) — highest volume of "fake ambiguity" cases
3. SS58 network-byte decode           — same pattern, second highest volume
4. Base58Check version-byte decode    — covers Litecoin/Namecoin/Decred/Dogecoin cleanly
5. Output language pass               — confirmed vs candidate-list vs unresolvable
6. Leave Tier C (EVM, Solana) exactly as is — already handled honestly
```

None of this requires AI. None of this requires a bigger database. It requires decoding one layer deeper than the display string for the formats where a real discriminator already exists — and being honest with a labeled confusion set where it genuinely doesn't.
