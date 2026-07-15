# AXON — Deterministic Address & Contract Identification Spec

Target: ≥90% correct classification with zero LLM involvement in the decision. AI only narrates after identity is locked. Explorer API calls are the fallback/verification layer for the ambiguous tail, not the primary method.

---

## 0. Core Principle

**Identity is decided by a decision tree of hard checks, in strict priority order. The first check that returns a definitive match wins. If nothing matches definitively, the address is `UNRESOLVED` — it is never guessed by an LLM.**

Every stage returns one of three states:
- `MATCH(chain, confidence=1.0, method)` — stop, done
- `NO_MATCH` — fall to next stage
- `CANDIDATE(chain, confidence<1.0)` — collected, resolved later by existential probing

AI narration is only ever called on a `MATCH` or a probed `CANDIDATE` that existential probing confirmed. Never on raw `UNRESOLVED`.

---

## 1. Coin/Wallet Address Pipeline

### Stage 1 — Format Bucketing (deterministic, string-only, <1ms)

Bucket the raw string by structural shape before doing anything else. This alone eliminates most cross-chain confusion:

| Pattern | Bucket |
|---|---|
| `^0x[0-9a-fA-F]{40}$` | EVM (Tier 2 — needs chain-id resolution) |
| `^0x[0-9a-fA-F]{64}$` | EVM tx hash / not an address — reject |
| `^bc1[a-z0-9]{25,90}$` | Bitcoin Bech32/Bech32m — MATCH immediately (HRP `bc` is Bitcoin-only) |
| `^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$` | Bitcoin Base58Check candidate |
| `^ltc1[a-z0-9]{25,90}$` | Litecoin Bech32 — MATCH (HRP `ltc`) |
| `^[LM][a-km-zA-HJ-NP-Z1-9]{25,34}$` | Litecoin Base58Check candidate |
| `^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$` | Dogecoin Base58Check candidate |
| `^T[1-9A-HJ-NP-Za-km-z]{33}$` | Tron Base58Check candidate |
| `^addr1[a-z0-9]{50,110}$` | Cardano Shelley Bech32 — MATCH (HRP `addr`) |
| `^Ae2[1-9A-HJ-NP-Za-km-z]{50,100}$` or `^DdzFF[1-9A-HJ-NP-Za-km-z]{90,110}$` | Cardano Byron — MATCH |
| `^cosmos1[a-z0-9]{38}$` | Cosmos Hub — MATCH (HRP `cosmos`) |
| `^osmo1[a-z0-9]{38}$` | Osmosis — MATCH (HRP `osmo`) |
| `^(inj\|celestia\|juno\|akash\|...)1[a-z0-9]{38}$` | respective Cosmos SDK chain — MATCH (HRP is the chain ticker, literally printed in the string) |
| `^[1-9A-HJ-NP-Za-km-z]{32,44}$` (no version prefix, pure base58, no checksum bytes) | Solana CANDIDATE — this is the one genuinely ambiguous bucket, see 1.4 |
| `^r[a-zA-Z0-9]{24,34}$` | Ripple/XRP Base58 (custom alphabet) — MATCH |
| `^X[1-9A-HJ-NP-Za-km-z]{33}$` | Dash — MATCH |

**Why this fixes your Cardano/Cosmos bug:** every Bech32-family chain embeds its own ticker as the human-readable part (HRP) *inside the string itself* — `addr1...` cannot be anything but Cardano, `cosmos1...` cannot be anything but Cosmos Hub, `bc1...` cannot be anything but Bitcoin. If your current code is misreporting these, the HRP substring extraction is either (a) not happening before the string reaches the LLM, or (b) happening but the result is being discarded/overridden by a later "AI narration" call that re-guesses from scratch. **Fix: once Stage 1 returns MATCH for a bech32-prefixed address, that result must be treated as immutable ground truth — no downstream stage, including AI narration, may override it.**

### Stage 2 — Checksum Validation (for Base58Check candidates only)

For any `CANDIDATE` from a Base58Check bucket (Bitcoin, Litecoin, Dogecoin, Tron, Dash):

1. Base58-decode the full string.
2. Split into `[version_byte][payload][4-byte checksum]`.
3. Compute `SHA256(SHA256(version_byte + payload))[0:4]`.
4. Compare to the trailing 4 bytes.
5. Cross-reference `version_byte` against the known version-byte table (below) to confirm it matches the chain implied by Stage 1's bucket.

If checksum fails → `NO_MATCH`, discard candidate entirely (it's not a valid address for *any* chain — flag as malformed, don't pass downstream).
If checksum passes AND version byte matches expected chain → `MATCH(confidence=1.0)`.
If checksum passes but version byte implies a *different* chain than Stage 1 assumed → re-bucket to the version-byte chain and re-validate (this is what actually happens with some legacy address overlaps — resolve it here, not with AI).

**Version byte table (the ones covering your collision cases):**

| Version byte | Chain | Prefix char(s) |
|---|---|---|
| `0x00` | Bitcoin P2PKH | `1` |
| `0x05` | Bitcoin P2SH | `3` |
| `0x30` | Litecoin P2PKH | `L` |
| `0x32` | Litecoin P2SH (deprecated) | `M` or `3` |
| `0x1E` | Dogecoin P2PKH | `D` |
| `0x16` | Dogecoin P2SH | `9`/`A` |
| `0x00` (Tron uses different encoding entirely — see below) | — | — |

Tron is a special case: it's Base58Check but over a **secp256k1 pubkey hash prefixed by `0x41`**, not the Bitcoin version-byte namespace — don't run it through the same table, give it its own decode path.

### Stage 3 — Bech32/Bech32m HRP + Checksum Verification

For anything caught in Stage 1 as bech32-shaped:
1. Extract HRP (everything before the last `1`).
2. Run the Bech32 polymod checksum over the full string (BIP-173 for Bech32, BIP-350 for Bech32m — Bitcoin Taproot addresses `bc1p...` use Bech32m specifically, not Bech32; using the wrong checksum algorithm here is a classic silent-fail bug worth checking).
3. HRP lookup table → chain. This is a simple dictionary, not inference:

```
bc      → Bitcoin
tb      → Bitcoin Testnet
ltc     → Litecoin
addr    → Cardano (mainnet)
addr_test → Cardano (testnet)
cosmos  → Cosmos Hub
osmo    → Osmosis
juno    → Juno
akash   → Akash
celestia→ Celestia
inj     → Injective
stars   → Stargaze
secret  → Secret Network
kava    → Kava
```

If checksum fails → malformed, reject (don't pass to AI as "possibly this chain").

### Stage 4 — EVM Address Handling (Tier 2: chain-id ambiguity, not format ambiguity)

`0x` + 40 hex chars is **structurally identical across all 30+ EVM chains** — Ethereum, Polygon, BSC, Arbitrum, Base, Optimism, Avalanche C-Chain all use the exact same address format. This is a real, unavoidable ambiguity — **format alone cannot tell you the chain.** This is where existential probing (Stage 5) is not optional, it's required.

Sub-steps:
1. Verify EIP-55 checksum casing if the string is mixed-case (confirms it's a well-formed EVM address, doesn't tell you which chain).
2. Do NOT let AI guess the chain from context alone unless the user's investigation is already scoped to one chain (in which case that's a legitimate prior, not a guess).
3. Pass to Stage 5 for live resolution.

### Stage 5 — Existential Probing (explorer/RPC verification layer)

This is your fallback + confirmation layer, used for: (a) EVM chain-id resolution, (b) Solana disambiguation, (c) any CANDIDATE that Stages 1–4 couldn't resolve to confidence 1.0.

**For EVM candidates**, query in parallel against each candidate chain's RPC/explorer, cheapest signal first:
1. `eth_getCode` — nonzero → contract exists on this chain. Zero + `eth_getBalance` nonzero or `eth_getTransactionCount` nonzero → EOA with activity on this chain.
2. Rank candidate chains by hit — if the address has code/activity on exactly one chain, that's your `MATCH`. If it has activity on multiple (common — many addresses are used cross-chain), report **all** chains it's active on rather than forcing a single answer. This is more useful for forensics anyway (`trail_status: active_on_multiple_chains`) than a false single answer.
3. Use free/already-integrated endpoints first: Etherscan API v2 (multichain, you already have this), Alchemy RPC (you already have this) before adding new dependencies.

**For Solana candidates** (the genuinely hard Tier-3 base58 case):
1. Query Solana RPC `getAccountInfo`. If it resolves to a real account → `MATCH(Solana, confidence=1.0)` via existential proof, not pattern guess.
2. If it doesn't resolve on Solana, fall back and re-check whether it actually matched a Base58Check bucket you mis-bucketed in Stage 1 (e.g. malformed Bitcoin address that slipped through).
3. If it resolves nowhere → `UNRESOLVED`, report honestly rather than defaulting to a guess.

**Explorer fallback endpoints to wire in** (add to your existing Etherscan v2 / Alchemy stack):
| Chain | Free explorer API |
|---|---|
| Bitcoin | blockstream.info/api (no key needed) |
| Solana | public RPC (`api.mainnet-beta.solana.com`) or Helius free tier |
| Cardano | Blockfrost free tier |
| Cosmos ecosystem | each chain's LCD REST endpoint (public, no key) |
| Tron | TronGrid free tier |

### Stage 6 — AI Narration (report-writing only)

Only invoked after Stage 1–5 produce a `MATCH` or an honest `UNRESOLVED`/`active_on_multiple_chains` state. The AI's job at this point is exclusively: write the forensic sentence describing what was found ("This is a Cardano Shelley-era address confirmed via Bech32 HRP `addr`, active with 14 transactions per Blockfrost"). **The AI must never be given the raw address and asked "what chain is this" — it is only ever given the already-resolved chain + evidence and asked to phrase it.** This is the single most important architectural fix: identity resolution and narration must be two separate function calls with no way for the second to override the first.

---

## 2. Contract Identification Pipeline (same tiered philosophy, applied to bytecode)

### Stage 1 — Exact Bytecode Hash Match
`keccak256(runtime_bytecode)` against a lookup table of known contracts (OpenZeppelin standard templates, popular factories, top-N verified contracts by tx volume). Exact hash match = `MATCH(confidence=1.0)`.

### Stage 2 — Proxy Pattern Detection
Fixed-offset bytecode signatures, fully deterministic:
- EIP-1167 minimal proxy: bytecode is a known fixed template with only the target address varying — regex/byte-slice match, not inference.
- EIP-1967 storage-slot proxy: check `keccak256("eip1967.proxy.implementation") - 1` storage slot via `eth_getStorageAt`. If populated, follow to implementation contract and classify that instead.
- UUPS: similar fixed storage slot pattern.

### Stage 3 — Function Selector Fingerprinting
Extract all 4-byte selectors present in the bytecode (scan for `PUSH4` opcodes followed by `EQ`/dispatcher pattern). Compare the *set* of selectors against known interface sets:
- ERC-20: `{transfer, approve, transferFrom, balanceOf, totalSupply, allowance}` selectors present → high-confidence ERC-20.
- ERC-721: `{ownerOf, safeTransferFrom, tokenURI, ...}`.
- ERC-1155, ERC-4626, etc. — same approach.

This gives interface class even for unverified/unmatched contracts, deterministically, no LLM.

### Stage 4 — Live `supportsInterface` (EIP-165) Call
For any contract claiming a standard interface, confirm with a live `eth_call` to `supportsInterface(bytes4)` rather than trusting the selector-fingerprint alone. This is your explorer/RPC verification step, same role as Stage 5 in the coin pipeline.

### Stage 5 — Fuzzy Bytecode Similarity (last resort, and the only place "AI-adjacent" scoring belongs)
For contracts that don't exact-match or fingerprint anything: SimHash or MinHash the bytecode, compare against your corpus, return a similarity score + nearest known contracts. This is explicitly presented as a similarity score, never as a confident identity claim, and is clearly labeled as such in the report ("structurally similar to X, Y — not a confirmed match").

### Stage 6 — AI Narration
Same rule as coins: AI writes the sentence describing the already-locked classification. It does not decide the classification.

---

## 3. UI — "Explorer Check" Button

Add a button next to both the wallet-format result and the contract-classification result:
- **Wallet address:** button labeled "Verify on-chain" — triggers Stage 5 existential probing on demand (useful when a user wants to double check a Stage 1–4 result, or force-resolve an `UNRESOLVED`).
- **Contract:** button labeled "Check interface" — triggers Stage 4 live `supportsInterface`/storage-slot check on demand.

Both buttons show: which stage produced the current classification, and the confidence/evidence backing it (HRP match / checksum pass / bytecode hash / live RPC confirmation) — so the analyst can see *why* AXON says what it says, not just the conclusion. This traceability is also good forensic practice independent of the bug fix.

---

## 4. Why This Gets You to ~90%+

- Bech32 chains (Bitcoin SegWit/Taproot, Cardano, all Cosmos SDK chains): **100% deterministic**, HRP is printed in the string.
- Base58Check chains (Bitcoin legacy, Litecoin, Dogecoin, Dash): **100% deterministic** via checksum + version byte.
- Tron, Ripple: **100% deterministic**, distinct alphabets/prefixes.
- EVM: **100% deterministic on format** (it's an EVM address), chain-id requires probing but that's inherent to EVM's design, not a bug — this is true even for Etherscan itself.
- Solana: the one real ambiguous case, resolved via existential probing rather than guessing, which is the same thing every professional tool (Chainalysis, TRM) does under the hood.

The remaining ~10% failure tail is genuinely ambiguous cases (malformed input, brand-new/unindexed contracts, addresses with zero on-chain footprint on any probed chain) — which is the honest ceiling, and far better than reporting a confident wrong answer.

---

## 5. Implementation Priority

1. Fix HRP extraction + immutability (Stage 1/3 for coins) — this alone kills your Cardano/Cosmos misfires, highest ROI, smallest change.
2. Decouple identity resolution from AI narration into two separate function calls — this stops any future regression of bug #1.
3. Wire base58 checksum + version-byte validation for the Base58Check bucket.
4. Add existential probing for EVM chain-id and Solana.
5. Build the contract pipeline (bytecode hash → proxy detection → selector fingerprint → supportsInterface).
6. Add the two "verify on-chain" / "check interface" buttons.
