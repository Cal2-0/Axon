"""
Axon Backend — Scan Router
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database.db import get_db, SessionLocal
from schemas.models import ScanRequest, BulkScanRequest
from modules.wallet_scorer import scan_wallet
from modules.contract_scanner import scan_contract
from modules.cross_chain import get_cross_chain_holdings
from modules.bulk_scanner import run_bulk_scan
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
async def post_scan_wallet(req: ScanRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if req.depth == "deep":
        background_tasks.add_task(run_deep_scan_background, req.address, "wallet")
        return {"status": "accepted", "message": "Deep scan initiated in background", "address": req.address}
    
    return await scan_wallet(req.address, db, depth="quick", case_id=req.case_id)

@router.post("/contract")
async def post_scan_contract(req: ScanRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if req.depth == "deep":
        background_tasks.add_task(run_deep_scan_background, req.address, "contract")
        return {"status": "accepted", "message": "Deep scan initiated in background", "address": req.address}

    return await scan_contract(req.address, db, depth="quick", case_id=req.case_id)

@router.get("/wallet/{address}/cross-chain-holdings")
async def get_wallet_cross_chain_holdings(address: str):
    return await get_cross_chain_holdings(address)

@router.post("/bulk")
async def post_scan_bulk(req: BulkScanRequest, db: Session = Depends(get_db)):
    """
    Run a bulk investigation on an array of addresses.
    Concurrency is throttled automatically to avoid API bans.
    """
    return await run_bulk_scan(req.addresses, db, case_id=req.case_id)
