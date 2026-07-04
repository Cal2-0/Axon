# AXON Address Intelligence & Format Reference

## What Was Added

A new AXON module was created called **Address Intelligence & Format Reference**.

This module is a forensic reference and validation tool for investigators who receive cryptocurrency addresses as digital evidence. It is not a blockchain explorer and it does not perform wallet investigation by itself.

The module helps investigators answer:

- Is this address format valid?
- What blockchain family does it resemble?
- What possible chain or chains could it belong to?
- What address type is it?
- What encoding and checksum model does it use?
- Is native AXON investigation supported?
- What forensic cautions should the investigator know before opening a case?

## Files Added Or Updated

### Frontend

- `frontend/src/pages/AddressIntelligence.jsx`
  - New page for address validation and reference lookup.
  - Includes paste box, validation result panel, reference database table, filters, copy, sort, CSV export, and JSON export.

- `frontend/src/App.jsx`
  - Added sidebar navigation item: **Address Reference**
  - Added route: `/address-intelligence`

- `frontend/src/api/axon.js`
  - Added `getAddressFormats()` API client function.

### Backend

- `backend/database/models.py`
  - Added the `AddressFormat` SQLAlchemy model.

- `backend/database/db.py`
  - Added startup seeding for the address format reference table.

- `backend/routers/address_formats.py`
  - Added API endpoint for reading address format records.

- `backend/main.py`
  - Registered the new `/address-formats` router.

- `backend/modules/address_format_reference.py`
  - Added the internal seed database of cryptocurrency address formats and investigator notes.

## Database Table

The new static reference table is:

```text
address_formats
```

Columns:

```text
id
chain
symbol
family
address_type
prefix
min_length
max_length
encoding
checksum
traceability
privacy_level
supported
notes
example
created_at
updated_at
```

The backend uses SQLAlchemy, so this table is created in whichever database AXON is configured to use through `DATABASE_URL`.

If `DATABASE_URL` points to Supabase/Postgres, the table is created there.

If `DATABASE_URL` is not set, AXON falls back to the local SQLite database.

## How The Data Works

On backend startup:

1. AXON initializes database tables through `init_db()`.
2. The `address_formats` table is created if it does not already exist.
3. `seed_address_formats()` runs.
4. If the table already has records, seeding is skipped.
5. If the table is empty, AXON inserts the built-in reference records.

This means new chains and formats can later be added directly in Supabase without changing frontend code.

## API Endpoint

The new backend endpoint is:

```text
GET /address-formats/
```

Optional query parameters:

```text
q
family
supported
```

Examples:

```text
GET /address-formats/
GET /address-formats/?q=bitcoin
GET /address-formats/?family=EVM
GET /address-formats/?supported=Supported
```

The frontend calls this endpoint through:

```text
getAddressFormats()
```

## How Local Validation Works

The page loads the full address format reference table once from the backend.

After that, address recognition is performed locally in the browser.

No API request is made when the investigator pastes an address for format validation.

The local validator checks:

- Address length
- Prefix
- Encoding pattern
- Known address family
- Possible matching chains
- Checksum model
- AXON support status

For Bech32 and Bech32m formats, the page performs local checksum verification.

For other checksum systems such as Base58Check, the page identifies that checksum support exists for the format, but it does not fully decode every chain-specific checksum yet.

## EVM Address Handling

Ethereum-compatible chains all share the same basic address format:

```text
0x + 40 hexadecimal characters
```

Because of this, the module intentionally does not claim that an EVM address is uniquely Ethereum.

For EVM-style addresses, the page displays:

- Detected Format: EVM Address
- Possible Chains:
  - Ethereum
  - BNB Smart Chain
  - Polygon
  - Base
  - Optimism
  - Arbitrum
  - Avalanche C
  - Fantom
  - Linea
  - Scroll
  - Mantle
  - and other EVM-compatible chains

It also displays this forensic note:

```text
Format alone cannot determine blockchain.
Use transaction history or RPC probing.
```

## Investigator Output

When an address is recognized, the page displays:

- Valid or invalid format
- Detected family
- Possible network
- Address type
- Encoding
- Length
- Prefix
- Checksum status
- Traceability
- AXON native support
- Suggested investigation module
- Investigator notes

Example output for a Bitcoin Taproot-style address:

```text
Valid Address Format
Detected Family: Bitcoin
Possible Network: Bitcoin
Address Type: Taproot P2TR
Encoding: Bech32m
Length: 62 Characters
Checksum: Valid
Traceability: Public Blockchain
AXON Native Support: Supported
Investigation Module: Bitcoin Investigation
```

## Reference Database UI

The page includes a searchable forensic reference table.

The table supports:

- Search
- Family filter
- Support-status filter
- Sort
- Copy example address
- Export CSV
- Export JSON

Each row includes badges such as:

- Supported
- Unsupported
- Experimental
- Privacy Coin
- EVM
- Bitcoin
- Layer 1
- Layer 2

## Included Format Families

The seed database includes major cryptocurrency address families such as:

- Bitcoin
- Bitcoin Cash
- Bitcoin SV
- Litecoin
- Dogecoin
- Ethereum
- All EVM chains
- Solana
- TRON
- XRP
- Stellar
- Cardano
- Avalanche C-Chain
- Near
- Algorand
- Cosmos
- Osmosis
- Celestia
- Injective
- Sei
- Polkadot
- Kusama
- TON
- Hedera
- Monero
- Zcash
- Dash
- Aptos
- Sui
- VeChain
- Theta
- Ravencoin
- Decred
- Vertcoin
- Peercoin
- Namecoin
- Beam
- Grin

## Design Direction

The page is designed to feel like a forensic reference manual.

The design direction is closer to:

- MITRE ATT&CK
- NIST reference material
- Digital forensics handbook

It intentionally avoids the feel of:

- Blockchain explorers
- Wallet dashboards
- CoinMarketCap-style market pages

## How To Use

Start the frontend and open:

```text
http://127.0.0.1:5173/address-intelligence
```

Paste a cryptocurrency address into the evidence field.

The page will immediately run local format recognition and show the matching forensic reference details.

## Verification Done

The frontend production build was tested successfully with:

```text
npm.cmd run build
```

The build completed successfully.

Backend runtime verification could not be completed in the sandbox because the local Python virtual environment executable returned an access denied error. The backend model, router, and startup wiring were still added in the codebase.
