import React, { useState } from 'react';
import { API_BASE } from '../api/axon';

export default function VerifyReport() {
  const [reportId, setReportId] = useState('');
  const [providedHash, setProvidedHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!reportId.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/verify/${encodeURIComponent(reportId.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to verify report');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          Verify <span className="text-axon-cyan">Report</span>
        </h1>
        <p className="text-axon-text-muted text-sm font-mono">
          Cryptographically verify the authenticity of an Axon Intelligence Report.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-axon-surface/60 border border-axon-border rounded-xl p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-axon-cyan/5 blur-[50px] rounded-full"></div>
        <form onSubmit={handleVerify} className="relative z-10 flex flex-col gap-6">
          
          <div>
            <label className="block text-xs font-bold text-axon-text-dim uppercase tracking-widest mb-2">
              Axon Report ID
            </label>
            <input
              type="text"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              placeholder="e.g., AXON-W-171892341..."
              className="w-full bg-axon-input border border-axon-border rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-axon-cyan focus:ring-1 focus:ring-axon-cyan outline-none transition-all placeholder:text-axon-text-dim/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-axon-text-dim uppercase tracking-widest mb-2 flex items-center gap-2">
              Compare Hash <span className="text-[10px] bg-axon-card border border-axon-border px-1.5 py-0.5 rounded text-axon-text-muted normal-case tracking-normal">Optional</span>
            </label>
            <input
              type="text"
              value={providedHash}
              onChange={(e) => setProvidedHash(e.target.value)}
              placeholder="Paste the SHA-256 hash from the document to verify it..."
              className="w-full bg-axon-input border border-axon-border rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-axon-cyan focus:ring-1 focus:ring-axon-cyan outline-none transition-all placeholder:text-axon-text-dim/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !reportId.trim()}
            className="self-end bg-axon-cyan hover:bg-cyan-400 text-black font-bold font-mono text-sm px-6 py-3 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 shadow-glow-cyan"
          >
            {loading ? (
              <>
                <span className="animate-spin text-lg">⚙</span> VERIFYING...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                VERIFY AUTHENTICITY
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 flex items-start gap-3">
          <span className="text-red-400 text-xl">⚠</span>
          <div>
            <div className="text-red-400 font-bold font-mono text-sm uppercase tracking-wider">Verification Failed</div>
            <div className="text-red-400/80 text-sm font-mono mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="bg-axon-surface border border-axon-border rounded-xl shadow-2xl overflow-hidden animate-slide-up">
          <div className="bg-axon-card border-b border-axon-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-axon-cyan/20 text-axon-cyan border border-axon-cyan/30 rounded text-[10px] font-bold font-mono uppercase tracking-widest">
                AUTHENTIC RECORD
              </span>
              <span className="text-axon-text-muted font-mono text-xs">{result.report_id}</span>
            </div>
            <span className="text-axon-text-dim text-xs font-mono">
              {new Date(result.scan_timestamp * 1000).toLocaleString()}
            </span>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest mb-1">Entity Address</div>
                <div className="font-mono text-white break-all">{result.entity_address}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest mb-1">Entity Type</div>
                <div className="font-mono text-axon-text-muted capitalize">{result.entity_type}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest mb-1">Scan Depth</div>
                <div className="font-mono text-axon-text-muted capitalize">{result.scan_depth}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest mb-1">Threat Level</div>
                <div className={`font-mono font-bold text-lg ${
                  result.risk_score >= 80 ? 'text-red-500' :
                  result.risk_score >= 60 ? 'text-axon-orange' :
                  result.risk_score >= 40 ? 'text-yellow-400' : 'text-axon-green'
                }`}>
                  {result.risk_score}/100
                </div>
              </div>
            </div>

            {/* Hash Display */}
            <div className="bg-[#0a0f1a] border border-axon-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  Authentic Database Hash
                </div>
              </div>
              <div className="font-mono text-xs text-axon-cyan break-all selection:bg-axon-cyan/30">
                {result.authentic_hash}
              </div>
            </div>

            {/* Hash Comparison Result */}
            {providedHash && (
              <div className={`mt-4 p-4 rounded-lg border flex items-start gap-3 ${
                providedHash.trim().toLowerCase() === result.authentic_hash.toLowerCase()
                  ? 'bg-axon-green/10 border-axon-green/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                {providedHash.trim().toLowerCase() === result.authentic_hash.toLowerCase() ? (
                  <>
                    <div className="text-axon-green mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                      <div className="text-axon-green font-bold text-sm uppercase tracking-wider">Hashes Match (PASS)</div>
                      <div className="text-axon-green/80 text-xs font-mono mt-1">The provided hash matches the server's authentic cryptographic seal. The document is unmodified and authentic.</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-red-400 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                      <div className="text-red-400 font-bold text-sm uppercase tracking-wider">Hash Mismatch — Tampering Detected (FAIL)</div>
                      <div className="text-red-400/80 text-xs font-mono mt-1 mb-2">The provided hash DOES NOT MATCH the server's authentic hash. The document has been modified since it was generated.</div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mt-2">
                        <div className="bg-red-500/20 p-2 rounded">
                          <span className="text-red-300 block mb-1">Provided Hash (Actual):</span>
                          <span className="text-red-400 break-all">{providedHash}</span>
                        </div>
                        <div className="bg-axon-green/10 p-2 rounded border border-axon-green/20">
                          <span className="text-axon-green block mb-1">Server Hash (Expected):</span>
                          <span className="text-axon-green break-all">{result.authentic_hash}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
