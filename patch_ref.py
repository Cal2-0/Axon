with open('backend/modules/report_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'rows.append(["Axon Engine", "Behavioral", "High", factor.get(\'reason\'), "N/A"])',
    'rows.append(["Axon Engine", "Behavioral", "High", factor.get(\'reason\'), "Chain Analysis"])'
)

with open('backend/modules/report_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched report_generator.py for Threat Database reference')
