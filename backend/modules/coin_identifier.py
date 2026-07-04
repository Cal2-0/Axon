import re
import json
import os
from typing import List, Dict, Any, Optional

import base58
import bech32
from eth_utils import is_address, is_checksum_address

with open(os.path.join(os.path.dirname(__file__), "verified_domains.json"), "r") as f:
    VERIFIED_DOMAINS = json.load(f)

BECH32M_CONST = 0x2BC830A3
BECH32_CONST = 1

EVM_NETWORKS = [
    "Ethereum", "Base", "Polygon", "Arbitrum", "Optimism", "BSC", "Avalanche",
]

AXON_SUPPORTED = {"Bitcoin", "Ethereum", "Polygon", "Solana", "Tron"}
AXON_COMING_SOON = {"Base", "Optimism", "Arbitrum", "BSC", "Avalanche"}
AXON_UNSUPPORTED = {"Litecoin", "Dogecoin"}


def _is_axon_supported(family: str, networks: List[str]) -> bool:
    if family == "EVM Compatible":
        return bool(set(networks) & AXON_SUPPORTED)
    if family in AXON_SUPPORTED:
        return True
    return bool(set(networks) & AXON_SUPPORTED)


def get_explorer_url(chain: str, address: str) -> Optional[str]:
    url_template = VERIFIED_DOMAINS.get(chain)
    if url_template:
        return url_template.replace("{addr}", address)
    return None


def _bech32_polymod(values: List[int]) -> int:
    generator = [0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3]
    chk = 1
    for value in values:
        top = chk >> 25
        chk = (chk & 0x1FFFFFF) << 5 ^ value
        for i in range(5):
            if (top >> i) & 1:
                chk ^= generator[i]
    return chk


def _bech32_hrp_expand(hrp: str) -> List[int]:
    return [ord(x) >> 5 for x in hrp] + [0] + [ord(x) & 31 for x in hrp]


def _bech32_decode_with_spec(addr: str, expected_hrp: str) -> Optional[str]:
    """Decode bech32 or bech32m. Returns 'bech32', 'bech32m', or None."""
    addr = addr.lower()
    pos = addr.rfind("1")
    if pos < 1 or pos + 7 > len(addr):
        return None
    hrp = addr[:pos]
    if hrp != expected_hrp:
        return None
    charset = bech32.CHARSET
    data = []
    for c in addr[pos + 1:]:
        if c not in charset:
            return None
        data.append(charset.index(c))
    if len(data) < 6:
        return None
    polymod = _bech32_polymod(_bech32_hrp_expand(hrp) + data)
    if polymod == BECH32_CONST:
        return "bech32"
    if polymod == BECH32M_CONST:
        return "bech32m"
    return None


def validate_base58check(address: str, expected_version_bytes: List[bytes]) -> bool:
    try:
        decoded = base58.b58decode_check(address)
        return any(decoded.startswith(vb) for vb in expected_version_bytes)
    except ValueError:
        return False


def _axon_support_lists(family: str, possible_networks: List[str]) -> Dict[str, List[str]]:
    supported, coming_soon, unsupported = [], [], []
    targets = possible_networks if possible_networks else [family]
    for net in targets:
        if net in AXON_SUPPORTED:
            supported.append(net)
        elif net in AXON_COMING_SOON:
            coming_soon.append(net)
        elif net in AXON_UNSUPPORTED:
            unsupported.append(net)
    return {"supported": supported, "coming_soon": coming_soon, "unsupported": unsupported}


def _forensic_note(family: str, address_type: str, encoding: str, prefix: str = "") -> str:
    notes = {
        "Taproot": (
            f"This address matches the Bitcoin Taproot (P2TR) specification. "
            f"Taproot addresses begin with \"{prefix}\", use the Bech32m checksum algorithm, "
            "and support improved privacy and scripting compared to legacy address types. "
            "This address format is fully supported by AXON."
        ),
        "SegWit": (
            f"This address matches the Bitcoin Native SegWit (P2WPKH/P2WSH) specification. "
            f"SegWit addresses use Bech32 encoding with HRP \"bc\" and witness version 0. "
            "This address format is fully supported by AXON."
        ),
        "P2PKH": (
            "This address matches the Bitcoin Legacy Pay-to-Public-Key-Hash (P2PKH) specification. "
            "Legacy addresses use Base58Check encoding with version byte 0x00. "
            "This address format is fully supported by AXON."
        ),
        "P2SH": (
            "This address matches the Bitcoin Pay-to-Script-Hash (P2SH) specification. "
            "P2SH addresses use Base58Check encoding with version byte 0x05. "
            "This address format is fully supported by AXON."
        ),
        "EVM": (
            "This address uses the standard EVM hexadecimal format (0x + 40 hex characters). "
            "The same address is valid across all EVM-compatible networks. "
            "The specific chain cannot be determined from the address alone — "
            "on-chain activity analysis is required to identify the active network."
        ),
        "Solana": (
            "This address matches the Solana public key specification. "
            "Solana addresses are Base58-encoded 32-byte Ed25519 public keys with no embedded checksum. "
            "Length and character set validation confirm structural compliance. "
            "This address format is fully supported by AXON."
        ),
        "Tron": (
            "This address matches the TRON Base58Check specification. "
            "TRON addresses begin with \"T\", use Base58Check encoding with version byte 0x41, "
            "and represent a 20-byte account identifier. "
            "This address format is fully supported by AXON."
        ),
        "Litecoin": (
            "This address matches the Litecoin specification but is not supported for AXON investigations."
        ),
        "Dogecoin": (
            "This address matches the Dogecoin specification but is not supported for AXON investigations."
        ),
    }
    return notes.get(address_type, f"Address format identified as {family} ({address_type}) via deterministic pattern matching.")


def analyze_address_format(address: str) -> Dict[str, Any]:
    """Deterministic forensic address identification. No LLM, no balance probing."""
    address = address.strip()
    if address.startswith("chain:"):
        address = address.split(":", 1)[1]
    if address.startswith(("bitcoin:", "ethereum:")):
        address = address.split(":", 1)[1]

    result: Dict[str, Any] = {
        "input": address,
        "valid": False,
        "family": "Unrecognized",
        "possible_networks": [],
        "address_type": "Unknown",
        "encoding": "Unknown",
        "checksum": "Failed",
        "length": len(address),
        "prefix": "",
        "supported": False,
        "axon_support": {"supported": [], "coming_soon": [], "unsupported": []},
        "forensic_notes": "Unrecognized address format. No pattern matched or checksum validation failed.",
        "confidence": "Deterministic",
        "privacy": "Unknown",
        "traceability": "Unknown",
    }

    # ── EVM ──────────────────────────────────────────────────────────────
    if re.match(r"^0x[0-9a-fA-F]{40}$", address):
        eip55 = is_checksum_address(address) if address != address.lower() and address != address.upper() else None
        if is_address(address):
            checksum_status = "EIP-55 Valid" if eip55 else ("Not Applicable" if eip55 is None else "EIP-55 Invalid")
            axon = _axon_support_lists("EVM Compatible", EVM_NETWORKS)
            result.update({
                "valid": True,
                "family": "EVM Compatible",
                "possible_networks": EVM_NETWORKS,
                "address_type": "EVM Externally Owned Account",
                "encoding": "Hexadecimal",
                "checksum": checksum_status,
                "prefix": "0x",
                "supported": bool(axon["supported"]),
                "axon_support": axon,
                "forensic_notes": _forensic_note("EVM Compatible", "EVM", "Hexadecimal"),
                "privacy": "Low",
                "traceability": "Public",
            })
            return _attach_legacy_fields(result, address)

    addr_lower = address.lower()

    # ── Bitcoin Taproot (Bech32m) ────────────────────────────────────────
    if addr_lower.startswith("bc1p") and re.match(r"^bc1p[02-9ac-hj-np-z]{38,58}$", addr_lower):
        spec = _bech32_decode_with_spec(addr_lower, "bc")
        if spec == "bech32m":
            axon = _axon_support_lists("Bitcoin", ["Bitcoin"])
            result.update({
                "valid": True,
                "family": "Bitcoin",
                "possible_networks": ["Bitcoin"],
                "address_type": "Taproot",
                "encoding": "Bech32m",
                "checksum": "Valid",
                "prefix": "bc1p",
                "supported": True,
                "axon_support": axon,
                "forensic_notes": _forensic_note("Bitcoin", "Taproot", "Bech32m", "bc1p"),
                "privacy": "Medium",
                "traceability": "Public",
            })
            return _attach_legacy_fields(result, address)

    # ── Bitcoin SegWit (Bech32) ──────────────────────────────────────────
    if re.match(r"^bc1[02-9ac-hj-np-z]{38,58}$", addr_lower) and not addr_lower.startswith("bc1p"):
        spec = _bech32_decode_with_spec(addr_lower, "bc")
        if spec == "bech32":
            axon = _axon_support_lists("Bitcoin", ["Bitcoin"])
            result.update({
                "valid": True,
                "family": "Bitcoin",
                "possible_networks": ["Bitcoin"],
                "address_type": "SegWit",
                "encoding": "Bech32",
                "checksum": "Valid",
                "prefix": addr_lower[:4],
                "supported": True,
                "axon_support": axon,
                "forensic_notes": _forensic_note("Bitcoin", "SegWit", "Bech32"),
                "privacy": "Low",
                "traceability": "Public",
            })
            return _attach_legacy_fields(result, address)

    # ── Bitcoin P2PKH ────────────────────────────────────────────────────
    if re.match(r"^1[1-9A-HJ-NP-Za-km-z]{25,34}$", address):
        if validate_base58check(address, [b"\x00"]):
            axon = _axon_support_lists("Bitcoin", ["Bitcoin"])
            result.update({
                "valid": True,
                "family": "Bitcoin",
                "possible_networks": ["Bitcoin"],
                "address_type": "P2PKH",
                "encoding": "Base58Check",
                "checksum": "Valid",
                "prefix": "1",
                "supported": True,
                "axon_support": axon,
                "forensic_notes": _forensic_note("Bitcoin", "P2PKH", "Base58Check"),
                "privacy": "Low",
                "traceability": "Public",
            })
            return _attach_legacy_fields(result, address)

    # ── Bitcoin P2SH ─────────────────────────────────────────────────────
    if re.match(r"^3[1-9A-HJ-NP-Za-km-z]{25,34}$", address):
        if validate_base58check(address, [b"\x05"]):
            axon = _axon_support_lists("Bitcoin", ["Bitcoin"])
            result.update({
                "valid": True,
                "family": "Bitcoin",
                "possible_networks": ["Bitcoin"],
                "address_type": "P2SH",
                "encoding": "Base58Check",
                "checksum": "Valid",
                "prefix": "3",
                "supported": True,
                "axon_support": axon,
                "forensic_notes": _forensic_note("Bitcoin", "P2SH", "Base58Check"),
                "privacy": "Low",
                "traceability": "Public",
            })
            return _attach_legacy_fields(result, address)

    # ── Litecoin ─────────────────────────────────────────────────────────
    if re.match(r"^[LM][1-9A-HJ-NP-Za-km-z]{26,34}$", address):
        if validate_base58check(address, [b"\x30", b"\x32"]):
            axon = _axon_support_lists("Litecoin", ["Litecoin"])
            result.update({
                "valid": True,
                "family": "Litecoin",
                "possible_networks": ["Litecoin"],
                "address_type": "Legacy",
                "encoding": "Base58Check",
                "checksum": "Valid",
                "prefix": address[0],
                "supported": False,
                "axon_support": axon,
                "forensic_notes": _forensic_note("Litecoin", "Litecoin", "Base58Check"),
                "privacy": "Low",
                "traceability": "Public",
            })
            return _attach_legacy_fields(result, address)

    if re.match(r"^ltc1[02-9ac-hj-np-z]{38,58}$", addr_lower):
        spec = _bech32_decode_with_spec(addr_lower, "ltc")
        if spec in ("bech32", "bech32m"):
            axon = _axon_support_lists("Litecoin", ["Litecoin"])
            result.update({
                "valid": True,
                "family": "Litecoin",
                "possible_networks": ["Litecoin"],
                "address_type": "SegWit" if spec == "bech32" else "Taproot",
                "encoding": "Bech32m" if spec == "bech32m" else "Bech32",
                "checksum": "Valid",
                "prefix": "ltc1",
                "supported": False,
                "axon_support": axon,
                "forensic_notes": _forensic_note("Litecoin", "Litecoin", "Bech32"),
                "privacy": "Low",
                "traceability": "Public",
            })
            return _attach_legacy_fields(result, address)

    # ── Dogecoin ─────────────────────────────────────────────────────────
    if re.match(r"^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$", address):
        if validate_base58check(address, [b"\x1E"]):
            axon = _axon_support_lists("Dogecoin", ["Dogecoin"])
            result.update({
                "valid": True,
                "family": "Dogecoin",
                "possible_networks": ["Dogecoin"],
                "address_type": "P2PKH",
                "encoding": "Base58Check",
                "checksum": "Valid",
                "prefix": "D",
                "supported": False,
                "axon_support": axon,
                "forensic_notes": _forensic_note("Dogecoin", "Dogecoin", "Base58Check"),
                "privacy": "Low",
                "traceability": "Public",
            })
            return _attach_legacy_fields(result, address)

    # ── Tron ─────────────────────────────────────────────────────────────
    if re.match(r"^T[1-9A-HJ-NP-Za-km-z]{33}$", address):
        if validate_base58check(address, [b"\x41"]):
            axon = _axon_support_lists("Tron", ["Tron"])
            result.update({
                "valid": True,
                "family": "Tron",
                "possible_networks": ["Tron"],
                "address_type": "TRON Account",
                "encoding": "Base58Check",
                "checksum": "Valid",
                "prefix": "T",
                "supported": True,
                "axon_support": axon,
                "forensic_notes": _forensic_note("Tron", "Tron", "Base58Check"),
                "privacy": "Low",
                "traceability": "Public",
            })
            return _attach_legacy_fields(result, address)

    # ── Solana ───────────────────────────────────────────────────────────
    if re.match(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$", address) and not address.startswith(("bc1", "ltc1", "0x")):
        try:
            decoded = base58.b58decode(address)
            if len(decoded) == 32:
                axon = _axon_support_lists("Solana", ["Solana"])
                result.update({
                    "valid": True,
                    "family": "Solana",
                    "possible_networks": ["Solana"],
                    "address_type": "Ed25519 Public Key",
                    "encoding": "Base58",
                    "checksum": "Passed",
                    "prefix": "",
                    "supported": True,
                    "axon_support": axon,
                    "forensic_notes": _forensic_note("Solana", "Solana", "Base58"),
                    "privacy": "Low",
                    "traceability": "Public",
                    "curve": "Ed25519",
                })
                return _attach_legacy_fields(result, address)
        except ValueError:
            pass

    return _attach_legacy_fields(result, address)


def _attach_legacy_fields(result: Dict[str, Any], address: str) -> Dict[str, Any]:
    """Attach backward-compatible fields used by bulk scanner and investigation UI."""
    if not result["valid"]:
        result["resolution"] = "unrecognized"
        result["candidates"] = []
        result["ai_summary"] = result["forensic_notes"]
        result["flagged_for_human_review"] = False
        return result

    family = result["family"]
    primary_chain = result["possible_networks"][0] if result["possible_networks"] else family

    if family == "EVM Compatible":
        result["resolution"] = "evm_format"
        result["type"] = "EVM"
        result["candidates"] = [
            {
                "chain": net,
                "confidence": 1.0,
                "tier": "C",
                "evidence": ["valid_evm_format", "deterministic"],
                "explorer_url": get_explorer_url(net, address),
            }
            for net in EVM_NETWORKS
        ]
        result["chain"] = "EVM"
    else:
        result["resolution"] = "single_deterministic"
        result["type"] = primary_chain
        result["candidates"] = [{
            "chain": primary_chain,
            "confidence": 1.0,
            "tier": "A",
            "evidence": ["deterministic_checksum", f"type={result['address_type']}"],
            "explorer_url": get_explorer_url(primary_chain, address),
        }]
        result["chain"] = primary_chain

    result["ai_summary"] = result["forensic_notes"]
    result["flagged_for_human_review"] = family == "EVM Compatible"
    if "identification_method" not in result:
        result["identification_method"] = "deterministic" if result["valid"] else "unrecognized"
    return result


async def resolve_chain_identity(address: str, ai_fallback: bool = True) -> Dict[str, Any]:
    """
    Address format analysis pipeline:
      1. Deterministic — regex + checksum + pattern DB
      2. AI fallback (optional) — pattern recognition when step 1 fails
    """
    address = address.strip()
    if address.startswith("chain:"):
        address = address.split(":", 1)[1]
    if address.startswith(("bitcoin:", "ethereum:")):
        address = address.split(":", 1)[1]

    result = analyze_address_format(address)

    if not result.get("valid") and ai_fallback:
        try:
            from modules.ai_analyst import generate_address_pattern_fallback
            ai_result = await generate_address_pattern_fallback(address)
            if ai_result:
                networks = ai_result.get("possible_networks") or [ai_result.get("family", "")]
                family = ai_result.get("family", "Unrecognized")
                result["deterministic_valid"] = False
                result["valid"] = bool(ai_result.get("valid", True))
                result["family"] = family
                result["possible_networks"] = networks
                result["address_type"] = ai_result.get("address_type", "Unknown")
                result["encoding"] = ai_result.get("encoding", "Unknown")
                result["checksum"] = ai_result.get("checksum", "Unverified")
                result["length"] = ai_result.get("length", len(address))
                result["prefix"] = ai_result.get("prefix", address[:4] if len(address) >= 4 else "")
                result["supported"] = _is_axon_supported(family, networks)
                result["axon_support"] = _axon_support_lists(family, networks)
                result["forensic_notes"] = (
                    ai_result.get("forensic_notes", "")
                    + " [Identified via AI pattern fallback — deterministic checksum validation did not pass.]"
                )
                result["confidence"] = "AI Assisted"
                result["identification_method"] = "ai_fallback"
                result = _attach_legacy_fields(result, address)
        except Exception as e:
            print(f"[COIN_IDENTIFIER] AI fallback failed: {e}")

    if result.get("valid"):
        if "identification_method" not in result:
            result["identification_method"] = "deterministic"
            result["deterministic_valid"] = True
    elif "identification_method" not in result:
        result["identification_method"] = "unrecognized"
        result["deterministic_valid"] = False

    return result
