import re

with open("frontend/src/pages/WalletInvestigation.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False

for line in lines:
    if "const [activeTab, setActiveTab]" in line:
        continue
    if "TABS NAVIGATION" in line:
        skip = True
        continue
    if "TAB CONTENT CONTAINERS" in line:
        skip = False
        continue
    if skip:
        continue
    
    # Replace conditional wrappers
    line = re.sub(r'<div className=\{activeTab === \'[^\']+\' \? \'block\' : \'hidden\'\}>', '<div className="block">', line)
    
    new_lines.append(line)

with open("frontend/src/pages/WalletInvestigation.jsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("done")
