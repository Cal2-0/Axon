content = """import React from 'react';
import { REAL_PROFILES } from '../data/realProfiles';

export default function DemoSamples() {
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const STORY_1 = `OPERATION: MIDNIGHT SWEEP
=========================

Analysts have intercepted suspicious cross-chain movements targeting DeFi liquidity pools. We suspect a coordinated advanced persistent threat (APT) is utilizing privacy mixers, rogue exchange accounts, and intermediary smart contracts to launder exploited funds. 

Targets:
${REAL_PROFILES[0].address}
${REAL_PROFILES[1].address}
${REAL_PROFILES[2].address}
${REAL_PROFILES[3].address}`;

  const STORY_2 = `WHALE WATCHING: ROUTINE CHECK
=================================================

During routine intelligence gathering, the automated monitoring systems flagged a massive anomaly in capital flows. We need to verify if these are simply legitimate whale/exchange movements or if there is malicious intent.

Targets:
${REAL_PROFILES[4].address}
${REAL_PROFILES[5].address}
${REAL_PROFILES[6].address}
${REAL_PROFILES[7].address}`;

  const STORY_3 = `EXPLOIT INVESTIGATION: FLASH LOAN ATTACK
========================================

Multiple smart contracts were drained using a flash loan attack. Initial forensic traces lead to these addresses. Determine their risk profile and contract vulnerabilities.

Targets:
${REAL_PROFILES[8].address}
${REAL_PROFILES[9].address}
${REAL_PROFILES[10].address}
${REAL_PROFILES[11].address}`;

  const STORY_4 = `COMPLIANCE AUDIT: MIXER INTERACTIONS
====================================

The compliance team flagged the following addresses for potential interactions with sanctioned privacy mixers. Conduct a thorough investigation to confirm.

Targets:
${REAL_PROFILES[12].address}
${REAL_PROFILES[13].address}
${REAL_PROFILES[14].address}
${REAL_PROFILES[15].address}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="border-b border-[#1e293b] pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-full">
            REAL-WORLD ASSETS
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Live Test Samples</h1>
        <p className="text-gray-500 mt-2 text-sm max-w-3xl">
          Use the curated addresses below to test the 5-Stage Scoring Engine against REAL on-chain data.
        </p>
      </div>

      {/* Story Texts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: "Scenario 1: Critical Threats", text: STORY_1 },
          { title: "Scenario 2: Benign Whales", text: STORY_2 },
          { title: "Scenario 3: Exploit Investigation", text: STORY_3 },
          { title: "Scenario 4: Compliance Audit", text: STORY_4 }
        ].map((story, i) => (
          <div key={i} className="bg-gradient-to-br from-[#0a0f1a] to-[#05080f] border border-[#1e293b] rounded-xl p-6 relative group overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-purple-500"></span>
                {story.title}
              </h3>
              <button
                onClick={() => handleCopy(story.text)}
                className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              >
                Copy Full Text
              </button>
            </div>
            <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap bg-[#05080f]/50 p-4 rounded-lg border border-[#1e293b]/50">
              {story.text}
            </pre>
          </div>
        ))}
      </div>

      <div className="border-b border-[#1e293b] pt-8 pb-4">
        <h2 className="text-2xl font-bold text-white">Curated Entities Bank ({REAL_PROFILES.length})</h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REAL_PROFILES.map((s, i) => {
          const isCritical = s.expectedRisk === 'CRITICAL';
          const isHigh = s.expectedRisk === 'HIGH';
          const isMed = s.expectedRisk === 'MEDIUM';
          let borderCol = 'border-[#1e293b] hover:border-gray-500';
          let riskColor = 'text-green-400';
          if (isCritical) {
            borderCol = 'border-[#1e293b] hover:border-red-500/50';
            riskColor = 'text-red-500';
          } else if (isHigh) {
            borderCol = 'border-[#1e293b] hover:border-orange-500/50';
            riskColor = 'text-orange-500';
          } else if (isMed) {
            borderCol = 'border-[#1e293b] hover:border-yellow-500/50';
            riskColor = 'text-yellow-500';
          }

          return (
            <div key={i} className={`bg-[#0a0f1a] border rounded-xl p-5 transition-colors group ${borderCol}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{s.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">{s.type}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(s.address)}
                  className="px-3 py-1.5 bg-[#05080f] border border-[#1e293b] text-gray-400 hover:text-white hover:border-[#22d3ee] rounded text-xs font-mono transition-all opacity-0 group-hover:opacity-100"
                >
                  Copy Address
                </button>
              </div>

              <div className="bg-[#05080f] border border-[#1e293b] rounded-lg p-3">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Contract / Wallet Address</div>
                <div className="font-mono text-sm text-[#22d3ee] break-all">{s.address}</div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#1e293b] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Expected Risk:</span>
                  <span className={`text-xs font-bold ${riskColor}`}>{s.expectedRisk}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
"""

with open("frontend/src/pages/DemoSamples.jsx", "w") as f:
    f.write(content)
print("done")
