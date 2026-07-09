
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, Zap, Layers, RefreshCw, Cpu, Activity, Info } from 'lucide-react';

const DATASETS = {
  "Ethereum Wallets": [
    {
      "address": "0xC8a65Fadf0e0dDAf421F28FEAb69Bf6E2E589963",
      "name": "Poly Network Exploiter",
      "type": "Wallet",
      "expectedRisk": "CRITICAL",
      "description": "Historically massive bridge exploit wallet with multiple cross-chain laundering attempts."
    },
    {
      "address": "0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13",
      "name": "Jaredfromsubway.eth",
      "type": "Wallet",
      "expectedRisk": "HIGH",
      "description": "One of the highest volume MEV bots on Ethereum, front-running retail users continuously."
    },
    {
      "address": "0x8575B2Dbbd7608A1629aDAA952abA74Bcc5381BF",
      "name": "Pranksy (NFT Whale)",
      "type": "Wallet",
      "expectedRisk": "MEDIUM",
      "description": "High volume, high net-worth individual engaging in complex DeFi/NFT interactions."
    },
    {
      "address": "0x28C6c06298d514Db089934071355E5743bf21d60",
      "name": "Binance Hot Wallet 14",
      "type": "Wallet",
      "expectedRisk": "LOW",
      "description": "High volume exchange wallet for testing the false-positive suppression engine."
    },
    {
      "address": "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe",
      "name": "Ethereum Foundation",
      "type": "Wallet",
      "expectedRisk": "LOW",
      "description": "Long-term dormant treasury that occasionally moves large sums for grants."
    },
    {
      "address": "0x0248f752802b2cfb4373cc0c3bc3964429385c26",
      "name": "Wintermute Exploiter",
      "type": "Wallet",
      "expectedRisk": "CRITICAL",
      "description": "Complex smart contract exploitation and subsequent fund movement."
    },
    {
      "address": "0x56D8B635A7C88Fd1104D23d632AF40c1C3Aac4e3",
      "name": "Nomad Bridge Exploiter",
      "type": "Wallet",
      "expectedRisk": "CRITICAL",
      "description": "Participated in a decentralized free-for-all bridge exploit."
    },
    {
      "address": "0x1111111254FB6c44BAC0beD2854e76F90643097d",
      "name": "1inch Aggregator Bot",
      "type": "Wallet",
      "expectedRisk": "MEDIUM",
      "description": "Router/Bot hybrid with extremely complex transaction traces."
    }
  ],
  "Ethereum Contracts": [
    {
      "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "name": "USDT Token Contract",
      "type": "Contract",
      "expectedRisk": "LOW",
      "description": "Core DeFi infrastructure. Tests static analysis on massive verified proxies."
    },
    {
      "address": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      "name": "Uniswap V2 Router",
      "type": "Contract",
      "expectedRisk": "LOW",
      "description": "Heavily used DEX router. Good for topology tests."
    },
    {
      "address": "0x1111111254EEB25477B68fb85Ed929f73A960582",
      "name": "1inch v5 Aggregator",
      "type": "Contract",
      "expectedRisk": "MEDIUM",
      "description": "Complex router with intricate call paths."
    },
    {
      "address": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      "name": "Wrapped BTC",
      "type": "Contract",
      "expectedRisk": "LOW",
      "description": "Cross-chain wrapped asset."
    }
  ],
  "Bitcoin": [
    {
      "address": "1FeexV6bAHb8RoZP9LSQcw86WXU945h39y",
      "name": "Mt Gox Hacker (Historic)",
      "type": "Wallet",
      "expectedRisk": "CRITICAL",
      "description": "Ancient legacy address holding ~79,956 BTC tied to the Mt. Gox theft."
    },
    {
      "address": "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
      "name": "Binance Cold Storage",
      "type": "Wallet",
      "expectedRisk": "LOW",
      "description": "Massive P2SH cold wallet with immense volume."
    },
    {
      "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "name": "Binance Hot Wallet",
      "type": "Wallet",
      "expectedRisk": "LOW",
      "description": "Active SegWit exchange wallet with constant txs."
    },
    {
      "address": "1P5ZEDWTKTFGxQjZphgWPUJt6NDX2j83a3",
      "name": "Legacy Mega Whale",
      "type": "Wallet",
      "expectedRisk": "MEDIUM",
      "description": "Legacy address that occasionally moves large amounts."
    }
  ],
  "Solana": [
    {
      "address": "9WzDXwBbmcg8ZXcBJhTE5pTxe7XhT4FlbCGT9m4P2sQj",
      "name": "FTX Drainer (SOL)",
      "type": "Wallet",
      "expectedRisk": "CRITICAL",
      "description": "Tied to the FTX unauthorized transfers."
    },
    {
      "address": "JUP6LkbZbjS1jKKwapdH67y95Y1GyCAXN3Rdz16eJ",
      "name": "Jupiter Aggregator",
      "type": "Contract",
      "expectedRisk": "LOW",
      "description": "Major DeFi program on Solana."
    },
    {
      "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "name": "SPL Token Program",
      "type": "Contract",
      "expectedRisk": "LOW",
      "description": "System program testing."
    },
    {
      "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "name": "USDC Coin",
      "type": "Contract",
      "expectedRisk": "LOW",
      "description": "Major stablecoin contract on Solana."
    }
  ],
  "TRON": [
    {
      "address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      "name": "Tether (USDT) Contract",
      "type": "Contract",
      "expectedRisk": "LOW",
      "description": "The most active contract on TRON."
    },
    {
      "address": "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9",
      "name": "Binance Hot Wallet",
      "type": "Wallet",
      "expectedRisk": "LOW",
      "description": "High volume exchange wallet."
    },
    {
      "address": "TAUN6FwrnwwmaEqYcckffC7wYmbaS6cBiX",
      "name": "Binance Cold",
      "type": "Wallet",
      "expectedRisk": "LOW",
      "description": "Large exchange storage."
    },
    {
      "address": "TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP",
      "name": "Justin Sun Wallet",
      "type": "Wallet",
      "expectedRisk": "LOW",
      "description": "High net worth, public figure."
    }
  ],
  "Other Chains": [
    {
      "address": "D8vFz4p5eaCEiPAW5QoT5R4R4xN3K4Xv7",
      "name": "Robinhood Cold (DOGE)",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Dogecoin"
    },
    {
      "address": "LcFs2BtzjC7Sxb6Qk2U3LzB5E7Y9E8zJ5",
      "name": "Binance Hot (LTC)",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Litecoin"
    },
    {
      "address": "addr1q82vw0m0kx6cxfz3hfwx38r4pxj9f60xwz9qx6y2u09c5a2y8u9l9f3l0p9j5j8g0z5k8l0n3n9x5v8l9m2q5z0j3f6sz4",
      "name": "Major Stake Pool (ADA)",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Cardano"
    },
    {
      "address": "rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh",
      "name": "Ripple Labs Escrow (XRP)",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Ripple"
    },
    {
      "address": "EQA_7p8H9G4c8a2n2s5L9z6r8v4x3X2b1n9M7N5m4B2_9A",
      "name": "Fragment Wallet (TON)",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "The Open Network"
    },
    {
      "address": "cosmos14lultfckehtszvzw4ehu0pzllsnz9e4f3a7",
      "name": "Binance Hot (ATOM)",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Cosmos"
    },
    {
      "address": "Y76M3GCZG5H7X2D2N9X9Z2K4V3F7Q5H7A2X3Y9W7D4M5G7H2Z3B6L9",
      "name": "Algo Foundation (ALGO)",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Algorand"
    },
    {
      "address": "X-avax1k0c7a523a54d6d0285a22h9p6j82q7f8d5j2d9",
      "name": "AVAX Whale",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Avalanche X-Chain"
    },
    {
      "address": "relay.aurora",
      "name": "Aurora Bridge (NEAR)",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Near Protocol"
    },
    {
      "address": "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A",
      "name": "Untraceable (XMR)",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Monero (Fictionalized syntax for test)"
    },
    {
      "address": "0x8a9c4f2b1d3e8a6f4c2b9a7d3f1e5a8b6c4d2f0a1b3e5d7f9a8c6b4d2f1e3a5",
      "name": "Sui Foundation",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Sui"
    },
    {
      "address": "0x1",
      "name": "Aptos Framework",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Aptos"
    },
    {
      "address": "15j4dg5GjdZ5j4dg5GjdZ5j4dg5GjdZ5j4dg5GjdZ5j4dg5",
      "name": "Polkadot Validator",
      "type": "Wallet",
      "expectedRisk": "UNSUPPORTED",
      "description": "Polkadot"
    }
  ]
};

const STORY_1 = `OP: MIDNIGHT SWEEP
Targeting DeFi privacy mixers. Evaluate threat level.
Targets:
0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe
0xC8a65Fadf0e0dDAf421F28FEAb69Bf6E2E589963`;

const STORY_2 = `OP: WHALE WATCHING
Assess legitimate vs malicious topology.
Targets:
0x28C6c06298d514Db089934071355E5743bf21d60
0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`;

const STORY_3 = `CROSS-CHAIN EVAL
Multi-chain attribution testing.
Targets:
0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13
bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`;

const STORY_4 = `EXPLOIT SIMULATION
Trace forensic paths.
Targets:
0x0248f752802b2cfb4373cc0c3bc3964429385c26
0x1111111254EEB25477B68fb85Ed929f73A960582`;

const STORY_5 = `EXCHANGE LAUNDERING
Tracking cash out paths.
Targets:
TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9
bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`;

const STORY_6 = `CONTRACT ANALYSIS
Reviewing high-volume DeFi programs.
Targets:
0xdAC17F958D2ee523a2206206994597C13D831ec7
TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`;

export default function DemoSamples() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Ethereum Wallets");
  const [searchQuery, setSearchQuery] = useState("");

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleAnalyze = (type, address) => {
    if (type.toLowerCase() === 'contract') {
      navigate(`/contract?address=${address}`);
    } else {
      navigate(`/wallet?address=${address}`);
    }
  };

  const filteredData = DATASETS[activeTab].filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-20 pt-8 px-4">
      
      {/* Header Redesign */}
      <div className="relative overflow-hidden rounded-3xl bg-[#090b14] border border-[#1e293b]/60 p-10 md:p-14 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-purple-900/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1e293b]/50 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
            <Activity className="w-4 h-4" /> Real-World Assets
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-gray-400 tracking-tight mb-6">
            Intelligence Dataset
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl leading-relaxed">
            A highly curated repository of active public blockchain entities. Designed to demonstrate AXON's multi-chain attribution, cross-referencing capabilities, and deterministic risk assessments against real threat actors.
          </p>
        </div>
      </div>

      {/* Bulk Scan Scenarios */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Layers className="w-6 h-6 text-purple-400" />
          Bulk Scan Scenarios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Triage Assessment", text: STORY_1, icon: <ShieldAlert className="w-5 h-5 text-red-400" /> },
            { title: "Mixed Role Detection", text: STORY_2, icon: <RefreshCw className="w-5 h-5 text-blue-400" /> },
            { title: "Cross-Chain Eval", text: STORY_3, icon: <Cpu className="w-5 h-5 text-purple-400" /> },
            { title: "Simulated Exploit", text: STORY_4, icon: <Zap className="w-5 h-5 text-yellow-400" /> },
            { title: "Exchange Laundering", text: STORY_5, icon: <Activity className="w-5 h-5 text-green-400" /> },
            { title: "Contract Analysis", text: STORY_6, icon: <Layers className="w-5 h-5 text-orange-400" /> }
          ].map((story, i) => (
            <div key={i} className="bg-[#0f1423] hover:bg-[#13192b] border border-[#1e293b] hover:border-blue-500/30 transition-all rounded-2xl p-6 relative group flex flex-col h-full shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  {story.icon}
                  {story.title}
                </h3>
              </div>
              <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap bg-black/40 p-4 rounded-xl border border-white/5 flex-grow mb-4 overflow-hidden">
                {story.text}
              </pre>
              <button
                onClick={() => handleCopy(story.text)}
                className="w-full py-2.5 bg-[#1e293b]/50 hover:bg-blue-600 border border-[#1e293b] hover:border-blue-500 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Copy Scenario Data
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="pt-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex space-x-2 p-1.5 bg-[#0f1423] border border-[#1e293b] rounded-2xl overflow-x-auto max-w-full">
            {Object.keys(DATASETS).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                    : 'text-gray-400 hover:text-white hover:bg-[#1e293b]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Filter addresses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-[#0f1423] border border-[#1e293b] focus:border-blue-500 rounded-2xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 transition-all"
            />
          </div>
        </div>

        {/* Masonry Grid of Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredData.map((s, i) => {
            const isCritical = s.expectedRisk === 'CRITICAL';
            const isHigh = s.expectedRisk === 'HIGH';
            const isMed = s.expectedRisk === 'MEDIUM';
            let borderCol = 'border-[#1e293b] group-hover:border-gray-500/50';
            let riskColor = 'text-green-400 bg-green-500/10 border-green-500/20';
            
            if (isCritical) {
              borderCol = 'border-red-900/30 group-hover:border-red-500/50 shadow-[inset_0_0_40px_rgba(220,38,38,0.03)]';
              riskColor = 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.2)]';
            } else if (isHigh) {
              borderCol = 'border-orange-900/30 group-hover:border-orange-500/50';
              riskColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            } else if (isMed) {
              borderCol = 'border-yellow-900/30 group-hover:border-yellow-500/50';
              riskColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            }

            return (
              <div key={i} className={`bg-[#090b14] border rounded-2xl p-6 transition-all duration-300 group hover:bg-[#0c101c] hover:-translate-y-1 ${borderCol}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="pr-4">
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-blue-300 transition-colors">{s.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-gray-300 text-[10px] font-bold rounded-lg font-mono uppercase tracking-widest">
                        {s.type}
                      </span>
                      {s.expectedRisk === "UNSUPPORTED" ? (
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg border font-mono text-gray-400 bg-gray-500/10 border-gray-500/20">
                          UNSUPPORTED
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border font-mono tracking-wider ${riskColor}`}>
                          RISK: {s.expectedRisk}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-xl p-3 mb-4 group-hover:border-white/10 transition-colors relative overflow-hidden">
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Address Target
                  </div>
                  <div className="font-mono text-xs text-blue-400 break-all leading-relaxed">
                    {s.address}
                  </div>
                  <button
                    onClick={() => handleCopy(s.address)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#1e293b] hover:bg-white text-gray-400 hover:text-black rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    title="Copy Address"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed mb-6 h-10 line-clamp-2">
                  {s.description}
                </p>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <button
                    onClick={() => handleAnalyze(s.type, s.address)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] flex justify-center items-center gap-2"
                  >
                    Launch Analysis <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredData.length === 0 && (
          <div className="text-center py-20 bg-[#090b14] rounded-3xl border border-[#1e293b]">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No entities found</h3>
            <p className="text-gray-600 mt-2">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
