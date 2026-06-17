"""
Axon Backend — Bulk Investigation Scanner
Processes large arrays of addresses safely and outputs a sorted report.
"""
import asyncio
import uuid
import time
from sqlalchemy.orm import Session
from modules.wallet_scorer import scan_wallet
from database.models import InvestigationLog

async def _process_address(address: str, db: Session, semaphore: asyncio.Semaphore, batch_id: str, case_id: int = None):
    async with semaphore:
        try:
            # Execute standard wallet scan (quick depth)
            result = await scan_wallet(address, db, depth="quick")
            
            # The scan_wallet function automatically writes to InvestigationLog.
            # We fetch the latest log for this address and tag it with our batch_id and case_id.
            log = db.query(InvestigationLog).filter(
                InvestigationLog.entity_address.ilike(address)
            ).order_by(InvestigationLog.scan_timestamp.desc()).first()
            
            if log:
                log.bulk_batch_id = batch_id
                if case_id is not None:
                    log.case_id = case_id
                db.commit()
                
            return {"address": address, "status": "success", "data": result}
        except Exception as e:
            print(f"[BULK] Error scanning {address}: {e}")
            return {"address": address, "status": "error", "error": str(e)}

async def run_bulk_scan(addresses: list, db: Session, case_id: int = None) -> dict:
    batch_id = str(uuid.uuid4())
    semaphore = asyncio.Semaphore(3) # Max 3 concurrent scans to prevent rate-limits
    
    print(f"\n{'='*60}")
    print(f"[BULK SCAN] Starting batch {batch_id} for {len(addresses)} addresses")
    print(f"{'='*60}")

    tasks = [
        _process_address(addr, db, semaphore, batch_id, case_id)
        for addr in addresses
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Sort results by risk score descending
    successful = [r for r in results if r["status"] == "success"]
    failed = [r for r in results if r["status"] == "error"]
    
    successful.sort(key=lambda x: x["data"].get("risk", {}).get("score", 0), reverse=True)
    
    summary = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0
    }
    
    for r in successful:
        label = r["data"].get("risk", {}).get("label", "LOW")
        if label in summary:
            summary[label] += 1
            
    print(f"[BULK SCAN] Batch {batch_id} complete. Success: {len(successful)}, Failed: {len(failed)}")
            
    return {
        "bulk_batch_id": batch_id,
        "case_id": case_id,
        "total_processed": len(addresses),
        "successful": len(successful),
        "failed": len(failed),
        "summary": summary,
        "results": successful,
        "errors": failed
    }
