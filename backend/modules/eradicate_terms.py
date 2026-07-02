import os
import re

paths = [
    r"c:\Users\bina1\OneDrive\Desktop\main\internship\axon\backend\modules",
    r"c:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src"
]

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple replacement rules as requested
    content = content.replace('"Data Not Available"', '"Data Not Available"')
    content = content.replace("'Data Not Available'", "'Data Not Available'")
    content = content.replace("Data Not Available", "Data Not Available")
    content = content.replace("Not Determined", "Not Determined")
    content = content.replace("Not Determined", "Not Determined")
    content = content.replace("Not Determined", "Not Determined")
    content = content.replace("No Evidence Observed", "No Evidence Observed")
    
    # For UI components where it might just say Unknown
    content = content.replace(">Data Not Available<", ">Data Not Available<")
    content = content.replace(" Analytical Engine ", " Analytical Engine ")
    content = content.replace("Analytical Engine", "Analytical Engine")
    content = content.replace("Analytical Engine", "Analytical Engine")
    content = content.replace("Behavioral Analysis Synthesis", "Behavioral Analysis Synthesis")
    content = content.replace("analyticalSynthesis", "analyticalSynthesis")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for p in paths:
    for root, dirs, files in os.walk(p):
        for file in files:
            if file.endswith(('.py', '.js', '.jsx', '.json')):
                replace_in_file(os.path.join(root, file))

print("Replacement complete.")
