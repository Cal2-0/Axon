import re

with open("frontend/src/pages/WalletInvestigation.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove state
content = re.sub(r"\s*const \[activeTab, setActiveTab\] = useState\([^)]+\);", "", content)

# Remove tabs navigation block
content = re.sub(r"\s*\{\/\* ─── TABS NAVIGATION ───.*?\n\s*\{\/\* ─── TAB CONTENT CONTAINERS ───.*?\n", "\n", content, flags=re.DOTALL)

# Replace conditional wrappers with div block
content = re.sub(r"<div className=\{activeTab === '[^']+' \? 'block' : 'hidden'\}>", '<div className="block">', content)

with open("frontend/src/pages/WalletInvestigation.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("done")
