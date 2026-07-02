import React, { useState } from 'react';

export default function IssueList({ findings }) {
  if (!findings || findings.length === 0) {
    return (
      <div className="glass-panel p-8 text-center text-axon-text-muted">
        <svg className="w-12 h-12 mx-auto mb-4 text-axon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h3 className="text-xl font-medium text-axon-text mb-2">No Vulnerabilities Found</h3>
        <p>The automated scanners did not detect any high-risk patterns.</p>
      </div>
    );
  }

  const getImpactColor = (impact) => {
    switch(impact?.toLowerCase()) {
      case 'high': return 'text-axon-red bg-axon-red/10 border-axon-red/30';
      case 'medium': return 'text-axon-orange bg-axon-orange/10 border-axon-orange/30';
      case 'low': return 'text-axon-yellow bg-axon-yellow/10 border-axon-yellow/30';
      default: return 'text-axon-blue bg-axon-blue/10 border-axon-blue/30';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-axon-text mb-4 border-b border-axon-border pb-2">Detected Issues ({findings.length})</h3>
      {findings.map((f, i) => (
        <div key={i} className="glass-panel p-5 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-lg font-medium text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-axon-cyan"></span>
              {f.check}
            </h4>
            <div className="flex gap-2">
              {f.tool && (
                <span className="px-2 py-1 text-xs font-mono rounded bg-axon-border text-axon-text-muted uppercase">
                  {f.tool}
                </span>
              )}
              <span className={`px-2 py-1 text-xs font-bold rounded uppercase border ${getImpactColor(f.impact)}`}>
                {f.impact || 'Data Not Available'} Impact
              </span>
            </div>
          </div>
          <p className="text-axon-text-dim text-sm leading-relaxed font-mono bg-axon-bg p-3 rounded border border-axon-border break-words">
            {f.description}
          </p>
        </div>
      ))}
    </div>
  );
}
