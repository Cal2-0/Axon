import sys
import re

def patch_case():
    path = r'c:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src\pages\CaseDashboard.jsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = re.compile(r'<button\s*onClick=\{async \(\) => await downloadMasterCasePDF\(caseData\)\}.*?⬇ Download Master PDF\s*</button>', re.DOTALL)
    
    new_btn = """<button
                  onClick={() => downloadMasterCasePDF(caseData, true)}
                  className="px-4 py-2 text-sm font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white rounded-lg transition-all flex items-center gap-1.5 mr-2"
                >
                  🌐 Download HTML Dossier
                </button>
                <button
                  onClick={() => window.open(`${API_BASE}/cases/${caseId}/pdf`, '_blank')}
                  className="px-4 py-2 text-sm font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all flex items-center gap-1.5"
                >
                  ⬇ Download Master PDF
                </button>"""

    if pattern.search(content):
        content = pattern.sub(new_btn, content)
        with open(path, 'w', encoding='utf-8') as out:
            out.write(content)
        print('Patched CaseDashboard')
    else:
        print('Not found in CaseDashboard')

patch_case()
