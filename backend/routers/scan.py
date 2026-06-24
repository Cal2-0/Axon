"""
Axon Backend — Scan Router
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database.db import get_db, SessionLocal
from schemas.models import ScanRequest, BulkScanRequest, DeepDiveRequest
from modules.wallet_scorer import scan_wallet
from modules.contract_scanner import scan_contract
from modules.cross_chain import get_cross_chain_holdings, detect_address_type
from modules.bulk_scanner import run_bulk_scan
from modules.ai_analyst import generate_dual_analysis, resolve_unknown_chain
import asyncio

router = APIRouter()

async def run_deep_scan_background(address: str, entity_type: str):
    """Background task to run a deep scan and save it to the DB."""
    db = SessionLocal()
    try:
        if entity_type == "wallet":
            await scan_wallet(address, db, depth="deep")
        else:
            await scan_contract(address, db, depth="deep")
    except Exception as e:
        print(f"[BACKGROUND] Deep scan failed for {address}: {e}")
    finally:
        db.close()

@router.post("/wallet")
async def post_scan_wallet(req: ScanRequest, db: Session = Depends(get_db)):
    native_info = detect_address_type(req.address)
    chain_type = native_info["type"]
    
    if chain_type == "BTC":
        from modules.btc_scorer import scan_btc_wallet
        return await scan_btc_wallet(req.address, db, depth=req.depth, case_id=req.case_id)
    elif chain_type == "SOLANA":
        from modules.sol_scorer import scan_sol_wallet
        return await scan_sol_wallet(req.address, db, depth=req.depth, case_id=req.case_id)
    elif chain_type == "TRON":
        from modules.tron_scorer import scan_tron_wallet
        return await scan_tron_wallet(req.address, db, depth=req.depth, case_id=req.case_id)
    else:
        # Default to EVM
        if req.depth == "deep":
            return await scan_wallet(req.address, db, depth="deep", case_id=req.case_id)
        return await scan_wallet(req.address, db, depth="quick", case_id=req.case_id)

@router.post("/contract")
async def post_scan_contract(req: ScanRequest, db: Session = Depends(get_db)):
    if req.depth == "deep":
        return await scan_contract(req.address, db, depth="deep", case_id=req.case_id)

    return await scan_contract(req.address, db, depth="quick", case_id=req.case_id)

@router.get("/wallet/{address}/cross-chain-holdings")
async def get_wallet_cross_chain_holdings(address: str):
    return await get_cross_chain_holdings(address)

@router.post("/deep-dive")
async def post_deep_dive(req: DeepDiveRequest):
    """
    On-demand endpoint to run the expensive Dual-Agent Debate + Judge
    for a specific evidence context payload.
    """
    return await generate_dual_analysis(req.evidence_context, req.entity_type)

@router.post("/bulk")
async def post_scan_bulk(req: BulkScanRequest, db: Session = Depends(get_db)):
    """
    Run a bulk investigation on an array of addresses.
    Concurrency is throttled automatically to avoid API bans.
    """
    return await run_bulk_scan(req.addresses, db, case_id=req.case_id)

@router.get("/chain-resolution/{address}")
async def get_chain_resolution(address: str):
    """
    Determines the blockchain for a given wallet address.
    If native detection fails, utilizes AI to suggest the chain and explorer.
    """
    native_info = detect_address_type(address)
    chain_type = native_info["type"]
    chain_name = native_info["chain"]
    
    if chain_type == "EVM":
        return {"chain": chain_name, "type": chain_type, "explorer_url": f"https://etherscan.io/address/{address}", "method": "native"}
    elif chain_type == "BTC":
        return {"chain": chain_name, "type": chain_type, "explorer_url": f"https://blockchair.com/bitcoin/address/{address}", "method": "native"}
    elif chain_type == "SOLANA":
        return {"chain": chain_name, "type": chain_type, "explorer_url": f"https://solscan.io/account/{address}", "method": "native"}
    elif chain_type == "TRON":
        return {"chain": chain_name, "type": chain_type, "explorer_url": f"https://tronscan.org/#/address/{address}", "method": "native"}
    else:
        return {
            "chain": "Unknown",
            "type": "UNKNOWN",
            "explorer_url": None,
            "method": "native",
            "confidence": 0
        }
@router.get("/chain-resolution-ai/{address}")
async def get_chain_resolution_ai(address: str):
    """
    Explicitly triggers the AI Analyst to determine the blockchain for a given wallet address.
    """
    ai_info = await resolve_unknown_chain(address)
    return {
        "chain": ai_info.get("chain", "Unknown"),
        "type": "UNKNOWN_AI_RESOLVED",
        "explorer_url": ai_info.get("explorer_url"),
        "official_website": ai_info.get("official_website"),
        "method": "ai",
        "confidence": ai_info.get("confidence", 0)
    }
