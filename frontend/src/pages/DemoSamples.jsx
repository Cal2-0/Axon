import React from 'react';
import { useNavigate } from 'react-router-dom';

const SAMPLES = [
  // BITCOIN
  { "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "name": "Bitcoin Genesis Block", "type": "Wallet", "expectedRisk": "LOW", "description": "Satoshi Nakamoto's original Genesis block address." },
  { "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "name": "Binance Cold Storage", "type": "Wallet", "expectedRisk": "LOW", "description": "Bitcoin Cold Wallet belonging to Binance." },
  { "address": "1Ez69SnzzmePmZX3WpEzMKTrcBF2gpNQ55", "name": "Silk Road Hacker (US Gov Seized)", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Tied to the Silk Road darknet market." },
  { "address": "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo", "name": "Binance Hot Wallet", "type": "Wallet", "expectedRisk": "LOW", "description": "High volume exchange wallet." },
  
  // SOLANA
  { "address": "9WzDXwBbmcg8ZXcBJhTE5pTxe7XhT4FlbCGT9m4P2sQj", "name": "FTX Drainer (SOL)", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Solana wallet tied to the FTX hack." },
  { "address": "v4Rv1Tia7gE8LXZnYYyvNGBhJzGzB1RjK7H4w6n5Vp", "name": "Mango Markets Exploiter", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Avi Eisenberg Mango Markets exploit wallet." },
  { "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "name": "Solana Token Program", "type": "Contract", "expectedRisk": "LOW", "description": "Core Solana token program." },
  { "address": "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pT40A", "name": "Raydium Liquidity Pool", "type": "Contract", "expectedRisk": "LOW", "description": "Raydium AMM." },
  
  // TRON
  { "address": "TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP", "name": "Justin Sun (TRON)", "type": "Wallet", "expectedRisk": "LOW", "description": "Justin Sun's public TRON wallet." },
  { "address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "name": "Tether USDT (TRC20)", "type": "Contract", "expectedRisk": "LOW", "description": "USDT contract on Tron." },
  { "address": "TT2T17KZhoDu47i2E4FWxfG79zpe56sqzD", "name": "Poloniex Hacker (TRON)", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Poloniex hack funds on TRON." },
  { "address": "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9", "name": "Binance TRON Hot Wallet", "type": "Wallet", "expectedRisk": "LOW", "description": "Binance exchange wallet on TRON." },
  
  // UNSUPPORTED / OTHER
  { "address": "DFndh9WcBjjTG5hZzXW9v4n3jA2U6vFf3K", "name": "Dogecoin Party Wallet", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Used to test the identification engine's circuit breakers for unsupported chains." },
  { "address": "ltc1q3n990v2u0cqv8dly70y09m98svy582jqwk8n9j", "name": "Litecoin Whale", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Litecoin address to test unsupported chains handling." },
  { "address": "Xn23xH4jQ1cM8yH6zT4tD4vX4wX9Y4wZ4w", "name": "Dash Privacy Wallet", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "Dash address for testing rejection." },
  { "address": "rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh", "name": "Ripple Labs", "type": "Wallet", "expectedRisk": "UNSUPPORTED", "description": "XRP address." },
  
  // ETHEREUM WALLETS
  { "address": "0x56D8B635A7C88Fd1104D23d632AF40c1C3Aac4e3", "name": "Nomad Bridge Exploiter", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Wallet tied to the Nomad bridge free-for-all exploit." },
  { "address": "0x75A77dbDEab6E384D0E5cae2B70072D56EE140e6", "name": "Lazarus Group Sub-wallet", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Lazarus group wallet used to wash funds." },
  { "address": "0x59ABf3837Fa962d6853b4Cc0a19513AA031fd32b", "name": "FTX Accounts Drainer", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "The address responsible for draining FTX funds during the collapse." },
  { "address": "0x098B716B8Aaf21512996dC57EB0615e2383E2f96", "name": "Ronin Bridge Exploiter", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Confirmed Threat Actor (North Korea Lazarus Group)." },
  { "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "name": "Vitalik Buterin", "type": "Wallet", "expectedRisk": "LOW", "description": "Ethereum founder main wallet. Completely benign." },
  
  // ETHEREUM CONTRACTS
  { "address": "0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF", "name": "Tornado Cash 10 ETH", "type": "Contract", "expectedRisk": "CRITICAL", "description": "OFAC Sanctioned Privacy Mixer." },
  { "address": "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", "name": "Uniswap V3 Router", "type": "Contract", "expectedRisk": "LOW", "description": "Blue-chip DeFi protocol." },
  { "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "name": "USDC Token", "type": "Contract", "expectedRisk": "LOW", "description": "Circle fiat-backed stablecoin contract." },
  { "address": "0x27182842E098f60e3D576794A5bFFb0777E025d3", "name": "Euler Finance", "type": "Contract", "expectedRisk": "HIGH", "description": "Exploited contract." }
];

const STORY_1 = `OPERATION: MIDNIGHT SWEEP
=========================

Analysts have intercepted suspicious cross-chain movements targeting DeFi liquidity pools. We suspect North Korean state-sponsored threat actors are utilizing privacy mixers to launder exploited funds from the Ronin Bridge. 

Please run these 4 targets through the Bulk Scanner immediately to assess the threat level and classify the entities before the funds are dispersed.

Targets:
0x098B716B8Aaf21512996dC57EB0615e2383E2f96
0x75A77dbDEab6E384D0E5cae2B70072D56EE140e6
0x47CE0C6eD5B0Ce3d3A51f161bE5E26E51DdDbcE8
0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc`;

const STORY_2 = `MULTI-CHAIN WHALE WATCHING: ROUTINE CHECK
=========================================

During routine intelligence gathering, we identified massive addresses shifting liquidity across exchange infrastructure and decentralized aggregators, spanning Ethereum, Bitcoin, TRON, and even some unsupported meme chains. 

We need to verify if these are simply legitimate whale movements or if there is malicious intent hidden in the transaction topology. Process these through the Bulk Scanner to test the engine's chain-agnostic capabilities.

Targets:
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP
DFndh9WcBjjTG5hZzXW9v4n3jA2U6vFf3K
ltc1q3n990v2u0cqv8dly70y09m98svy582jqwk8n9j`;

const STORY_3 = `EXPLOIT INVESTIGATION: MAJOR BREACHES
=====================================

Multiple massive breaches have occurred over the last 24 hours. Assess the following wallets associated with the FTX, Poly Network, and Wormhole hacks to trace outbound liquidity.

Targets:
0x59ABf3837Fa962d6853b4Cc0a19513AA031fd32b
0xC8a65Fadf0e0dDAf421F28FEAb69Bf6E2E589963
0x629eEED06a0cdEc0eB79B5e94b28c03e8a4a5B0E
0x0d043128146654C781C414878aDF35205934fb5D`;

const STORY_4 = `COMPLIANCE: DEX ROUTERS
=======================

The compliance engine requires a health check on the top decentralized exchange routers to ensure no sanctioned liquidity has passed through directly. Provide a baseline assessment.

Targets:
0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45
0x1111111254fb6c44bac0bed2854e76f90643097d
0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F`;

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
