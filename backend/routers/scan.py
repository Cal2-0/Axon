"""
Axon Backend — Scan Router
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database.db import get_db, SessionLocal
from schemas.models import ScanRequest, BulkScanRequest, DeepDiveRequest
from modules.wallet_scorer import scan_wallet
from modules.contract_scanner import scan_contract
from modules.cross_chain import get_cross_chain_holdings
from modules.bulk_scanner import run_bulk_scan
from modules.ai_analyst import generate_dual_analysis
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
