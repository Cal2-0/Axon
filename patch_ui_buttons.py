import sys
import re

def patch_wallet():
    path = r'c:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src\pages\WalletInvestigation.jsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The existing button:
    # <button onClick={handleDownloadCoC} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" id="wallet-download-pdf-btn">
    #                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    #                 📄 Download Final Analysis PDF
    #               </button>
    
    # We want to add a secondary button right before it or after it.
    old_btn = """<button onClick={handleDownloadCoC} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" id="wallet-download-pdf-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                📄 Download Final Analysis PDF
              </button>"""
              
    new_btn = """<button onClick={() => downloadWalletPDF(result, true)} className="axon-button text-xs px-4 py-2 gap-1.5 bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white" id="wallet-download-html-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                🌐 Download HTML Dossier
              </button>
              <button onClick={handleDownloadCoC} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" id="wallet-download-pdf-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                📄 Download Final Analysis PDF
              </button>"""

    if old_btn in content:
        content = content.replace(old_btn, new_btn)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched Wallet")
    else:
        print("Wallet old btn not found")


def patch_contract():
    path = r'c:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src\pages\ContractInvestigation.jsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Revert handleDownloadCoC to original:
    old_func = """const handleDownloadCoC = async () => {
    await downloadContractPDF(result);
  };"""
    new_func = """const handleDownloadCoC = async () => {
    if (!result || !result.report_metadata || !result.report_metadata.report_id) {
      alert("Report ID not found. Ensure you have run a scan first.");
      return;
    }
    const reportId = result.report_metadata.report_id;
    window.open(`${API_BASE}/scan/report/${reportId}/pdf`, "_blank");
  };"""

    content = content.replace(old_func, new_func)
    
    old_btn = """<button onClick={handleDownloadCoC} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" id="contract-download-pdf-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                📄 Download Final Analysis PDF
              </button>"""
              
    new_btn = """<button onClick={() => downloadContractPDF(result, true)} className="axon-button text-xs px-4 py-2 gap-1.5 bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white" id="contract-download-html-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                🌐 Download HTML Dossier
              </button>
              <button onClick={handleDownloadCoC} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" id="contract-download-pdf-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                📄 Download Final Analysis PDF
              </button>"""

    if old_btn in content:
        content = content.replace(old_btn, new_btn)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched Contract")
    else:
        print("Contract old btn not found")


def patch_bulk():
    path = r'c:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src\pages\BulkInvestigation.jsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    old_btn = """<button onClick={async () => {
            await downloadBulkPDF(report);
          }} className="px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-md">
            Export Master PDF
          </button>"""
          
    new_btn = """<button onClick={() => downloadBulkPDF(report, true)} className="px-4 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-md mr-2">
            Download HTML Dossier
          </button>
          <button onClick={() => {
            if (report?.report_metadata?.report_id) {
              window.open(`${API_BASE}/scan/report/${report.report_metadata.report_id}/pdf`, "_blank");
            } else {
              alert("Report ID not available for this batch.");
            }
          }} className="px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-md">
            Export Master PDF
          </button>"""

    if old_btn in content:
        content = content.replace(old_btn, new_btn)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched Bulk")
    else:
        print("Bulk old btn not found")


def patch_case():
    path = r'c:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src\pages\CaseDashboard.jsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    old_btn = """<button className="axon-button flex items-center gap-2" onClick={async () => await downloadMasterCasePDF(caseData)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Master PDF
          </button>"""
          
    new_btn = """<button className="axon-button bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white flex items-center gap-2 mr-2" onClick={() => downloadMasterCasePDF(caseData, true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            HTML Dossier
          </button>
          <button className="axon-button flex items-center gap-2" onClick={() => window.open(`${API_BASE}/cases/${caseId}/pdf`, '_blank')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Master PDF
          </button>"""

    if old_btn in content:
        content = content.replace(old_btn, new_btn)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched Case")
    else:
        print("Case old btn not found")

patch_wallet()
patch_contract()
patch_bulk()
patch_case()
