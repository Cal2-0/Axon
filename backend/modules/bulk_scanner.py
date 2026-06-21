"""
Axon Backend — Bulk Investigation Scanner
Processes large arrays of addresses safely and outputs a sorted report.
"""
import asyncio
import uuid
import time
from sqlalchemy.orm import Session
from modules.wallet_scorer import scan_wallet, _get_etherscan_key, _etherscan_get
from modules.contract_scanner import scan_contract
from database.models import InvestigationLog, VerificationReport
import httpx
import hashlib
import json

async def _is_contract(address: str) -> bool:
    key = _get_etherscan_key()
    url = f"https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getCode&address={address}&tag=latest&apikey={key}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await _etherscan_get(client, url)
            result_str = str(res.get("result", "0x"))
            return result_str.startswith("0x") and len(result_str) > 2
    except Exception:
        return False

async def _process_address(address: str, db: Session, semaphore: asyncio.Semaphore, batch_id: str, case_id: int = None):
    async with semaphore:
        try:
            if await _is_contract(address):
                result = await scan_contract(address, db, depth="quick")
            else:
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
            
    response_data = {
        "bulk_batch_id": batch_id,
        "case_id": case_id,
        "total_processed": len(addresses),
        "successful": len(successful),
        "failed": len(failed),
        "summary": summary,
        "results": successful,
        "errors": failed
    }

    # Generate master verification report for the bulk run
    report_meta = {
        "report_id": f"AXON-B-{int(time.time())}-{batch_id[:8]}",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "generated_timestamp": time.time(),
        "scan_depth": "quick", # Bulk is always quick currently
        "entity_address": batch_id,
        "entity_type": "bulk_batch",
        "engine_version": "2.0/3.0",
    }
    
    hash_payload = json.dumps(response_data, sort_keys=True, default=str)
    report_meta["sha256_hash"] = hashlib.sha256(hash_payload.encode()).hexdigest()
    report_meta["hash_algorithm"] = "SHA-256"
    report_meta["hash_scope"] = "Full response_data payload (sorted keys, pre-metadata)"
    response_data["report_metadata"] = report_meta

    try:
        max_risk = max([r["data"].get("risk", {}).get("score", 0) for r in successful]) if successful else 0
        
        # Save independent verifiable report immutably
        report_entry = VerificationReport(
            report_id=report_meta["report_id"],
            report_hash=report_meta["sha256_hash"],
            entity_address=batch_id,
            entity_type="bulk_batch",
            risk_score=max_risk,
            scan_timestamp=time.time(),
            scan_depth="quick"
        )
        db.add(report_entry)
        db.commit()
    except Exception as e:
        print(f"[BULK] Error saving verification report: {e}")
        db.rollback()
        
    return response_data
