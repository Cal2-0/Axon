import httpx
import asyncio
import json
import sys
import io

# Fix Windows encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://127.0.0.1:8000"

async def test_endpoints():
    print("=" * 60)
    print("  AXON Full System Test")
    print("=" * 60)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. API Health
        print("\n[1] API HEALTH CHECK (/health/apis)...")
        try:
            res = await client.get(f"{BASE_URL}/health/apis")
            health = res.json()
            for api, status in health.items():
                icon = "[OK]" if status else "[FAIL]"
                print(f"    {icon} {api}: {'ONLINE' if status else 'ERROR'}")
        except Exception as e:
            print(f"    [FAIL] Failed: {e}")

        # 2. Wallet Scan (Phase 1)
        test_wallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        print(f"\n[2] WALLET SCAN - Phase 1 Modules")
        print(f"    Target: {test_wallet}")
        try:
            res = await client.post(f"{BASE_URL}/scan/wallet", json={"address": test_wallet})
            data = res.json()
            identity = data.get("identity", {})
            risk = data.get("risk", {})
            graph = data.get("graph", {})
            osint = data.get("osint", {})
            holdings = data.get("holdings", {})

            print(f"\n    Identity:")
            print(f"       ETH Balance:     {identity.get('ethBalance')}")
            print(f"       TX Count:        {identity.get('txCount')}")
            print(f"       Counterparties:  {identity.get('uniqueCounterparties')}")
            print(f"       First Seen:      {identity.get('firstSeen')}")
            print(f"       Last Seen:       {identity.get('lastSeen')}")
            print(f"       Total Received:  {identity.get('totalReceived')}")
            print(f"       Total Sent:      {identity.get('totalSent')}")
            print(f"       Total Volume:    {identity.get('totalVolumeUSD')}")

            print(f"\n    Risk Score:         {risk.get('score')}/100 - {risk.get('label')}")
            print(f"       ML Class:        {risk.get('mlClassification')}")
            print(f"       Anomaly Score:   {risk.get('anomalyScore')}")
            for f in risk.get("factors", []):
                print(f"       +{f['penalty']}pts - {f['reason']}")

            print(f"\n    Transaction Graph:")
            print(f"       Nodes:  {len(graph.get('nodes', []))}")
            print(f"       Edges:  {len(graph.get('edges', []))}")
            if graph.get("edges"):
                e = graph["edges"][0]
                print(f"       Sample: {e.get('source', '')[:10]}... -> {e.get('target', '')[:10]}... ({e.get('value', 0):.4f} ETH)")

            print(f"\n    OSINT / Groq AI:")
            summary = osint.get("summary", "")
            if "Error" in summary:
                print(f"       [FAIL] Groq Error: {summary[:100]}")
            else:
                print(f"       [OK] AI Summary: {summary[:150]}...")

            print(f"\n    Holdings:")
            print(f"       ERC-20 Tokens:  {holdings.get('erc20_count', 0)}")
            print(f"       Forta Alerts:   {holdings.get('forta_alerts', 0)}")

        except Exception as e:
            print(f"    [FAIL] Wallet scan failed: {e}")

        # 3. Intelligence DB (Phase 2)
        print(f"\n[3] INTELLIGENCE DB - Phase 2 Modules")
        try:
            stats = (await client.get(f"{BASE_URL}/intel/stats")).json()
            print(f"    Stats:")
            print(f"       Malicious Wallets:  {stats.get('malicious_wallets')}")
            print(f"       Exchange Wallets:   {stats.get('exchange_wallets')}")
            print(f"       Known Mixers:       {stats.get('known_mixers')}")
            print(f"       Threat Actors:      {stats.get('threat_actors')}")

            wallets = (await client.get(f"{BASE_URL}/intel/wallets?limit=3")).json()
            print(f"\n    Wallets (page 1, showing 3):")
            print(f"       Total in DB: {wallets.get('total')}")
            for w in wallets.get("data", [])[:3]:
                print(f"       - {w.get('address', '')[:16]}... | {w.get('label', '')} | {w.get('threat_level', '')}")

            mixers = (await client.get(f"{BASE_URL}/intel/mixers")).json()
            print(f"\n    Mixers: {len(mixers)} records")
            for m in mixers[:3]:
                print(f"       - {m.get('name', '')} ({m.get('type', '')}) - {m.get('status', '')}")

            exchanges = (await client.get(f"{BASE_URL}/intel/exchanges")).json()
            print(f"\n    Exchanges: {len(exchanges)} records")
            for e in exchanges[:3]:
                print(f"       - {e.get('name', '')} - {e.get('category', '')} ({e.get('status', '')})")

        except Exception as e:
            print(f"    [FAIL] Intel fetch failed: {e}")

    print(f"\n{'=' * 60}")
    print("  Test Complete")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
