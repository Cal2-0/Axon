import sys

path = r'c:\Users\bina1\OneDrive\Desktop\main\internship\axon\frontend\src\utils\pdfExport.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace _triggerPDFDownload
old_trigger = """function _triggerPDFDownload(html, filename) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Popup blocked — fallback to blob download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Popup was blocked. The report has been downloaded as HTML. Open it in your browser and use Ctrl+P → Save as PDF.');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for fonts to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    try { printWindow.print(); } catch(e) { /* ignore */ }
  }, 2000);
}"""

new_trigger = """function _triggerPDFDownload(html, filename, forceHtml = true) {
  if (forceHtml) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Popup blocked — fallback to blob download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Popup was blocked. The report has been downloaded as HTML. Open it in your browser and use Ctrl+P → Save as PDF.');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for fonts to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    try { printWindow.print(); } catch(e) { /* ignore */ }
  }, 2000);
}"""

if old_trigger in content:
    content = content.replace(old_trigger, new_trigger)
else:
    print("Could not find old_trigger")

# Change export function signatures to pass forceHtml=true by default
content = content.replace("export async function downloadWalletPDF(result) {", "export async function downloadWalletPDF(result, forceHtml = true) {")
content = content.replace("_triggerPDFDownload(html, `AXON-${caseId}-Wallet-Report`);", "_triggerPDFDownload(html, `AXON-${caseId}-Wallet-Report`, forceHtml);")

content = content.replace("export async function downloadContractPDF(result) {", "export async function downloadContractPDF(result, forceHtml = true) {")
content = content.replace("_triggerPDFDownload(html, `AXON-${caseId}-Contract-Report`);", "_triggerPDFDownload(html, `AXON-${caseId}-Contract-Report`, forceHtml);")

content = content.replace("export async function downloadBulkPDF(report) {", "export async function downloadBulkPDF(report, forceHtml = true) {")
content = content.replace("_triggerPDFDownload(html, `AXON-${caseId}-Master-Report`);", "_triggerPDFDownload(html, `AXON-${caseId}-Master-Report`, forceHtml);")

content = content.replace("export async function downloadMasterCasePDF(report) {", "export async function downloadMasterCasePDF(report, forceHtml = true) {")
content = content.replace("_triggerPDFDownload(html, `AXON-${caseId}-Case-Report`);", "_triggerPDFDownload(html, `AXON-${caseId}-Case-Report`, forceHtml);")

# Wait, check if the string for case report is `AXON-${caseId}-Master-Report` ?
# In pdfExport.js:
# downloadBulkPDF uses `AXON-${caseId}-Master-Report`
# downloadMasterCasePDF uses `AXON-${caseId}-Master-Report`
# Let's just blindly replace `_triggerPDFDownload(html, ` with `_triggerPDFDownload(html, ` and append `, forceHtml)`... Wait, I need a regex.

import re
content = re.sub(r'_triggerPDFDownload\((html, `.*?`)\);', r'_triggerPDFDownload(\1, forceHtml);', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched pdfExport.js")
