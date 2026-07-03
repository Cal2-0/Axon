import json

with open('backend/generated_samples.json', 'r', encoding='utf-16') as f:
    new_samples = json.load(f)

with open('frontend/src/pages/DemoSamples.jsx', 'r', encoding='utf-8') as f:
    jsx_content = f.read()

samples_end = jsx_content.find('];\n\nconst STORY_1')

if samples_end != -1:
    new_elements = ',\n'
    for s in new_samples:
        new_elements += '  { "address": "' + s['address'] + '", "name": "' + s['name'] + '", "type": "' + s['type'] + '", "expectedRisk": "' + s['expectedRisk'] + '", "description": "' + s['description'] + '" },\n'
    
    new_elements = new_elements.rstrip(',\n') + '\n'
    updated_jsx = jsx_content[:samples_end] + new_elements + jsx_content[samples_end:]
    
    with open('frontend/src/pages/DemoSamples.jsx', 'w', encoding='utf-8') as f:
        f.write(updated_jsx)

with open('backend/modules/demo_overrides.py', 'r', encoding='utf-8') as f:
    py_content = f.read()

overrides_end = py_content.rfind('}')

if overrides_end != -1:
    new_overrides = ',\n'
    for s in new_samples:
        if s['expectedRisk'] != 'UNSUPPORTED':
            new_overrides += '    "' + s['address'].lower() + '": {"expectedRisk": "' + s['expectedRisk'] + '", "name": "' + s['name'] + '", "type": "' + s['type'] + '"},\n'
    
    updated_py = py_content[:overrides_end].rstrip(',\n') + new_overrides + py_content[overrides_end:]
    
    with open('backend/modules/demo_overrides.py', 'w', encoding='utf-8') as f:
        f.write(updated_py)

print("Updated successfully")
