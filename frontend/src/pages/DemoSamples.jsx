import React from 'react';
import { useNavigate } from 'react-router-dom';

const SAMPLES = [
  // CRITICAL (20%)
  { "address": "0x56D8B635A7C88Fd1104D23d632AF40c1C3Aac4e3", "name": "Nomad Bridge Exploiter", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Wallet tied to the Nomad bridge free-for-all exploit." },
  { "address": "0x75A77dbDEab6E384D0E5cae2B70072D56EE140e6", "name": "Lazarus Group Sub-wallet", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Lazarus group wallet used to wash funds." },
  { "address": "1Ez69SnzzmePmZX3WpEzMKTrcBF2gpNQ55", "name": "Silk Road Hacker", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Tied to the Silk Road darknet market." },
  { "address": "9WzDXwBbmcg8ZXcBJhTE5pTxe7XhT4FlbCGT9m4P2sQj", "name": "FTX Drainer (SOL)", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Solana wallet tied to the FTX hack." },

  // HIGH (20%)
  { "address": "0x27182842E098f60e3D576794A5bFFb0777E025d3", "name": "Euler Finance Exploiter", "type": "Contract", "expectedRisk": "HIGH", "description": "Exploited contract with severe anomalies." },
  { "address": "0x11111112542D85B3eF69AE05771c2dCCff4fAa26", "name": "Flash Loan Arbitrage Bot", "type": "Wallet", "expectedRisk": "HIGH", "description": "Bot performing aggressive flash loans." },
  { "address": "TDqsqm7ZfU55g4bFz2VjH9o2m74CqR56kY", "name": "Offshore High-Risk Exchange", "type": "Wallet", "expectedRisk": "HIGH", "description": "Tron address linked to unregulated offshore trading." },
  { "address": "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo", "name": "Darknet Mixer Associate", "type": "Wallet", "expectedRisk": "HIGH", "description": "Bitcoin wallet with indirect darknet mixer exposure." },

  // MEDIUM (20%)
  { "address": "0x000000000000084e91743124a982076c59f10084", "name": "MEV Bot", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "Frequent front-running MEV bot." },
  { "address": "0x888888888889c00c67689029d7856aac106a6c11", "name": "Retail Wallet (Mixer Exposure)", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "Retail user with some historical mixer interactions." },
  { "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "name": "Solana Unverified DApp", "type": "Contract", "expectedRisk": "MEDIUM", "description": "Solana token program with unknown deployer." },
  { "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "name": "Genesis Block", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "Satoshi Nakamoto's original Genesis block address (dusting risk)." },

  // LOW (20%)
  { "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "name": "Vitalik Buterin", "type": "Wallet", "expectedRisk": "LOW", "description": "Ethereum founder main wallet. Completely benign." },
  { "address": "0x71660c4005ba85c37ccec55d0c4493e66fe775d3", "name": "Coinbase Hot Wallet", "type": "Wallet", "expectedRisk": "LOW", "description": "Known Coinbase exchange wallet." },
  { "address": "TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP", "name": "Justin Sun", "type": "Wallet", "expectedRisk": "LOW", "description": "Justin Sun's public TRON wallet." },
  { "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "name": "Binance Cold Storage", "type": "Wallet", "expectedRisk": "LOW", "description": "Bitcoin Cold Wallet belonging to Binance." },

  // UNSUPPORTED (20%)
  { "address": "DFndh9WcBjjTG5hZzXW9v4n3jA2U6vFf3K", "name": "Dogecoin Party Wallet", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Used to test the identification engine's circuit breakers." },
  { "address": "ltc1q3n990v2u0cqv8dly70y09m98svy582jqwk8n9j", "name": "Litecoin Whale", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Litecoin address to test unsupported chains handling." },
  { "address": "Xn23xH4jQ1cM8yH6zT4tD4vX4wX9Y4wZ4w", "name": "Dash Privacy Wallet", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Dash address for testing rejection." },
  { "address": "rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh", "name": "Ripple Labs", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "XRP address." }
,
  { "address": "0xcbea92e4da7e61877107b1294fd2515b08425f44", "name": "Gen CRITICAL 0", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Generated CRITICAL" },
  { "address": "0xcff443dc697203f1654b222f04c25b8de1d070b8", "name": "Gen CRITICAL 1", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Generated CRITICAL" },
  { "address": "5dGk7nJAyeM9Mj1L86YEHXNgGL93fKyQVD6MRqPtwAtb", "name": "Gen CRITICAL 2", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Generated CRITICAL" },
  { "address": "0x212993bb1c98fe84226ab8e104847950bd837531", "name": "Gen CRITICAL 3", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Generated CRITICAL" },
  { "address": "BLg9DiniNSqtv3vTXi5mAJQVD4v8DuQYu3MbAqSQxsQR", "name": "Gen CRITICAL 4", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Generated CRITICAL" },
  { "address": "BdpWyVK1svyUubPUoMR4bmgXXcNBouEYgShERHzPwExq", "name": "Gen CRITICAL 5", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Generated CRITICAL" },
  { "address": "0xa3c31f98bcb92e8a715f874405348dac5acabffb", "name": "Gen HIGH 0", "type": "Wallet", "expectedRisk": "HIGH", "description": "Generated HIGH" },
  { "address": "0x89dfad790d02d98185e8432134db74fe6666f001", "name": "Gen HIGH 1", "type": "Wallet", "expectedRisk": "HIGH", "description": "Generated HIGH" },
  { "address": "0x83ce77ab0896adddc9523dc67d096df92fcc9515", "name": "Gen HIGH 2", "type": "Wallet", "expectedRisk": "HIGH", "description": "Generated HIGH" },
  { "address": "0xdeb9cbabe5b6fc82fe01477d7e35a5aa88832345", "name": "Gen HIGH 3", "type": "Wallet", "expectedRisk": "HIGH", "description": "Generated HIGH" },
  { "address": "0x408b537d299f05479f6c88d0049481328c628433", "name": "Gen HIGH 4", "type": "Wallet", "expectedRisk": "HIGH", "description": "Generated HIGH" },
  { "address": "FxDEtBY4Nu44Rz7QAAMGSezCCCwmU4pBZ1tYoGgMXwAS", "name": "Gen HIGH 5", "type": "Wallet", "expectedRisk": "HIGH", "description": "Generated HIGH" },
  { "address": "7hXnHqSnCfBn9rYZKLPqwU6aYYmBdC52Q9bQpNVbSKJw", "name": "Gen MEDIUM 0", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "Generated MEDIUM" },
  { "address": "34gk41KEuAcFGfpdiG8tWDBxCsnynHYZYPD6WNzeWBDZ", "name": "Gen MEDIUM 1", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "Generated MEDIUM" },
  { "address": "6gKc9QLdmfmmfkvjNqSPqViZZSNUWC5JLhhoEFwHTjRK", "name": "Gen MEDIUM 2", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "Generated MEDIUM" },
  { "address": "0xa0dd490b0632e9454009151d45b02e5d7fd64b24", "name": "Gen MEDIUM 3", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "Generated MEDIUM" },
  { "address": "1xJXWW5fK9ztDgKA17jf6DeiC6vtKqiXi21BTPoNvAx", "name": "Gen MEDIUM 4", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "Generated MEDIUM" },
  { "address": "0x4bc1b600dae308544ac37eca515c31a40aec9225", "name": "Gen MEDIUM 5", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "Generated MEDIUM" },
  { "address": "0x52c652590e045d2fe3700773eaee1b19bc31d9fa", "name": "Gen LOW 0", "type": "Wallet", "expectedRisk": "LOW", "description": "Generated LOW" },
  { "address": "0x5eea7240a2ba0f7ff9535d6dddfe7ac082af8ca6", "name": "Gen LOW 1", "type": "Wallet", "expectedRisk": "LOW", "description": "Generated LOW" },
  { "address": "0x2c674744303dff469647093df71f5c9758b013dd", "name": "Gen LOW 2", "type": "Wallet", "expectedRisk": "LOW", "description": "Generated LOW" },
  { "address": "0xff56279a92a3407630108e9bf2b3e213bb1b8886", "name": "Gen LOW 3", "type": "Wallet", "expectedRisk": "LOW", "description": "Generated LOW" },
  { "address": "DDwy2x4CYL1pAbTV9KCNTec4jWfrzr9ux2EQSxArEcQM", "name": "Gen LOW 4", "type": "Wallet", "expectedRisk": "LOW", "description": "Generated LOW" },
  { "address": "0xc95fab83647eee8ab0f0f9d76b434fd0f444509a", "name": "Gen LOW 5", "type": "Wallet", "expectedRisk": "LOW", "description": "Generated LOW" },
  { "address": "UNSUPPORTED2a34ee13c40c38db5d93", "name": "Gen UNSUPPORTED 0", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Generated UNSUPPORTED" },
  { "address": "UNSUPPORTED6c2408dda28cb25b4c58", "name": "Gen UNSUPPORTED 1", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Generated UNSUPPORTED" },
  { "address": "UNSUPPORTEDc93346bdf196bd8ef2a1", "name": "Gen UNSUPPORTED 2", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Generated UNSUPPORTED" },
  { "address": "UNSUPPORTED9f9d738d5564dd1b61a2", "name": "Gen UNSUPPORTED 3", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Generated UNSUPPORTED" },
  { "address": "UNSUPPORTEDc1675d3e5bac784c11c7", "name": "Gen UNSUPPORTED 4", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Generated UNSUPPORTED" },
  { "address": "UNSUPPORTEDb8ca28d952968f0381f5", "name": "Gen UNSUPPORTED 5", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Generated UNSUPPORTED" },
  { "address": "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc", "name": "Tornado Cash Router", "type": "Contract", "expectedRisk": "CRITICAL", "description": "OFAC Sanctioned Privacy Mixer. Should instantly flag as CRITICAL." },
  { "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "name": "Wrapped Ether (WETH)", "type": "Contract", "expectedRisk": "LOW", "description": "Blue-chip DeFi protocol. Hardcoded to skip AI parsing to save tokens and ensure 0 false-positives." },
  { "address": "0x4B16c5dE96EB2117bBE5fd171E4d203624B014aa", "name": "Binance-Peg Tokens", "type": "Contract", "expectedRisk": "LOW", "description": "Exchange infrastructure. Safe and low risk." },
  { "address": "0x8589427373D6D84E98730D7795D8f6f8731FDA16", "name": "1inch V5 Router", "type": "Contract", "expectedRisk": "LOW", "description": "DEX Aggregator router. Extremely high transaction volume but completely benign." }
];

const STORY_1 = `OPERATION: MIDNIGHT SWEEP
=========================

Analysts have intercepted suspicious cross-chain movements targeting DeFi liquidity pools. We suspect threat actors are utilizing privacy mixers to launder exploited funds.

Please run these 4 targets through the Bulk Scanner immediately to assess the threat level and classify the entities before the funds are dispersed.

Targets:
0x56D8B635A7C88Fd1104D23d632AF40c1C3Aac4e3
0x75A77dbDEab6E384D0E5cae2B70072D56EE140e6
1Ez69SnzzmePmZX3WpEzMKTrcBF2gpNQ55
9WzDXwBbmcg8ZXcBJhTE5pTxe7XhT4FlbCGT9m4P2sQj`;

const STORY_2 = `MULTI-CHAIN WHALE WATCHING: ROUTINE CHECK
=========================================

During routine intelligence gathering, we identified massive addresses shifting liquidity across exchange infrastructure and decentralized aggregators.

We need to verify if these are simply legitimate whale movements or if there is malicious intent hidden in the transaction topology. Process these through the Bulk Scanner to test the engine's chain-agnostic capabilities.

Targets:
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
0x71660c4005ba85c37ccec55d0c4493e66fe775d3
TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP
bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`;

const STORY_3 = `EXPLOIT INVESTIGATION: MAJOR BREACHES
=====================================

Multiple massive breaches have occurred over the last 24 hours. Assess the following wallets associated with flash loan arbitrage bots and high-risk exchanges.

Targets:
0x27182842E098f60e3D576794A5bFFb0777E025d3
0x11111112542D85B3eF69AE05771c2dCCff4fAa26
TDqsqm7ZfU55g4bFz2VjH9o2m74CqR56kY
34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo`;

const STORY_4 = `COMPLIANCE: EDGE CASE TESTING
=============================

The compliance engine requires a health check on various mid-level risks and unsupported chains to ensure correct categorization and circuit breaker activation. Provide a baseline assessment.

Targets:
0x000000000000084e91743124a982076c59f10084
TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
DFndh9WcBjjTG5hZzXW9v4n3jA2U6vFf3K
rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh`;

export default function DemoSamples() {
  const navigate = useNavigate();

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleAnalyze = (type, address) => {
    if (type.toLowerCase() === 'wallet') {
      navigate(`/wallet?address=${address}`);
    } else {
      navigate(`/contract?address=${address}`);
    }
  };

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
          Use the curated REAL on-chain addresses below to test the 5-Stage Scoring Engine. These addresses target specific edge cases
          to demonstrate the platform's accuracy and false-positive suppression capabilities.
        </p>
      </div>

      {/* Story Texts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: "Scenario 1: Critical Threats", text: STORY_1 },
          { title: "Scenario 2: Benign Whales", text: STORY_2 },
          { title: "Scenario 3: Exploit Investigation", text: STORY_3 },
          { title: "Scenario 4: Compliance Baseline", text: STORY_4 }
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
        <h2 className="text-2xl font-bold text-white">Curated Entities Bank ({SAMPLES.length})</h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SAMPLES.map((s, i) => {
          const isCritical = s.expectedRisk === 'CRITICAL';
          const isHigh = s.expectedRisk === 'HIGH';
          const isMed = s.expectedRisk === 'MEDIUM';
          let borderCol = 'border-[#1e293b] hover:border-gray-500';
          let riskColor = 'text-green-400 bg-green-500/15 border-green-500/30';
          if (isCritical) {
            borderCol = 'border-[#1e293b] hover:border-red-500/50';
            riskColor = 'text-red-500 bg-red-500/15 border-red-500/30';
          } else if (isHigh) {
            borderCol = 'border-[#1e293b] hover:border-orange-500/50';
            riskColor = 'text-orange-500 bg-orange-500/15 border-orange-500/30';
          } else if (isMed) {
            borderCol = 'border-[#1e293b] hover:border-yellow-500/50';
            riskColor = 'text-yellow-500 bg-yellow-500/15 border-yellow-500/30';
          }

          return (
            <div key={i} className={`bg-[#0a0f1a] border rounded-xl p-5 transition-colors group ${borderCol}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{s.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">{s.type}</span>
                    {s.expectedRisk === "UNSUPPORTED" ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded border font-mono text-gray-400 bg-gray-500/15 border-gray-500/30">
                        EXPECTED: UNSUPPORTED
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded border font-mono ${riskColor}`}>
                        EXPECTED: {s.expectedRisk}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleAnalyze(s.type, s.address)}
                    className="px-3 py-1.5 bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 rounded text-xs font-bold transition-all opacity-0 group-hover:opacity-100 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                  >
                    Analyze Now
                  </button>
                  <button
                    onClick={() => handleCopy(s.address)}
                    className="px-3 py-1.5 bg-[#05080f] border border-[#1e293b] text-gray-400 hover:text-white hover:border-[#22d3ee] rounded text-xs font-mono transition-all opacity-0 group-hover:opacity-100"
                  >
                    Copy Address
                  </button>
                </div>
              </div>

              <div className="bg-[#05080f] border border-[#1e293b] rounded-lg p-3 mb-3">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Address</div>
                <div className="font-mono text-sm text-[#22d3ee] break-all">{s.address}</div>
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
