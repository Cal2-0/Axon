import json

SAMPLES = [
  {"address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "name": "Vitalik Buterin", "type": "Wallet", "expectedRisk": "LOW", "description": "Ethereum founder's main wallet. Extremely high net worth, completely benign."},
  {"address": "0x28C6c06298d514Db089934071355E5743bf21d60", "name": "Binance 14 (Hot Wallet)", "type": "Wallet", "expectedRisk": "LOW", "description": "High volume, high velocity exchange wallet. Should correctly suppress false-positives and score LOW."},
  {"address": "0x098B716B8Aaf21512996dC57EB0615e2383E2f96", "name": "Ronin Bridge Exploiter", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Confirmed Threat Actor (North Korea Lazarus Group). Should score 90+ and flag as CRITICAL."},
  {"address": "0x75A77dbDEab6E384D0E5cae2B70072D56EE140e6", "name": "Lazarus Group Sub-wallet", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Lazarus group wallet used to wash funds."},
  {"address": "0x59ABf3837Fa962d6853b4Cc0a19513AA031fd32b", "name": "FTX Accounts Drainer", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "The address responsible for draining FTX funds during the collapse."},
  {"address": "0xC8a65Fadf0e0dDAf421F28FEAb69Bf6E2E589963", "name": "Poly Network Exploiter", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Hacker responsible for the massive Poly Network exploit."},
  {"address": "0x629eEED06a0cdEc0eB79B5e94b28c03e8a4a5B0E", "name": "Wormhole Exploiter", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Wallet tied to the $320M Wormhole bridge exploit."},
  {"address": "0x0d043128146654C781C414878aDF35205934fb5D", "name": "Harmony Bridge Exploiter", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Wallet tied to the Horizon bridge hack."},
  {"address": "0xE74b28ce2534fd8223c10bAecF65A7137f81f18B", "name": "Wintermute Exploiter", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Wallet that exploited Wintermute for $160M."},
  {"address": "0x56D8B635A7C88Fd1104D23d632AF40c1C3Aac4e3", "name": "Nomad Bridge Exploiter", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Wallet tied to the Nomad bridge free-for-all exploit."},
  {"address": "0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296", "name": "Justin Sun", "type": "Wallet", "expectedRisk": "LOW", "description": "Tron founder's public wallet. High volume interactions."},
  {"address": "0x71660c4005BA85c37ccec55d0C4493E66Fe775d3", "name": "Coinbase 1", "type": "Wallet", "expectedRisk": "LOW", "description": "Coinbase hot wallet."},
  {"address": "0x267be1C1D684F78cb4F6a176C4911b741E4Ffdc0", "name": "Kraken 1", "type": "Wallet", "expectedRisk": "LOW", "description": "Kraken exchange wallet."},
  {"address": "0xD6216fC19DB775Df9774a6E33526131dA7D19a2c", "name": "KuCoin 1", "type": "Wallet", "expectedRisk": "LOW", "description": "KuCoin exchange wallet."},
  {"address": "0xA910f92Acd04CaE5E2D2883317769999BcEeE96a", "name": "Poloniex Hacker", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Wallet associated with Poloniex hack."},
  {"address": "0x1C6A9783F41bdEeb5f7E1EB2C1dbD9Aa942b0Be6", "name": "Bitfinex Hacker", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Wallet associated with 2016 Bitfinex hack."},
  {"address": "0x000000000000084e91743124a982076C59f10084", "name": "MEV Bot", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "High frequency MEV bot. Not strictly illegal but suspicious behavior."},
  {"address": "0x11111112542D85B3EF69AE05771c2dCCff4fAa26", "name": "1inch Sandwich Bot", "type": "Wallet", "expectedRisk": "MEDIUM", "description": "Automated bot performing sandwich attacks."},
  {"address": "0x1da5821544e25c636c1417Ba96Ade4Cf6D2f9B5A", "name": "OFAC Sanctioned entity", "type": "Wallet", "expectedRisk": "CRITICAL", "description": "Explicitly blacklisted by OFAC."},
  {"address": "0xF977814e90dA44bFA03b6295A0616a897441aceC", "name": "Binance 8", "type": "Wallet", "expectedRisk": "LOW", "description": "Binance hot wallet 8."},
  {"address": "0x47CE0C6eD5B0Ce3d3A51f161bE5E26E51DdDbcE8", "name": "Tornado Cash 100 ETH", "type": "Contract", "expectedRisk": "CRITICAL", "description": "OFAC Sanctioned Privacy Mixer. Should instantly flag as CRITICAL."},
  {"address": "0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF", "name": "Tornado Cash 10 ETH", "type": "Contract", "expectedRisk": "CRITICAL", "description": "OFAC Sanctioned Privacy Mixer."},
  {"address": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "name": "Uniswap V2 Router", "type": "Contract", "expectedRisk": "LOW", "description": "Blue-chip DeFi protocol."},
  {"address": "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", "name": "Uniswap V3 Router", "type": "Contract", "expectedRisk": "LOW", "description": "Blue-chip DeFi protocol."},
  {"address": "0x1111111254fb6c44bac0bed2854e76f90643097d", "name": "1inch V5 Router", "type": "Contract", "expectedRisk": "LOW", "description": "DEX Aggregator router. Extremely high transaction volume but completely benign."},
  {"address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "name": "Wrapped Ether (WETH)", "type": "Contract", "expectedRisk": "LOW", "description": "Core DeFi building block. Skip AI parsing to save tokens and ensure 0 false-positives."},
  {"address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "name": "USDC Token", "type": "Contract", "expectedRisk": "LOW", "description": "Circle's fiat-backed stablecoin contract."},
  {"address": "0xdAC17F958D2ee523a2206206994597C13D831ec7", "name": "Tether (USDT)", "type": "Contract", "expectedRisk": "LOW", "description": "Tether fiat-backed stablecoin contract."},
  {"address": "0x6B175474E89094C44Da98b954EedeAC495271d0F", "name": "Dai Stablecoin", "type": "Contract", "expectedRisk": "LOW", "description": "MakerDAO stablecoin."},
  {"address": "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", "name": "Curve 3pool", "type": "Contract", "expectedRisk": "LOW", "description": "Curve Finance main pool."},
  {"address": "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F", "name": "SushiSwap Router", "type": "Contract", "expectedRisk": "LOW", "description": "SushiSwap core router."},
  {"address": "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", "name": "Aave V2 Lending Pool", "type": "Contract", "expectedRisk": "LOW", "description": "Aave decentralized lending protocol."},
  {"address": "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", "name": "Aave V3 Pool", "type": "Contract", "expectedRisk": "LOW", "description": "Aave decentralized lending protocol."},
  {"address": "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5", "name": "Compound cETH", "type": "Contract", "expectedRisk": "LOW", "description": "Compound lending protocol."},
  {"address": "0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B", "name": "MakerDAO MCD", "type": "Contract", "expectedRisk": "LOW", "description": "Maker protocol core."},
  {"address": "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", "name": "Lido stETH", "type": "Contract", "expectedRisk": "LOW", "description": "Lido liquid staking token."},
  {"address": "0xb2ecfE4E4D61f8790bac78d91b4B851dffE3baC1", "name": "Blur Exchange", "type": "Contract", "expectedRisk": "LOW", "description": "Blur NFT marketplace."},
  {"address": "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC", "name": "OpenSea Seaport", "type": "Contract", "expectedRisk": "LOW", "description": "OpenSea NFT marketplace."},
  {"address": "0x27182842E098f60e3D576794A5bFFb0777E025d3", "name": "Euler Finance", "type": "Contract", "expectedRisk": "HIGH", "description": "Exploited contract."},
  {"address": "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc", "name": "Tornado Cash Router", "type": "Contract", "expectedRisk": "CRITICAL", "description": "Privacy Mixer Router."}
]

import random
random.seed(42)
random.shuffle(SAMPLES)

code = f"""import React from 'react';
import {{ useNavigate }} from 'react-router-dom';

const SAMPLES = {json.dumps(SAMPLES, indent=2)};

const STORY_1 = `OPERATION: MIDNIGHT SWEEP
=========================

Analysts have intercepted suspicious cross-chain movements targeting DeFi liquidity pools. We suspect North Korean state-sponsored threat actors are utilizing privacy mixers to launder exploited funds from the Ronin Bridge. 

Please run these 4 targets through the Bulk Scanner immediately to assess the threat level and classify the entities before the funds are dispersed.

Targets:
0x098B716B8Aaf21512996dC57EB0615e2383E2f96
0x75A77dbDEab6E384D0E5cae2B70072D56EE140e6
0x47CE0C6eD5B0Ce3d3A51f161bE5E26E51DdDbcE8
0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc`;

const STORY_2 = `WHALE WATCHING: ROUTINE CHECK
=============================

During routine intelligence gathering, we identified massive addresses shifting liquidity across exchange infrastructure and decentralized aggregators. 

We need to verify if these are simply legitimate whale/exchange movements or if there is malicious intent hidden in the transaction topology. Process these through the Bulk Scanner to generate a forensic consensus.

Targets:
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296
0x28C6c06298d514Db089934071355E5743bf21d60
0x71660c4005BA85c37ccec55d0C4493E66Fe775d3`;

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

export default function DemoSamples() {{
  const navigate = useNavigate();

  const handleCopy = (text) => {{
    navigator.clipboard.writeText(text);
  }};

  const handleAnalyze = (type, address) => {{
    if (type.toLowerCase() === 'wallet') {{
      navigate(`/wallet?address=${{address}}`);
    }} else {{
      navigate(`/contract?address=${{address}}`);
    }}
  }};

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {{/* Header */}}
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

      {{/* Story Texts */}}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {{[
          {{ title: "Scenario 1: Critical Threats", text: STORY_1 }},
          {{ title: "Scenario 2: Benign Whales", text: STORY_2 }},
          {{ title: "Scenario 3: Exploit Investigation", text: STORY_3 }},
          {{ title: "Scenario 4: Compliance Baseline", text: STORY_4 }}
        ].map((story, i) => (
          <div key={{i}} className="bg-gradient-to-br from-[#0a0f1a] to-[#05080f] border border-[#1e293b] rounded-xl p-6 relative group overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-purple-500"></span>
                {{story.title}}
              </h3>
              <button
                onClick={{() => handleCopy(story.text)}}
                className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              >
                Copy Full Text
              </button>
            </div>
            <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap bg-[#05080f]/50 p-4 rounded-lg border border-[#1e293b]/50">
              {{story.text}}
            </pre>
          </div>
        ))}}
      </div>

      <div className="border-b border-[#1e293b] pt-8 pb-4">
        <h2 className="text-2xl font-bold text-white">Curated Entities Bank ({{SAMPLES.length}})</h2>
      </div>

      {{/* Grid */}}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {{SAMPLES.map((s, i) => {{
          const isCritical = s.expectedRisk === 'CRITICAL';
          const isHigh = s.expectedRisk === 'HIGH';
          const isMed = s.expectedRisk === 'MEDIUM';
          let borderCol = 'border-[#1e293b] hover:border-gray-500';
          let riskColor = 'text-green-400 bg-green-500/15 border-green-500/30';
          if (isCritical) {{
            borderCol = 'border-[#1e293b] hover:border-red-500/50';
            riskColor = 'text-red-500 bg-red-500/15 border-red-500/30';
          }} else if (isHigh) {{
            borderCol = 'border-[#1e293b] hover:border-orange-500/50';
            riskColor = 'text-orange-500 bg-orange-500/15 border-orange-500/30';
          }} else if (isMed) {{
            borderCol = 'border-[#1e293b] hover:border-yellow-500/50';
            riskColor = 'text-yellow-500 bg-yellow-500/15 border-yellow-500/30';
          }}

          return (
            <div key={{i}} className={{`bg-[#0a0f1a] border rounded-xl p-5 transition-colors group ${{borderCol}}`}}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{{s.name}}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">{{s.type}}</span>
                    <span className={{`px-2 py-0.5 text-[9px] font-bold rounded border font-mono ${{riskColor}}`}}>
                      EXPECTED: {{s.expectedRisk}}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={{() => handleAnalyze(s.type, s.address)}}
                    className="px-3 py-1.5 bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 rounded text-xs font-bold transition-all opacity-0 group-hover:opacity-100 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                  >
                    Analyze Now
                  </button>
                  <button
                    onClick={{() => handleCopy(s.address)}}
                    className="px-3 py-1.5 bg-[#05080f] border border-[#1e293b] text-gray-400 hover:text-white hover:border-[#22d3ee] rounded text-xs font-mono transition-all opacity-0 group-hover:opacity-100"
                  >
                    Copy Address
                  </button>
                </div>
              </div>

              <div className="bg-[#05080f] border border-[#1e293b] rounded-lg p-3 mb-3">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Address</div>
                <div className="font-mono text-sm text-[#22d3ee] break-all">{{s.address}}</div>
              </div>

              <p className="text-sm text-gray-400 leading-relaxed">
                {{s.description}}
              </p>
            </div>
          );
        }})}}
      </div>
    </div>
  );
}}
"""

with open("frontend/src/pages/DemoSamples.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("done")
