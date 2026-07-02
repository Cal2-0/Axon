import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import GraphView from '../components/GraphView';
import SmartAddressInput, { isValidAddress } from '../components/SmartAddressInput';
import { downloadWalletPDF } from '../utils/pdfExport';
import { formatINR, formatIndian } from '../utils/indianFormat';
import TemporalHeatmap from '../components/TemporalHeatmap';

// ─── DEMO PROFILES ─────────────────────────────────────────────────────────
const DEMO_PROFILES = {
  '0x098B716B8Aaf21512996dC57EB0615e2383E2f96': {
    shortName: 'Ronin Bridge Exploiter',
    tag: 'CRITICAL',
    identity: {
      address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
      ens: null, label: 'Ronin Bridge Exploiter', tag: 'HACKER',
      firstSeen: '2022-03-23', lastSeen: '2024-11-14', ethBalance: '0.0412',
      totalReceived: '173,600 ETH', totalSent: '173,598 ETH', txCount: 4821,
      uniqueCounterparties: 312, walletAgeDays: 991, totalVolumeUSD: '$622,000,000',
    },
    risk: {
      score: 97, label: 'CRITICAL', mlClassification: 'Anomaly', anomalyScore: 94,
      factors: [
        { penalty: 40, icon: '🔴', reason: 'Direct interaction with Tornado Cash mixer contracts' },
        { penalty: 25, icon: '🔴', reason: 'Address flagged by OFAC sanctions list (SDN)' },
        { penalty: 20, icon: '🟠', reason: 'Source of $622M Ronin Bridge exploit (2022-03-23)' },
        { penalty: 8,  icon: '🟡', reason: 'Abnormal transaction velocity — 847 txns in 72hrs' },
        { penalty: 4,  icon: '🟡', reason: 'Interaction with multiple known money mule wallets' },
      ],
    },
    graph: {
      nodes: [
        { id: '0x098B71', label: '0x098B...', type: 'hacker', risk: 97 },
        { id: '0xTornado1', label: 'Tornado Cash', type: 'mixer', risk: 95 },
        { id: '0xTornado2', label: 'Tornado Cash 2', type: 'mixer', risk: 95 },
        { id: '0xBinance1', label: 'Binance Hot', type: 'exchange', risk: 5 },
        { id: '0xMule1', label: 'Mule #1', type: 'suspect', risk: 78 },
        { id: '0xMule2', label: 'Mule #2', type: 'suspect', risk: 82 },
        { id: '0xMule3', label: 'Mule #3', type: 'suspect', risk: 71 },
        { id: '0xRonin', label: 'Ronin Bridge', type: 'victim', risk: 30 },
        { id: '0xHuobi1', label: 'Huobi Deposit', type: 'exchange', risk: 10 },
      ],
      edges: [
        { source: '0xRonin', target: '0x098B71' }, { source: '0x098B71', target: '0xTornado1' },
        { source: '0x098B71', target: '0xTornado2' }, { source: '0x098B71', target: '0xMule1' },
        { source: '0x098B71', target: '0xMule2' }, { source: '0xMule1', target: '0xBinance1' },
        { source: '0xMule2', target: '0xHuobi1' }, { source: '0xMule3', target: '0xTornado1' },
        { source: '0x098B71', target: '0xMule3' },
      ],
    },
    osint: {
      summary: 'High-confidence attribution. Subject linked to Lazarus Group (DPRK state-sponsored APT) via GitHub account patterns and Reddit alias discovery.',
      githubMentions: [
        { source: 'github.com', username: 'anon_eth_researcher', content: 'Traced $622M Ronin hack to 0x098B... via chain analysis', date: '2022-03-24', confidence: 91 },
        { source: 'github.com', username: 'defi_watchdog', content: 'OFAC sanctioned address — Lazarus Group confirmed', date: '2022-04-15', confidence: 88 },
      ],
      redditMentions: [
        { subreddit: 'r/ethfinance', post: 'Ronin hacker address identified — 0x098B716B...', upvotes: 4821, date: '2022-03-24' },
        { subreddit: 'r/CryptoCurrency', post: 'How investigators traced the Ronin Bridge exploiter', upvotes: 12300, date: '2022-04-02' },
      ],
      aliases: ['lazarus_eth', 'ronin_exploiter', 'dprk_operator_7'],
      walletMentions: [
        { platform: 'Etherscan', label: 'Ronin Bridge Exploiter', verified: true },
        { platform: 'OFAC SDN List', label: 'Sanctioned Entity — Lazarus Group', verified: true },
        { platform: 'Chainalysis KYT', label: 'High Risk — State Sponsored Hacker', verified: true },
        { platform: 'TRM Labs', label: 'DPRK-linked wallet', verified: true },
      ],
    },
    exchange: {
      detected: true,
      findings: [
        { exchange: 'Binance', address: '0x28C6...', confidence: 87, type: 'Deposit', volumeETH: '8,200', date: '2022-04-01', status: 'FLAGGED' },
        { exchange: 'Huobi', address: '0x1D2E...', confidence: 74, type: 'Deposit', volumeETH: '6,100', date: '2022-04-05', status: 'FLAGGED' },
        { exchange: 'OKX', address: '0x9F3A...', confidence: 61, type: 'Deposit Attempt', volumeETH: '3,400', date: '2022-04-12', status: 'BLOCKED' },
      ],
      cashOutEvents: 2, totalCashOutUSD: '$52,400,000',
      summary: 'Subject attempted to cash out through 3 exchanges. 2 successful deposits (Binance, Huobi). OKX deposit blocked after KYT alert triggered.',
    },
    mixer: {
      detected: true,
      findings: [
        { mixer: 'Tornado Cash (0.1 ETH)', txCount: 1840, totalETH: '184.0', firstUse: '2022-03-25', lastUse: '2022-07-14', risk: 'CRITICAL' },
        { mixer: 'Tornado Cash (1 ETH)',   txCount: 620,  totalETH: '620.0', firstUse: '2022-03-26', lastUse: '2022-08-03', risk: 'CRITICAL' },
        { mixer: 'Tornado Cash (10 ETH)',  txCount: 284,  totalETH: '2840.0',firstUse: '2022-03-28', lastUse: '2022-09-11', risk: 'CRITICAL' },
        { mixer: 'Tornado Cash (100 ETH)', txCount: 96,   totalETH: '9600.0',firstUse: '2022-04-01', lastUse: '2022-10-22', risk: 'CRITICAL' },
      ],
      bridgeActivity: [
        { bridge: 'Avalanche Bridge', volumeUSD: '$12,300,000', date: '2022-04-08' },
        { bridge: 'Wormhole', volumeUSD: '$8,700,000', date: '2022-04-21' },
      ],
      launderingIndicators: [
        'Structuring: consistent 0.1 ETH denominations to evade detection thresholds',
        'Layering: 4-hop chain observed before exchange deposit',
        'Integration: funds integrated via NFT purchases and DeFi liquidity positions',
        'OFAC-sanctioned mixer contracts (Tornado Cash) used 2,840 times',
      ],
      totalMixedETH: '13,244 ETH (~$44.6M)',
    },
  },

  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045': {
    shortName: 'vitalik.eth',
    tag: 'SAFE',
    identity: {
      address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      ens: 'vitalik.eth', label: 'Vitalik Buterin (Ethereum Co-founder)', tag: 'PUBLIC FIGURE',
      firstSeen: '2015-07-30', lastSeen: '2025-06-01', ethBalance: '240.12',
      totalReceived: '1,245,000 ETH', totalSent: '1,244,760 ETH', txCount: 8742,
      uniqueCounterparties: 5231, walletAgeDays: 3624, totalVolumeUSD: '$4,200,000,000',
    },
    risk: {
      score: 8, label: 'SAFE', mlClassification: 'Normal', anomalyScore: 3,
      factors: [
        { penalty: 4, icon: '🟡', reason: 'High-value transactions above $1M threshold detected' },
        { penalty: 2, icon: '🟢', reason: 'Minor interactions with privacy-preserving protocols (RailGun donation)' },
        { penalty: 2, icon: '🟢', reason: 'Wallet age exceeds 8 years — long-term holder pattern' },
      ],
    },
    graph: {
      nodes: [
        { id: '0xVitalik', label: 'vitalik.eth', type: 'default', risk: 8 },
        { id: '0xGitcoin', label: 'Gitcoin Grants', type: 'default', risk: 2 },
        { id: '0xUniV3', label: 'Uniswap V3', type: 'default', risk: 3 },
        { id: '0xENS', label: 'ENS Registrar', type: 'default', risk: 1 },
        { id: '0xLido', label: 'Lido Staking', type: 'default', risk: 5 },
        { id: '0xCharities', label: 'Charity Donations', type: 'default', risk: 1 },
        { id: '0xRailgun', label: 'RailGun', type: 'mixer', risk: 40 },
      ],
      edges: [
        { source: '0xVitalik', target: '0xGitcoin' }, { source: '0xVitalik', target: '0xUniV3' },
        { source: '0xVitalik', target: '0xENS' }, { source: '0xVitalik', target: '0xLido' },
        { source: '0xVitalik', target: '0xCharities' }, { source: '0xVitalik', target: '0xRailgun' },
      ],
    },
    osint: {
      summary: 'Publicly known identity. Vitalik Buterin — Ethereum co-founder. Active on social media, GitHub, and governance forums. No suspicious activity detected.',
      githubMentions: [
        { source: 'github.com', username: 'vbuterin', content: 'Ethereum Research — EIP proposals & protocol design', date: '2025-05-30', confidence: 99 },
      ],
      redditMentions: [
        { subreddit: 'r/ethereum', post: 'Vitalik donates $100M in SHIB to India COVID relief', upvotes: 38200, date: '2021-05-13' },
        { subreddit: 'r/ethfinance', post: 'vitalik.eth spotted staking 1000 ETH on Lido', upvotes: 5100, date: '2024-12-14' },
      ],
      aliases: ['vbuterin', 'VitalikButerin'],
      walletMentions: [
        { platform: 'Etherscan', label: 'Vitalik Buterin', verified: true },
        { platform: 'ENS', label: 'vitalik.eth', verified: true },
        { platform: 'Chainalysis KYT', label: 'Low Risk — Public Figure', verified: true },
      ],
    },
    exchange: {
      detected: true,
      findings: [
        { exchange: 'Coinbase', address: '0xa9D1...', confidence: 42, type: 'Withdrawal', volumeETH: '500', date: '2018-01-15', status: 'CLEAR' },
      ],
      cashOutEvents: 0, totalCashOutUSD: '$0',
      summary: 'Minor exchange interaction detected (Coinbase withdrawal, 2018). No suspicious cash-out events.',
    },
    mixer: {
      detected: true,
      findings: [
        { mixer: 'RailGun (Privacy Donation)', txCount: 3, totalETH: '100.0', firstUse: '2023-01-15', lastUse: '2023-06-20', risk: 'LOW' },
      ],
      bridgeActivity: [],
      launderingIndicators: ['No structuring patterns detected', 'Public figure — mixer use likely for legitimate privacy purposes'],
      totalMixedETH: '100 ETH (~$180K)',
    },
  },

  '0x3cbded43efdaf0fc77b9c55f6fc9988fcc9b37d9': {
    shortName: 'FTX Drainer',
    tag: 'CRITICAL',
    identity: {
      address: '0x3cbded43efdaf0fc77b9c55f6fc9988fcc9b37d9',
      ens: null, label: 'FTX Exchange Drainer (Nov 2022)', tag: 'HACKER',
      firstSeen: '2022-11-12', lastSeen: '2023-09-30', ethBalance: '2,105.8',
      totalReceived: '81,300 ETH', totalSent: '79,194 ETH', txCount: 1247,
      uniqueCounterparties: 89, walletAgeDays: 322, totalVolumeUSD: '$477,000,000',
    },
    risk: {
      score: 93, label: 'CRITICAL', mlClassification: 'Anomaly', anomalyScore: 91,
      factors: [
        { penalty: 35, icon: '🔴', reason: 'Wallet drained FTX hot wallets during Chapter 11 bankruptcy filing' },
        { penalty: 25, icon: '🔴', reason: 'Bulk ETH transfers (>10,000 ETH) within 24-hour window' },
        { penalty: 18, icon: '🟠', reason: 'Cross-chain bridging to BTC via RenBridge within 48 hours' },
        { penalty: 10, icon: '🟠', reason: 'On-chain swaps to obscure ERC-20 tokens post-drain' },
        { penalty: 5,  icon: '🟡', reason: 'Interaction with freshly deployed contract (potential tumbler)' },
      ],
    },
    graph: {
      nodes: [
        { id: '0xFTXDr', label: 'FTX Drainer', type: 'hacker', risk: 93 },
        { id: '0xFTXHot', label: 'FTX Hot Wallet', type: 'victim', risk: 20 },
        { id: '0xFTXHot2', label: 'FTX Hot Wallet 2', type: 'victim', risk: 20 },
        { id: '0xRenBr', label: 'RenBridge', type: 'mixer', risk: 65 },
        { id: '0xSwap1', label: 'DEX Swap #1', type: 'default', risk: 15 },
        { id: '0xTumbler', label: 'Not Determined', type: 'suspect', risk: 80 },
        { id: '0xInter1', label: 'Intermediary #1', type: 'suspect', risk: 72 },
      ],
      edges: [
        { source: '0xFTXHot', target: '0xFTXDr' }, { source: '0xFTXHot2', target: '0xFTXDr' },
        { source: '0xFTXDr', target: '0xRenBr' }, { source: '0xFTXDr', target: '0xSwap1' },
        { source: '0xFTXDr', target: '0xTumbler' }, { source: '0xTumbler', target: '0xInter1' },
      ],
    },
    osint: {
      summary: 'Unknown actor drained FTX exchange wallets during the November 2022 collapse. Estimated $477M extracted. Attribution efforts ongoing — linked to either insider or opportunistic attacker.',
      githubMentions: [
        { source: 'github.com', username: 'chainalysis_research', content: 'FTX drainer traced — cross-chain analysis of 0x3cbd...', date: '2022-11-14', confidence: 82 },
      ],
      redditMentions: [
        { subreddit: 'r/CryptoCurrency', post: 'FTX hacked for $477M during bankruptcy — funds being moved', upvotes: 28400, date: '2022-11-12' },
        { subreddit: 'r/FTX_Official', post: 'Tracking the FTX drainer wallet in real-time', upvotes: 9300, date: '2022-11-13' },
      ],
      aliases: ['ftx_drainer', 'ftx_exploiter_2022'],
      walletMentions: [
        { platform: 'Etherscan', label: 'FTX Accounts Drainer', verified: true },
        { platform: 'Chainalysis KYT', label: 'Critical Risk — Exchange Exploit', verified: true },
        { platform: 'Arkham Intel', label: 'FTX Drainer — Suspected Insider', verified: false },
      ],
    },
    exchange: {
      detected: false,
      findings: [],
      cashOutEvents: 0, totalCashOutUSD: '$0',
      summary: 'No direct exchange deposits detected. Funds appear to be laundered via cross-chain bridges and DEX swaps.',
    },
    mixer: {
      detected: true,
      findings: [
        { mixer: 'RenBridge (cross-chain)', txCount: 14, totalETH: '15,200.0', firstUse: '2022-11-13', lastUse: '2022-12-01', risk: 'CRITICAL' },
        { mixer: 'Uniswap (DEX swap)', txCount: 43, totalETH: '8,400.0', firstUse: '2022-11-14', lastUse: '2023-03-22', risk: 'HIGH' },
      ],
      bridgeActivity: [
        { bridge: 'RenBridge → BTC', volumeUSD: '$120,000,000', date: '2022-11-13' },
        { bridge: 'Multichain Bridge', volumeUSD: '$45,000,000', date: '2022-11-28' },
      ],
      launderingIndicators: [
        'Peel chain: systematic small transfers to fresh wallets over weeks',
        'Cross-chain bridge used within 24hrs of exploit',
        'DEX swaps to illiquid ERC-20 tokens (potential wash trading)',
        'Timing: exploit occurred during peak of FTX bankruptcy confusion',
      ],
      totalMixedETH: '23,600 ETH (~$42M)',
    },
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} title="Copy to clipboard" className="shrink-0 p-1 rounded hover:bg-axon-card transition-colors">
      {copied ? (
        <svg className="w-4 h-4 text-axon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-4 h-4 text-axon-text-dim hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  );
}

function SectionHeader({ color = 'cyan', icon, title, badge }) {
  const bar = { cyan: 'bg-axon-cyan', purple: 'bg-axon-purple', orange: 'bg-axon-orange', green: 'bg-axon-green', red: 'bg-red-500' };
  const bdg = { cyan: 'bg-axon-cyan/10 border-axon-cyan/30 text-axon-cyan', purple: 'bg-axon-purple/10 border-axon-purple/30 text-axon-purple', orange: 'bg-axon-orange/10 border-axon-orange/30 text-axon-orange', green: 'bg-axon-green/10 border-axon-green/30 text-axon-green', red: 'bg-red-500/10 border-red-500/30 text-red-400' };
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-3">
        <span className={`w-1.5 h-6 rounded-full ${bar[color]}`}></span>
        <span className="text-lg">{icon}</span>
        {title}
      </h2>
      {badge && <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded border ${bdg[color]}`}>{badge}</span>}
    </div>
  );
}

function CollapsibleSection({ color, icon, title, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-panel overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-6 pb-0 text-left group">
        <div className="flex items-center justify-between mb-5">
          <SectionHeader color={color} icon={icon} title={title} badge={badge} />
          <svg className={`w-5 h-5 text-axon-text-dim transition-transform duration-300 shrink-0 ml-3 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

function RiskMeter({ score, label }) {
  const color = score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : score >= 40 ? '#eab308' : '#22c55e';
  const textColor = score >= 80 ? 'text-red-400' : score >= 60 ? 'text-orange-400' : score >= 40 ? 'text-yellow-400' : 'text-green-400';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle cx="70" cy="70" r="54" fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <text x="70" y="64" textAnchor="middle" fontSize="30" fontWeight="bold" fill="white" fontFamily="monospace">{score}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">/100</text>
      </svg>
      <span className={`text-lg font-extrabold font-mono tracking-widest ${textColor}`}>{label}</span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
export default function WalletInvestigation({ caseId }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [cryptoPrices, setCryptoPrices] = useState({
    ethereum: { usd: 3500, inr: 290500 },
    bitcoin: { usd: 65000, inr: 5400000 },
    solana: { usd: 140, inr: 11600 },
    tron: { usd: 0.12, inr: 10 }
  });

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,tron,binancecoin,matic-network,avalanche-2&vs_currencies=usd,inr')
      .then(res => res.json())
      .then(data => {
        setCryptoPrices(prev => ({ ...prev, ...data }));
      })
      .catch(err => console.error('Failed to fetch live crypto prices:', err));
  }, []);

  const [result, setResult] = useState(null);
  const [crossChain, setCrossChain] = useState(null);
  const [chainData, setChainData] = useState(null);
  const [isDeepDiveActive, setIsDeepDiveActive] = useState(false);
  const [deepDiveStatus, setDeepDiveStatus] = useState('');
  const [deepDiveError, setDeepDiveError] = useState('');
  const [deepDiveResult, setDeepDiveResult] = useState(null);
  const [reportHash, setReportHash] = useState(null);
  const [isAiAnalyzingChain, setIsAiAnalyzingChain] = useState(false);
  const [aiOneCardResult, setAiOneCardResult] = useState(null);
  const location = useLocation();


  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const initialAddress = searchParams.get('address');
    const deepdive = searchParams.get('deepdive') === 'true';
    if (initialAddress) {
      setAddress(initialAddress);
      // eslint-disable-next-line no-use-before-define
      runAnalysis(initialAddress, deepdive);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const runAnalysis = async (targetAddress, autoDeepDive = false) => {
    if (!targetAddress || !targetAddress.trim()) return;
    setLoading(true);
    setResult(null);
    setDeepDiveResult(null);
    setCrossChain(null);
    setChainData(null);
    
    try {
      const { scanWallet, getCrossChainHoldings, resolveChain } = await import('../api/axon');
      
      const chainInfo = await resolveChain(targetAddress.trim());
      setChainData(chainInfo);

      let profile;
      try {
        profile = await scanWallet(targetAddress.trim(), caseId);
      } catch (err) {
        // Fallback to error profile
        profile = {
          identity: { address: targetAddress.trim(), tag: 'EXTERNAL', label: `${chainInfo?.candidates?.[0]?.chain || chainInfo?.chain || 'Data Not Available'} Wallet`, ethBalance: 'N/A', totalVolumeUSD: 'N/A' },
          risk: { score: 0, label: 'ERROR', mlClassification: 'Data Not Available', anomalyScore: 0, factors: [] },
          osint: { summary: `Failed to scan address. Error: ${err.message}`, aliases: [], walletMentions: 0 },
          exchange: { detected: false, findings: [], cashOutEvents: 0, totalCashOutUSD: '$0', summary: 'N/A' },
          mixer: { detected: false, findings: [], bridgeActivity: [], launderingIndicators: [], totalMixedETH: '0' },
          graph: { nodes: [], edges: [] }
        };
      }
      setResult(profile);

      if (autoDeepDive && chainInfo.type === 'EVM') {
        setIsDeepDiveActive(true);
        setDeepDiveStatus('Running full deep scan (1000 txs + Dual-Adversarial Synthesis pipeline)...');
        scanWallet(targetAddress.trim(), caseId, 'deep').then(deepResult => {
            setDeepDiveResult(deepResult);
            setIsDeepDiveActive(false);
            setDeepDiveStatus('');
        }).catch(err => {
            setDeepDiveError(err.message || 'Deep Dive Scan failed. Check API logs.');
            setIsDeepDiveActive(false);
        });
      }

      // Async fetch cross-chain (single call, was duplicated before)
      getCrossChainHoldings(targetAddress.trim())
        .then(cc => setCrossChain(cc))
        .catch(err => console.error("Cross-chain fetch failed:", err));

      // Use server-side hash if available, otherwise compute client-side
      if (profile.report_metadata && profile.report_metadata.sha256_hash) {
        setReportHash(profile.report_metadata.sha256_hash);
      } else {
        try {
          const msgUint8 = new TextEncoder().encode(JSON.stringify(profile));
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const docHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          setReportHash(docHash);
        } catch(e) { console.error("Hash err:", e); }
      }

    } catch (err) {
      console.error(err);
      alert("Failed to fetch wallet analysis from backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (e) => {
    if (e) e.preventDefault();
    if (!isValidAddress(address.trim())) return; // Prevent investigating unknown
    setAiOneCardResult(null);
    runAnalysis(address);
  };

  
  const handleDeepDive = async () => {
    if (!result || !result.identity || !result.identity.address) return;
    setIsDeepDiveActive(true);
    setDeepDiveStatus('Running full deep scan (1000 txs + Dual-Adversarial Synthesis pipeline)...');
    setDeepDiveError('');

    try {
      const { scanWallet } = await import('../api/axon');
      // Full re-scan at depth='deep' — fetches 5000 txs, runs 3-AI pipeline, produces updated score
      const deepResult = await scanWallet(result.identity.address, caseId, 'deep');
      setDeepDiveResult(deepResult);
      setDeepDiveStatus('');
    } catch (err) {
      console.error(err);
      setDeepDiveError(err.message || 'Deep Dive Scan failed. Check API logs.');
      setDeepDiveStatus('');
    } finally {
      setIsDeepDiveActive(false);
    }
  };

  const handleAiChainAnalyze = async (targetAddress = address) => {
    if (!targetAddress || !targetAddress.trim()) return;
    setIsAiAnalyzingChain(true);
    setAiOneCardResult(null);
    try {
      const { resolveChainAI } = await import('../api/axon');
      const aiInfo = await resolveChainAI(targetAddress.trim());
      setAiOneCardResult(aiInfo);
      setChainData(aiInfo); // Also update the main display if it's there
    } catch (err) {
      console.error(err);
      alert('AI Chain Analysis failed.');
    } finally {
      setIsAiAnalyzingChain(false);
    }
  };


  const handleExport = () => {
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axon-wallet-report-${result.identity.address.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCoC = async () => {
    if (!result) return;
    try {
      await downloadWalletPDF(result);
    } catch (err) {
      console.error(err);
      alert("Error generating Final Analysis PDF: " + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">

      {/* Page Header */}
      <div className="border-b border-axon-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-axon-cyan bg-axon-cyan/10 border border-axon-cyan/30 rounded-full">
            WALLET INVESTIGATION
          </span>
          <span className="w-2 h-2 rounded-full bg-axon-accent animate-pulse-slow"></span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Wallet Investigation</h1>
        <p className="text-axon-text-muted mt-1 text-base max-w-2xl">
          Enter a wallet address once. AXON runs all intelligence modules — risk scoring, transaction graph, OSINT attribution, exchange detection, and mixer analysis.
        </p>
      </div>

      {/* Input Panel */}
      <form onSubmit={handleAnalyze} className="glass-panel p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <SmartAddressInput
            value={address}
            onChange={(val) => { setAddress(val); setAiOneCardResult(null); }}
            onSubmit={handleAnalyze}
            loading={loading}
            placeholder="0x... or search by name (e.g. Vitalik, Tornado, Binance)"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => handleAiChainAnalyze(address)} disabled={isAiAnalyzingChain || !address.trim()} className="axon-button px-6 py-3.5 min-w-[140px] font-bold bg-axon-purple/20 border border-axon-purple/50 text-axon-purple hover:bg-axon-purple hover:text-white transition-colors whitespace-nowrap">
              {isAiAnalyzingChain ? (
                <svg className="animate-spin w-5 h-5 inline mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              )}
              Which Coin?
            </button>
            <button type="submit" disabled={loading || !address.trim() || !isValidAddress(address.trim())} className="axon-button axon-button-primary px-8 py-3.5 min-w-[160px] font-bold" id="wallet-analyze-btn" title={!isValidAddress(address.trim()) && address.trim() ? "Invalid Format. Click 'Which Coin?' to identify." : ""}>
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Investigate
                </>
              )}
            </button>
          </div>
        </div>


        {/* Module Pills */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-axon-border/30">
          {['Wallet Risk Scorer', 'Transaction Graph', 'OSINT Engine', 'Exchange Detection', 'Mixer Detection'].map(m => (
            <span key={m} className="px-2.5 py-1 text-[11px] font-mono bg-axon-card border border-axon-border text-axon-text-dim rounded-full">{m}</span>
          ))}
        </div>
      </form>

      {/* Simple Analytical Engine Card Result */}
      {aiOneCardResult && (
        <div className="glass-panel p-6 border border-axon-purple/40 animate-fade-in bg-gradient-to-r from-axon-bg to-axon-purple/5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">🤖</span>
            <h3 className="text-lg font-bold text-white tracking-tight">AI Coin Identification</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-3 bg-axon-card rounded-lg border border-axon-border">
              <div className="text-[10px] uppercase font-bold text-axon-text-dim mb-1">Most Likely Crypto</div>
              <div className="text-base font-mono text-axon-cyan font-bold">{aiOneCardResult.candidates?.[0]?.chain || 'Data Not Available'}</div>
              <div className="text-[10px] text-axon-text-dim mt-1">Confidence: {aiOneCardResult.candidates?.[0]?.confidence ? (aiOneCardResult.candidates[0].confidence * 100).toFixed(0) : '0'}%</div>
            </div>
            {aiOneCardResult.candidates?.[0]?.explorer_url && (
              <div className="p-3 bg-axon-card rounded-lg border border-axon-border">
                <div className="text-[10px] uppercase font-bold text-axon-text-dim mb-1">Explorer Link</div>
                <a href={aiOneCardResult.candidates[0].explorer_url} target="_blank" rel="noreferrer" className="text-base font-medium text-axon-purple hover:underline truncate block">
                  {String(aiOneCardResult.candidates[0].explorer_url).replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {aiOneCardResult.ai_summary && (
              <div className="p-3 bg-axon-card rounded-lg border border-axon-border md:col-span-1">
                <div className="text-[10px] uppercase font-bold text-axon-text-dim mb-1">Analytical Engine Summary</div>
                <div className="text-xs text-white leading-relaxed">{aiOneCardResult.ai_summary}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="glass-panel p-8 space-y-4 animate-fade-in">
          <div className="text-center text-axon-text-muted mb-6 text-sm font-mono">Running intelligence pipeline...</div>
          {['Wallet Risk Scorer', 'Transaction Graph Builder', 'OSINT Engine', 'Exchange Attribution', 'Mixer Detector'].map((m, i) => (
            <div key={m} className="flex items-center gap-4">
              <div className="w-40 text-xs font-mono text-axon-text-dim truncate">{m}</div>
              <div className="flex-1 h-1.5 bg-axon-card rounded-full overflow-hidden">
                <div className="h-full bg-axon-cyan rounded-full" style={{ width: '100%', animation: `slide-loading 1.2s ease-in-out ${i * 0.18}s infinite alternate` }} />
              </div>
              <svg className="animate-spin w-3 h-3 text-axon-cyan shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* ═══ RESULTS ═══════════════════════════════════════════════════════ */}
      {result && (
        <div className="space-y-6 animate-fade-in">

          {/* Export Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-sm text-axon-text-dim font-mono">
                Investigation complete · <span className="text-white">6 modules</span> · {new Date().toLocaleString()}
              </div>
              {reportHash && (
                <div className="mt-1 flex items-center gap-2 text-[10px] text-axon-text-muted font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-axon-card border border-axon-border text-axon-text-dim uppercase tracking-widest">SHA-256 PROOF</span>
                  <span className="truncate max-w-[200px] md:max-w-md">{reportHash}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDownloadCoC} className="axon-button text-xs px-4 py-2 gap-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" id="wallet-download-pdf-btn">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                📄 Download Final Analysis PDF
              </button>
              <button onClick={handleExport} className="axon-button text-xs px-4 py-2 gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export JSON
              </button>
            </div>
          </div>

          {/* ── 1. Identity Panel ─────────────────────────────────────── */}
          <CollapsibleSection color="cyan" icon="🔍" title="Wallet Identity">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <span 
                  className="font-mono text-base text-white break-all cursor-pointer hover:text-axon-cyan transition-colors"
                  onClick={() => navigator.clipboard.writeText(result.identity.address)}
                  title="Click to copy"
                >
                  {result.identity.address}
                </span>
                <CopyButton text={result.identity.address} />
                <span className={`shrink-0 px-2 py-0.5 text-xs font-bold rounded border ${
                  result.identity.tag === 'HACKER' || result.identity.tag === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : result.identity.tag === 'PUBLIC FIGURE' || result.identity.tag === 'LOW' ? 'bg-axon-green/20 text-axon-green border-axon-green/40'
                  : result.identity.tag === 'EXTERNAL' ? 'bg-axon-orange/20 text-axon-orange border-axon-orange/40'
                  : 'bg-axon-cyan/20 text-axon-cyan border-axon-cyan/40'
                }`}>{result.identity.tag}</span>
                {(chainData?.candidates?.[0]?.chain || chainData?.chain) && (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold font-mono tracking-widest text-axon-orange bg-axon-orange/10 border border-axon-orange/30 rounded uppercase">
                    CHAIN: {chainData.candidates?.[0]?.chain || chainData.chain}
                  </span>
                )}
                {result.identity.entityClass && (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold font-mono tracking-widest text-axon-purple bg-axon-purple/10 border border-axon-purple/30 rounded uppercase">
                    {result.identity.entityClass} ×{result.identity.classModifier || 1.0}
                  </span>
                )}
              </div>
              
              {(chainData?.candidates?.[0]?.explorer_url || chainData?.explorer_url) && typeof (chainData?.candidates?.[0]?.explorer_url || chainData?.explorer_url) === 'string' && (chainData?.candidates?.[0]?.explorer_url || chainData?.explorer_url) !== 'null' && (chainData?.candidates?.[0]?.explorer_url || chainData?.explorer_url) !== 'None' && (
                 <div className="flex items-center gap-2">
                   <a href={String(chainData?.candidates?.[0]?.explorer_url || chainData?.explorer_url).replace('<address>', result.identity.address)} target="_blank" rel="noreferrer" className="axon-button text-[10px] px-3 py-1.5 gap-1.5 bg-axon-bg border-axon-border hover:border-axon-cyan hover:text-white transition-colors">
                     🔗 View in Block Explorer
                     <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                   </a>
                   {(chainData?.candidates?.[0]?.official_website || chainData?.official_website) && (
                     <a href={chainData.candidates?.[0]?.official_website || chainData.official_website} target="_blank" rel="noreferrer" className="axon-button text-[10px] px-3 py-1.5 gap-1.5 bg-axon-bg border-axon-border hover:border-axon-purple hover:text-white transition-colors">
                       🌐 Official Website
                     </a>
                   )}
                 </div>
              )}
              {chainData && (chainData.candidates?.[0]?.chain || chainData.chain) === 'Data Not Available' && (
                <div className="mt-2">
                  <button onClick={handleAiChainAnalyze} disabled={isAiAnalyzingChain} className="axon-button text-xs px-4 py-2 gap-1.5 bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors">
                    {isAiAnalyzingChain ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                    {isAiAnalyzingChain ? 'Analyzing...' : 'AI Analyze Unknown Chain'}
                  </button>
                  <p className="text-[10px] text-axon-text-dim mt-1.5">Run a small Analytical Engine analysis to tell what crypto is most likely and find the official website.</p>
                </div>
              )}
            </div>
            <div className="text-axon-text-muted text-sm font-semibold mb-4">{result.identity.label}</div>
            {result.identity.ens && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-axon-purple/10 border border-axon-purple/30 rounded-lg text-sm font-mono text-axon-purple">
                🏷️ {result.identity.ens}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-axon-bg rounded-lg border border-axon-border p-3 text-center col-span-2">
                {(() => {
                  const activeChain = chainData?.candidates?.[0]?.chain || chainData?.chain;
                  const isEVM = chainData?.type === 'EVM';
                  const sym = activeChain === 'Bitcoin' ? 'BTC' : activeChain === 'Solana' ? 'SOL' : activeChain === 'Tron' ? 'TRX' : 'ETH';
                  const cgId = activeChain === 'Bitcoin' ? 'bitcoin' : activeChain === 'Solana' ? 'solana' : activeChain === 'Tron' ? 'tron' : 'ethereum';
                  
                  const rawBalance = String(result.identity.ethBalance).replace(/,/g, '').replace(/ ETH| BTC| SOL| TRX/g, '');
                  const balNum = parseFloat(rawBalance);
                  const priceData = cryptoPrices[cgId];
                  
                  return (
                    <>
                      <div className="text-lg font-bold font-mono text-axon-cyan">
                        {result.identity.ethBalance === 'N/A' ? 'N/A' : `${rawBalance} ${sym}`}
                      </div>
                      <div className="text-[11px] text-axon-text-dim mt-0.5 font-mono">
                        {!isNaN(balNum) && priceData ? (
                          <>
                            ≈ ${(balNum * priceData.usd).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD
                            <span className="mx-2">|</span>
                            ≈ {formatINR(balNum * priceData.inr)} INR
                          </>
                        ) : (
                          <>Value Calculation N/A for {sym}</>
                        )}
                      </div>
                      <div className="text-[10px] text-axon-text-dim uppercase tracking-wider mt-1.5">{sym} Balance (Live Value)</div>
                    </>
                  );
                })()}
              </div>
              <div className="bg-axon-bg rounded-lg border border-axon-border p-3 text-center col-span-2">
                <div className="text-xl font-bold font-mono text-axon-orange mt-1">
                  {result.identity.totalVolumeUSD}
                </div>
                <div className="text-[10px] text-axon-text-dim uppercase tracking-wider mt-2.5">Total Volume</div>
              </div>
              {[
                { label: 'Transactions', value: result.identity.txCount?.toLocaleString(), color: 'text-white' },
                { label: 'Counterparties', value: result.identity.uniqueCounterparties, color: 'text-white' },
                { label: 'First Seen', value: result.identity.firstSeen, color: 'text-axon-text-muted' },
                { label: 'Last Active', value: result.identity.lastSeen, color: 'text-axon-text-muted' },
                { label: 'Total Received', value: String(result.identity.totalReceived || 'Data Not Available').replace(/ ETH| BTC| SOL| TRX/g, '') + (result.identity.totalReceived && result.identity.totalReceived !== 'Data Not Available' ? ' ' + ((chainData?.candidates?.[0]?.chain || chainData?.chain) === 'Bitcoin' ? 'BTC' : (chainData?.candidates?.[0]?.chain || chainData?.chain) === 'Solana' ? 'SOL' : (chainData?.candidates?.[0]?.chain || chainData?.chain) === 'Tron' ? 'TRX' : 'ETH') : ''), color: 'text-axon-green' },
                { label: 'Total Sent', value: String(result.identity.totalSent || 'Data Not Available').replace(/ ETH| BTC| SOL| TRX/g, '') + (result.identity.totalSent && result.identity.totalSent !== 'Data Not Available' ? ' ' + ((chainData?.candidates?.[0]?.chain || chainData?.chain) === 'Bitcoin' ? 'BTC' : (chainData?.candidates?.[0]?.chain || chainData?.chain) === 'Solana' ? 'SOL' : (chainData?.candidates?.[0]?.chain || chainData?.chain) === 'Tron' ? 'TRX' : 'ETH') : ''), color: 'text-red-400' },
              ].map(item => (
                <div key={item.label} className="bg-axon-bg rounded-lg border border-axon-border p-3 text-center">
                  <div className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</div>
                  <div className="text-[10px] text-axon-text-dim uppercase tracking-wider mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* ── 2. Threat Indicator ─────────────────────────────────────────── */}
          <CollapsibleSection color="red" icon="⚠️" title="Threat Assessment" badge="5-LAYER BEHAVIORAL ENGINE" defaultOpen={true}>
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex flex-col items-center gap-3 shrink-0">
                <RiskMeter score={result.risk.score} label={result.risk.label} />
                
                {/* Score Breakdown Panel */}
                <div className="w-full bg-axon-bg rounded border border-axon-border p-3 text-left min-w-[170px]">
                  <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-wider mb-2 text-center border-b border-axon-border/50 pb-1">5-Layer Breakdown</div>
                  {[
                    { l: 'L1: Behavioral', v: result.risk.layers?.L1 },
                    { l: 'L2: Graph', v: result.risk.layers?.L2 },
                    { l: 'L3: Economic', v: result.risk.layers?.L3 },
                    { l: 'L4: Attribution', v: result.risk.layers?.L4 },
                    { l: 'L5: Analytical Engine Delta', v: result.risk.layers?.L5 }
                  ].map(a => (
                     <div key={a.l} className="flex justify-between items-center text-[11px] mb-1">
                        <span className="text-axon-text-muted">{a.l}</span>
                        <span className="font-mono text-white">{a.v !== undefined ? a.v : 0}/100</span>
                     </div>
                  ))}
                </div>

                <div className="text-center mt-2">
                  <div className="text-xs text-axon-text-dim">ML Classification</div>
                  <div className="text-sm font-bold font-mono text-axon-purple">{result.risk.mlClassification}</div>
                </div>
                <div className="w-full bg-axon-bg rounded border border-axon-border p-3 text-center min-w-[150px]">
                  <div className="text-xs text-axon-text-dim mb-1">Anomaly Severity</div>
                  <div className="text-lg font-bold font-mono text-axon-purple">{result.risk.anomalyScore}%</div>
                  <div className="w-full h-1.5 bg-axon-card rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-axon-purple rounded-full" style={{ width: `${result.risk.anomalyScore}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                
                {/* Analytical Engine Forensic Analysis (Quick Scan) */}
                {result.risk.analyticalSynthesis && (
                  <div className="mb-6 bg-[#1e293b]/50 rounded-xl border border-blue-500/30 p-5 font-sans text-sm leading-relaxed text-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b border-blue-500/20 pb-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-blue-600 rounded">ANALYST SYNTHESIS</span>
                      <span className="text-xs font-mono font-bold text-blue-400">{result.risk.analyticalSynthesis.mitre_tag || "N/A"}</span>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Plausible Hypothesis</div>
                      <p className="text-gray-300 font-mono text-xs break-words">{result.risk.analyticalSynthesis.hypothesis}</p>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Adversarial Synthesis (Executive Verdict)</div>
                      <p className="text-white font-bold break-words">{result.risk.analyticalSynthesis.verdict}</p>
                    </div>

                    <div className="mt-6 border-t border-blue-500/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-blue-300/70 max-w-sm">
                        This is a quick summary. For a comprehensive forensic analysis, run the Dual Adversarial Analytical Engine Engine.
                      </div>
                      {!deepDiveResult && (
                        <button
                          onClick={handleDeepDive}
                          disabled={isDeepDiveActive}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono tracking-wider rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                        >
                          {isDeepDiveActive ? 'ANALYZING...' : 'RUN DEEP DIVE ANALYSIS'}
                        </button>
                      )}
                    </div>
                    {deepDiveStatus && <div className="mt-2 text-blue-300 font-mono text-[10px] text-right">{deepDiveStatus}</div>}
                    {deepDiveError && <div className="mt-3 text-red-400 text-xs">{deepDiveError}</div>}
                  </div>
                )}

                <div className="text-sm font-bold text-axon-text-dim uppercase tracking-wider mb-3">Risk Factors</div>
                <div className="space-y-3">
                  {result.risk?.factors?.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-axon-bg rounded-lg border border-axon-border">
                      <span className="text-base shrink-0">{f.icon}</span>
                      <div className="flex-1 min-w-0 text-sm text-white">{f.reason}</div>
                      <span className="shrink-0 px-2 py-0.5 text-xs font-bold font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded">+{f.penalty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* ── Deep Dive Results (shown after deep scan completes) ── */}
          {deepDiveResult && deepDiveResult.risk && deepDiveResult.risk.analyticalSynthesis && (
            <CollapsibleSection color="purple" icon="🧠" title="Dual-Adversarial Deep Scan" badge="3-AGENT PIPELINE" defaultOpen={true}>
              
              {/* Updated Risk Score Delta */}
              {deepDiveResult.risk.score !== undefined && (
                <div className="mb-6 flex items-center gap-6 p-4 bg-axon-bg rounded-xl border border-axon-purple/30">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-axon-text-dim uppercase tracking-widest mb-1">Quick Scan</div>
                      <div className="text-2xl font-bold font-mono text-white">{result.risk.score}</div>
                    </div>
                    <div className="text-2xl text-axon-text-dim">→</div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-axon-purple uppercase tracking-widest mb-1">Deep Scan</div>
                      <div className={`text-2xl font-bold font-mono ${deepDiveResult.risk.score >= 80 ? 'text-red-400' : deepDiveResult.risk.score >= 60 ? 'text-orange-400' : deepDiveResult.risk.score >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {deepDiveResult.risk.score}
                      </div>
                    </div>
                    <div className={`px-3 py-1 text-sm font-bold font-mono rounded border ${
                      deepDiveResult.risk.score - result.risk.score > 0
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : deepDiveResult.risk.score - result.risk.score < 0
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-axon-card text-axon-text-dim border-axon-border'
                    }`}>
                      Δ {deepDiveResult.risk.score - result.risk.score > 0 ? '+' : ''}{deepDiveResult.risk.score - result.risk.score}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className={`text-lg font-extrabold font-mono tracking-widest ${deepDiveResult.risk.score >= 80 ? 'text-red-400' : deepDiveResult.risk.score >= 60 ? 'text-orange-400' : deepDiveResult.risk.score >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {deepDiveResult.risk.label}
                    </div>
                    <div className="text-[10px] text-axon-text-dim font-mono">Updated Risk Rating</div>
                  </div>
                </div>
              )}

              <div className="font-sans text-sm leading-relaxed">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                  {/* Prosecution Panel */}
                  <div className="bg-red-950/20 rounded-xl border border-red-500/30 p-4">
                    <div className="flex items-center justify-between mb-3 border-b border-red-500/20 pb-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-red-600 rounded">PROSECUTION PERSPECTIVE</span>
                      <span className="text-xs font-mono font-bold text-red-400">{deepDiveResult.risk.analyticalSynthesis.prosecution_risk || deepDiveResult.risk.label} RISK</span>
                    </div>
                    <p className="text-gray-300 font-mono text-xs break-words">{deepDiveResult.risk.analyticalSynthesis.prosecution_summary}</p>
                  </div>

                  {/* Defense Panel */}
                  <div className="bg-[#064e3b]/40 rounded-xl border border-emerald-500/30 p-4">
                    <div className="flex items-center justify-between mb-3 border-b border-emerald-500/20 pb-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-emerald-600 rounded">DEFENSE PERSPECTIVE</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">{deepDiveResult.risk.analyticalSynthesis.defense_risk || 'MEDIUM'} RISK</span>
                    </div>
                    <p className="text-gray-300 font-mono text-xs break-words">{deepDiveResult.risk.analyticalSynthesis.defense_summary}</p>
                  </div>
                </div>

                {/* Judge Panel */}
                <div className="bg-[#1e293b]/50 rounded-xl border border-blue-500/30 p-5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full"></div>
                  <div className="flex items-center justify-between mb-4 border-b border-blue-500/20 pb-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white bg-blue-600 rounded">EXECUTIVE VERDICT</span>
                      <span className="text-xs font-mono font-bold text-blue-400">{deepDiveResult.risk.analyticalSynthesis.mitre_tag || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest">Confidence</span>
                      <span className="text-xs font-mono font-bold text-white bg-blue-500/20 px-2 py-0.5 rounded">{deepDiveResult.risk.analyticalSynthesis.confidence || '—'}%</span>
                    </div>
                  </div>
                  
                  <div className="mb-4 relative z-10">
                    <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Synthesized Hypothesis</div>
                    <p className="text-gray-300 font-mono text-xs break-words">{deepDiveResult.risk.analyticalSynthesis.hypothesis}</p>
                  </div>

                  {deepDiveResult.risk.analyticalSynthesis.judge_reasoning && (
                    <div className="mb-4 relative z-10">
                      <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Judge Reasoning</div>
                      <p className="text-gray-400 italic text-xs break-words border-l-2 border-blue-500/30 pl-3">{deepDiveResult.risk.analyticalSynthesis.judge_reasoning}</p>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 relative z-10">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex justify-between">
                      <span>Final Executive Verdict</span>
                      <span className="opacity-70">Consensus: {deepDiveResult.risk.analyticalSynthesis.consensus_level || 'N/A'}</span>
                    </div>
                    <p className="text-white font-bold break-words">{deepDiveResult.risk.analyticalSynthesis.verdict}</p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          )}

          
          {/* ── 3. Financial Intelligence ─────────────────────────────────────────── */}
          <CollapsibleSection color="green" icon="💵" title="Financial Intelligence" badge="FUNDS TRACKING" defaultOpen={true}>
            

            {/* Cross-Chain Exposure inside Identity */}
            <div className="mt-6 pt-6 border-t border-axon-border/50">
              <div className="text-sm font-bold text-axon-text-dim uppercase tracking-wider mb-4">Cross-Chain Exposure</div>
              {crossChain ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {crossChain.holdings && crossChain.holdings.map((data) => {
                    const hasBalance = data.balance > 0;
                    return (
                      <div key={data.chain} className={`bg-[#0a0f1a] rounded-lg border p-4 text-center transition-colors ${
                        hasBalance ? 'border-axon-border hover:border-axon-cyan' : 'border-axon-border/30 opacity-60'
                      }`}>
                        <div className="text-sm font-bold text-white mb-1">{data.chain}</div>
                        <div className={`text-lg font-bold font-mono ${hasBalance ? 'text-axon-cyan' : 'text-gray-600'}`}>
                          {data.balance.toFixed(4)} {data.symbol}
                        </div>
                        <div className="text-[10px] text-axon-text-dim mt-1 font-mono">
                          ${(data.usd_value || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          <span className="mx-1">|</span>
                          {formatINR(data.inr_value || 0)}
                        </div>
                        {data.error && (
                          <div className="text-[9px] text-yellow-500/60 mt-1">⚠ fetch error</div>
                        )}
                      </div>
                    );
                  })}
                  <div className="bg-axon-cyan/5 rounded-lg border border-axon-cyan/40 p-4 text-center col-span-2 md:col-span-4 flex items-center justify-between px-8">
                    <span className="text-sm font-bold text-white uppercase tracking-widest">Total Estimated Exposure</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-axon-cyan">
                        ${(crossChain.total_net_worth_usd || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <div className="text-sm font-bold font-mono text-axon-text-dim mt-1">
                        {formatINR(crossChain.total_net_worth_inr || 0)}
                      </div>
                      <div className="text-[9px] text-gray-600 mt-0.5">via Etherscan v2 · CoinGecko</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 text-axon-text-muted text-sm font-mono">
                  <svg className="animate-spin w-4 h-4 text-axon-cyan" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Scanning secondary networks...
                </div>
              )}
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              

              {/* Stablecoin Flows */}
              <div>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-green-400">💵</span> Stablecoin Flow Analysis
                </div>
                <div className="p-4 bg-axon-bg rounded border border-axon-border flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-white">USDT / USDC Volume</div>
                      <div className="text-xs text-axon-text-dim">Historical Token Transfers</div>
                    </div>
                    <div className="text-xl font-mono font-bold text-green-400">
                      ${(result.holdings?.stablecoin_flows?.total_usd_volume || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-axon-border/50">
                    <div>
                      <div className="text-axon-text-dim mb-1">INFLOW</div>
                      <div className="text-green-400">USDT: +{(result.holdings?.stablecoin_flows?.usdt_in || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                      <div className="text-green-400">USDC: +{(result.holdings?.stablecoin_flows?.usdc_in || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                    </div>
                    <div>
                      <div className="text-axon-text-dim mb-1">OUTFLOW</div>
                      <div className="text-red-400">USDT: -{(result.holdings?.stablecoin_flows?.usdt_out || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                      <div className="text-red-400">USDC: -{(result.holdings?.stablecoin_flows?.usdc_out || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                    </div>
                  </div>
                </div>
              </div>
              

              {/* Alchemy Token Holdings */}
              <div>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-axon-cyan">🪙</span> ERC-20 Token Holdings
                </div>
                <div className="p-4 bg-axon-bg rounded border border-axon-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Distinct Tokens Found</div>
                    <div className="text-xs text-axon-text-dim">Via Alchemy RPC</div>
                  </div>
                  <div className="text-2xl font-mono font-bold text-axon-cyan">
                    {result.holdings?.erc20_count || 0}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

{/* ── 4. OSINT & Threat Alerts ──────────────────────────────────────── */}
          <CollapsibleSection color="purple" icon="🛰️" title="OSINT & Threat Alerts" badge="LIVE" defaultOpen={false}>
            {result.osint.analyticalSynthesis && result.osint.analyticalSynthesis.verdict ? (
              <div className="mb-6 p-4 bg-axon-purple/5 border border-axon-purple/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3 border-b border-axon-purple/20 pb-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-axon-purple/20 text-axon-purple rounded">THREAT SUMMARY</span>
                  <span className="text-xs font-bold text-white">{result.osint.analyticalSynthesis.mitre_tag || "N/A"}</span>
                </div>
                <div className="text-xs text-axon-text-dim uppercase tracking-widest mb-1 font-bold">Hypothesis</div>
                <p className="text-sm text-axon-text-muted leading-relaxed mb-3">{result.osint.analyticalSynthesis.hypothesis}</p>
                <div className="text-xs text-axon-text-dim uppercase tracking-widest mb-1 font-bold">Verdict</div>
                <p className="text-sm text-axon-purple font-bold leading-relaxed">{result.osint.analyticalSynthesis.verdict}</p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-axon-purple/5 border border-axon-purple/20 rounded-lg text-sm text-axon-text-muted">
                {typeof result.osint?.summary === 'string' ? result.osint.summary : (
                  <div>
                    <p className="font-semibold mb-1 text-white text-xs uppercase tracking-wider text-axon-purple/80">OSINT Sweep Metrics</p>
                    <ul className="list-disc pl-4 space-y-1 mt-1 text-xs">
                      {result.osint?.summary?.ens_name && <li>ENS Domain: {result.osint.summary.ens_name}</li>}
                      <li>Reddit Mentions: <span className="font-mono text-white font-bold">{result.osint?.summary?.reddit_mentions || 0}</span></li>
                      <li>GitHub Mentions: <span className="font-mono text-white font-bold">{result.osint?.summary?.github_mentions || 0}</span></li>
                      <li>Twitter Mentions: <span className="font-mono text-white font-bold">{result.osint?.summary?.twitter_mentions || 0}</span></li>
                      <li>General Web Mentions: <span className="font-mono text-white font-bold">{result.osint?.summary?.web_mentions || 0}</span></li>
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Forta Alerts */}
              <div>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-red-400">🚨</span> Forta Network Alerts
                </div>
                <div className="p-4 bg-axon-bg rounded border border-axon-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Live Security Alerts</div>
                    <div className="text-xs text-axon-text-dim">Triggered in the last 24h</div>
                  </div>
                  <div className={`text-2xl font-mono font-bold ${result.holdings?.forta_alerts > 0 ? 'text-red-400' : 'text-axon-green'}`}>
                    {result.holdings?.forta_alerts || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3">Discovered Aliases</div>
                <div className="flex flex-wrap gap-2">
                  {result.osint?.aliases?.map(a => (
                    <span key={a} className="px-2.5 py-1 text-xs font-mono bg-axon-purple/10 border border-axon-purple/30 text-axon-purple rounded">{a}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3">Threat Mentions</div>
                <div className="p-4 bg-axon-bg rounded border border-axon-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">OSINT Platform Mentions</div>
                    <div className="text-xs text-axon-text-dim">Scraped from security feeds</div>
                  </div>
                  <div className={`text-2xl font-mono font-bold ${result.osint.walletMentions > 0 ? 'text-red-400' : 'text-axon-green'}`}>
                    {result.osint.walletMentions || 0}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* ── 5. Exchange Detection ────────────────────────────────── */}
          <CollapsibleSection color="green" icon="🏦" title="Exchange Detection" badge="ATTRIBUTION ENGINE" defaultOpen={false}>
            {result.exchange?.summary && (
              <div className="mb-4 p-3 bg-axon-green/5 border border-axon-green/20 rounded-lg text-sm text-axon-text-muted">
                {result.exchange.summary}
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-axon-bg rounded border border-axon-border p-4 text-center">
                <div className="text-2xl font-bold font-mono text-axon-cyan">{result.exchange?.exchangeCounterparties ?? 'N/A'}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Exchange Nodes</div>
              </div>
              <div className="bg-axon-bg rounded border border-axon-border p-4 text-center">
                <div className="text-2xl font-bold font-mono text-axon-cyan">{result.exchange?.cashOutEvents ?? 'N/A'}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Cash Out Events</div>
              </div>
              <div className="bg-axon-bg rounded border border-axon-cyan/30 p-4 col-span-2 text-center">
                <div className="text-2xl font-bold font-mono text-white">{result.exchange?.totalCashOutUSD ?? 'N/A'}</div>
                <div className="text-xs text-axon-cyan mt-1 uppercase tracking-wider">Total Value Cashed Out</div>
              </div>
            </div>
            {result.exchange?.findings?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="border-b border-axon-border text-left">
                      {['Exchange', 'Deposit Address', 'Confidence', 'Type', 'Volume (ETH)', 'Date', 'Status'].map(h => (
                        <th key={h} className="pb-2 pr-4 text-xs text-axon-text-dim uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.exchange?.findings?.map((f, i) => (
                      <tr key={i} className="border-b border-axon-border/50 hover:bg-axon-card/30 transition-colors">
                        <td className="py-3 pr-4 font-bold text-white">{f.exchange}</td>
                        <td className="py-3 pr-4 text-axon-cyan text-xs">{f.address}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-axon-card rounded-full overflow-hidden">
                              <div className="h-full bg-axon-green rounded-full" style={{ width: `${f.confidence}%` }} />
                            </div>
                            <span className="text-axon-green text-xs">{f.confidence}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-axon-text-muted">{f.type}</td>
                        <td className="py-3 pr-4 text-white">{f.volumeETH}</td>
                        <td className="py-3 pr-4 text-axon-text-dim">{f.date}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded border ${
                            f.status === 'FLAGGED' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : f.status === 'BLOCKED' ? 'bg-axon-orange/10 text-axon-orange border-axon-orange/30'
                            : 'bg-axon-green/10 text-axon-green border-axon-green/30'
                          }`}>{f.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>

          {/* ── 6. Mixer Detection ───────────────────────────────────── */}
          <CollapsibleSection color="orange" icon="🌪️" title="Mixer Detection" badge="LAUNDERING ANALYSIS" defaultOpen={false}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-axon-bg rounded border border-red-500/30 p-4 text-center">
                <div className="text-2xl font-bold font-mono text-axon-orange">{result.mixer?.mixerCounterparties ?? 'N/A'}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Mixer Nodes</div>
              </div>
              <div className="bg-axon-bg rounded border border-axon-border p-4 text-center">
                <div className="text-2xl font-bold font-mono text-axon-orange">{result.mixer?.bridgeActivity ? result.mixer.bridgeActivity.length : 'N/A'}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Bridges Used</div>
              </div>
              <div className="bg-axon-bg rounded border border-red-500/30 p-4 col-span-2 text-center">
                <div className="text-xl font-bold font-mono text-red-400">{result.mixer?.totalMixedETH ?? 'N/A'}</div>
                <div className="text-xs text-axon-text-dim mt-1 uppercase tracking-wider">Total Mixed</div>
              </div>
            </div>

            <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3">Mixer Usage</div>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="border-b border-axon-border text-left">
                    {['Pool', 'Transactions', 'Total ETH', 'First Use', 'Last Use', 'Risk'].map(h => (
                      <th key={h} className="pb-2 pr-4 text-xs text-axon-text-dim uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.mixer?.findings?.map((f, i) => (
                    <tr key={i} className="border-b border-axon-border/50 hover:bg-axon-card/30 transition-colors">
                      <td className="py-3 pr-4 text-white">{f.mixer}</td>
                      <td className="py-3 pr-4 text-axon-orange">{f.txCount.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-red-400 font-bold">{f.totalETH}</td>
                      <td className="py-3 pr-4 text-axon-text-dim">{f.firstUse}</td>
                      <td className="py-3 pr-4 text-axon-text-dim">{f.lastUse}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded border ${
                          f.risk === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : f.risk === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                          : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30'
                        }`}>{f.risk}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.mixer?.bridgeActivity?.length > 0 && (
              <>
                <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3">Bridge Activity</div>
                <div className="grid md:grid-cols-2 gap-3 mb-6">
                  {result.mixer?.bridgeActivity?.map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-axon-bg rounded border border-axon-border">
                      <span className="text-sm text-white">{b.bridge}</span>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-axon-orange">{b.volumeUSD}</div>
                        <div className="text-xs text-axon-text-dim">{b.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="text-xs font-bold text-axon-text-dim uppercase tracking-wider mb-3">Laundering Indicators</div>
            <div className="space-y-2">
              {result.mixer?.launderingIndicators?.map((ind, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 rounded border border-red-500/20">
                  <span className="text-red-400 text-xs mt-0.5 shrink-0">▸</span>
                  <span className="text-xs text-axon-text-muted">{ind}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* ── 6.5 Temporal Activity Analysis ───────────────────────────────────── */}
          {result.temporal_activity && result.temporal_activity.length > 0 && (
            <CollapsibleSection color="cyan" icon="🕒" title="Temporal Activity Analysis" badge="TIMEZONE HEATMAP" defaultOpen={true}>
              <div className="mb-4 p-3 bg-axon-cyan/5 border border-axon-cyan/20 rounded-lg text-sm text-axon-text-muted">
                Transaction frequency by Day of Week & Hour of Day (UTC). Concentrated clusters can help deduce the operator's geographic timezone or automated script schedules.
              </div>
              <TemporalHeatmap data={result.temporal_activity} />
            </CollapsibleSection>
          )}

          {/* ── 6.75 DeFi Interactions & Timeline ───────────────────────────────────── */}
          {result.graph?.defi_interactions && result.graph.defi_interactions.length > 0 && (
            <CollapsibleSection color="purple" icon="📜" title="DeFi Interactions & Timeline" badge={`${result.graph.defi_interactions.length} PARSED EVENTS`} defaultOpen={true}>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm font-mono">
                  <thead className="sticky top-0 bg-axon-bg z-10">
                    <tr className="border-b border-axon-border text-left">
                      <th className="py-3 pr-4 text-xs text-axon-text-dim uppercase tracking-wider bg-axon-bg">Narrative</th>
                      <th className="py-3 pr-4 text-xs text-axon-text-dim uppercase tracking-wider bg-axon-bg">Signature</th>
                      <th className="py-3 pr-4 text-xs text-axon-text-dim uppercase tracking-wider bg-axon-bg">To Contract</th>
                      <th className="py-3 pr-4 text-xs text-axon-text-dim uppercase tracking-wider bg-axon-bg">Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.graph.defi_interactions.map((interaction, i) => (
                      <tr key={interaction.hash || i} className="border-b border-axon-border/50 hover:bg-axon-card/30 transition-colors">
                        <td className="py-3 pr-4 text-white font-bold break-words whitespace-normal max-w-[300px]">
                          {interaction.narrative}
                        </td>
                        <td className="py-3 pr-4 text-axon-purple text-xs">
                          {interaction.signature}
                        </td>
                        <td className="py-3 pr-4 text-axon-cyan">
                          {interaction.to ? interaction.to.substring(0, 8) + '...' + interaction.to.substring(interaction.to.length - 6) : 'Data Not Available'}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2 text-axon-cyan">
                            {interaction.hash ? interaction.hash.substring(0, 10) + '...' : 'N/A'}
                            {interaction.hash && <CopyButton text={interaction.hash} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* ── 7. Transaction History ────────────────────────────────── */}
          <CollapsibleSection color="slate" icon="📜" title="General Transaction Timeline" badge={`${result.transactions?.length || 0} RECORDS`} defaultOpen={true}>
            {result.transactions && result.transactions.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm font-mono">
                  <thead className="sticky top-0 bg-axon-bg z-10">
                    <tr className="border-b border-axon-border text-left">
                      {['Date', 'Hash', 'Block', 'Type', 'From / To', 'Value (Native)', 'Gas Fee'].map(h => (
                        <th key={h} className="py-3 pr-4 text-xs text-axon-text-dim uppercase tracking-wider bg-axon-bg whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.transactions.map((tx, i) => {
                      const isIncoming = tx.to?.toLowerCase() === result.identity.address.toLowerCase();
                      const valEth = (parseInt(tx.value || '0') / 1e18).toFixed(4);
                      const gasEth = ((parseInt(tx.gasUsed || '0') * parseInt(tx.gasPrice || '0')) / 1e18).toFixed(6);
                      const displayAddr = isIncoming ? tx.from : tx.to;
                      const dateStr = tx.timeStamp && tx.timeStamp !== '0' ? new Date(parseInt(tx.timeStamp) * 1000).toLocaleString() : 'N/A';
                      return (
                        <tr key={tx.hash || i} className="border-b border-axon-border/50 hover:bg-axon-card/30 transition-colors">
                          <td className="py-3 pr-4 text-axon-text-muted whitespace-nowrap text-xs">
                            {dateStr}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2 text-axon-cyan">
                              {tx.hash ? tx.hash.substring(0, 10) + '...' : 'N/A'}
                              {tx.hash && <CopyButton text={tx.hash} />}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-axon-text-dim">{tx.blockNumber || 'Pending'}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                              isIncoming 
                                ? 'bg-axon-green/10 text-axon-green border-axon-green/30' 
                                : 'bg-axon-orange/10 text-axon-orange border-axon-orange/30'
                            }`}>
                              {isIncoming ? 'IN' : 'OUT'}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-white">
                            {displayAddr ? displayAddr.substring(0, 8) + '...' + displayAddr.substring(displayAddr.length - 6) : 'Contract Creation'}
                          </td>
                          <td className={`py-3 pr-4 font-bold ${isIncoming ? 'text-axon-green' : 'text-axon-text-dim'}`}>
                            {isIncoming ? '+' : '-'}{valEth}
                          </td>
                          <td className="py-3 pr-4 text-axon-text-muted">{gasEth}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-axon-border rounded-lg text-axon-text-dim">
                No transaction history found on Ethereum Mainnet.
              </div>
            )}
          </CollapsibleSection>

          {/* ── Transaction Graph (Moved to Bottom) ──────────────────── */}
          <CollapsibleSection color="orange" icon="🕸️" title="Money Flow & Topology" badge="VISUALIZATION" defaultOpen={true}>
            <div className="h-[500px] rounded-lg overflow-hidden bg-axon-bg border border-axon-border">
              <GraphView data={result.graph} />
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs font-mono">
              {[
                { color: 'bg-red-500', label: 'Hacker/Suspect' },
                { color: 'bg-purple-500', label: 'Mixer' },
                { color: 'bg-blue-500', label: 'Exchange' },
                { color: 'bg-axon-cyan', label: 'Victim' },
                { color: 'bg-slate-600', label: 'Normal' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5 text-axon-text-dim">
                  <span className={`w-3 h-3 rounded-full ${item.color}`} />
                  {item.label}
                </div>
              ))}
            </div>
          </CollapsibleSection>

        </div>
      )}

      {/* Empty State */}
      {!loading && !result && (
        <div className="glass-panel p-16 flex flex-col items-center justify-center text-center border-dashed border-2">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-white mb-2">Start an Investigation</h3>
          <p className="text-axon-text-muted max-w-md text-sm">
            Enter a wallet address above to run all 5 intelligence modules simultaneously using real data.
          </p>
        </div>
      )}

    </div>
  );
}
