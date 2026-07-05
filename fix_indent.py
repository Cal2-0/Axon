import glob

for filepath in ['backend/modules/btc_scorer.py', 'backend/modules/sol_scorer.py', 'backend/modules/tron_scorer.py']:
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    new_lines = []
    in_patch = False
    for line in lines:
        if "# --- DEMO OVERRIDES ---" in line:
            in_patch = True
        
        if in_patch:
            # Check if this line is part of the patch (it should have 8 spaces)
            # Wait, the end of the patch is before 'label = "CRITICAL"'
            if 'label = "CRITICAL"' in line:
                in_patch = False
                new_lines.append(line)
                continue
            
            # De-dent by 4 spaces
            if line.startswith("    "):
                new_lines.append(line[4:])
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"Fixed {filepath}")
