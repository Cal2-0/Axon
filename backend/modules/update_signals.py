import re

filepath = r"c:\Users\bina1\OneDrive\Desktop\main\internship\axon\backend\modules\wallet_scorer.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

def replace_signal(match):
    reason = match.group(1)
    icon = match.group(2)
    layer = match.group(3)
    
    # Determine confidence and source based on layer and text
    source = "On-chain Heuristic"
    confidence = "Medium"
    
    if layer == "L4":
        if "THREAT DB" in reason or "OFAC" in reason or "sanctioned" in reason.lower() or "threat intelligence" in reason.lower():
            source = "Threat DB"
            confidence = "High"
        elif "Forta" in reason:
            source = "Forta Network"
            confidence = "High"
        elif "exchange" in reason.lower():
            source = "Exchange Database"
            confidence = "High"
        else:
            source = "On-chain Intelligence"
            confidence = "High"
    elif layer == "OSINT":
        source = "OSINT"
        confidence = "Low"
    else: # L1, L2, L3
        if "definitive" in reason.lower() or "extreme" in reason.lower() or "high value" in reason.lower():
            confidence = "High"
        elif "mild" in reason.lower() or "semi-structured" in reason.lower():
            confidence = "Low"

    return f'signals.append(({reason}, {icon}, "{layer}", "{confidence}", "{source}"))'

# Match signals.append(( <reason> , <icon> , "<layer>" ))
# We have to be careful with nested parentheses in format()
# But all of them are of the form: signals.append((<reason>, "icon", "layer"))
pattern = re.compile(r'signals\.append\(\((.*?),\s*("[^"]+"),\s*"([^"]+)"\)\)')
new_content = pattern.sub(replace_signal, content)

# Check if there are any remaining that didn't match the regex (e.g. icon is variable)
pattern2 = re.compile(r'signals\.append\(\((.*?),\s*(icon),\s*"([^"]+)"\)\)')
def replace_signal2(match):
    reason = match.group(1)
    icon_var = match.group(2)
    layer = match.group(3)
    return f'signals.append(({reason}, {icon_var}, "{layer}", "High", "Threat DB"))'

new_content = pattern2.sub(replace_signal2, new_content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated signals in wallet_scorer.py")
