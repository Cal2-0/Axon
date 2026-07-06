import sys
import re

def patch_wallet():
    path = r'c:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src\pages\WalletInvestigation.jsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = re.compile(r'<button onClick={handleDownloadCoC}.*?📄 Download Final Analysis PDF\s*</button>', re.DOTALL)
    
    new_btn = """<button onClick={() => downloadWalletPDF(result, true)} className="axon-button text-xs px-4 py-2 gap-1.5 bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white" id="wallet-download-html-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                🌐 Download HTML Dossier
              </button>
              """

    def repl(m):
        return new_btn + m.group(0)

    if pattern.search(content):
        content = pattern.sub(repl, content)
        with open(path, 'w', encoding='utf-8') as out:
            out.write(content)
        print('Patched Wallet')
    else:
        print('Not found in Wallet')

def patch_case():
    path = r'c:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src\pages\CaseDashboard.jsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = re.compile(r'<button className="axon-button flex items-center gap-2" onClick=\{async \(\) => await downloadMasterCasePDF\(caseData\)\}.*?Export Master PDF\s*</button>', re.DOTALL)
    
    new_btn = """<button className="axon-button bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white flex items-center gap-2 mr-2" onClick={() => downloadMasterCasePDF(caseData, true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            HTML Dossier
          </button>
          <button className="axon-button flex items-center gap-2" onClick={() => window.open(`${API_BASE}/cases/${caseId}/pdf`, '_blank')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Master PDF
          </button>"""

    if pattern.search(content):
        content = pattern.sub(new_btn, content)
        with open(path, 'w', encoding='utf-8') as out:
            out.write(content)
        print('Patched Case')
    else:
        print('Not found in Case')

patch_wallet()
patch_case()
