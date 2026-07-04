import React, { useEffect, useMemo, useState } from 'react';
import { getAddressFormats } from '../api/axon';

const EVM_CHAINS = [
  'Ethereum', 'BNB Smart Chain', 'Polygon', 'Base', 'Optimism', 'Arbitrum',
  'Avalanche C', 'Fantom', 'Linea', 'Scroll', 'Mantle', 'Gnosis', 'Celo',
  'Blast', 'zkSync Era', 'Moonbeam', 'Cronos', 'Kava EVM'
];

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

function hrpExpand(hrp) {
  return [
    ...hrp.split('').map(char => char.charCodeAt(0) >> 5),
    0,
    ...hrp.split('').map(char => char.charCodeAt(0) & 31),
  ];
}

function polymod(values) {
  const generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i += 1) {
      if ((top >> i) & 1) chk ^= generator[i];
    }
  }
  return chk;
}

function verifyBech32(value) {
  const address = value.trim();
  if (address !== address.toLowerCase() && address !== address.toUpperCase()) {
    return { ok: false, variant: 'Invalid mixed case' };
  }
  const lower = address.toLowerCase();
  const pos = lower.lastIndexOf('1');
  if (pos < 1 || pos + 7 > lower.length) return { ok: false, variant: 'Invalid separator' };
  const hrp = lower.slice(0, pos);
  const data = lower.slice(pos + 1).split('').map(char => BECH32_CHARSET.indexOf(char));
  if (data.some(index => index === -1)) return { ok: false, variant: 'Invalid character' };
  const check = polymod([...hrpExpand(hrp), ...data]);
  if (check === 1) return { ok: true, variant: 'Bech32' };
  if (check === 0x2bc830a3) return { ok: true, variant: 'Bech32m' };
  return { ok: false, variant: 'Checksum mismatch' };
}

function splitPrefixes(prefix = '') {
  return prefix
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .filter(item => !['None', 'Account rules'].includes(item));
}

function encodingValid(address, format) {
  const encoding = (format.encoding || '').toLowerCase();
  if (encoding.includes('hex')) return /^0x[0-9a-fA-F]+$/.test(address) || /^[0-9a-fA-F]+$/.test(address);
  if (encoding.includes('base58')) return BASE58_RE.test(address);
  if (encoding.includes('bech32')) return /^[023456789acdefghjklmnpqrstuvwxyz]+$/i.test(address);
  if (encoding.includes('base32')) return /^[A-Z2-7]+$/.test(address);
  if (encoding.includes('base64')) return /^[A-Za-z0-9_-]+={0,2}$/.test(address);
  return true;
}

function prefixMatches(address, format) {
  const prefixes = splitPrefixes(format.prefix);
  if (prefixes.length === 0) return true;
  const lower = address.toLowerCase();
  return prefixes.some(prefix => {
    const p = prefix.toLowerCase();
    if (p.includes('.')) return lower.endsWith(p) || lower.startsWith(p);
    return lower.startsWith(p);
  });
}

function validateAddress(address, formats) {
  const value = address.trim();
  if (!value) return null;

  const lengthMatches = formats.filter(format => (
    value.length >= format.min_length &&
    value.length <= format.max_length &&
    prefixMatches(value, format) &&
    encodingValid(value, format)
  ));

  const evmLike = /^0x[0-9a-fA-F]{40}$/.test(value);
  const moveLike = /^0x[0-9a-fA-F]{1,64}$/.test(value) && value.length !== 42;
  const nearLike = /^[a-z0-9][a-z0-9_.-]{0,62}[a-z0-9]$/.test(value) && value.includes('.');
  const hederaLike = /^\d+\.\d+\.\d+$/.test(value);
  const candidates = [...lengthMatches];

  if (evmLike) {
    formats
      .filter(format => format.family === 'EVM' || ['VeChain', 'Theta'].includes(format.chain))
      .forEach(format => {
        if (!candidates.some(item => item.id === format.id)) candidates.push(format);
      });
  }

  if (moveLike) {
    formats
      .filter(format => format.family === 'Move')
      .forEach(format => {
        if (!candidates.some(item => item.id === format.id)) candidates.push(format);
      });
  }

  if (nearLike) {
    formats
      .filter(format => format.chain === 'Near')
      .forEach(format => {
        if (!candidates.some(item => item.id === format.id)) candidates.push(format);
      });
  }

  if (hederaLike) {
    formats
      .filter(format => format.chain === 'Hedera')
      .forEach(format => {
        if (!candidates.some(item => item.id === format.id)) candidates.push(format);
      });
  }

  const bech32 = value.toLowerCase().includes('1') ? verifyBech32(value) : null;
  const primary = candidates[0] || null;
  const checksum = bech32?.ok
    ? `Valid (${bech32.variant})`
    : primary?.checksum?.toLowerCase().includes('bech32')
      ? bech32?.variant || 'Checksum mismatch'
      : primary?.checksum && primary.checksum !== 'None'
        ? `${primary.checksum} supported`
        : 'No checksum';

  return {
    address: value,
    valid: candidates.length > 0,
    primary,
    candidates,
    checksum,
    ambiguous: evmLike || candidates.length > 1,
  };
}

function Badge({ children, tone = 'slate' }) {
  const tones = {
    green: 'bg-axon-green/10 text-axon-green border-axon-green/30',
    cyan: 'bg-axon-cyan/10 text-axon-cyan border-axon-cyan/30',
    orange: 'bg-axon-orange/10 text-axon-orange border-axon-orange/30',
    red: 'bg-axon-red/10 text-axon-red border-axon-red/30',
    purple: 'bg-axon-purple/10 text-axon-purple border-axon-purple/30',
    slate: 'bg-axon-card text-axon-text-muted border-axon-border',
  };
  return <span className={`px-2 py-1 rounded border text-[10px] font-bold font-mono uppercase tracking-wide ${tones[tone]}`}>{children}</span>;
}

function formatBadges(format) {
  const badges = [];
  if (format.supported === 'Supported') badges.push(['Supported', 'green']);
  if (format.supported === 'Unsupported') badges.push(['Unsupported', 'slate']);
  if (format.supported === 'Experimental') badges.push(['Experimental', 'orange']);
  if (format.privacy_level?.toLowerCase().includes('privacy')) badges.push(['Privacy Coin', 'red']);
  if (format.family === 'EVM') badges.push(['EVM', 'purple']);
  if (format.family === 'Bitcoin') badges.push(['Bitcoin', 'cyan']);
  if (format.chain.includes('Layer') || ['Base', 'Optimism', 'Arbitrum', 'Linea', 'Scroll', 'Mantle'].includes(format.chain)) badges.push(['Layer 2', 'orange']);
  if (!badges.some(([label]) => label === 'Layer 2')) badges.push(['Layer 1', 'slate']);
  return badges;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  const headers = ['chain', 'symbol', 'family', 'address_type', 'prefix', 'min_length', 'max_length', 'encoding', 'checksum', 'traceability', 'privacy_level', 'supported', 'notes', 'example'];
  const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map(row => headers.map(header => escape(row[header])).join(','))].join('\n');
}

export default function AddressIntelligence() {
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const [supported, setSupported] = useState('');
  const [sortKey, setSortKey] = useState('chain');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    getAddressFormats()
      .then(setFormats)
      .catch(err => console.error('Failed to load address formats', err))
      .finally(() => setLoading(false));
  }, []);

  const result = useMemo(() => validateAddress(address, formats), [address, formats]);
  const families = useMemo(() => [...new Set(formats.map(item => item.family))].sort(), [formats]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return formats
      .filter(item => !family || item.family === family)
      .filter(item => !supported || item.supported === supported)
      .filter(item => !q || [item.chain, item.symbol, item.family, item.address_type, item.prefix, item.encoding, item.notes].some(value => String(value).toLowerCase().includes(q)))
      .sort((a, b) => String(a[sortKey] || '').localeCompare(String(b[sortKey] || '')));
  }, [formats, query, family, supported, sortKey]);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-axon-cyan font-mono text-sm tracking-widest">LOADING ADDRESS FORMAT REFERENCE...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-fade-in space-y-6">
      <div className="border-b border-axon-border pb-6">
        <div className="flex items-center gap-3 mb-3">
          <Badge tone="cyan">Forensic Reference</Badge>
          <Badge tone="slate">Local Format Validation</Badge>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Address Intelligence & Format Reference</h1>
        <p className="text-axon-text-muted mt-2 max-w-3xl text-sm">
          Validate cryptocurrency address evidence, identify possible blockchain formats, and confirm AXON native investigation support before opening a case workflow.
        </p>
      </div>

      <section className="grid xl:grid-cols-[minmax(0,1fr)_390px] gap-5">
        <div className="bg-axon-surface border border-axon-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Evidence Address</h2>
            <span className="text-[10px] text-axon-text-dim font-mono">{address.trim().length || 0} characters</span>
          </div>
          <textarea
            value={address}
            onChange={event => setAddress(event.target.value)}
            spellCheck="false"
            placeholder="Paste cryptocurrency address evidence..."
            className="w-full min-h-[120px] bg-axon-bg border border-axon-border rounded-lg p-4 text-sm text-white font-mono outline-none focus:border-axon-cyan resize-y placeholder:text-axon-text-dim"
          />
          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-axon-bg border border-axon-border rounded p-3">
              <div className="text-axon-text-dim font-mono uppercase text-[10px]">Reference Records</div>
              <div className="text-white text-xl font-bold mt-1">{formats.length}</div>
            </div>
            <div className="bg-axon-bg border border-axon-border rounded p-3">
              <div className="text-axon-text-dim font-mono uppercase text-[10px]">Native AXON</div>
              <div className="text-axon-green text-xl font-bold mt-1">{formats.filter(item => item.supported === 'Supported').length}</div>
            </div>
            <div className="bg-axon-bg border border-axon-border rounded p-3">
              <div className="text-axon-text-dim font-mono uppercase text-[10px]">Privacy Formats</div>
              <div className="text-axon-red text-xl font-bold mt-1">{formats.filter(item => item.privacy_level?.toLowerCase().includes('privacy')).length}</div>
            </div>
          </div>
        </div>

        <aside className="bg-axon-surface border border-axon-border rounded-lg p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Validation Result</h2>
          {!result && (
            <div className="text-sm text-axon-text-muted border border-dashed border-axon-border rounded p-5">
              Paste an address to run local format recognition.
            </div>
          )}
          {result && !result.valid && (
            <div className="space-y-4">
              <Badge tone="red">Invalid or Unknown Format</Badge>
              <p className="text-sm text-axon-text-muted">No loaded reference format matched the prefix, encoding, and length profile.</p>
            </div>
          )}
          {result?.valid && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge tone="green">Valid Address Format</Badge>
                {result.ambiguous && <Badge tone="orange">Ambiguous</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ['Detected Family', result.primary.family],
                  ['Possible Network', result.primary.chain],
                  ['Address Type', result.primary.address_type],
                  ['Encoding', result.primary.encoding],
                  ['Length', `${result.address.length} Characters`],
                  ['Prefix', result.primary.prefix],
                  ['Checksum', result.checksum],
                  ['Traceability', result.primary.traceability],
                  ['AXON Native Support', result.primary.supported],
                  ['Investigation Module', result.primary.supported === 'Supported' ? `${result.primary.family} Investigation` : 'Reference Only'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-axon-bg border border-axon-border rounded p-3">
                    <div className="text-[10px] uppercase tracking-wider text-axon-text-dim font-mono">{label}</div>
                    <div className="text-white mt-1 font-semibold">{value}</div>
                  </div>
                ))}
              </div>
              {/^0x[0-9a-fA-F]{40}$/.test(result.address) && (
                <div className="bg-axon-orange/10 border border-axon-orange/25 rounded p-3">
                  <div className="text-axon-orange text-xs font-bold uppercase tracking-wider mb-2">Format alone cannot determine blockchain.</div>
                  <div className="flex flex-wrap gap-1.5">
                    {EVM_CHAINS.map(chain => <Badge key={chain} tone="slate">{chain}</Badge>)}
                  </div>
                  <p className="text-xs text-axon-text-muted mt-3">Use transaction history or RPC probing.</p>
                </div>
              )}
              <div className="text-xs text-axon-text-muted leading-relaxed border-t border-axon-border pt-3">
                {result.primary.notes}
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="bg-axon-surface border border-axon-border rounded-lg overflow-hidden">
        <div className="p-5 border-b border-axon-border space-y-4">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Reference Database</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => downloadFile('axon-address-formats.csv', toCsv(filtered), 'text/csv')} className="axon-button py-2 px-3 text-xs">Export CSV</button>
              <button onClick={() => downloadFile('axon-address-formats.json', JSON.stringify(filtered, null, 2), 'application/json')} className="axon-button py-2 px-3 text-xs">Export JSON</button>
            </div>
          </div>
          <div className="grid md:grid-cols-[minmax(0,1fr)_180px_170px_170px] gap-3">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search chain, prefix, encoding, notes..." className="axon-input" />
            <select value={family} onChange={event => setFamily(event.target.value)} className="axon-input">
              <option value="">All families</option>
              {families.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={supported} onChange={event => setSupported(event.target.value)} className="axon-input">
              <option value="">All support</option>
              <option value="Supported">Supported</option>
              <option value="Experimental">Experimental</option>
              <option value="Unsupported">Unsupported</option>
            </select>
            <select value={sortKey} onChange={event => setSortKey(event.target.value)} className="axon-input">
              <option value="chain">Sort by chain</option>
              <option value="family">Sort by family</option>
              <option value="supported">Sort by support</option>
              <option value="privacy_level">Sort by privacy</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-axon-border bg-axon-bg/60">
                {['Chain', 'Type', 'Prefix', 'Length', 'Encoding', 'Checksum', 'Traceability', 'Badges', 'Example'].map(header => (
                  <th key={header} className="px-4 py-3 text-[10px] font-bold text-axon-text-dim uppercase tracking-widest whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(format => (
                <tr key={format.id} className="border-b border-axon-border/60 hover:bg-axon-bg/70 align-top">
                  <td className="px-4 py-4">
                    <div className="font-bold text-white">{format.chain}</div>
                    <div className="text-xs text-axon-text-dim font-mono">{format.symbol} / {format.family}</div>
                  </td>
                  <td className="px-4 py-4 text-axon-text-muted min-w-[190px]">{format.address_type}</td>
                  <td className="px-4 py-4 font-mono text-xs text-axon-cyan">{format.prefix}</td>
                  <td className="px-4 py-4 font-mono text-xs text-axon-text-muted">{format.min_length}-{format.max_length}</td>
                  <td className="px-4 py-4 text-xs text-axon-text-muted">{format.encoding}</td>
                  <td className="px-4 py-4 text-xs text-axon-text-muted min-w-[160px]">{format.checksum}</td>
                  <td className="px-4 py-4 text-xs text-axon-text-muted">{format.traceability}</td>
                  <td className="px-4 py-4 min-w-[210px]">
                    <div className="flex flex-wrap gap-1.5">
                      {formatBadges(format).map(([label, tone]) => <Badge key={label} tone={tone}>{label}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-4 min-w-[220px]">
                    <button onClick={() => copy(format.example, format.id)} className="group flex items-center gap-2 text-left">
                      <span className="font-mono text-xs text-axon-text-muted group-hover:text-white break-all">{format.example.slice(0, 28)}...</span>
                      <span className="text-[10px] text-axon-cyan">{copiedId === format.id ? 'Copied' : 'Copy'}</span>
                    </button>
                    <div className="mt-2 text-xs text-axon-text-dim max-w-[360px]">{format.notes}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-10 text-center text-axon-text-dim font-mono text-sm">No address formats match the current filters.</div>}
        </div>
      </section>
    </div>
  );
}
