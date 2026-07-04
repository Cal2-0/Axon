"""
Axon Backend — Analytical Engine Analyst Module (v2.0 — Dual-Model + Judge Architecture)

ARCHITECTURE:
  QUICK SCAN (bulk / quick depth):
    → Single fast model (llama-3.1-8b-instant) → JSON verdict
    → 1 API call

  DEEP SCAN (deep depth):
    → Phase 1: Two independent Analytical Engine models analyze the SAME L1-L5 data
        Model A (llama-3.3-70b-versatile): Prosecution — find every red flag
        Model B (gemma2-9b-it): Defense — find every legitimate explanation
    → Phase 2: Judge model synthesizes both perspectives
        Model C (mixtral-8x7b-32768): Final consensus verdict
    → 3 API calls total

  The mathematical scoring engine (L1-L5 / A1-A5) is UNCHANGED.
  Analytical Engine does NOT modify the score — it only generates the narrative.

All models are FREE via Groq API.
"""
import os
import httpx
import json
import asyncio
import random
from typing import Optional

# ─── MODEL REGISTRY ────────────────────────────────────────────────────────────
MODELS = {
    "fast":        "meta-llama/llama-3.1-8b-instruct",               # OpenRouter
    "smart":       "meta-llama/llama-3.3-70b-instruct",              # OpenRouter
    "prosecution": "meta-llama/llama-3.3-70b-instruct",              # OpenRouter
    "defense":     "meta-llama/llama-3.3-70b-instruct",              # OpenRouter
    "judge":       "meta-llama/llama-3.3-70b-instruct",              # OpenRouter
}

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


def _get_groq_key():
    """Read all available Groq keys and return one randomly."""
    keys = []
    
    # Check comma-separated list if provided
    keys_str = os.environ.get("GROQ_API_KEYS", "")
    if keys_str:
        keys.extend([k.strip() for k in keys_str.split(",") if k.strip()])
        
    # Check individual keys explicitly
    for key_name in ["GROQ_API_KEY", "GROQ_API_KEY1", "GROQ_API_KEY2"]:
        val = os.environ.get(key_name, "").strip()
        if val and val not in keys:
            keys.append(val)
            
    if not keys:
        return ""
    return random.choice(keys)


def _get_openrouter_key():
    """Read OpenRouter API key."""
    return os.environ.get("OPENROUTER_API_KEY", "")


async def _call_api(model: str, system_prompt: str, user_prompt: str,
                     temperature: float = 0.2, max_tokens: int = 600) -> dict:
    """Make an API call to OpenRouter or Groq based on model name."""
    fallback = {
        "hypothesis": "AI analysis unavailable.",
        "mitre_tag": "N/A",
        "verdict": "Manual verification required."
    }

    is_openrouter = "/" in model
    api_url = OPENROUTER_API_URL if is_openrouter else GROQ_API_URL
    key = _get_openrouter_key() if is_openrouter else _get_groq_key()
    provider_name = "OpenRouter" if is_openrouter else "Groq"

    if not key:
        print(f"[AI_ANALYST] WARNING: API Key for {provider_name} is EMPTY")
        return fallback

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }

    if is_openrouter:
        headers["HTTP-Referer"] = "https://github.com/axon-forensics"
        headers["X-Title"] = "Axon Forensic Engine"

    payload = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(api_url, headers=headers, json=payload)

            if response.status_code == 429:
                print(f"[AI_ANALYST] Rate limited on {model} ({provider_name}), waiting 3s...")
                await asyncio.sleep(3.0)
                if not is_openrouter:
                    headers["Authorization"] = f"Bearer {_get_groq_key()}"
                response = await client.post(api_url, headers=headers, json=payload)

            if response.status_code != 200:
                print(f"[AI_ANALYST] {model} API Error {response.status_code}: {response.text[:200]}")
                return fallback

            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            return json.loads(content)

    except json.JSONDecodeError as e:
        print(f"[AI_ANALYST] {model} JSON parse error: {e}")
        return fallback
    except Exception as e:
        print(f"[AI_ANALYST] {model} Error: {e}")
        return fallback


# ═══════════════════════════════════════════════════════════════════════════════
# QUICK SCAN — Single model, fast response (for bulk scans + quick depth)
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_summary(prompt: str) -> dict:
    """Original interface — single fast model. Used by quick scans and bulk."""
    return await _call_api(
        model=MODELS["fast"],
        system_prompt=(
            "You are Axon AI, an elite cybersecurity forensic engine. "
            "You MUST strictly respond in valid JSON format with exactly these three keys: "
            "'hypothesis', 'mitre_tag', and 'verdict'. "
            "Do NOT wrap your response in markdown code blocks."
        ),
        user_prompt=prompt,
        temperature=0.2
    )


# ═══════════════════════════════════════════════════════════════════════════════
# DUAL QUICK RATINGS — Two Analytical Engine agents give independent ratings on every scan
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_dual_quick_ratings(evidence_context: str, entity_type: str = "wallet") -> dict:
    """
    Run Agent Alpha and Agent Beta in parallel for independent risk ratings.
    Returns {agentA: {rating, confidence, one_liner, model}, agentB: {...}}.
    Both run on every scan (quick + deep).
    """
    print(f"[AI_ANALYST] Starting dual quick ratings for {entity_type}...")

    agent_system = (
        "You are a blockchain forensic analyst. Given evidence from an on-chain investigation, "
        "provide your independent risk assessment. "
        "Respond ONLY in valid JSON with exactly these keys: "
        '{"rating": "CRITICAL or HIGH or MEDIUM or LOW", '
        '"confidence": 0-100, '
        '"one_liner": "One sentence summary of your assessment"}'
    )

    agent_prompt = f"""Analyze this {entity_type} evidence and provide your independent risk rating.

{evidence_context[:3000]}

Respond with ONLY valid JSON."""

    alpha_result, beta_result = await asyncio.gather(
        _call_api(MODELS["fast"], agent_system, agent_prompt, temperature=0.2, max_tokens=200),
        _call_api(MODELS["defense"], agent_system, agent_prompt, temperature=0.3, max_tokens=200),
        return_exceptions=True
    )

    def safe_agent(result, model_name, label):
        if isinstance(result, Exception):
            print(f"[AI_ANALYST] {label} failed: {result}")
            return {"rating": "UNKNOWN", "confidence": 0, "one_liner": "Agent unavailable.", "model": model_name}
        return {
            "rating": result.get("rating", "UNKNOWN"),
            "confidence": result.get("confidence", 0),
            "one_liner": result.get("one_liner", result.get("verdict", "No assessment.")),
            "model": model_name,
        }

    agentA = safe_agent(alpha_result, MODELS["fast"], "Agent Alpha")
    agentB = safe_agent(beta_result, MODELS["defense"], "Agent Beta")

    print(f"[AI_ANALYST] Quick Ratings — Alpha: {agentA['rating']} ({agentA['confidence']}%) | Beta: {agentB['rating']} ({agentB['confidence']}%)")

    return {"agentA": agentA, "agentB": agentB}


# ═══════════════════════════════════════════════════════════════════════════════
# DEEP SCAN — Dual-Model Analysis + Judge (2+1 Architecture)
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_dual_analysis(evidence_context: str, entity_type: str = "wallet") -> dict:
    """
    Run the 2+1 dual-model pipeline for deep scans.

    Phase 1: Model A (prosecution) + Model B (defense) run in PARALLEL
    Phase 2: Model C (judge) synthesizes both perspectives

    Returns dict with standard keys (hypothesis, mitre_tag, verdict) plus
    additional adversarial context (prosecution_summary, defense_summary,
    consensus_level, confidence, judge_reasoning).
    """
    print(f"[AI_ANALYST] Starting dual-model analysis for {entity_type}...")

    # ── Phase 1: Prosecution + Defense (Parallel) ────────────────────────────
    prosecution_system = (
        "You are a PROSECUTION forensic blockchain analyst. "
        "Your job is to identify EVERY red flag, suspicious pattern, and potential "
        "evidence of illicit activity. Be thorough and aggressive in your analysis. "
        "Assume the worst-case interpretation of ambiguous evidence. "
        "Respond ONLY in valid JSON."
    )

    prosecution_prompt = f"""Analyze this {entity_type} from a PROSECUTION perspective.
Find every reason this could be malicious, suspicious, or involved in illicit activity.

{evidence_context}

Respond with ONLY valid JSON with exactly these keys:
{{"findings": "3-4 key prosecution findings as a single paragraph",
  "risk_assessment": "CRITICAL or HIGH or MEDIUM or LOW",
  "confidence": 0-100,
  "key_evidence": "The single most damning piece of evidence",
  "mitre_tag": "Most relevant MITRE ATT&CK technique tag"}}"""

    defense_system = (
        "You are a DEFENSE forensic blockchain analyst. "
        "Your job is to identify EVERY legitimate explanation, mitigating factor, "
        "and evidence of benign activity. Be thorough in finding reasons this entity "
        "could be operating normally. Challenge prosecution assumptions. "
        "Respond ONLY in valid JSON."
    )

    defense_prompt = f"""Analyze this {entity_type} from a DEFENSE perspective.
Find every reason this could be legitimate, benign, or operating normally.

{evidence_context}

Respond with ONLY valid JSON with exactly these keys:
{{"findings": "3-4 key defense findings as a single paragraph",
  "risk_assessment": "CRITICAL or HIGH or MEDIUM or LOW",
  "confidence": 0-100,
  "key_defense": "The single strongest argument for legitimacy",
  "mitre_tag": "Most relevant MITRE ATT&CK tag, or N/A if benign"}}"""

    # Run both in parallel
    prosecution_result, defense_result = await asyncio.gather(
        _call_api(MODELS["prosecution"], prosecution_system, prosecution_prompt, temperature=0.3, max_tokens=500),
        _call_api(MODELS["defense"], defense_system, defense_prompt, temperature=0.3, max_tokens=500),
        return_exceptions=True
    )

    # Handle failures gracefully
    if isinstance(prosecution_result, Exception) or not isinstance(prosecution_result, dict):
        print(f"[AI_ANALYST] Prosecution model failed or returned non-dict: {prosecution_result}")
        prosecution_result = {"findings": "Prosecution analysis unavailable.", "risk_assessment": "MEDIUM", "confidence": 30, "key_evidence": "N/A", "mitre_tag": "N/A"}
    if isinstance(defense_result, Exception) or not isinstance(defense_result, dict):
        print(f"[AI_ANALYST] Defense model failed or returned non-dict: {defense_result}")
        defense_result = {"findings": "Defense analysis unavailable.", "risk_assessment": "MEDIUM", "confidence": 30, "key_defense": "N/A", "mitre_tag": "N/A"}

    print(f"[AI_ANALYST] Phase 1 done — Prosecution: {prosecution_result.get('risk_assessment', '?')} | Defense: {defense_result.get('risk_assessment', '?')}")

    # Small delay to respect Groq rate limits
    await asyncio.sleep(0.5)

    # ── Phase 2: Judge Synthesizes Both Perspectives ─────────────────────────
    judge_system = (
        "You are the CHIEF FORENSIC JUDGE reviewing two independent analyst reports — "
        "one from a prosecution analyst and one from a defense analyst. "
        "Your job is to weigh both perspectives fairly and deliver a definitive verdict. "
        "If the prosecution has stronger evidence, side with them. "
        "If the defense has legitimate explanations, acknowledge them. "
        "Be definitive — do not be wishy-washy. "
        "Respond ONLY in valid JSON."
    )

    judge_prompt = f"""You are reviewing two independent forensic analyses of a blockchain {entity_type}.

PROSECUTION REPORT:
{json.dumps(prosecution_result, indent=2)}

DEFENSE REPORT:
{json.dumps(defense_result, indent=2)}

ORIGINAL ALGORITHMIC EVIDENCE (L1-L5 layer scores + signals):
{evidence_context[:2500]}

Weigh both perspectives. Deliver the final verdict.

Respond with ONLY valid JSON with exactly these keys:
{{"hypothesis": "2-3 sentence forensic hypothesis incorporating both prosecution and defense perspectives. Reference specific evidence.",
  "mitre_tag": "Most relevant MITRE ATT&CK technique tag based on the stronger case",
  "verdict": "One sentence definitive executive verdict. Be clear and decisive.",
  "confidence": 0-100,
  "consensus_level": "UNANIMOUS if both agree, MAJORITY if judge sides with one, SPLIT if genuinely unclear",
  "judge_reasoning": "1-2 sentences explaining why you sided with prosecution or defense"}}"""

    judge_result = await _call_api(
        MODELS["judge"], judge_system, judge_prompt,
        temperature=0.15, max_tokens=600
    )

    # If judge fails, fall back to prosecution result (conservative)
    if judge_result.get("hypothesis", "").startswith("AI analysis unavailable"):
        print("[AI_ANALYST] Judge model failed — falling back to prosecution perspective")
        judge_result = {
            "hypothesis": prosecution_result.get("findings", "Analysis inconclusive."),
            "mitre_tag": prosecution_result.get("mitre_tag", "N/A"),
            "verdict": f"Prosecution assessment: {prosecution_result.get('risk_assessment', 'MEDIUM')} risk. Defense review unavailable.",
            "confidence": prosecution_result.get("confidence", 50),
            "consensus_level": "FALLBACK",
            "judge_reasoning": "Judge model unavailable — defaulting to prosecution assessment."
        }

    print(f"[AI_ANALYST] Phase 2 done — Judge verdict: {judge_result.get('consensus_level', '?')} | Confidence: {judge_result.get('confidence', '?')}%")

    # ── Compile Final Response ───────────────────────────────────────────────
    final = {
        # Standard keys (backward compatible with generate_summary)
        "hypothesis": judge_result.get("hypothesis", "Analysis complete."),
        "mitre_tag": judge_result.get("mitre_tag", "N/A"),
        "verdict": judge_result.get("verdict", "See detailed analysis."),

        # Extended adversarial context
        "confidence": judge_result.get("confidence", 50),
        "consensus_level": judge_result.get("consensus_level", "UNKNOWN"),
        "judge_reasoning": judge_result.get("judge_reasoning", ""),
        "prosecution_summary": prosecution_result.get("findings", prosecution_result.get("hypothesis", "No prosecution narrative provided.")),
        "prosecution_risk": prosecution_result.get("risk_assessment", "MEDIUM"),
        "prosecution_evidence": prosecution_result.get("key_evidence", ""),
        "defense_summary": defense_result.get("findings", defense_result.get("hypothesis", "No defense narrative provided.")),
        "defense_risk": defense_result.get("risk_assessment", "MEDIUM"),
        "defense_argument": defense_result.get("key_defense", ""),
        "models_used": [MODELS["prosecution"], MODELS["defense"], MODELS["judge"]],
        "engine_type": "dual_adversarial",
    }

    print(f"[AI_ANALYST] Dual-Model Analysis Complete: Consensus={final['consensus_level']} Confidence={final['confidence']}%")

    return final


# ═══════════════════════════════════════════════════════════════════════════════
# UNKNOWN CHAIN RESOLUTION (AI Fallback)
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_address_pattern_fallback(address: str) -> Optional[dict]:
    """
    AI fallback for addresses that fail deterministic checksum validation.
    Uses pattern recognition only — runs after regex/checksum pipeline fails.
    """
    print(f"[AI_ANALYST] Running address pattern fallback for: {address[:16]}...")
    system_prompt = (
        "You are AXON's Address Intelligence Engine.\n\n"
        "You are NOT guessing when deterministic validation already succeeded. "
        "The deterministic engine FAILED on this address — your job is pattern "
        "recognition to suggest the most likely address family based on prefix, "
        "length, encoding, and known cryptocurrency address specifications.\n\n"
        "Given a cryptocurrency address:\n"
        "1. Analyze the syntax and prefix patterns.\n"
        "2. Suggest the most likely address family.\n"
        "3. List compatible blockchain networks if applicable.\n"
        "4. Determine the likely address type.\n"
        "5. Identify the likely encoding.\n"
        "6. State whether checksum could not be verified (deterministic engine failed).\n"
        "7. Determine whether AXON supports investigation (Bitcoin, Ethereum, Polygon, Solana, Tron = supported).\n"
        "8. Produce investigator-friendly forensic notes.\n\n"
        "Never invent on-chain activity. Never claim checksum passed if you did not verify it. "
        "If multiple chains share the same format (e.g. EVM), explicitly state that the chain "
        "cannot be determined from the address alone.\n"
        "If the address is garbage or not cryptocurrency-related, set valid=false and family=Unrecognized.\n\n"
        "Return ONLY JSON:\n"
        "{\n"
        '  "valid": true,\n'
        '  "family": "Cardano",\n'
        '  "possible_networks": ["Cardano"],\n'
        '  "address_type": "Shelley",\n'
        '  "encoding": "Bech32",\n'
        '  "checksum": "Unverified",\n'
        '  "length": 58,\n'
        '  "prefix": "addr1",\n'
        '  "supported": false,\n'
        '  "forensic_notes": "...",\n'
        '  "confidence": "AI Assisted"\n'
        "}"
    )
    user_prompt = f"Address to analyze (deterministic validation failed):\n{address}"

    result = await _call_api(
        model=MODELS["fast"],
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.1,
        max_tokens=400,
    )

    if not isinstance(result, dict) or "family" not in result:
        return None
    if result.get("family", "").lower() in ("unrecognized", "unknown", ""):
        return None
    result["confidence"] = "AI Assisted"
    return result


async def generate_coin_tiebreak_summary(candidates: list) -> str:
    """Uses a fast Analytical Engine model to write a 1-sentence factual summary of multi-chain activity."""
    print(f"[AI_ANALYST] Generating tie-break summary for {len(candidates)} active chains.")
    system_prompt = (
        "You are writing one short forensic-report sentence about an address whose "
        "chain identity has ALREADY been determined by deterministic checksum "
        "validation and live on-chain probing — you are not deciding the chain.\n\n"
        "Write 1-2 sentences summarizing this for a forensic report. Do not invent "
        "any chain, balance, or activity not present in the evidence. Do not "
        "hedge below the given confidence tier, and do not state higher certainty "
        "than the given tier.\n\n"
        "Output ONLY JSON: { \"summary\": \"...\" }"
    )
    user_prompt = f"Evidence (already computed, do not contradict it):\n- candidates: {json.dumps(candidates)}"
    
    result = await _call_api(
        model=MODELS["smart"],
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.1,
        max_tokens=150
    )
    
    if not isinstance(result, dict) or "summary" not in result:
        return "Multiple active chains detected, but Analytical Engine summary generation failed."
        
    return result["summary"]

# ═══════════════════════════════════════════════════════════════════════════════
# SMART ROUTER — Picks quick or dual analysis based on scan depth
# ═══════════════════════════════════════════════════════════════════════════════

async def analyze_entity(prompt: str, depth: str = "quick", entity_type: str = "wallet") -> dict:
    """
    Smart router for Analytical Engine analysis.
    - depth="quick" → single fast model (1 API call)
    - depth="deep"  → dual-model + judge (3 API calls)
    """
    if depth == "deep":
        return await generate_dual_analysis(prompt, entity_type)
    else:
        return await generate_summary(prompt)
