import re
import sys

def patch_file(filepath, entity_type_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Update import
    content = content.replace("from modules.ai_analyst import generate_dual_quick_ratings", "from modules.ai_analyst import analyze_entity")
    
    # 2. Update AI call
    if "generate_dual_quick_ratings(ai_prompt" in content:
        # Match the old generation block
        content = re.sub(
            r'dual_ratings = await generate_dual_quick_ratings\(ai_prompt, entity_type=".*?"\)\s*ai_verdict = dual_ratings\.get\("investigator_verdict", f"\{label\} RISK .*?"\)',
            rf'''ai_data = await analyze_entity(ai_prompt, depth=depth, entity_type="{entity_type_str}")
    ai_verdict = ai_data.get("verdict", f"{{label}} RISK - Based on analysis.")''',
            content
        )
    
    # 3. Fix risk.analyticalSynthesis
    if '"analyticalSynthesis": {' in content:
        old_synth = re.search(r'"analyticalSynthesis": \{.*?"engine_type": "[^"]*"\s*\}', content, flags=re.DOTALL)
        if old_synth:
            new_synth = f'''"analyticalSynthesis": {{
                "rating": label,
                "hypothesis": ai_data.get("hypothesis", ""),
                "mitre_tag": ai_data.get("mitre_tag", ""),
                "verdict": ai_verdict,
                "confidence": ai_data.get("confidence", None),
                "consensus_level": ai_data.get("consensus_level", None),
                "judge_reasoning": ai_data.get("judge_reasoning", None),
                "prosecution_summary": ai_data.get("prosecution_summary", None),
                "defense_summary": ai_data.get("defense_summary", None),
                "engine_type": ai_data.get("engine_type", "single")
            }},
            "aiAgentA": ai_data.get("agentA"),
            "aiAgentB": ai_data.get("agentB")'''
            content = content.replace(old_synth.group(0), new_synth)
    
    # 4. Fix graph nodes (just a quick pass for the loops)
    graph_fix = """
    # FIX GRAPH NODES
    existing_node_ids = set(n["id"] for n in graph_nodes)
    for edge in graph_edges:
        src = edge["source"]
        tgt = edge["target"]
        if src not in existing_node_ids:
            graph_nodes.append({"id": src, "label": src[:6]+"...", "type": "default", "risk": 10})
            existing_node_ids.add(src)
        if tgt not in existing_node_ids:
            graph_nodes.append({"id": tgt, "label": tgt[:6]+"...", "type": "default", "risk": 10})
            existing_node_ids.add(tgt)
"""
    # Insert graph fix right before response_data = {
    content = content.replace("response_data = {", graph_fix + "\n    response_data = {")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Patched {filepath}")

patch_file("backend/modules/sol_scorer.py", "solana_wallet")
patch_file("backend/modules/tron_scorer.py", "tron_wallet")
patch_file("backend/modules/btc_scorer.py", "bitcoin_wallet")
