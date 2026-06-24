import React, { useState, useEffect, useRef } from 'react';
import { REAL_PROFILES } from '../data/realProfiles';

// ─── KNOWN ADDRESS DATABASE (Real Test Bank) ──────────────────────────────────────────
// Build KNOWN_ADDRESSES from REAL_PROFILES
const KNOWN_ADDRESSES = {};
REAL_PROFILES.forEach(profile => {
  KNOWN_ADDRESSES[profile.address.toLowerCase()] = {
    label: profile.name,
    category: profile.type,
    risk: profile.expectedRisk,
    ens: null
  };
});

// Multi-chain address checksum validation
export function isValidAddress(addr) {
  if (/^0x[0-9a-fA-F]{40}$/.test(addr)) return true; // EVM
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,59}$/i.test(addr)) return true; // BTC
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr) && !addr.startsWith('0x') && !addr.startsWith('bc1')) return true; // SOL
  if (/^T[A-Za-z1-9]{33}$/.test(addr)) return true; // TRON
  return false;
}

function isPartialAddress(addr) {
  return addr.length > 0;
}

// ─── SMART ADDRESS INPUT ─────────────────────────────────────────────────────
export default function SmartAddressInput({ value, onChange, onSubmit, loading, placeholder = '0x... (ETH, BTC, SOL)' }) {
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

    if (isValidAddress(addr)) {
      const known = KNOWN_ADDRESSES[addr.toLowerCase()];
      if (known) {
        setValidation('known');
        setKnownInfo(known);
      } else {
        setValidation('valid');
        setKnownInfo(null);
      }
    } else if (isPartialAddress(addr)) {
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
    if (validation === 'valid') return 'border-axon-cyan/60 ring-1 ring-axon-cyan/30';
    if (validation === 'known') {
      if (knownInfo?.risk === 'CRITICAL') return 'border-red-500/60 ring-1 ring-red-500/30';
      if (knownInfo?.risk === 'MEDIUM') return 'border-orange-500/60 ring-1 ring-orange-500/30';
      return 'border-green-500/60 ring-1 ring-green-500/30';
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
      <div className="flex items-center gap-1.5 text-axon-cyan">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span className="text-[10px] font-mono">VALID FORMAT</span>
      </div>
    );
    if (validation === 'known') {
      const riskColorMap = { LOW: 'text-green-400', MEDIUM: 'text-orange-400', CRITICAL: 'text-red-400' };
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
                  {value.trim().length} chars
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
          : knownInfo.risk === 'MEDIUM' ? 'bg-orange-500/5 border-orange-500/30'
          : 'bg-green-500/5 border-green-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              knownInfo.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400'
              : knownInfo.risk === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400'
              : 'bg-green-500/20 text-green-400'
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
            : knownInfo.risk === 'MEDIUM' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
            : 'bg-green-500/10 text-green-400 border-green-500/30'
          }`}>{knownInfo.risk}</span>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-axon-surface border border-axon-border rounded-lg shadow-2xl overflow-hidden animate-fade-in max-h-60 overflow-y-auto">
          <div className="px-3 py-2 border-b border-axon-border">
            <span className="text-[10px] font-mono text-axon-text-dim uppercase tracking-wider">Test Profiles ({suggestions.length})</span>
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
                : info.risk === 'MEDIUM' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                : 'bg-green-500/10 text-green-400 border-green-500/30'
              }`}>{info.risk}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
