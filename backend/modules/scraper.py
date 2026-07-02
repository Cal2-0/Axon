"""
Axon Backend — Web Scraper Module
Scrapes wallet intelligence data from public sources:

1. GitHub — Public repos with Ethereum address lists (forta-network, ethereum-lists, etc.)
2. Etherscan — Labeled addresses (exchange, phishing, hack, etc.)
3. ChainAbuse — Reported scam/fraud addresses
4. OFAC SDN — US Treasury sanctioned crypto addresses
5. Public threat intel feeds and security researcher repos

Run standalone: python -m modules.scraper
"""
import asyncio
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime
from typing import Optional

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import httpx
except ImportError:
    print("[SCRAPER] httpx not installed. Run: pip install httpx")
    httpx = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("[SCRAPER] beautifulsoup4 not installed. Run: pip install beautifulsoup4")
    BeautifulSoup = None

# Ethereum address regex
ETH_ADDR_RE = re.compile(r'0x[0-9a-fA-F]{40}')

# ─── SCRAPER SOURCES ─────────────────────────────────────────────────────────

# GitHub repos with public wallet/address data (raw URLs for direct fetch)
GITHUB_SOURCES = [
    {
        "name": "Etherscan Label Word Cloud (Public Labels)",
        "url": "https://raw.githubusercontent.com/brianleect/etherscan-labels/main/data/combined/combinedAllLabels.json",
        "type": "json",
        "parser": "etherscan_labels",
    },
    {
        "name": "Forta Scam Detector — Known Scammer Addresses",
        "url": "https://raw.githubusercontent.com/forta-network/starter-kits/main/scam-detector-py/src/scam_addresses.json",
        "type": "json",
        "parser": "forta_scam",
    },
    {
        "name": "OFAC Sanctioned Addresses (Blockchain)",
        "url": "https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt",
        "type": "text_lines",
        "parser": "ofac_eth",
    },
    {
        "name": "OFAC Sanctioned Addresses (BTC)",
        "url": "https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_BTC.txt",
        "type": "text_lines",
        "parser": "ofac_btc",
    },
    {
        "name": "MyEtherWallet Darklist (Phishing/Scam)",
        "url": "https://raw.githubusercontent.com/MyEtherWallet/ethereum-lists/master/src/addresses/addresses-darklist.json",
        "type": "json",
        "parser": "mew_darklist",
    },
    {
        "name": "Cryptoscamdb Blacklist",
        "url": "https://raw.githubusercontent.com/CryptoScamDB/blacklist/master/data/urls.yaml",
        "type": "text",
        "parser": "cryptoscamdb",
    },
    {
        "name": "MetaMask Phishing List",
        "url": "https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/master/src/config.json",
        "type": "json",
        "parser": "metamask_phishing",
    },
]

# GitHub search queries for finding wallet addresses in security research
GITHUB_SEARCH_QUERIES = [
    "ethereum malicious addresses",
    "blockchain scam wallet list",
    "tornado cash sanctioned addresses",
    "crypto phishing addresses database",
    "defi hack exploiter address",
]


class AxonScraper:
    """Scrapes public blockchain threat intelligence from multiple sources."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.results = {
            "wallets": [],
            "exchanges": [],
            "mixers": [],
            "metadata": {
                "sources_attempted": 0,
                "sources_succeeded": 0,
                "total_addresses_found": 0,
                "scrape_timestamp": None,
                "errors": [],
            }
        }
        self._seen_addresses = set()

    def _add_wallet(self, address: str, label: str, category: str, source: str,
                    chain: str = "ETH", threat_level: str = "HIGH",
                    sanctioned: bool = False, tags: list = None,
                    amount_usd: str = "$0", description: str = ""):
        """Add a unique wallet to results, deduplicating by address."""
        addr_lower = address.lower().strip()
        if addr_lower in self._seen_addresses:
            return
        if not ETH_ADDR_RE.match(address) and not address.startswith("bc1") and not address.startswith("1") and not address.startswith("3"):
            return

        self._seen_addresses.add(addr_lower)
        self.results["wallets"].append({
            "address": address,
            "label": label[:200],
            "category": category,
            "chain": chain,
            "amount_usd": amount_usd,
            "threat_level": threat_level,
            "sanctioned": sanctioned,
            "last_active": datetime.now().strftime("%Y-%m-%d"),
            "risk_score": {"CRITICAL": 90, "HIGH": 75, "MEDIUM": 55, "LOW": 30}.get(threat_level, 60),
            "description": f"[Source: {source}] {description}"[:500],
            "tags": tags or [category.lower().replace(" ", "_")],
            "first_seen": "2020-01-01",
            "total_received_eth": "0",
            "total_sent_eth": "0",
            "tx_count": 0,
            "counterparties": 0,
            "source": source,
        })

    # ─── PARSERS ─────────────────────────────────────────────────────────────

    def _parse_etherscan_labels(self, data):
        """Parse brianleect/etherscan-labels combined JSON."""
        count = 0
        try:
            if isinstance(data, dict):
                for address, label_info in data.items():
                    if not ETH_ADDR_RE.match(address):
                        continue
                    if isinstance(label_info, dict):
                        name = label_info.get("nameTag", label_info.get("label", "Data Not Available"))
                        labels = str(label_info.get("labels", "")).lower()
                    elif isinstance(label_info, str):
                        name = label_info
                        labels = label_info.lower()
                    else:
                        continue

                    # Categorize by label keywords
                    category = "Data Not Available"
                    threat_level = "MEDIUM"
                    tags = []
                    sanctioned = False

                    if any(kw in labels for kw in ["phish", "fake", "scam", "fraud"]):
                        category = "Phishing"
                        threat_level = "HIGH"
                        tags = ["phishing", "etherscan_flagged"]
                    elif any(kw in labels for kw in ["hack", "exploit", "attacker", "drainer"]):
                        category = "Hacker"
                        threat_level = "CRITICAL"
                        tags = ["hacker", "exploit", "etherscan_flagged"]
                    elif any(kw in labels for kw in ["heist", "stolen"]):
                        category = "Hacker"
                        threat_level = "CRITICAL"
                        tags = ["theft", "etherscan_flagged"]
                    elif any(kw in labels for kw in ["tornado", "mixer", "tumbl"]):
                        category = "Mixer"
                        threat_level = "CRITICAL"
                        tags = ["mixer", "etherscan_flagged"]
                    elif any(kw in labels for kw in ["sanction", "ofac"]):
                        category = "Sanctions Evasion"
                        threat_level = "CRITICAL"
                        sanctioned = True
                        tags = ["ofac_sanctioned", "etherscan_flagged"]
                    elif any(kw in labels for kw in ["exchange", "binance", "coinbase", "kraken"]):
                        # Skip exchanges — these are legitimate
                        continue
                    else:
                        # Skip non-malicious addresses
                        continue

                    self._add_wallet(
                        address=address, label=name, category=category,
                        source="Etherscan Labels (GitHub)", chain="ETH",
                        threat_level=threat_level, sanctioned=sanctioned, tags=tags,
                        description=f"Etherscan labeled address: {name}"
                    )
                    count += 1
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and "address" in item:
                        address = item["address"]
                        name = item.get("nameTag", item.get("label", item.get("name", "Data Not Available")))
                        labels_str = str(item.get("labels", "")) + " " + str(name)
                        labels = labels_str.lower()

                        category = "Scammer"
                        threat_level = "HIGH"
                        tags = ["etherscan_labeled"]
                        sanctioned = False

                        if any(kw in labels for kw in ["phish", "fake", "scam"]):
                            category = "Phishing"
                            tags.append("phishing")
                        elif any(kw in labels for kw in ["hack", "exploit"]):
                            category = "Hacker"
                            threat_level = "CRITICAL"
                            tags.append("hacker")

                        self._add_wallet(
                            address=address, label=str(name), category=category,
                            source="Etherscan Labels (GitHub)", chain="ETH",
                            threat_level=threat_level, sanctioned=sanctioned, tags=tags,
                            description=f"Etherscan labeled: {name}"
                        )
                        count += 1
        except Exception as e:
            self.results["metadata"]["errors"].append(f"Etherscan labels parser error: {e}")
        return count

    def _parse_forta_scam(self, data):
        """Parse Forta Network scam detector address list."""
        count = 0
        try:
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, str) and ETH_ADDR_RE.match(item):
                        self._add_wallet(
                            address=item, label=f"Forta Flagged Scammer",
                            category="Scammer", source="Forta Scam Detector",
                            chain="ETH", threat_level="HIGH",
                            tags=["forta_flagged", "scam_detector"],
                            description="Flagged by Forta Network's on-chain scam detection system."
                        )
                        count += 1
                    elif isinstance(item, dict):
                        addr = item.get("address", item.get("addr", ""))
                        label = item.get("label", item.get("name", "Forta Flagged"))
                        if ETH_ADDR_RE.match(addr):
                            self._add_wallet(
                                address=addr, label=label, category="Scammer",
                                source="Forta Scam Detector", chain="ETH",
                                threat_level="HIGH", tags=["forta_flagged", "scam_detector"],
                                description=f"Forta flagged: {label}"
                            )
                            count += 1
            elif isinstance(data, dict):
                for addr, info in data.items():
                    if ETH_ADDR_RE.match(addr):
                        label = info if isinstance(info, str) else str(info.get("label", "Forta Scam"))
                        self._add_wallet(
                            address=addr, label=label, category="Scammer",
                            source="Forta Scam Detector", chain="ETH",
                            threat_level="HIGH", tags=["forta_flagged"],
                            description=f"Forta scam detection: {label}"
                        )
                        count += 1
        except Exception as e:
            self.results["metadata"]["errors"].append(f"Forta parser error: {e}")
        return count

    def _parse_ofac_eth(self, text: str):
        """Parse OFAC sanctioned ETH address list (one per line)."""
        count = 0
        for line in text.strip().split("\n"):
            addr = line.strip()
            if ETH_ADDR_RE.match(addr):
                self._add_wallet(
                    address=addr, label="OFAC Sanctioned Address",
                    category="Sanctions Evasion", source="OFAC SDN List (GitHub mirror)",
                    chain="ETH", threat_level="CRITICAL", sanctioned=True,
                    tags=["ofac_sanctioned", "us_treasury", "sdn_list"],
                    description="Address on US Treasury OFAC Specially Designated Nationals list."
                )
                count += 1
        return count

    def _parse_ofac_btc(self, text: str):
        """Parse OFAC sanctioned BTC address list."""
        count = 0
        for line in text.strip().split("\n"):
            addr = line.strip()
            if addr and len(addr) > 20:
                self._add_wallet(
                    address=addr, label="OFAC Sanctioned BTC Address",
                    category="Sanctions Evasion", source="OFAC SDN List (GitHub mirror)",
                    chain="BTC", threat_level="CRITICAL", sanctioned=True,
                    tags=["ofac_sanctioned", "us_treasury", "sdn_list", "bitcoin"],
                    description="Bitcoin address on US Treasury OFAC SDN list."
                )
                count += 1
        return count

    def _parse_mew_darklist(self, data):
        """Parse MyEtherWallet darklist JSON."""
        count = 0
        try:
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        addr = item.get("address", "")
                        comment = item.get("comment", "Unknown threat")
                        name = item.get("name", comment[:50])
                        if ETH_ADDR_RE.match(addr):
                            self._add_wallet(
                                address=addr, label=name,
                                category="Phishing", source="MyEtherWallet Darklist",
                                chain="ETH", threat_level="HIGH",
                                tags=["mew_darklist", "phishing", "blacklisted"],
                                description=f"MEW darklist: {comment}"
                            )
                            count += 1
        except Exception as e:
            self.results["metadata"]["errors"].append(f"MEW darklist parser error: {e}")
        return count

    def _parse_cryptoscamdb(self, text: str):
        """Extract any Ethereum addresses from CryptoScamDB data."""
        count = 0
        addresses = ETH_ADDR_RE.findall(text)
        for addr in addresses:
            self._add_wallet(
                address=addr, label="CryptoScamDB Flagged",
                category="Scammer", source="CryptoScamDB",
                chain="ETH", threat_level="HIGH",
                tags=["cryptoscamdb", "scam", "blacklisted"],
                description="Address found in CryptoScamDB blacklist database."
            )
            count += 1
        return count

    def _parse_metamask_phishing(self, data):
        """Extract addresses from MetaMask Phishing config JSON."""
        count = 0
        try:
            blacklist = data.get("blacklist", [])
            # Usually domains, but let's grep text representation for addresses
            text_repr = json.dumps(data)
            addresses = ETH_ADDR_RE.findall(text_repr)
            for addr in addresses:
                self._add_wallet(
                    address=addr, label="MetaMask Flagged",
                    category="Phishing", source="MetaMask Phishing List",
                    chain="ETH", threat_level="CRITICAL",
                    tags=["metamask", "phishing", "blacklisted"],
                    description="Address found in MetaMask Phishing Detect database."
                )
                count += 1
        except Exception as e:
            self.results["metadata"]["errors"].append(f"MetaMask parser error: {e}")
        return count

    # ─── MAIN SCRAPER ────────────────────────────────────────────────────────

    async def scrape_source(self, client: "httpx.AsyncClient", source: dict) -> int:
        """Scrape a single source and return count of addresses found."""
        name = source["name"]
        url = source["url"]
        self.results["metadata"]["sources_attempted"] += 1

        try:
            print(f"  [SCRAPE] Fetching: {name}...")
            response = await client.get(url, timeout=self.timeout, follow_redirects=True)

            if response.status_code != 200:
                self.results["metadata"]["errors"].append(f"{name}: HTTP {response.status_code}")
                print(f"  [SCRAPE] ✗ {name} — HTTP {response.status_code}")
                return 0

            parser_name = source.get("parser", "generic")
            content_type = source.get("type", "text")
            count = 0

            if content_type == "json":
                try:
                    data = response.json()
                except Exception:
                    data = {}

                if parser_name == "etherscan_labels":
                    count = self._parse_etherscan_labels(data)
                elif parser_name == "forta_scam":
                    count = self._parse_forta_scam(data)
                elif parser_name == "mew_darklist":
                    count = self._parse_mew_darklist(data)
                elif parser_name == "metamask_phishing":
                    count = self._parse_metamask_phishing(data)
                else:
                    # Generic JSON — look for addresses
                    text = response.text
                    addrs = ETH_ADDR_RE.findall(text)
                    for addr in addrs:
                        self._add_wallet(addr, f"Address from {name}", "Data Not Available",
                                         source=name, tags=["scraped"])
                        count += 1

            elif content_type == "text_lines":
                text = response.text
                if parser_name == "ofac_eth":
                    count = self._parse_ofac_eth(text)
                elif parser_name == "ofac_btc":
                    count = self._parse_ofac_btc(text)
                else:
                    for line in text.strip().split("\n"):
                        addr = line.strip()
                        if ETH_ADDR_RE.match(addr):
                            self._add_wallet(addr, f"Address from {name}", "Data Not Available",
                                             source=name, tags=["scraped"])
                            count += 1

            else:
                text = response.text
                if parser_name == "cryptoscamdb":
                    count = self._parse_cryptoscamdb(text)
                else:
                    addrs = ETH_ADDR_RE.findall(text)
                    for addr in addrs:
                        self._add_wallet(addr, f"Address from {name}", "Data Not Available",
                                         source=name, tags=["scraped"])
                        count += 1

            if count > 0:
                self.results["metadata"]["sources_succeeded"] += 1

            print(f"  [SCRAPE] ✓ {name} — {count} addresses found")
            return count

        except httpx.TimeoutException:
            self.results["metadata"]["errors"].append(f"{name}: Timeout after {self.timeout}s")
            print(f"  [SCRAPE] ✗ {name} — Timeout")
            return 0
        except Exception as e:
            self.results["metadata"]["errors"].append(f"{name}: {str(e)[:100]}")
            print(f"  [SCRAPE] ✗ {name} — Error: {e}")
            return 0

    async def scrape_github_search(self, client: "httpx.AsyncClient", query: str) -> int:
        """Search GitHub for repos containing wallet addresses (uses GitHub search API)."""
        count = 0
        try:
            # GitHub code search API (unauthenticated — 10 req/min limit)
            url = f"https://api.github.com/search/code?q={query}+extension:json&per_page=5"
            headers = {"Accept": "application/vnd.github.v3+json"}
            response = await client.get(url, headers=headers, timeout=15)

            if response.status_code == 200:
                data = response.json()
                items = data.get("items", [])
                for item in items[:3]:  # Limit to top 3 results
                    raw_url = item.get("html_url", "").replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
                    if raw_url:
                        try:
                            raw_resp = await client.get(raw_url, timeout=10, follow_redirects=True)
                            if raw_resp.status_code == 200:
                                addrs = ETH_ADDR_RE.findall(raw_resp.text[:50000])  # Limit parsing
                                for addr in addrs[:100]:  # Cap at 100 per file
                                    self._add_wallet(
                                        addr, f"GitHub Research: {query[:30]}",
                                        "Data Not Available", source=f"GitHub Search: {query[:20]}",
                                        tags=["github_search", "research"]
                                    )
                                    count += 1
                        except Exception:
                            pass
            elif response.status_code == 403:
                print(f"  [SCRAPE] GitHub rate limit hit for query: {query[:30]}")
        except Exception as e:
            self.results["metadata"]["errors"].append(f"GitHub search ({query[:20]}): {str(e)[:80]}")
        return count

    async def run_all(self) -> dict:
        """Run all scrapers and return combined results."""
        if httpx is None:
            print("[SCRAPER] ERROR: httpx not installed. Cannot scrape.")
            return self.results

        print("\n" + "=" * 70)
        print("  AXON WEB SCRAPER — Blockchain Threat Intelligence")
        print("=" * 70)
        self.results["metadata"]["scrape_timestamp"] = datetime.now().isoformat()

        async with httpx.AsyncClient(
            headers={"User-Agent": "Axon-Security-Intel/1.0 (Research)"},
            verify=True,
        ) as client:
            # 1. Scrape all defined sources
            print("\n[PHASE 1] Scraping defined intelligence sources...")
            for source in GITHUB_SOURCES:
                await self.scrape_source(client, source)
                await asyncio.sleep(1)  # Rate limiting

            # 2. GitHub search for additional addresses
            print("\n[PHASE 2] Searching GitHub for wallet intelligence...")
            for query in GITHUB_SEARCH_QUERIES:
                await self.scrape_github_search(client, query)
                await asyncio.sleep(2)  # Respect GitHub rate limits

        self.results["metadata"]["total_addresses_found"] = len(self.results["wallets"])

        print("\n" + "=" * 70)
        print(f"  SCRAPE COMPLETE")
        print(f"  Sources attempted: {self.results['metadata']['sources_attempted']}")
        print(f"  Sources succeeded: {self.results['metadata']['sources_succeeded']}")
        print(f"  Total addresses:   {self.results['metadata']['total_addresses_found']}")
        if self.results["metadata"]["errors"]:
            print(f"  Errors:            {len(self.results['metadata']['errors'])}")
        print("=" * 70 + "\n")

        return self.results

    def save_to_json(self, filepath: str = "scraped_intel.json"):
        """Save scraped results to a JSON file."""
        with open(filepath, "w") as f:
            json.dump(self.results, f, indent=2, default=str)
        print(f"[SCRAPER] Results saved to {filepath}")

    def import_to_database(self):
        """Import scraped results into the SQLite database."""
        from database.db import SessionLocal, Base, engine
        from database.models import MaliciousWallet

        Base.metadata.create_all(bind=engine)
        db = SessionLocal()

        imported = 0
        skipped = 0

        try:
            for wallet in self.results["wallets"]:
                # Check for duplicates
                existing = db.query(MaliciousWallet).filter_by(
                    address=wallet["address"]
                ).first()
                if existing:
                    skipped += 1
                    continue

                # Remove non-model fields
                wallet_data = {k: v for k, v in wallet.items() if k != "source"}
                db.add(MaliciousWallet(**wallet_data))
                imported += 1

                if imported % 500 == 0:
                    db.commit()
                    print(f"  [IMPORT] Committed {imported} wallets...")

            db.commit()
            print(f"\n[IMPORT] ✅ Imported {imported} new wallets ({skipped} duplicates skipped)")

        except Exception as e:
            db.rollback()
            print(f"[IMPORT] ❌ Error: {e}")
            raise
        finally:
            db.close()

        return imported


# ─── CLI ENTRY POINT ─────────────────────────────────────────────────────────
async def main():
    scraper = AxonScraper(timeout=30)
    await scraper.run_all()
    scraper.save_to_json()

    # Import to database
    print("\n[IMPORT] Importing scraped data to database...")
    scraper.import_to_database()


if __name__ == "__main__":
    asyncio.run(main())
