# AXON: Deep Technical Explainer & Module Breakdown

This document serves as the absolute deep-dive into **how** and **why** AXON works under the hood. It is designed to provide full answers to technical questions regarding APIs used, logic steps, data structures, and the rationale behind each component.

---

## 1. Wallet Analysis Engine (The 5-Stage Mathematical Model)

**What it is:** The core engine that evaluates cryptocurrency wallets (EVM, BTC, SOL, TRON) and assigns a threat score.
**Why it's used:** To dynamically determine if a wallet is malicious based on its behavior, rather than relying solely on static blocklists.
**APIs Used:** Etherscan v2 (EVM), Blockchain.info (BTC), Solscan (SOL), Tronscan (TRX).

### How it Works (The Steps)
1. **Transaction Fetching:** The backend queries the native block explorer API for the target wallet. It pulls up to 10,000 transactions (for quick scans, usually limited to 100-1000 for speed, while `deep` scans pull up to 5,000).
2. **Data Parsing:** It processes incoming and outgoing transfers, identifying counterparties, transaction timestamps, and values.
3. **The 5-Stage Engine Evaluation:**
   - **L1 (Temporal Anomaly - 28%):** Analyzes timestamps. Are transactions happening in micro-seconds (bot behavior)? Are there long periods of dormancy followed by sudden spikes (compromised wallet)?
   - **L2 (Fund Velocity & Graph - 24%):** Calculates the fan-out (how many unique counterparties the wallet sends to). High fan-out implies a mixer or a distribution wallet.
   - **L3 (Economic Value - 23%):** Analyzes the volume of funds. Massive transfers within short windows trigger velocity spike alerts.
   - **L4 (Attribution - 15%):** Checks the local `MaliciousWallet` database. If the wallet is a known threat actor, this layer instantly penalizes the score.
   - **L5 (Dual-Mode AI Synthesis - 10%):** Discussed below.
4. **Outputs:** A comprehensive JSON object containing the `risk.score`, `risk.label`, `graph.nodes`, `graph.edges`, and `analyticalSynthesis`.

---

## 2. Dual-Mode AI Synthesis & Confidence Scoring

**What it is:** A multi-agent AI system that reads the mathematical outputs of L1-L4 and generates a final verdict.
**Why it's used:** Raw numbers lack context. The AI interprets the numbers to explain *why* the wallet acts the way it does.
**APIs Used:** Groq (`llama-3.3-70b-versatile`) or OpenRouter (`meta-llama/llama-3.1-8b-instruct`).

### How it Works (The Steps)
1. **Context Construction:** The backend takes the L1-L4 results, the OSINT data, and the raw transaction summaries, and builds an "Evidence Context" string.
2. **Dual-Adversarial Mode (for Deep Scans):**
   - **Agent A (Prosecutor):** Instructed to find every possible reason why the wallet is malicious.
   - **Agent B (Defense):** Instructed to find every possible reason why the wallet is benign (e.g., it's just an active trader).
   - **The Judge:** A third prompt that reads Agent A and Agent B's arguments, and synthesizes a final, highly balanced verdict.
3. **Confidence Scoring:** The AI is instructed to assign a Confidence Score (0-100%) based on the strength of the evidence. If there are only 2 transactions, confidence is inherently low.
4. **Outputs:** A structured JSON object injected into the report under `risk.analyticalSynthesis`, containing `prosecution_summary`, `defense_summary`, and the `judge_reasoning`.

---

## 3. Contract Forensic Scanner

**What it is:** An auditing engine specifically for EVM smart contracts.
**Why it's used:** To detect vulnerabilities, honeypots, and rug-pull mechanics in deployed bytecode before users interact with them.
**APIs Used:** GoPlus Labs Security API, Etherscan ABI fetching.

### How it Works (The Steps)
1. **Identification:** The `cross_chain.py` router detects that a `0x` address holds bytecode (is a contract). The scan is routed to `contract_scanner.py`.
2. **Static Vulnerability Mapping:** 
   - Uses simulated Slither & Mythril rulesets against the contract's code structure.
   - Queries GoPlus Labs to identify if the contract has a `mint` function (can create infinite tokens), can pause trading (honeypot), or has hidden owner privileges.
3. **Outputs:** Returns a report with `security_score`, `vulnerabilities` (High, Medium, Low), and `goplus` insights.

---

## 4. OSINT (Open Source Intelligence) Sweep

**What it is:** An automated web scraper that searches the internet for mentions of a specific crypto address.
**Why it's used:** Malicious addresses are often reported on Twitter, Reddit, or GitHub long before they make it into official threat databases.
**APIs Used:** Google Custom Search / DuckDuckGo scraping (simulated for speed), Twitter API integrations.

### How it Works (The Steps)
1. **Targeting:** The address is passed to `osint_scraper.py`.
2. **Querying:** The system searches the surface web for `"0xAddress" AND ("scam" OR "hack" OR "stolen")`.
3. **Data Extraction:** It pulls Reddit mentions, GitHub issues, and general web aliases.
4. **Outputs:** Returns a `osint.summary` with counts of mentions and potential aliases (e.g., "Identified as Lazarus Group by Chainalysis on Twitter").

---

## 5. Bulk Investigation Cases (XDR Interface)

**What it is:** A system designed to process dozens or hundreds of addresses simultaneously.
**Why it's used:** Compliance teams (AML/KYC) get batches of addresses in CSVs. Manually scanning them one-by-one is impossible.
**APIs Used:** Same as Wallet Analysis, but throttled using `asyncio.Semaphore`.

### How it Works (The Steps)
1. **Ingestion:** The frontend sends an array of addresses to `/scan/bulk`.
2. **Throttling:** The backend processes exactly 3 addresses at a time to prevent rate-limiting from Etherscan/Groq.
3. **Cross-Correlation (Similarity Matrix):** After all scans finish, the system compares the results. If Address A and Address B both interacted with the same mixer, it links them.
4. **Outputs:** A high-level Dashboard highlighting only the most critical threats, sorting them by Risk Score, and plotting them on a unified D3 network graph.

---

## 6. Verifiable Chain of Custody & PDF Reports

**What it is:** The legally admissible output mechanism for AXON.
**Why it's used:** Law enforcement needs proof that a digital forensics report was not tampered with after generation.
**Libraries Used:** ReportLab (Python PDF generation), Hashlib.

### How it Works (The Steps)
1. **Data Freezing:** When an investigation finishes, the entire JSON payload is sorted alphabetically and hashed using `SHA-256`.
2. **Database Commit:** A unique `report_id` and the `sha256_hash` are permanently saved to the `VerificationReport` SQLite table.
3. **PDF Stamping:** The PDF is generated, and the Hash is printed on the cover page.
4. **Verification Portal:** Anyone can enter the `report_id` in the UI to see if the Hash printed on their PDF matches the immutable Hash in the database.

---

## 7. Supported Coins & Address Intelligence

**What it is:** The deterministic router that identifies which blockchain an address belongs to.
**Why it's used:** The user shouldn't have to tell the software what coin they are pasting.

### Supported Chains
- **EVM (Ethereum, Base, Polygon, etc.):** 42-char `0x` addresses.
- **Bitcoin (BTC):** `1`, `3`, `bc1` formats. Validated using Base58Check and Bech32m checksums.
- **Solana (SOL):** Base58 Ed25519 public keys.
- **Tron (TRX):** `T` prefixed 34-char strings.
- **Unsupported:** Litecoin, Dogecoin (identified, but scanning is blocked).

### How it Works (The Steps)
1. **Regex + Checksum:** The system applies strict mathematical rules. If an address passes a Bech32m checksum, it *is* Bitcoin Taproot. No guessing.
2. **AI Fallback:** If the math fails to recognize the address, AXON sends it to the AI to "guess" (e.g., Cardano, XRP). It flags this result as "AI Assisted" with "Unverified" checksums.
3. **Output:** Defines the exact block explorer to use, preventing the system from querying Etherscan for a Solana address.
