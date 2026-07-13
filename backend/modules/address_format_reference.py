"""
AXON address format reference corpus.

These records seed the address_formats table only when it is empty. The page
then reads from the table so Supabase can be extended without frontend changes.
"""
from database.db import SessionLocal
from database.models import AddressFormat


ADDRESS_FORMATS = [
    {
        "chain": "Bitcoin", "symbol": "BTC", "family": "Bitcoin", "address_type": "Legacy P2PKH",
        "prefix": "1", "min_length": 26, "max_length": 35, "encoding": "Base58Check",
        "checksum": "Double SHA-256 Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Supported",
        "notes": "Classic Bitcoin pay-to-public-key-hash format. Native tracing is supported, but attribution requires clustering, exchange intelligence, and transaction context.",
        "example": "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
    },
    {
        "chain": "Bitcoin", "symbol": "BTC", "family": "Bitcoin", "address_type": "Script Hash P2SH",
        "prefix": "3", "min_length": 26, "max_length": 35, "encoding": "Base58Check",
        "checksum": "Double SHA-256 Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Supported",
        "notes": "Often used for multisig and wrapped SegWit. Format does not reveal the redeem script until spent.",
        "example": "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    },
    {
        "chain": "Bitcoin", "symbol": "BTC", "family": "Bitcoin", "address_type": "Native SegWit P2WPKH/P2WSH",
        "prefix": "bc1q", "min_length": 42, "max_length": 62, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Supported",
        "notes": "Native SegWit address. Bech32 checksum is local-verifiable and rejects mixed case.",
        "example": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kg3g4ty",
    },
    {
        "chain": "Bitcoin", "symbol": "BTC", "family": "Bitcoin", "address_type": "Taproot P2TR",
        "prefix": "bc1p", "min_length": 62, "max_length": 62, "encoding": "Bech32m",
        "checksum": "Bech32m polymod", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Supported",
        "notes": "Taproot output. Script-path details may remain hidden unless the script path is spent.",
        "example": "bc1p5cyxnuxmeuwuvkwfem96lxxss9d8x90r2f3duq",
    },
    {
        "chain": "Bitcoin Testnet", "symbol": "tBTC", "family": "Bitcoin", "address_type": "Testnet Legacy/SegWit/Taproot",
        "prefix": "m,n,2,tb1", "min_length": 26, "max_length": 90, "encoding": "Base58Check / Bech32 / Bech32m",
        "checksum": "Base58Check or Bech32 family", "traceability": "Public Testnet",
        "privacy_level": "Test Network", "supported": "Experimental",
        "notes": "Testing network only. Do not treat testnet activity as economic evidence.",
        "example": "tb1qfm7k2a7d9h3x5s9h7j0xk4s4c8yk9sv9g4kz3n",
    },
    {
        "chain": "Bitcoin Cash", "symbol": "BCH", "family": "Bitcoin Cash", "address_type": "CashAddr",
        "prefix": "bitcoincash:q,p", "min_length": 42, "max_length": 55, "encoding": "CashAddr",
        "checksum": "CashAddr checksum", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "CashAddr is visually distinct from Bitcoin, but legacy BCH addresses can collide with BTC-style formatting.",
        "example": "bitcoincash:qq07l3q9q7s7w3v9tx8s7yq9qv8h65a8xyd9ahx0f5",
    },
    {
        "chain": "Bitcoin SV", "symbol": "BSV", "family": "Bitcoin", "address_type": "Legacy P2PKH/P2SH",
        "prefix": "1,3", "min_length": 26, "max_length": 35, "encoding": "Base58Check",
        "checksum": "Double SHA-256 Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "Shares legacy-looking address formats with Bitcoin. Format alone cannot reliably separate BTC, BCH legacy, and BSV.",
        "example": "1KzTSfqjF2iKCduwz59nv2uqh1W2JsTxZH",
    },
    {
        "chain": "Litecoin", "symbol": "LTC", "family": "Bitcoin", "address_type": "Legacy/P2SH/SegWit",
        "prefix": "L,M,ltc1", "min_length": 26, "max_length": 90, "encoding": "Base58Check / Bech32",
        "checksum": "Base58Check or Bech32", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "Litecoin has legacy and Bech32 formats. Older P2SH addresses may be confused with Bitcoin 3-prefix addresses.",
        "example": "ltc1qgk6q3ad6g3dl9kn8c4h4f8s4w7g2m9kv2d7x9h",
    },
    {
        "chain": "Dogecoin", "symbol": "DOGE", "family": "Bitcoin", "address_type": "P2PKH/P2SH",
        "prefix": "D,9,A", "min_length": 26, "max_length": 35, "encoding": "Base58Check",
        "checksum": "Double SHA-256 Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "Dogecoin addresses are transparent and UTXO-based. Investigation patterns resemble Bitcoin-family tracing.",
        "example": "D8BmdC4ePwpjZ8fGx1tYz9k4HXpM9pZk9x",
    },
    {
        "chain": "Ethereum", "symbol": "ETH", "family": "EVM", "address_type": "EOA or Contract",
        "prefix": "0x", "min_length": 42, "max_length": 42, "encoding": "Hex",
        "checksum": "Optional EIP-55 mixed-case checksum", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Supported",
        "notes": "EOA and contracts share the same address format. Format alone cannot identify chain; use transaction history or RPC probing.",
        "example": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    },
    {
        "chain": "All EVM Chains", "symbol": "EVM", "family": "EVM", "address_type": "EOA or Contract",
        "prefix": "0x", "min_length": 42, "max_length": 42, "encoding": "Hex",
        "checksum": "Optional EIP-55 mixed-case checksum", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Supported",
        "notes": "Possible chains include Ethereum, BNB Smart Chain, Polygon, Base, Optimism, Arbitrum, Avalanche C, Fantom, Linea, Scroll, Mantle, and many others.",
        "example": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    },
    {
        "chain": "Solana", "symbol": "SOL", "family": "Solana", "address_type": "Account Public Key",
        "prefix": "None", "min_length": 32, "max_length": 44, "encoding": "Base58",
        "checksum": "None", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Supported",
        "notes": "Any account, token account, or program can share this public-key format. Ownership and account type require chain state.",
        "example": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg19",
    },
    {
        "chain": "TRON", "symbol": "TRX", "family": "TRON", "address_type": "Account or Contract",
        "prefix": "T", "min_length": 34, "max_length": 34, "encoding": "Base58Check",
        "checksum": "Double SHA-256 Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Supported",
        "notes": "TRON addresses encode a 0x41 network byte. Contracts and accounts are not distinguishable by format alone.",
        "example": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    },
    {
        "chain": "XRP Ledger", "symbol": "XRP", "family": "XRP", "address_type": "Classic Address",
        "prefix": "r", "min_length": 25, "max_length": 35, "encoding": "Base58Check",
        "checksum": "XRP Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Exchange deposits commonly require destination tags. Missing tags are an evidence-handling issue, not an address-format issue.",
        "example": "rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh",
    },
    {
        "chain": "Stellar", "symbol": "XLM", "family": "Stellar", "address_type": "Public Account",
        "prefix": "G", "min_length": 56, "max_length": 56, "encoding": "StrKey Base32",
        "checksum": "CRC16-XModem", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Stellar deposits may require memos. G-prefix accounts differ from secret S-prefix seeds, which must be handled as sensitive material.",
        "example": "GDQP2YNOF3XFW3G2O4XTK6W2GO7A2N6GJVTK6Y5UH2V3NMJU6AO7PZ7L",
    },
    {
        "chain": "Cardano", "symbol": "ADA", "family": "Cardano", "address_type": "Shelley / Byron",
        "prefix": "addr1,addr_test1,DdzFF", "min_length": 59, "max_length": 120, "encoding": "Bech32 / Base58",
        "checksum": "Bech32 or CBOR-era checksum", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "Shelley addresses often start with addr1. Stake credentials can link multiple payment addresses.",
        "example": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3h2z5r5z6",
    },
    {
        "chain": "Avalanche C-Chain", "symbol": "AVAX", "family": "EVM", "address_type": "C-Chain EVM Address",
        "prefix": "0x", "min_length": 42, "max_length": 42, "encoding": "Hex",
        "checksum": "Optional EIP-55", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Supported",
        "notes": "C-Chain uses EVM addresses. Format alone cannot distinguish Avalanche C-Chain from other EVM networks.",
        "example": "0x8db97c7cece249c2b98bdc0226cc4c2a57bf52fc",
    },
    {
        "chain": "Near", "symbol": "NEAR", "family": "Near", "address_type": "Named or Implicit Account",
        "prefix": ".near,.testnet or 64 hex", "min_length": 2, "max_length": 64, "encoding": "Account name / Hex",
        "checksum": "Account rules", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Named accounts resolve to implicit accounts. Format alone may be a readable account name, not a public key.",
        "example": "alice.near",
    },
    {
        "chain": "Algorand", "symbol": "ALGO", "family": "Algorand", "address_type": "Account Address",
        "prefix": "None", "min_length": 58, "max_length": 58, "encoding": "Base32",
        "checksum": "SHA-512/256 checksum", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Algorand addresses are uppercase Base32 and include a checksum. Asset holdings require indexer context.",
        "example": "IB3NJQ7XIRUGI3XEBQDR3Z5QXW3NHTR2YZWY6GY7E5J7NC4KZ3PNU6VN64",
    },
    {
        "chain": "Cosmos Hub", "symbol": "ATOM", "family": "Cosmos", "address_type": "Account Address",
        "prefix": "cosmos1", "min_length": 39, "max_length": 45, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Cosmos SDK chains are prefix-distinguished. Same key material can map to different chain prefixes.",
        "example": "cosmos1p8s4e8h4f6z9k5j7m6x3w2q7n9v5h3c2a1l9m0",
    },
    {
        "chain": "Osmosis", "symbol": "OSMO", "family": "Cosmos", "address_type": "Account Address",
        "prefix": "osmo1", "min_length": 39, "max_length": 45, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Cosmos SDK address. IBC activity may move value across chains without changing user-controlled key material.",
        "example": "osmo1p8s4e8h4f6z9k5j7m6x3w2q7n9v5h3c2gk0n4",
    },
    {
        "chain": "Celestia", "symbol": "TIA", "family": "Cosmos", "address_type": "Account Address",
        "prefix": "celestia1", "min_length": 43, "max_length": 50, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Celestia uses Cosmos-style Bech32 addresses with a chain-specific human-readable prefix.",
        "example": "celestia1p8s4e8h4f6z9k5j7m6x3w2q7n9v5h3c2j3dn2q",
    },
    {
        "chain": "Injective", "symbol": "INJ", "family": "Cosmos/EVM", "address_type": "Account Address",
        "prefix": "inj1", "min_length": 39, "max_length": 45, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Injective accounts may also map to Ethereum-style keys. Check chain context before attribution.",
        "example": "inj1p8s4e8h4f6z9k5j7m6x3w2q7n9v5h3c2rd2uh5",
    },
    {
        "chain": "Sei", "symbol": "SEI", "family": "Cosmos/EVM", "address_type": "Account Address",
        "prefix": "sei1", "min_length": 39, "max_length": 45, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Experimental",
        "notes": "Sei supports Cosmos-style and EVM-compatible account activity depending on network version and tooling.",
        "example": "sei1p8s4e8h4f6z9k5j7m6x3w2q7n9v5h3c2ll7q4",
    },
    {
        "chain": "Polkadot", "symbol": "DOT", "family": "Substrate", "address_type": "SS58 Account",
        "prefix": "1", "min_length": 47, "max_length": 48, "encoding": "SS58 Base58",
        "checksum": "SS58 checksum", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "SS58 network prefix matters. The same public key can be displayed differently across Substrate chains.",
        "example": "15oF4LqgcpLMeFqJfC5R4YV8S9R8hE9L6hYqT5zYv7sH3v4",
    },
    {
        "chain": "Kusama", "symbol": "KSM", "family": "Substrate", "address_type": "SS58 Account",
        "prefix": "C,D,E,F,G,H,J", "min_length": 47, "max_length": 48, "encoding": "SS58 Base58",
        "checksum": "SS58 checksum", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Kusama uses SS58 with its own network prefix. Do not infer Polkadot from SS58 length alone.",
        "example": "CpjsLtwV1v3z4C8YyL9QwqN9Yk2B3xZt6YpQm7S8R9n2K3L",
    },
    {
        "chain": "TON", "symbol": "TON", "family": "TON", "address_type": "Bounceable / Non-Bounceable",
        "prefix": "EQ,UQ,kQ,0:", "min_length": 48, "max_length": 66, "encoding": "Base64url / raw",
        "checksum": "CRC16", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Experimental",
        "notes": "TON has bounceable and non-bounceable user-friendly forms. Raw workchain:hash format is also common.",
        "example": "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
    },
    {
        "chain": "Hedera", "symbol": "HBAR", "family": "Hedera", "address_type": "Account ID / EVM Alias",
        "prefix": "0.0. or 0x", "min_length": 5, "max_length": 42, "encoding": "Shard.realm.num / Hex",
        "checksum": "Optional Hedera checksum", "traceability": "Public Ledger",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Hedera account IDs such as 0.0.12345 differ from EVM aliases. Preserve both forms in evidence notes.",
        "example": "0.0.123456",
    },
    {
        "chain": "Monero", "symbol": "XMR", "family": "Monero", "address_type": "Standard / Integrated / Subaddress",
        "prefix": "4,8", "min_length": 95, "max_length": 106, "encoding": "Monero Base58",
        "checksum": "Keccak checksum", "traceability": "Privacy Chain",
        "privacy_level": "High Privacy", "supported": "Unsupported",
        "notes": "On-chain tracing is not possible in the conventional sense. Use endpoint intelligence, exchange records, malware telemetry, and seizure context.",
        "example": "48AJSRkQj7NiiT4Z9bFZ9uP9B2LzJ3pQYhJ9yLkQ1rM8nS6wP3tV7xK9mN2qR5sT8uW1xY4zA7bC9dE2fG5h",
    },
    {
        "chain": "Zcash", "symbol": "ZEC", "family": "Zcash", "address_type": "Transparent / Shielded",
        "prefix": "t1,t3,zs,u", "min_length": 35, "max_length": 141, "encoding": "Base58Check / Bech32m",
        "checksum": "Format-dependent checksum", "traceability": "Mixed",
        "privacy_level": "Optional Privacy", "supported": "Unsupported",
        "notes": "Transparent addresses are traceable; shielded pools obscure sender, receiver, and amount depending on pool and transaction type.",
        "example": "t1Z7XQwY9QxQv7S6v4w3p2m1k9j8h7g6f5d4s3a2P",
    },
    {
        "chain": "Dash", "symbol": "DASH", "family": "Bitcoin", "address_type": "P2PKH/P2SH",
        "prefix": "X,7", "min_length": 34, "max_length": 34, "encoding": "Base58Check",
        "checksum": "Double SHA-256 Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Optional CoinJoin", "supported": "Unsupported",
        "notes": "Dash PrivateSend uses CoinJoin-style mixing. Normal address format does not indicate whether funds passed through PrivateSend.",
        "example": "Xw8w9T9xF6q4QzVf5CjM9pN2sR3uT4vW5x",
    },
    {
        "chain": "Aptos", "symbol": "APT", "family": "Move", "address_type": "Account Address",
        "prefix": "0x", "min_length": 3, "max_length": 66, "encoding": "Hex",
        "checksum": "None", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Experimental",
        "notes": "Similar visual prefix to EVM, but full Aptos account addresses are 66 characters including 0x.",
        "example": "0x1f3a9c8e7b6d5a4c3f2e1d0c9b8a7968574635241302ffeeddccbbaa99887766",
    },
    {
        "chain": "Sui", "symbol": "SUI", "family": "Move", "address_type": "Account Address",
        "prefix": "0x", "min_length": 66, "max_length": 66, "encoding": "Hex",
        "checksum": "None", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Experimental",
        "notes": "Sui account addresses use 32-byte hex. Do not classify a 66-character 0x value as EVM.",
        "example": "0x8d2f4c6b9a1e3d5f7b0c2a4e6f8d1b3c5a7e9f1029384756abcdefabcdef1234",
    },
    {
        "chain": "VeChain", "symbol": "VET", "family": "EVM-like", "address_type": "Account Address",
        "prefix": "0x", "min_length": 42, "max_length": 42, "encoding": "Hex",
        "checksum": "Optional mixed-case checksum", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "VeChain addresses resemble EVM addresses. Chain identity requires context beyond format.",
        "example": "0x7567d83b7b8d80addcb281a71d54fc7b3364ffed",
    },
    {
        "chain": "Theta", "symbol": "THETA", "family": "EVM-like", "address_type": "Account Address",
        "prefix": "0x", "min_length": 42, "max_length": 42, "encoding": "Hex",
        "checksum": "Optional mixed-case checksum", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Theta account format is EVM-like. Use chain-specific explorers or RPC data for confirmation.",
        "example": "0x2e833968e5bb786ae419c4d13189fb081cc43bab",
    },
    {
        "chain": "Ravencoin", "symbol": "RVN", "family": "Bitcoin", "address_type": "P2PKH/P2SH",
        "prefix": "R,r", "min_length": 26, "max_length": 35, "encoding": "Base58Check",
        "checksum": "Double SHA-256 Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "UTXO chain with asset issuance features. Asset movement may be relevant to fraud cases.",
        "example": "RXBurnXXXXXXXXXXXXXXXXXXXXXXWUo9FV",
    },
    {
        "chain": "Decred", "symbol": "DCR", "family": "Bitcoin", "address_type": "P2PKH/P2SH",
        "prefix": "Ds,Dc", "min_length": 35, "max_length": 36, "encoding": "Base58Check",
        "checksum": "Blake-256 checksum variant", "traceability": "Public Blockchain",
        "privacy_level": "Optional Mixing", "supported": "Unsupported",
        "notes": "Decred supports privacy mixing. Address format alone does not indicate mixed transaction history.",
        "example": "DsUZxxoHJSty8DCfwfartwTYbuhmVct7tJu",
    },
    {
        "chain": "Vertcoin", "symbol": "VTC", "family": "Bitcoin", "address_type": "P2PKH/P2SH/SegWit",
        "prefix": "V,3,vtc1", "min_length": 26, "max_length": 90, "encoding": "Base58Check / Bech32",
        "checksum": "Base58Check or Bech32", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "Bitcoin-derived UTXO chain. Prefix overlap means format recognition should preserve uncertainty.",
        "example": "vtc1qgk6q3ad6g3dl9kn8c4h4f8s4w7g2m9kq6s3px",
    },
    {
        "chain": "Peercoin", "symbol": "PPC", "family": "Bitcoin", "address_type": "P2PKH/P2SH",
        "prefix": "P,p", "min_length": 26, "max_length": 35, "encoding": "Base58Check",
        "checksum": "Double SHA-256 Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "Bitcoin-style address family. Confirm chain by transaction evidence before attribution.",
        "example": "PC9A2GkL3N4pQ5rS6tU7vW8xY9zAbCdEfG",
    },
    {
        "chain": "Namecoin", "symbol": "NMC", "family": "Bitcoin", "address_type": "P2PKH/P2SH",
        "prefix": "N,M", "min_length": 26, "max_length": 35, "encoding": "Base58Check",
        "checksum": "Double SHA-256 Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "Bitcoin-derived chain with name registration activity. Preserve domain/name evidence separately from address evidence.",
        "example": "N2a5b8c9d3e4f6g7h8j9kLmNpQrStUvWx",
    },
    {
        "chain": "Beam", "symbol": "BEAM", "family": "Mimblewimble", "address_type": "Wallet Address",
        "prefix": "beam", "min_length": 50, "max_length": 120, "encoding": "Base58 / Slatepack-style",
        "checksum": "Format-dependent", "traceability": "Privacy Chain",
        "privacy_level": "High Privacy", "supported": "Unsupported",
        "notes": "Mimblewimble privacy limits public tracing. Emphasize endpoint and exchange records.",
        "example": "beam1qv8w9x0y2z3a4b5c6d7e8f9g0h1j2k3m4n5p6q7r8s9t0u",
    },
    {
        "chain": "Grin", "symbol": "GRIN", "family": "Mimblewimble", "address_type": "Slatepack Address",
        "prefix": "grin", "min_length": 52, "max_length": 80, "encoding": "Bech32-like Slatepack",
        "checksum": "Slatepack checksum", "traceability": "Privacy Chain",
        "privacy_level": "High Privacy", "supported": "Unsupported",
        "notes": "Grin does not provide conventional reusable on-chain addresses. Treat slatepack strings as communication/payment artifacts.",
        "example": "grin1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
    },
    {
        "chain": "Filecoin", "symbol": "FIL", "family": "Filecoin", "address_type": "Secp256k1 / BLS / Delegated",
        "prefix": "f1,f3,f4,f0", "min_length": 7, "max_length": 90, "encoding": "Base32 lower",
        "checksum": "Blake2b-based checksum", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "f1 = secp256k1 actor, f3 = BLS actor, f4 = delegated (FVM/EVM-compatible), f0 = actor ID. Prefix determines address type.",
        "example": "f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za",
    },
    {
        "chain": "Internet Computer", "symbol": "ICP", "family": "ICP", "address_type": "Account Identifier / Principal",
        "prefix": "None", "min_length": 27, "max_length": 64, "encoding": "Hex / Textual encoding",
        "checksum": "CRC32 checksum", "traceability": "Public Ledger",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "ICP uses two formats: 64-char hex Account Identifiers (for ICP transfers) and shorter Principal IDs (for canister calls). Do not confuse the two.",
        "example": "e8d4b24f0ea3c2d876745e42d6e89c19d6c1f3a9b7e5d2c1a0f8b6e4d2c0a1b3",
    },
    {
        "chain": "Kaspa", "symbol": "KAS", "family": "Kaspa", "address_type": "Schnorr / ECDSA",
        "prefix": "kaspa:", "min_length": 67, "max_length": 70, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain (DAG)",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "Kaspa uses a BlockDAG architecture. Addresses use the kaspa: prefix with Bech32 encoding.",
        "example": "kaspa:qr5t5yqzrtwcdq8gk9wey6sxyg2xplnrv48tg9v47t",
    },
    {
        "chain": "Fantom", "symbol": "FTM", "family": "EVM", "address_type": "EOA or Contract",
        "prefix": "0x", "min_length": 42, "max_length": 42, "encoding": "Hex",
        "checksum": "Optional EIP-55", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Supported",
        "notes": "Fantom Opera is a full EVM-compatible chain. Addresses are indistinguishable from Ethereum by format alone.",
        "example": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
    },
    {
        "chain": "Cronos", "symbol": "CRO", "family": "EVM", "address_type": "EOA or Contract",
        "prefix": "0x", "min_length": 42, "max_length": 42, "encoding": "Hex",
        "checksum": "Optional EIP-55", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Supported",
        "notes": "Cronos is an EVM-compatible chain by Crypto.com. Also has a Cosmos-style cro1 address for the native chain.",
        "example": "0x5c7f8a570d578ed60e5e6a47b3bbbf2f7e78c0a5",
    },
    {
        "chain": "MultiversX", "symbol": "EGLD", "family": "MultiversX", "address_type": "Account Address",
        "prefix": "erd1", "min_length": 62, "max_length": 62, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Formerly Elrond. Uses erd1 Bech32 prefix. Smart contract addresses also start with erd1.",
        "example": "erd1qqqqqqqqqqqqqpgqp699jngundfqw3d0h6nk2r0cxm8k5g7rlsss8cgyml",
    },
    {
        "chain": "Zilliqa", "symbol": "ZIL", "family": "Zilliqa", "address_type": "Account Address",
        "prefix": "zil1", "min_length": 42, "max_length": 42, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Zilliqa uses zil1 Bech32 addresses. Also has a legacy 0x Base16 format — both represent the same account.",
        "example": "zil1v25at4s3eh9w34uqqhe3vdlf3mntu2zqe3ewgr",
    },
    {
        "chain": "Tezos", "symbol": "XTZ", "family": "Tezos", "address_type": "Implicit / Originated",
        "prefix": "tz1,tz2,tz3,KT1", "min_length": 36, "max_length": 36, "encoding": "Base58Check",
        "checksum": "Blake2b Base58Check", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "tz1 = Ed25519, tz2 = secp256k1, tz3 = P-256. KT1 addresses are originated smart contracts. Prefix distinguishes key type.",
        "example": "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
    },
    {
        "chain": "EOS", "symbol": "EOS", "family": "EOSIO", "address_type": "Named Account",
        "prefix": "None", "min_length": 1, "max_length": 12, "encoding": "Lowercase alphanumeric + dots",
        "checksum": "Account name rules", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "EOS accounts are human-readable names up to 12 characters (a-z, 1-5, dots). Premium names can be shorter. Account creation requires an existing account.",
        "example": "eosio.token",
    },
    {
        "chain": "IOTA", "symbol": "IOTA", "family": "IOTA", "address_type": "Stardust / Chrysalis",
        "prefix": "iota1,smr1", "min_length": 60, "max_length": 66, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public DAG",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "IOTA uses a DAG (Tangle) architecture. Post-Chrysalis addresses use Bech32 encoding with iota1 prefix. Shimmer uses smr1.",
        "example": "iota1qp0r7e76wfrayh7k3rgj8cnd8al0gsh0dh7cjfu",
    },
    {
        "chain": "Harmony", "symbol": "ONE", "family": "EVM", "address_type": "Account Address",
        "prefix": "one1", "min_length": 42, "max_length": 42, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Harmony is EVM-compatible but uses a one1 Bech32 display format. The underlying key is the same as a 0x EVM address.",
        "example": "one1a2b3c4d5e6f7g8h9j0k1l2m3n4o5p6q7r8s9t0",
    },
    {
        "chain": "Celo", "symbol": "CELO", "family": "EVM", "address_type": "EOA or Contract",
        "prefix": "0x", "min_length": 42, "max_length": 42, "encoding": "Hex",
        "checksum": "Optional EIP-55", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Supported",
        "notes": "Celo is a full EVM-compatible chain focused on mobile payments. Addresses are standard EVM format.",
        "example": "0x471ece3750da237f93b8e339c536989b8978a438",
    },
    {
        "chain": "Klaytn", "symbol": "KLAY", "family": "EVM", "address_type": "EOA or Contract",
        "prefix": "0x", "min_length": 42, "max_length": 42, "encoding": "Hex",
        "checksum": "Optional EIP-55", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Klaytn is an EVM-compatible chain by Kakao. Format is identical to Ethereum addresses.",
        "example": "0xc6a2ad8cc6e4a7e08fc37cc5954be07d499e7654",
    },
    {
        "chain": "Stacks", "symbol": "STX", "family": "Stacks", "address_type": "Standard / Contract",
        "prefix": "SP,ST", "min_length": 36, "max_length": 41, "encoding": "Crockford Base32",
        "checksum": "c32check", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Stacks is a Bitcoin Layer-2. SP prefix is mainnet, ST is testnet. Smart contracts append .contract-name to the deployer address.",
        "example": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    },
    {
        "chain": "Arweave", "symbol": "AR", "family": "Arweave", "address_type": "Wallet Address",
        "prefix": "None", "min_length": 43, "max_length": 43, "encoding": "Base64url",
        "checksum": "None", "traceability": "Permanent Storage",
        "privacy_level": "Pseudonymous", "supported": "Unsupported",
        "notes": "Arweave wallet addresses are 43-character Base64url-encoded SHA-256 hashes of RSA public keys. Data stored on Arweave is permanent.",
        "example": "Fq1aHb3BpTFQv1pMh9RCwLz1g7ER5k0aF3j1fxVSbZQ",
    },
    {
        "chain": "Secret Network", "symbol": "SCRT", "family": "Cosmos", "address_type": "Account Address",
        "prefix": "secret1", "min_length": 45, "max_length": 45, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Privacy Chain",
        "privacy_level": "Optional Privacy", "supported": "Unsupported",
        "notes": "Cosmos SDK chain with privacy-preserving smart contracts (Secret Contracts). On-chain data for Secret Contracts is encrypted.",
        "example": "secret1p8s4e8h4f6z9k5j7m6x3w2q7n9v5h3c2xyzuvw",
    },
    {
        "chain": "THORChain", "symbol": "RUNE", "family": "Cosmos", "address_type": "Account Address",
        "prefix": "thor1", "min_length": 43, "max_length": 43, "encoding": "Bech32",
        "checksum": "Bech32 polymod", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "THORChain enables cross-chain swaps without wrapping. Investigate cross-chain flows carefully — funds may move to/from BTC, ETH, etc.",
        "example": "thor1p8s4e8h4f6z9k5j7m6x3w2q7n9v5h3c2abcdef",
    },
    {
        "chain": "Flow", "symbol": "FLOW", "family": "Flow", "address_type": "Account Address",
        "prefix": "0x", "min_length": 18, "max_length": 18, "encoding": "Hex",
        "checksum": "None", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Flow addresses are shorter than EVM (16 hex chars + 0x prefix = 18 total). Do not confuse with EVM addresses which are 42 characters.",
        "example": "0xe467b9dd11fa00df",
    },
    {
        "chain": "zkSync Era", "symbol": "ETH", "family": "EVM", "address_type": "EOA or Contract",
        "prefix": "0x", "min_length": 42, "max_length": 42, "encoding": "Hex",
        "checksum": "Optional EIP-55", "traceability": "Public Blockchain (L2)",
        "privacy_level": "Transparent", "supported": "Supported",
        "notes": "zkSync Era is an Ethereum L2 using ZK rollups. Addresses are standard EVM format. Verify chain via RPC or bridge transaction context.",
        "example": "0x3355df6d4c9c3035724fd0e3914de96a5a83aaf4",
    },
    {
        "chain": "Astar", "symbol": "ASTR", "family": "EVM/Substrate", "address_type": "EVM or SS58 Account",
        "prefix": "0x or SS58", "min_length": 42, "max_length": 48, "encoding": "Hex / SS58 Base58",
        "checksum": "EIP-55 or SS58", "traceability": "Public Blockchain",
        "privacy_level": "Transparent", "supported": "Unsupported",
        "notes": "Astar supports both EVM and Substrate native accounts. The same account may have both a 0x and SS58 representation.",
        "example": "0x7Be8076f4EA4A4AD08075c2508e481d6C946D12b",
    },
]


def seed_address_formats():
    """Seed address formats table. Inserts missing entries by chain+address_type key."""
    db = SessionLocal()
    try:
        existing_count = db.query(AddressFormat).count()
        if existing_count == 0:
            # Fresh table — bulk insert all
            db.add_all(AddressFormat(**item) for item in ADDRESS_FORMATS)
            db.commit()
            print(f"[SEED] Inserted {len(ADDRESS_FORMATS)} address formats (fresh seed).")
        else:
            # Table has data — merge only new entries
            existing_keys = set()
            for row in db.query(AddressFormat.chain, AddressFormat.address_type).all():
                existing_keys.add((row.chain, row.address_type))
            
            new_entries = []
            for item in ADDRESS_FORMATS:
                key = (item["chain"], item["address_type"])
                if key not in existing_keys:
                    new_entries.append(AddressFormat(**item))
            
            if new_entries:
                db.add_all(new_entries)
                db.commit()
                print(f"[SEED] Merged {len(new_entries)} new address formats into existing table.")
            else:
                print(f"[SEED] Address formats table up to date ({existing_count} entries).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
