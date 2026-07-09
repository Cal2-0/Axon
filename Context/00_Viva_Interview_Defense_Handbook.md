# AXON: The Complete Viva & Interview Defense Handbook

This handbook is designed to prepare you for the technical defense of AXON. It covers the exact implementation details (the "How") and the design decisions (the "Why") so you can confidently answer questions as the core developer of the platform.

---

## 1. What is AXON? (The Elevator Pitch)

**Concept:** 
AXON is an AI-assisted blockchain digital forensics and threat intelligence platform. It investigates cryptocurrency wallets and smart contracts dynamically. 

**The Problem:** 
Traditional Anti-Money Laundering (AML) tools and block explorers rely on static blacklists. If a hacker creates a new wallet today, they won't be in any database. 

**The Solution:** 
Instead of asking "Is this wallet known to be bad?", AXON asks **"Does this wallet behave like a bad wallet?"** It achieves this by pulling raw blockchain data, running it through a 5-Stage Mathematical Behavioral Engine, utilizing multi-agent AI for reasoning, and generating a cryptographically verifiable PDF report.

---

## 2. The Complete Pipeline (How it Works: Input to Output)

When a user pastes an address into AXON, here is the exact backend flow:

1. **Input & Address Intelligence:** The user pastes an address. AXON does *not* ask for the coin. It uses deterministic Regex and Checksums to mathematically prove which blockchain the address belongs to (EVM, BTC, SOL, TRON). AI is only used as a fallback for unknown chains.
2. **Data Fetching:** The backend routes the request to the correct native block explorer API and pulls up to 10,000 transactions.
3. **Normalization:** The raw data (which looks completely different for Bitcoin vs. Ethereum) is normalized into a standard, unified internal data structure.
4. **Behavioral Extraction:** AXON calculates features like velocity, fan-out, counterparty toxicity, and transaction burst rates.
5. **The 5-Stage Engine:** The normalized data is passed through our deterministic scoring algorithm to generate a raw Threat Score (0-100).
6. **Dual-Agent AI Synthesis:** The numbers are passed to an LLM (Groq/OpenRouter). One agent acts as a Prosecutor, one as a Defense Lawyer, and a Judge provides the final contextual reasoning.
7. **Report Generation:** The final JSON payload is hashed (SHA-256), saved to the database, and rendered into a 12-section PDF for court-admissible evidence.

---

## 3. Data Fetching & APIs (The Tools We Use & Why)

We rely on native, chain-specific APIs to get the most accurate raw data. 

### Why not use a unified API like Alchemy or Moralis?
*Unified APIs are great for dApps, but bad for forensics. They often abstract away raw inputs, internal transactions, or specific contract calls that we need for behavioral mapping. Going directly to the native scanners gives us unfiltered raw data.*

| Target | API Used | What It Fetches | Why We Chose It |
| :--- | :--- | :--- | :--- |
| **Ethereum (EVM)** | Etherscan v2 API | Normal txs, internal txs, ERC-20 transfers, Contract ABIs. | It is the canonical source of truth for EVM chains. It provides internal transactions which are critical for tracking contract-based money laundering. |
| **Bitcoin (BTC)** | Blockchain.info API | UTXOs, inputs, outputs, block heights. | Highly reliable for unspent transaction outputs (UTXOs) needed to map Bitcoin's peel chains. |
| **Solana (SOL)** | Solscan API | SPL token transfers, account histories. | Solana's native RPC is notoriously difficult to parse for historical data; Solscan indexes it perfectly for forensics. |
| **Tron (TRX)** | Tronscan API | TRX transfers, TRC-20 movements. | Essential for tracking Tether (USDT), which is heavily laundered on Tron. |
| **Smart Contracts** | GoPlus Labs API | Vulnerabilities, Honeypot checks, Mint authority. | GoPlus is the industry standard for on-chain, real-time protocol security checks. |
| **Threat Intel** | Forta Network | Exploit alerts, malicious signatures. | Forta uses decentralized nodes to detect active exploits in real-time. |
| **AI Synthesis** | Groq / OpenRouter | Runs `llama-3.3-70b-versatile` or `llama-3.1-8b-instruct`. | Groq provides ultra-low latency inference. We use OpenRouter as a fallback. We chose Llama over OpenAI for data privacy reasons (open-source weights). |

---

## 4. What Happens After Fetching? (Normalization)

Once Etherscan returns data, it looks different from what Blockchain.info returns. We can't build 4 different math engines.

**The Solution:**
We pass the raw payloads into a **Normalization Layer**. We strip away the chain-specific jargon (like `gasPrice` vs `UTXO`) and convert it into a standardized JSON structure containing:
*   `Incoming Flow`
*   `Outgoing Flow`
*   `Timestamps`
*   `Counterparties`
*   `Volume (Normalized to USD)`

**Why?**
This allows our 5-Stage Math Engine to be completely chain-agnostic. The engine doesn't care if it's looking at Bitcoin or Ethereum; it only looks at mathematical behavior.

---

## 5. The 5-Stage Mathematical Engine (How it Decides)

This is the core logic. The engine has 5 axes, totaling 100 points.

### Stage 1: Temporal Anomaly (28%)
*   **What it asks:** *When* did the money move?
*   **How it works:** It looks for burst activity. If a wallet has 1,000 transactions, but 900 of them occurred within a 2-minute window, it indicates a bot script or a flash loan exploit. It heavily penalizes fast, immediate dispersals.

### Stage 2: Fund Velocity & Network Graph (24%)
*   **What it asks:** *Where* is the money going?
*   **How it works:** It calculates "Fan-out" (one wallet sending to 50 wallets instantly) and "Peel Chains" (moving funds through a long chain of single wallets). High fan-out indicates a distribution wallet; peel chains indicate money laundering.

### Stage 3: Economic Behavior (23%)
*   **What it asks:** *How much* money is moving?
*   **How it works:** It looks at volume relative to the wallet's history. A wallet that normally trades $10 suddenly moving $10,000,000 triggers a massive velocity spike penalty.

### Stage 4: Threat Intelligence Attribution (15%)
*   **What it asks:** Do we *already know* this wallet?
*   **How it works:** We cross-reference the counterparties with our local database of sanctioned entities, known hackers, or mixers (like Tornado Cash). Guilt by association applies here.

### Stage 5: AI Synthesis (10%)
*   **What it asks:** Does this make logical sense?
*   **How it works:** AI reviews the data. *Note: AI only controls 10% of the score, preventing it from hallucinating a critical threat out of thin air.*

---

## 6. Threat Levels & Confidence Scoring

Once the engine calculates the score out of 100, we map it to Threat Levels:

*   **00 - 20 : Low** (Normal user activity)
*   **21 - 40 : Medium** (Slightly anomalous, maybe a high-volume trader)
*   **41 - 60 : High** (Suspicious patterns, high fan-out, possible mixer usage)
*   **61 - 80 : Critical** (Active exploit behavior, known malicious links)
*   **81 - 100: Extreme** (Sanctioned entity, confirmed hacker, Tornado Cash node)

### What is Confidence Scoring?
If a wallet has a score of 90 (Extreme), but only has **2 transactions**, we cannot be statistically sure it's a hacker.
We apply a **Data Availability Penalty**.
*   2 transactions = Confidence 20%
*   500 transactions = Confidence 95%
We need sufficient data to make a confident behavioral assessment.

---

## 7. Dual-Agent AI (Deep Scan)

When an investigator runs a "Deep Scan", we do not just ask an LLM "is this wallet bad?" 
We use a structured, multi-agent architecture:

1.  **Agent A (Prosecutor):** Is fed the engine data and strictly told to find every reason this wallet is a criminal.
2.  **Agent B (Defense Lawyer):** Is fed the exact same data and told to find every innocent explanation (e.g., "It's not a money launderer, it's just a centralized exchange hot wallet").
3.  **Agent C (The Judge):** Reads both arguments and outputs the final `risk_explanation` and `recommendation`.

**Why did you do it this way?**
Because LLMs suffer from confirmation bias. If you give an LLM a suspicious wallet, it will try to agree with you that it's bad. Forcing an adversarial defense lawyer creates highly balanced, objective forensic reporting.

---

## 8. Verifiable Reporting (The PDF Engine)

Forensic reports are useless in court if they can be edited. 

**How it works:**
1.  When an investigation concludes, we generate the final JSON payload.
2.  Before creating the PDF, we hash that JSON object using **SHA-256**.
3.  We store `Report_ID` + `SHA256_Hash` in our SQLite database.
4.  We use `reportlab` (Python) to generate the PDF and print the Hash on page 1.

**Why?**
If someone alters the PDF to frame someone else, the hash of the modified document will no longer match the hash stored immutably on AXON's servers. The investigator can use our Verification Portal to prove the chain of custody.

---

## 9. "Grill Me" / Evaluator Q&A

**Q: Why didn't you just use Machine Learning (like a Random Forest or Neural Network) for the Threat Score instead of a 5-Stage Mathematical Engine?**
> **A:** Explainability and determinism. In digital forensics and AML, if a user's funds are frozen, you have to explain exactly *why* in court. A neural network is a black box; it says "Threat 90%" but can't point to the exact mathematical trigger. Our engine is deterministic—if a wallet gets 90%, we can point exactly to Stage 2 (Fan Out) and Stage 1 (Burst Activity) as the exact legal reason.

**Q: You use AI as a fallback for detecting coins. What if the AI hallucinates a coin type?**
> **A:** It doesn't matter, because AI has zero authority to launch an investigation. The primary engine uses strict Regex and Checksums (Tier 1). If that fails, the AI suggests what coin it *might* be (Tier 2), marks it clearly as "AI Assisted / Unverified," and simply gives the user an explorer link. AXON will block the scanner from running on unverified, AI-guessed formats to prevent garbage-in-garbage-out.

**Q: How do you handle Etherscan/API rate limits, especially for Bulk Scans?**
> **A:** We use asynchronous programming (`asyncio`) but throttle it using a `Semaphore`. We process exactly 3-5 wallets concurrently. This ensures we maximize speed while staying just under the standard public API rate limits (like 5 calls/sec for Etherscan). 

**Q: Why did you use React/FastAPI? Why not just Next.js for everything?**
> **A:** AXON requires intense server-side compute. The 5-Stage math engine, D3 graph generation, and massive array parsing block the event loop. FastAPI (Python) handles data processing (Pandas/Numpy) and AI orchestration far better than Node.js. React is strictly the presentation layer. Separation of concerns.

**Q: What happens if a wallet has zero transactions?**
> **A:** The math engine instantly returns a 0 threat score with a 0% confidence level. The PDF engine gracefully omits the behavior sections rather than printing "Empty" or "Null".

**Q: How does the Smart Contract Scanner differ from the Wallet Scanner?**
> **A:** Wallets are analyzed based on *Behavior* (transactions). Contracts are analyzed based on *Code*. When the router detects bytecode at an address, it bypasses the 5-Stage engine and instead runs Static Analysis (simulated Slither rules) and queries GoPlus to check for Honeypots, mint functions, and hidden owner privileges.

**Q: Exactly which API fields do you read from GoPlus and how do they affect the score?**
> **A:** We parse binary flags and numeric values to detect protocol security and admin abuse risks. 
> * **Code Security (Axis 1):** Fields like `is_honeypot` (forces Axis 1 to 100), `cannot_sell_all` (up to 80 pts), `selfdestruct_can_be_triggered` (up to 75 pts), and `transfer_pausable` (up to 50 pts) indicate severe logic traps.
> * **Admin Risk (Axis 2):** Fields like `is_proxy` (up to 65 pts), `owner_change_balance` (up to 85 pts), `hidden_owner` (up to 75 pts), and high `buy_tax`/`sell_tax` (>25% sets Axis 2 to 90) flag centralized rug-pull vectors.

**Q: Which Forta endpoint do you call and how does it map to the engine?**
> **A:** We query the **Forta Network GraphQL API** (`https://api.forta.network/graphql`). We filter the `alerts` array specifically by the target address using `first: 5`. The number of malicious alerts returned directly dictates **Axis 5 (Threat Intelligence)**. Each alert adds 25 points to Axis 5, up to a maximum of 90.

**Q: What if the Etherscan or block explorer API goes down or changes its response format? How resilient is your backend?**
> **A:** Our backend wraps all API calls in asynchronous `try/except` blocks with strict timeouts (e.g., 5-45 seconds). If Etherscan fails or rate-limits us, AXON gracefully catches the exception, returns an empty dataset for that specific module, and proceeds with the rest of the scan. It doesn't crash the server. We also use a standard Normalization Layer so if an API format changes, we only have to update the mapping in one single file, not the entire engine.

**Q: Why use a JSON -> SHA-256 -> PDF workflow instead of just digitally signing the PDF with a certificate (like Adobe Sign)?**
> **A:** Digital certificates are tied to a centralized certificate authority (CA) and can expire or be revoked. Hashing the raw data payload (JSON) via SHA-256 ensures cryptographic permanence. By saving the hash in our immutable SQLite database, we prove exactly what data was generated at the exact millisecond of the scan, entirely independent of third-party PDF signing vendors.

**Q: How does the engine handle "Flash Loans"? Is volume heavily penalized if it's returned in the same block?**
> **A:** Flash loans are handled specifically by Axis 1 (Temporal Anomaly) and Axis 3 (Economic Behavior). Since flash loans execute massive volume instantly and usually interact with multiple contracts (high fan-out), they trigger massive burst penalties. In AXON, unless the target is a known trusted protocol (like Aave or Uniswap), unexplained massive volume in a tiny time window is correctly flagged as High/Critical risk.

**Q: You mentioned multi-agent AI (Prosecutor, Defense, Judge). How do you prevent hallucination if both the prosecutor and defense start making up transaction data?**
> **A:** The AI has absolutely no access to the internet, nor does it fetch its own data. We strictly inject the normalized JSON payload (the raw numbers and mathematical engine results) directly into the AI's system prompt. We constrain the Judge's narrative to match the exact mathematical score band (e.g., if the score is 20, the prompt forces the AI to conclude "LOW RISK" regardless of what the prosecutor argued).

**Q: What database are you using to store the MaliciousWallet and KnownMixer lists? Is it relational or NoSQL and why?**
> **A:** We use **SQLite** (via SQLAlchemy ORM) for the local deployments because AXON is designed as a portable forensic toolkit. Investigators often need to run it locally on air-gapped or secure networks where setting up a massive PostgreSQL/MongoDB cluster is impractical. A relational database ensures strict schemas for the Threat DB and Verification Hashes.

**Q: If a user interacted with Tornado Cash exactly once 3 years ago to fund a fresh wallet, does your engine label them a Critical Threat today?**
> **A:** Axis 3 (Behavioral Fingerprinting) evaluates the *proportion* of volume and Axis 4 (Topology) evaluates the density of the connection. If they have 1,000 legitimate transactions and only 1 mixer deposit 3 years ago, the mathematical weight of that single interaction is diluted. They will receive a penalty (likely scoring Medium/High), but they won't automatically hit 100/Critical unless they are a core distribution node for the mixer.

**Q: You use React for the frontend and FastAPI for the backend. Why not just use a full-stack framework like Next.js?**
> **A:** Separation of concerns and computational blocking. AXON processes massive arrays of transactions, calculates standard deviations for behavior, and runs heavy D3 graph algorithms. Python (FastAPI/Pandas/Numpy) is fundamentally better at data science workloads than Node.js (which powers Next.js). If we ran the 5-Stage engine in Node.js, the event loop would block, freezing the entire application for other users.

---

*This handbook provides the technical foundation for your defense. Read it to internalize the architecture, and you will be able to answer any question about AXON confidently.*
