# AXON Phase 5 — Forensic Report Refactor & Determinism Spec
## Build prompt for Claude Code
## This phase is about output quality, investigator UX, and repeatability.
## No new features. No new APIs. Fix what's already there, make it court-ready.

---

## The Core Problem (read this first)

AXON currently produces **system output** when it should produce **investigator output**.

The difference:
- System output: "L4 Penalty: THREAT_DB match, score +15, reason: {'label': 'mixer'}"
- Investigator output: "Finding: Direct interaction with sanctioned mixer. Evidence: 47 transactions to 0xd90e…, spanning Oct 2024–Jan 2025. Impact: Funds commingled with OFAC-sanctioned protocol. Confidence: HIGH."

Same underlying data. Completely different utility to an officer, a compliance team, or a court.

Every problem below is a symptom of the same root cause: **the report was designed around the data model, not around the reader**. Phase 5 fixes this.

---

## Problem 1 — Report Language: Computer → Investigator

### What to remove from every report surface (frontend + PDF)
```
NEVER show:
  {'key': value}           → any raw dict/JSON syntax
  "L4 Penalty"            → internal scoring layer names as primary labels
  "score += 15"           → scoring arithmetic visible to the user
  "THREAT_DB"             → internal database identifiers
  "None" / "null"         → empty programmatic values
  "Unknown" × 10          → see Problem 3
  "N/A"                   → replace with a real statement of what wasn't found
```

### What every finding must contain instead

```
FINDING STRUCTURE (use this for every surfaced signal, no exceptions):

  Finding:    One sentence. What was observed. Active voice. No jargon.
              "This wallet sent funds directly to a sanctioned mixer protocol."

  Evidence:   Specific, citable data points. Tx hashes, timestamps, amounts.
              "47 transactions totaling 14.2 ETH between Oct 12 2024 and Jan 3 2025."

  Impact:     What this means for the investigation. Why it matters.
              "Funds are commingled with OFAC-sanctioned activity. Withdrawal from
               this entity may constitute sanctions violation under 31 CFR § 594."

  Confidence: OBSERVED | INFERRED | POSSIBLE
              "OBSERVED — direct on-chain transaction record, not heuristic."
```

### Confidence vocabulary (use ONLY these three, everywhere, consistently)
```
OBSERVED  — directly on-chain, cryptographically verifiable, deterministic
INFERRED  — derived from behavioral pattern across multiple data points,
             reproducible but not a single citable tx
POSSIBLE  — heuristic or AI-derived, may vary between runs, label accordingly
```

If the AI contributed to a finding, it MUST be labeled POSSIBLE, not OBSERVED or INFERRED. This is the only place in the system where AI output is distinguished from deterministic output in the user-visible layer. Everything else in the report that is labeled OBSERVED or INFERRED must be reproducible exactly by a second officer running the same scan.

---

## Problem 2 — No Executive Summary

### The 30-second rule
An officer must be able to understand the ENTIRE CASE within 30 seconds of opening the report. This means the first thing they see is not a score, not a graph, not a table. It is a short paragraph written in plain English.

### Executive Summary structure (appears at absolute top of report and PDF)

```
SUBJECT:      0x098B716B8Aaf21512996dC57EB0615e2383E2f96
SCAN DATE:    2026-06-14 14:28:21 UTC
SCAN ID:      AXON-2026-06-14-A3F7 (deterministic, explained below)
SCAN DEPTH:   200 transactions / 90-day window
RISK VERDICT: CRITICAL (87/100)

SUMMARY:
This wallet exhibits a high-confidence laundering pattern. Funds were received
from the Ronin Bridge exploit address (1 hop, OBSERVED), immediately peeled
through 3 intermediary wallets over 72 hours, and partially deposited into
Binance (deposit address confirmed, OBSERVED). The wallet has been dormant for
214 days since the final transfer. Direct interaction with OFAC-sanctioned
entity Tornado Cash was confirmed across 47 transactions (OBSERVED).

PRIMARY RISK FACTORS (ranked):
  1. CRITICAL — OFAC-sanctioned entity interaction (47 txns) [OBSERVED]
  2. CRITICAL — 1-hop contamination from Ronin exploit wallet [OBSERVED]
  3. HIGH     — Peel chain structuring detected, 3 hops, 14.2 ETH [INFERRED]
  4. MEDIUM   — Dormancy-then-spike pattern (214 day gap) [INFERRED]
  5. LOW      — Round-denomination transactions (60% of outflows) [INFERRED]
```

This replaces nothing — all existing detail panels remain. This is added ABOVE everything else. It is generated deterministically from the L1–L4 scored signals, not from the AI. The AI's L5 verdict appears as a SEPARATE labeled section below the deterministic summary.

---

## Problem 3 — Unknown × 10

### Rule: never surface a field that is empty, null, or unresolved

```
CURRENT (wrong):
  Label:          Unknown
  ENS Name:       Unknown
  First Seen:     Unknown
  Total Sent:     Unknown

CORRECT:
  Label:          No attribution found in threat corpus or public databases
  ENS Name:       No ENS domain registered to this address
  First Seen:     Earliest transaction not available within 200-tx scan window
                  [Deep Scan required for full history]
  Total Sent:     Unable to calculate — full transaction history not loaded
```

### Implementation rule
Before rendering ANY field in the report or PDF:
```python
def render_field(label, value):
    if value is None or value == "Unknown" or value == "" or value == "N/A":
        return FIELD_ABSENCE_MESSAGES[label]  # pre-written per field
    return value

FIELD_ABSENCE_MESSAGES = {
    "label":      "No attribution found in threat corpus or public databases.",
    "ens":        "No ENS domain registered to this address.",
    "first_seen": "Earliest transaction not available in current scan depth.",
    "total_sent": "Outflow total unavailable — full history not loaded.",
    # add one per field, no generic fallback
}
```

If you don't have a pre-written message for a field, hide the field entirely. Never show the field label with an empty or Unknown value. A blank field with a label looks like a system error. A missing field looks like a deliberate choice.

---

## Problem 4 — Evidence Ranking

### Every finding must be ranked before display

```python
SEVERITY_ORDER = {
    "CRITICAL": 0,
    "HIGH":     1,
    "MEDIUM":   2,
    "LOW":      3,
    "INFO":     4,
}

CONFIDENCE_ORDER = {
    "OBSERVED": 0,
    "INFERRED": 1,
    "POSSIBLE": 2,
}

def sort_findings(findings):
    return sorted(
        findings,
        key=lambda f: (SEVERITY_ORDER[f.severity], CONFIDENCE_ORDER[f.confidence])
    )
```

The highest-severity, highest-confidence finding is always first. An OFAC match (CRITICAL, OBSERVED) appears before a behavioral pattern (HIGH, INFERRED) which appears before an AI hypothesis (MEDIUM, POSSIBLE). The reader's eye goes to the most important thing automatically.

---

## Problem 5 — Investigator Notes

### Data model addition (add to Case entity and to individual scans)

```python
class InvestigatorNote:
    id:            str        # uuid
    scan_id:       str        # which scan this is attached to
    case_id:       str        # which case (if any)
    author:        str        # analyst name, free text for now
    content:       str        # free text, supports markdown
    note_type:     str        # "observation" | "question" | "lead" | "discrepancy"
    attached_txs:  List[str]  # list of tx hashes this note relates to
    created_at:    datetime
    # Notes are IMMUTABLE after creation — append-only, never edit.
    # This preserves chain of custody. If wrong, add a correction note.
```

### UI requirements
- Notes panel appears in the right rail of every investigation view
- Adding a note does NOT require saving a case first — notes can be added to any scan immediately
- Note types have distinct visual treatment:
  - `observation` → neutral, gray
  - `question`    → amber, open question icon
  - `lead`        → blue, arrow icon  
  - `discrepancy` → red, flag icon
- Notes export into the PDF dossier under "Investigator Annotations" section
- Notes are append-only. No edit button. If an investigator made a mistake, they add a new note marked "CORRECTION: ..."

---

## Problem 6 — Timeline Icons

### Icon mapping for timeline events (use consistently, never mix up)

```
FUNDING_IN          →  ↓ green arrow         "Received [amount] from [source]"
FUNDING_OUT         →  ↑ red arrow           "Sent [amount] to [destination]"
EXCHANGE_DEPOSIT    →  🏦 bank icon          "Deposit to [exchange name]"
EXCHANGE_WITHDRAWAL →  🏦 bank icon (out)    "Withdrawal from [exchange name]"
BRIDGE              →  ⇄ bridge icon         "Bridged [amount] [chain→chain] via [bridge]"
DEX_SWAP            →  ⇌ swap icon           "Swapped [token A] → [token B] via [protocol]"
MIXER_INTERACTION   →  🌀 vortex icon        "Interaction with [mixer name]"
CONTRACT_DEPLOY     →  📄 deploy icon        "Deployed contract [address]"
CONTRACT_CALL       →  ⚙️ gear icon         "Called [function] on [contract]"
TOKEN_APPROVAL      →  ✓ checkmark icon      "Approved [amount] [token] to [spender]"
DORMANCY_START      →  ⏸ pause icon         "Last activity before [N]-day dormancy"
DORMANCY_END        →  ▶ play icon           "First activity after [N]-day dormancy"
NFT_TRANSFER        →  🖼️ frame icon        "Transferred [NFT name/ID]"
SELF_TRANSFER       →  ↻ loop icon          "Self-transfer (wallet consolidation)"
```

Every timeline event must resolve to ONE of these types. If it doesn't match, it goes under `CONTRACT_CALL` as a generic event, never unlabeled.

---

## Problem 7 — Determinism & Reproducibility

### This is the most important requirement in this spec.

If Officer A and Officer B run AXON on the same address with the same scan depth on the same day, they must receive byte-for-byte identical L1–L4 outputs. The only permitted source of variation is L5 (AI), and that variation must be explicitly labeled as such in the report.

### How to achieve this

**Step 1: Deterministic Scan ID**
```python
import hashlib, json

def generate_scan_id(address: str, scan_depth: int, scan_date: str) -> str:
    payload = json.dumps({
        "address":    address.lower(),
        "depth":      scan_depth,
        "date":       scan_date,  # YYYY-MM-DD only, not time — same-day runs are identical
        "engine_ver": "AXON-5.0"  # bump on ANY scoring formula change
    }, sort_keys=True)
    hash = hashlib.sha256(payload.encode()).hexdigest()[:12].upper()
    return f"AXON-{scan_date}-{hash}"
```

Two officers scanning the same address on the same day get `AXON-2026-06-14-A3F7C2`. Different days get different IDs (data may have changed). Same address, different depth → different ID (different data window).

**Step 2: All L1–L4 signals must be purely deterministic**
```
Allowed as L1–L4 signal inputs:
  ✓ Transaction hash (immutable on-chain)
  ✓ Block number / timestamp (immutable)
  ✓ ETH/token value (immutable per-tx)
  ✓ Address-to-address relationships (immutable)
  ✓ Database match (deterministic given same DB version)

NEVER allowed in L1–L4:
  ✗ LLM output of any kind
  ✗ Random sampling of transactions
  ✗ Time.now() used in signal logic (use block timestamps, not wall clock)
  ✗ Any external API that returns non-deterministic/live data without caching
    (e.g., if ETH price fluctuates, cache the price at scan time, don't re-fetch)
```

**Step 3: AI output is quarantined**
```
L5 AI output:
  - Stored separately from L1–L4 results in the database
  - Labeled in every UI surface as "AI INTERPRETATION — may vary between runs"
  - NOT factored into the numeric score deterministically
    (the delta is applied, but stored as a separate field, not baked into the base score)
  - The PDF dossier has a clear section break:
    "DETERMINISTIC FINDINGS (L1–L4)" and "AI INTERPRETATION (L5 — non-deterministic)"
  - If an officer needs to testify in court, they testify on L1–L4 findings.
    L5 is advisory context.
```

**Step 4: Report versioning**
```python
class ScanRecord:
    scan_id:        str       # AXON-2026-06-14-A3F7C2
    address:        str
    scan_depth:     int       # 200 | 1000 | 5000
    engine_version: str       # "AXON-5.0" — bump on any formula change
    l1_score:       float
    l2_score:       float
    l3_score:       float
    l4_score:       float
    l5_delta:       float     # stored separately
    final_score:    float     # l1+l2+l3+l4 only, NOT including l5_delta
    final_score_with_ai: float  # final_score + l5_delta, labeled as such
    findings:       List[Finding]  # deterministic only
    ai_verdict:     str           # stored separately, labeled non-deterministic
    raw_data_hash:  str           # SHA-256 of the raw API response JSON
    created_at:     datetime
    # Every scan is stored. Rescanning creates a NEW record, never overwrites.
```

If an investigator runs AXON on the same address 3 times over 3 weeks, there are 3 scan records: `v1`, `v2`, `v3`. The case timeline shows all three. Score changes between versions are surfaced explicitly: "Score changed from 42 to 87 between scan v1 (2026-06-01) and scan v2 (2026-06-14) — primary driver: new OFAC match in threat DB."

---

## Problem 8 — API Efficiency (what to remove, what to keep)

### Remove or replace immediately

```
REMOVE:
  DuckDuckGo scraping         → unreliable, rate-limited instantly, returns noise,
                                 cannot be cited in court ("I scraped Google" is not
                                 admissible attribution). Replace with: structured
                                 OSINT from Forta + your threat DB only.

  Any BeautifulSoup web scraping for threat intel → same problem. Unstructured,
                                 non-reproducible, legally weak.

REPLACE:
  GoPlus free tier (if used)  → fine for demo, unreliable for production. 
                                 Either cache all GoPlus responses at scan time
                                 (for reproducibility) or remove from L1-L4 scoring
                                 (put in an "external advisory" section instead).
```

### Keep, but add response caching

```
Every external API call in L1–L4 must be cached at scan time:
  - Store the raw API response JSON
  - Hash it (SHA-256) and store the hash alongside the scan record
  - Never re-fetch for the same scan_id — if an officer views the report
    tomorrow, they see the SAME data that was fetched today
  - This is required for reproducibility AND for court admissibility
    (the evidence was captured at time T, not re-fetched from a live API
     that may have changed)

Cache storage: same SQLite db, a raw_responses table:
  {scan_id, source_name, endpoint, response_json, response_hash, fetched_at}
```

### API call budget (what to fetch, in what order, with what fallback)

```
For every wallet scan, fetch in this order. Stop early if rate-limited.
Mandatory (scan fails without these):
  1. Etherscan: tx list (200 or deep-scan depth)
  2. Etherscan: balance

High-value (run if available):
  3. Alchemy: token balances (ERC-20 portfolio)
  4. Forta: alerts for this address
  5. Your threat DB: exact match

Nice-to-have (run async, don't block report generation):
  6. ENS resolution
  7. Alchemy: NFT holdings
  8. Forta: 1-hop contamination check

L5 AI (run last, after everything else):
  9. Groq: 3-agent debate (non-blocking — report renders without it,
            AI verdict fills in when ready, labeled as pending)
```

---

## What a final report looks like (reference layout)

```
┌─────────────────────────────────────────────────────────────────┐
│  AXON FORENSIC REPORT                          AXON-2026-06-14  │
│  Subject: 0x098B...2f96          Engine: AXON-5.0 / ETH Engine  │
│  Scan Depth: 200 txns / 90 days  Scan Date: 2026-06-14 14:28 UTC│
├─────────────────────────────────────────────────────────────────┤
│  RISK VERDICT: CRITICAL (87/100)                                │
│  ████████████████████████████████████░░░░  87%                  │
├─────────────────────────────────────────────────────────────────┤
│  EXECUTIVE SUMMARY                                              │
│  [30-second paragraph, plain English, generated from L1-L4]    │
├─────────────────────────────────────────────────────────────────┤
│  PRIMARY FINDINGS [DETERMINISTIC — L1-L4]                      │
│  Ranked: CRITICAL → HIGH → MEDIUM → LOW → INFO                  │
│                                                                 │
│  1. [CRITICAL / OBSERVED]                                       │
│     Finding:    Direct interaction with OFAC-sanctioned mixer   │
│     Evidence:   47 txns to 0xd90e… Oct 2024–Jan 2025           │
│     Impact:     Funds commingled with sanctioned entity         │
│     Confidence: OBSERVED                                        │
│                                                                 │
│  2. [CRITICAL / OBSERVED]                                       │
│     Finding:    ...                                             │
│                                                                 │
│  3. [HIGH / INFERRED]                                           │
│     Finding:    Peel chain structuring detected                 │
│     Evidence:   3-hop chain, 14.2 ETH total, 72h window        │
│     Impact:     Characteristic fund-obscuration pattern        │
│     Confidence: INFERRED (behavioral pattern, not single tx)   │
├─────────────────────────────────────────────────────────────────┤
│  SCORE BREAKDOWN                                                │
│  L1 Behavioral:     22/30    ██████████████████░░░░            │
│  L2 Graph:          19/25    ███████████████░░░░░░             │
│  L3 Economic:       18/20    ██████████████████░░             │
│  L4 Attribution:    13/15    █████████████░░                  │
│  DETERMINISTIC:     72/90                                       │
│  L5 AI Delta:       +7/10   [NON-DETERMINISTIC — labeled]      │
│  FINAL:             87/100                                      │
├─────────────────────────────────────────────────────────────────┤
│  ACTIVITY TIMELINE                                              │
│  [icons per event type, chronological, dormancy gaps visible]  │
├─────────────────────────────────────────────────────────────────┤
│  AI INTERPRETATION [L5 — NON-DETERMINISTIC, MAY VARY]          │
│  Prosecution:  "..."                                            │
│  Defense:      "..."                                            │
│  Judge Verdict: "..."                                           │
│  MITRE ATT&CK: TA0011 — Command and Control                     │
├─────────────────────────────────────────────────────────────────┤
│  INVESTIGATOR NOTES                      [+ Add Note]          │
│  [append-only, typed, color-coded by type]                     │
├─────────────────────────────────────────────────────────────────┤
│  INTEGRITY                                                      │
│  Raw data hash:   SHA256:a3f7c2d8...                           │
│  Report hash:     SHA256:9b4e1f23...                           │
│  Signed at:       2026-06-14 14:29:03 UTC                      │
│  Verify at:       axon.io/verify/AXON-2026-06-14-A3F7C2        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation order for Claude Code

Build in this sequence. Do not skip steps.

```
Step 1: Finding data model
  - Define Finding(finding, evidence, impact, confidence, severity) dataclass
  - Refactor every L1–L4 signal to emit a Finding object, not a raw score
  - All existing signal logic stays the same — only the OUTPUT format changes

Step 2: Null/unknown field handling
  - Define FIELD_ABSENCE_MESSAGES dict
  - Add render_field() wrapper
  - Replace every "Unknown" / "N/A" / None in templates with render_field()

Step 3: Executive Summary generator
  - Takes sorted findings list (L1–L4 only)
  - Generates the plain-English paragraph + ranked primary risk factors list
  - Completely deterministic — same findings → same summary

Step 4: Scan ID + versioning
  - generate_scan_id() function
  - ScanRecord model + migration
  - Every scan stored, never overwritten
  - PDF and UI both show scan_id prominently

Step 5: API response caching
  - raw_responses table
  - Wrap every external API call in cache_fetch(scan_id, source, endpoint, fn)
  - Report viewer loads from cache, never re-fetches

Step 6: AI quarantine
  - Separate l5_delta storage
  - "NON-DETERMINISTIC" label on every AI surface
  - AI section renders async after the rest of the report (doesn't block)

Step 7: Investigator notes
  - InvestigatorNote model
  - Notes panel in right rail
  - Append-only, note_type color coding
  - Notes section in PDF export

Step 8: Timeline icons
  - Event type classifier (maps every tx to one of the 14 event types above)
  - Icon rendering per type
  - Dormancy gap visualization

Step 9: PDF export update
  - New layout matching the reference above
  - Clear section break between deterministic and AI sections
  - Investigator notes section
  - Integrity hashes at the bottom
```
