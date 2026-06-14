"""
Axon Backend — Scan Router
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.db import get_db
from schemas.models import ScanRequest
from modules.wallet_scorer import scan_wallet
from modules.contract_scanner import scan_contract

router = APIRouter()

@router.post("/wallet")
async def post_scan_wallet(req: ScanRequest, db: Session = Depends(get_db)):
    return await scan_wallet(req.address, db)

@router.post("/contract")
async def post_scan_contract(req: ScanRequest, db: Session = Depends(get_db)):
    return await scan_contract(req.address, db)
