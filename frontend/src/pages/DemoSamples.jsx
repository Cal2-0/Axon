import React from 'react';

const SAMPLES = [
  {
    address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
    name: 'Ronin Bridge Exploiter',
    type: 'Wallet',
    expectedRisk: 'CRITICAL',
    description: 'Confirmed Threat Actor (North Korea Lazarus Group). Should score 90+ and flag as CRITICAL.'
  },
  {
    address: '0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc',
    name: 'Tornado Cash Router',
    type: 'Contract',
    expectedRisk: 'CRITICAL',
    description: 'OFAC Sanctioned Privacy Mixer. Should instantly flag as CRITICAL.'
  },
  {
    address: '0x28C6c06298d514Db089934071355E5743bf21d60',
    name: 'Binance 14 (Hot Wallet)',
    type: 'Wallet',
    expectedRisk: 'LOW',
    description: 'High volume, high velocity exchange wallet. Should correctly suppress false-positives and score LOW.'
  },
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    name: 'Wrapped Ether (WETH)',
    type: 'Contract',
    expectedRisk: 'LOW',
    description: 'Blue-chip DeFi protocol. Hardcoded to skip AI parsing to save tokens and ensure 0 false-positives.'
  },
  {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    name: 'Vitalik Buterin',
    type: 'Wallet',
    expectedRisk: 'LOW',
    description: 'Whale address with massive balances and mixer interactions (donations). Should score LOW.'
  },
  {
    address: '0x4B16c5dE96EB2117bBE5fd171E4d203624B014aa',
    name: 'Binance-Peg Tokens',
    type: 'Contract',
    expectedRisk: 'LOW',
    description: 'Exchange infrastructure. Safe and low risk.'
  },
  {
    address: '0x8589427373D6D84E98730D7795D8f6f8731FDA16',
    name: '1inch V5 Router',
    type: 'Contract',
    expectedRisk: 'LOW',
    description: 'DEX Aggregator router. Extremely high transaction volume but completely benign.'
  }
];

const STORY_1 = `OPERATION: MIDNIGHT SWEEP
=========================

Analysts have intercepted suspicious cross-chain movements targeting DeFi liquidity pools. We suspect North Korean state-sponsored threat actors are utilizing privacy mixers to launder exploited funds from the Ronin Bridge. 

Please run these 4 targets through the Bulk Scanner immediately to assess the threat level and classify the entities before the funds are dispersed.

Targets:
0x098B716B8Aaf21512996dC57EB0615e2383E2f96 (Suspect 1)
0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc (Suspect 2)
0x28C6c06298d514Db089934071355E5743bf21d60 (Suspect 3)
0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 (Suspect 4)`;

const STORY_2 = `WHALE WATCHING: ROUTINE CHECK
=============================

During routine intelligence gathering, we identified three massive addresses shifting liquidity across exchange infrastructure and decentralized aggregators. 

We need to verify if these are simply legitimate whale/exchange movements or if there is malicious intent hidden in the transaction topology. Process these through the Bulk Scanner to generate a forensic consensus.

Targets:
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
0x4B16c5dE96EB2117bBE5fd171E4d203624B014aa
0x8589427373D6D84E98730D7795D8f6f8731FDA16`;

export default function DemoSamples() {
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here if desired
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="border-b border-[#1e293b] pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-full">
            DEMO ASSETS
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">System Test Samples</h1>
        <p className="text-gray-500 mt-2 text-sm max-w-3xl">
          Use the curated addresses below to test the 5-Stage Scoring Engine. These addresses target specific edge cases
          (e.g., sanctioned contracts, massive exchange wallets, known hackers) to demonstrate the platform's accuracy
          and false-positive suppression capabilities.
        </p>
      </div>

      {/* Story Texts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: "Demo Scenario 1: Critical Threats", text: STORY_1 },
          { title: "Demo Scenario 2: Benign Whales", text: STORY_2 }
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
        <h2 className="text-2xl font-bold text-white">Individual Entities</h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SAMPLES.map((s, i) => {
          const isCritical = s.expectedRisk === 'CRITICAL';
          return (
            <div key={i} className="bg-[#0a0f1a] border border-[#1e293b] rounded-xl p-5 hover:border-[#22d3ee]/50 transition-colors group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{s.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">{s.type}</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded border font-mono ${
                      isCritical ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-green-500/15 text-green-400 border-green-500/30'
                    }`}>
                      EXPECTED: {s.expectedRisk}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(s.address)}
                  className="px-3 py-1.5 bg-[#05080f] border border-[#1e293b] text-gray-400 hover:text-white hover:border-[#22d3ee] rounded text-xs font-mono transition-all opacity-0 group-hover:opacity-100"
                >
                  Copy Address
                </button>
              </div>
              
              <div className="font-mono text-xs text-[#22d3ee] bg-[#05080f] p-2 rounded mb-3 break-all">
                {s.address}
              </div>
              
              <p className="text-sm text-gray-400 leading-relaxed">
                {s.description}
              </p>
            </div>
          );
        })}
      </div>

    </div>
  );
}
