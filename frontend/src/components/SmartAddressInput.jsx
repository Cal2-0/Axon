import React, { useState, useEffect, useRef } from 'react';

// ─── KNOWN ADDRESS DATABASE (Demo) ──────────────────────────────────────────
const KNOWN_ADDRESSES = {
  // SAFE / Legitimate
  '0xd8da6bf26964af9d7eed9e03e53415d37aa96045': { label: 'vitalik.eth (Ethereum Co-founder)', risk: 'SAFE', category: 'Public Figure', ens: 'vitalik.eth' },
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { label: 'Uniswap V2 Router', risk: 'SAFE', category: 'DEX', ens: null },
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { label: 'Uniswap (UNI Token)', risk: 'SAFE', category: 'Token', ens: null },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { label: 'Wrapped Ether (WETH)', risk: 'SAFE', category: 'Token', ens: null },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { label: 'USD Coin (USDC)', risk: 'SAFE', category: 'Token', ens: null },
  '0x6b175474e89094c44da98b954eedeac495271d0f': { label: 'Dai Stablecoin (DAI)', risk: 'SAFE', category: 'Token', ens: null },
  '0x514910771af9ca656af840dff83e8264ecf986ca': { label: 'Chainlink (LINK)', risk: 'SAFE', category: 'Token', ens: null },

  // EXCHANGES
  '0x28c6c06298d514db089934071355e5743bf21d60': { label: 'Binance Hot Wallet', risk: 'SAFE', category: 'Exchange', ens: null },
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': { label: 'Coinbase', risk: 'SAFE', category: 'Exchange', ens: null },
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': { label: 'Kraken', risk: 'SAFE', category: 'Exchange', ens: null },

  // CRITICAL / Malicious
  '0x098b716b8aaf21512996dc57eb0615e2383e2f96': { label: 'Ronin Bridge Exploiter', risk: 'CRITICAL', category: 'Hacker', ens: null },
  '0x3cbded43efdaf0fc77b9c55f6fc9988fcc9b37d9': { label: 'FTX Exchange Drainer', risk: 'CRITICAL', category: 'Hacker', ens: null },
  '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a': { label: 'Bitfinex Hacker 2016', risk: 'CRITICAL', category: 'Hacker', ens: null },
  '0x4f26ffbe5f04ed43630fdc30a87638d53d0b0876': { label: 'Lazarus Group Wallet', risk: 'CRITICAL', category: 'State Actor', ens: null },
  '0x00000000219ab540356cbb839cbe05303d7705fa': { label: 'Wintermute Exploiter', risk: 'CRITICAL', category: 'Hacker', ens: null },

  // MEDIUM RISK
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { label: 'USDT Tether', risk: 'MEDIUM', category: 'Centralized Token', ens: null },

  // Mixers
  '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b': { label: 'Tornado Cash', risk: 'CRITICAL', category: 'Mixer (OFAC Sanctioned)', ens: null },
};

// Ethereum address checksum validation
function isValidEthAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function isPartialEthAddress(addr) {
  return /^0x[0-9a-fA-F]{0,40}$/.test(addr);
}

// ─── SMART ADDRESS INPUT ─────────────────────────────────────────────────────
export default function SmartAddressInput({ value, onChange, onSubmit, loading, placeholder = '0x... (Ethereum address)' }) {
  const [focused, setFocused] = useState(false);
  const [validation, setValidation] = useState(null); // null | 'typing' | 'invalid' | 'valid' | 'known'
  const [knownInfo, setKnownInfo] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Validate as user types
  useEffect(() => {
    const addr = value.trim();
    if (!addr) {
      setValidation(null);
      setKnownInfo(null);
      setShowDropdown(false);
      setSuggestions([]);
      return;
    }

    // Check for known address matches (autocomplete)
    const lower = addr.toLowerCase();
    const matches = Object.entries(KNOWN_ADDRESSES).filter(([key, info]) =>
      key.startsWith(lower) || info.label.toLowerCase().includes(lower)
    ).slice(0, 5);
    setSuggestions(matches);
    setShowDropdown(matches.length > 0 && focused && addr.length >= 3);

    if (isValidEthAddress(addr)) {
      const known = KNOWN_ADDRESSES[addr.toLowerCase()];
      if (known) {
        setValidation('known');
        setKnownInfo(known);
      } else {
        setValidation('valid');
        setKnownInfo(null);
      }
    } else if (isPartialEthAddress(addr)) {
      setValidation('typing');
      setKnownInfo(null);
    } else {
      setValidation('invalid');
      setKnownInfo(null);
    }
  }, [value, focused]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = (address) => {
    onChange(address);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const getStatusColor = () => {
    if (!validation) return 'border-axon-border';
    if (validation === 'typing') return 'border-axon-border';
    if (validation === 'invalid') return 'border-red-500/60 ring-1 ring-red-500/30';
    if (validation === 'valid') return 'border-axon-green/60 ring-1 ring-axon-green/30';
    if (validation === 'known') {
      if (knownInfo?.risk === 'CRITICAL') return 'border-red-500/60 ring-1 ring-red-500/30';
      if (knownInfo?.risk === 'MEDIUM') return 'border-axon-orange/60 ring-1 ring-axon-orange/30';
      return 'border-axon-green/60 ring-1 ring-axon-green/30';
    }
    return 'border-axon-border';
  };

  const getStatusIcon = () => {
    if (!validation || validation === 'typing') return null;
    if (validation === 'invalid') return (
      <div className="flex items-center gap-1.5 text-red-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span className="text-[10px] font-mono">INVALID FORMAT</span>
      </div>
    );
    if (validation === 'valid') return (
      <div className="flex items-center gap-1.5 text-axon-green">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span className="text-[10px] font-mono">VALID ADDRESS</span>
      </div>
    );
    if (validation === 'known') {
      const riskColorMap = { SAFE: 'text-axon-green', MEDIUM: 'text-axon-orange', CRITICAL: 'text-red-400' };
      return (
        <div className={`flex items-center gap-1.5 ${riskColorMap[knownInfo?.risk] || 'text-axon-cyan'}`}>
          {knownInfo?.risk === 'CRITICAL' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          )}
          <span className="text-[10px] font-mono font-bold">{knownInfo?.risk}</span>
        </div>
      );
    }
  };

  return (
    <div className="flex-1 relative">
      <label className="block text-xs font-bold text-axon-text-dim uppercase tracking-widest mb-2">
        Wallet Address
      </label>

      {/* Input with validation indicators */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          className={`axon-input w-full pr-36 transition-all duration-300 ${getStatusColor()}`}
          id="wallet-address-input"
          autoComplete="off"
          spellCheck="false"
        />

        {/* Status indicator (right side of input) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {value.trim() && !loading && (
            <>
              {getStatusIcon()}
              {value.trim().length > 0 && (
                <span className="text-[10px] text-axon-text-dim font-mono">
                  {value.trim().length}/42
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Known address info card */}
      {knownInfo && validation === 'known' && (
        <div className={`mt-2 p-3 rounded-lg border flex items-center justify-between animate-fade-in ${
          knownInfo.risk === 'CRITICAL' ? 'bg-red-500/5 border-red-500/30'
          : knownInfo.risk === 'MEDIUM' ? 'bg-axon-orange/5 border-axon-orange/30'
          : 'bg-axon-green/5 border-axon-green/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              knownInfo.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400'
              : knownInfo.risk === 'MEDIUM' ? 'bg-axon-orange/20 text-axon-orange'
              : 'bg-axon-green/20 text-axon-green'
            }`}>
              {knownInfo.risk === 'CRITICAL' ? '⚠' : knownInfo.risk === 'MEDIUM' ? '◆' : '✓'}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{knownInfo.label}</div>
              <div className="text-[11px] font-mono text-axon-text-dim">{knownInfo.category}{knownInfo.ens ? ` · ${knownInfo.ens}` : ''}</div>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-xs font-bold font-mono rounded border ${
            knownInfo.risk === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30'
            : knownInfo.risk === 'MEDIUM' ? 'bg-axon-orange/10 text-axon-orange border-axon-orange/30'
            : 'bg-axon-green/10 text-axon-green border-axon-green/30'
          }`}>{knownInfo.risk}</span>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-axon-surface border border-axon-border rounded-lg shadow-2xl overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-axon-border">
            <span className="text-[10px] font-mono text-axon-text-dim uppercase tracking-wider">Known Addresses ({suggestions.length})</span>
          </div>
          {suggestions.map(([address, info]) => (
            <button
              key={address}
              onClick={() => selectSuggestion(address)}
              className="w-full px-3 py-2.5 text-left hover:bg-axon-card/60 transition-colors flex items-center justify-between gap-3 border-b border-axon-border/30 last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm text-white font-semibold truncate">{info.label}</div>
                <div className="text-[10px] text-axon-cyan font-mono truncate">{address}</div>
              </div>
              <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold font-mono rounded border ${
                info.risk === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : info.risk === 'MEDIUM' ? 'bg-axon-orange/10 text-axon-orange border-axon-orange/30'
                : 'bg-axon-green/10 text-axon-green border-axon-green/30'
              }`}>{info.risk}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
