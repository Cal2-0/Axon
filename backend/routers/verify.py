from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import VerificationReport

router = APIRouter(prefix="/verify", tags=["Verify"])

@router.get("/{report_id}")
async def verify_report(report_id: str, db: Session = Depends(get_db)):
    """
    Retrieve the authentic SHA-256 hash and metadata for a given report ID.
    Used for tamper-proof verification.
    """
    # Fetch from database
    log = db.query(VerificationReport).filter(VerificationReport.report_id == report_id).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Report ID not found in verification database")
        
    return {
        "status": "success",
        "report_id": log.report_id,
        "authentic_hash": log.report_hash,
        "scan_timestamp": log.scan_timestamp,
        "entity_address": log.entity_address,
        "entity_type": log.entity_type,
        "risk_score": log.risk_score,
        "scan_depth": log.scan_depth
    }
