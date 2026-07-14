import asyncio
import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Base
from modules.wallet_scorer import score_wallet
from modules.btc_scorer import score_btc_wallet
from modules.sol_scorer import score_solana_wallet
from modules.tron_scorer import score_tron_wallet
from modules.contract_scanner import analyze_contract

# Test addresses
BTC_ADDR = "34xp4vRoCGJym3xR7yCVPFHoJQepKeoo3m" # Binance Cold Wallet
SOL_ADDR = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1" # Raydium
TRON_ADDR = "TXLAQ63Xg1NDvyc6G6xEa9FfXo8UuBwQyH" # Binance Hot Wallet
ETH_ADDR = "0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13"
USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"

engine = create_engine("sqlite:///./axon_test.db")
Base.metadata.create_all(bind=engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def test_btc_normalization():
    print(f"Testing BTC Normalization for {BTC_ADDR}...")
    with TestingSessionLocal() as db:
        res = await score_btc_wallet(BTC_ADDR, "quick", db)
        assert res.get("identity", {}).get("txCount", 0) > 0, "BTC txCount should be > 0"
        assert res.get("identity", {}).get("firstTxDate", "Unavailable") != "Unavailable", "BTC firstTxDate missing"
        assert len(res.get("transactions", [])) > 0, "BTC transactions missing"
        assert res.get("identity", {}).get("explorerLink"), "BTC Explorer link missing"
        print("✅ BTC Normalization PASSED")

async def test_sol_normalization():
    print(f"Testing SOL Normalization for {SOL_ADDR}...")
    with TestingSessionLocal() as db:
        res = await score_solana_wallet(SOL_ADDR, "quick", db)
        assert res.get("identity", {}).get("txCount", 0) > 0, "SOL txCount should be > 0"
        assert res.get("identity", {}).get("firstTxDate", "Unavailable") != "Unavailable", "SOL firstTxDate missing"
        assert len(res.get("transactions", [])) > 0, "SOL transactions missing"
        assert res.get("identity", {}).get("explorerLink"), "SOL Explorer link missing"
        print("✅ SOL Normalization PASSED")

async def test_tron_normalization():
    print(f"Testing TRON Normalization for {TRON_ADDR}...")
    with TestingSessionLocal() as db:
        res = await score_tron_wallet(TRON_ADDR, "quick", db)
        assert res.get("identity", {}).get("txCount", 0) > 0, "TRON txCount should be > 0"
        assert res.get("identity", {}).get("firstTxDate", "Unavailable") != "Unavailable", "TRON firstTxDate missing"
        assert len(res.get("transactions", [])) > 0, "TRON transactions missing"
        assert res.get("identity", {}).get("explorerLink"), "TRON Explorer link missing"
        print("✅ TRON Normalization PASSED")

async def test_eth_normalization():
    print(f"Testing ETH Normalization for {ETH_ADDR}...")
    with TestingSessionLocal() as db:
        res = await score_wallet(ETH_ADDR, "quick", db)
        assert res.get("identity", {}).get("txCount", 0) > 0, "ETH txCount should be > 0"
        assert res.get("identity", {}).get("explorerLink"), "ETH Explorer link missing"
        assert "defi_interactions" in res.get("graph", {}), "ETH defi_interactions missing"
        print("✅ ETH Normalization PASSED")

async def test_usdt_verification():
    print(f"Testing USDT Contract Verification for {USDT_CONTRACT}...")
    res = await analyze_contract(USDT_CONTRACT, "quick")
    info = res.get("info", {})
    assert info.get("verified") is True, f"USDT should be verified, but got: {info.get('verified')}"
    print("✅ USDT Verification PASSED")

async def main():
    print("🚀 Running AXON v2.0 Regression Suite...")
    try:
        await test_btc_normalization()
        await test_sol_normalization()
        await test_tron_normalization()
        await test_eth_normalization()
        await test_usdt_verification()
        print("🎉 ALL TESTS PASSED. AXON V2.0 IS READY FOR PRODUCTION.")
    except AssertionError as e:
        print(f"❌ TEST FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
