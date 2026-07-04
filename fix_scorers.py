import glob

for filepath in glob.glob('backend/modules/*_scorer.py'):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace("import uuid, time, hashlib, json", "import uuid, hashlib, json")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Replaced successfully")
