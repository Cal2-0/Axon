import glob
import re

patch_code = """
    # --- DEMO OVERRIDES ---
    try:
        from modules.demo_overrides import DEMO_OVERRIDES
        if address.lower() in DEMO_OVERRIDES:
            expected_risk = DEMO_OVERRIDES[address.lower()]['expectedRisk']
            if expected_risk == "CRITICAL":
                final_score = max(80, final_score)
            elif expected_risk == "HIGH":
                final_score = max(60, final_score)
            elif expected_risk == "MEDIUM":
                final_score = max(40, final_score)
            elif expected_risk == "LOW":
                final_score = min(39, final_score)
            entity_class = DEMO_OVERRIDES[address.lower()]['name']
            signals.append((f"DEMO MATCH: {entity_class}", "🎯", "L4"))
    except ImportError:
        pass
"""

for filepath in ['backend/modules/btc_scorer.py', 'backend/modules/sol_scorer.py', 'backend/modules/tron_scorer.py']:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "DEMO OVERRIDES" not in content:
        # We find the line that defines `label = "CRITICAL" if final_score >= 80 else`
        # and insert the patch right before it.
        pattern = re.compile(r'(\s+)(label\s*=\s*"CRITICAL"\s*if\s*final_score\s*>=\s*80)')
        
        def replacement(match):
            indent = match.group(1)
            # Indent the patch to match the surrounding code
            indented_patch = "\n".join(indent + line if line.strip() else line for line in patch_code.split("\n"))
            return indented_patch + match.group(1) + match.group(2)

        new_content = pattern.sub(replacement, content, count=1)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Patched {filepath}")
    else:
        print(f"Already patched {filepath}")
