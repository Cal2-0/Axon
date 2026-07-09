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
from modules.ai_analyst import generate_dual_analysis
import asyncio
from fastapi import Request

# Import the limiter initialized in limiter.py
from limiter import limiter

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
@limiter.limit("15/minute")
async def post_scan_wallet(request: Request, req: ScanRequest, db: Session = Depends(get_db)):
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
    elif chain_type == "EVM":
        kwargs = {
            "depth": req.depth,
            "case_id": req.case_id,
            "examiner_name": req.examiner_name,
            "agency": req.agency,
            "case_reference": req.case_reference
        }
        if req.depth == "deep":
            return await scan_wallet(req.address, db, **kwargs)
        return await scan_wallet(req.address, db, **kwargs)
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Unsupported Chain. Only EVM, BTC, SOLANA, and TRON are currently supported for deep investigations.")

@router.post("/contract")
@limiter.limit("15/minute")
async def post_scan_contract(request: Request, req: ScanRequest, db: Session = Depends(get_db)):
    kwargs = {
        "depth": req.depth,
        "case_id": req.case_id,
        "chain_id": req.chain_id
    }
    if req.depth == "deep":
        return await scan_contract(req.address, db, **kwargs)

    return await scan_contract(req.address, db, **kwargs)

@router.get("/wallet/{address}/cross-chain-holdings")
@limiter.limit("20/minute")
async def get_wallet_cross_chain_holdings(request: Request, address: str):
    return await get_cross_chain_holdings(address)

@router.post("/deep-dive")
@limiter.limit("5/minute")
async def post_deep_dive(request: Request, req: DeepDiveRequest):
    """
    On-demand endpoint to run the expensive Dual-Agent Debate + Judge
    for a specific evidence context payload.
    """
    return await generate_dual_analysis(req.evidence_context, req.entity_type)

@router.post("/bulk")
@limiter.limit("3/minute")
async def post_scan_bulk(request: Request, req: BulkScanRequest, db: Session = Depends(get_db)):
    """
    Run a bulk investigation on an array of addresses.
    Concurrency is throttled automatically to avoid API bans.
    """
    return await run_bulk_scan(req.addresses, db, case_id=req.case_id)

@router.get("/chain-resolution/{address}")
@limiter.limit("60/minute")
async def get_chain_resolution(request: Request, address: str):
    """
    Deterministic address format analysis with optional AI pattern fallback.
    Step 1: regex + checksum validation. Step 2 (if step 1 fails): OpenRouter/Groq pattern recognition.
    """
    from modules.coin_identifier import resolve_chain_identity
    return await resolve_chain_identity(address)

@router.get("/trace/{address}")
@limiter.limit("10/minute")
async def get_fund_trace(request: Request, address: str, max_hops: int = 3, db: Session = Depends(get_db)):
    """
    Traces outgoing funds from an address using a bounded BFS search.
    Stops tracing a branch if it hits a known entity in the Attribution DB.
    """
    from modules.fund_tracer import run_trace
    return await run_trace(address, db, max_hops=max_hops)

@router.get("/report/{report_id}/pdf")
async def get_report_pdf(report_id: str, db: Session = Depends(get_db)):
    """
    Downloads a Verifiable Chain of Custody PDF for a given VerificationReport ID.
    """
    from fastapi.responses import Response
    from modules.report_generator import generate_pdf_report
    try:
        pdf_bytes = generate_pdf_report(report_id, db)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=AXON_Report_{report_id}.pdf"})
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=str(e))
