from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database.db import get_db
from database.models import InvestigationLog

router = APIRouter()

@router.get("/search")
def search_logs(q: str = Query("", description="Search term for address, risk level, or name"), limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(InvestigationLog)
    
    q_lower = q.lower()
    
    # Smart risk mapping
    if "critical" in q_lower:
        query = query.filter(InvestigationLog.risk_score >= 80)
    elif "high" in q_lower:
        query = query.filter(InvestigationLog.risk_score >= 60, InvestigationLog.risk_score < 80)
    elif "medium" in q_lower:
        query = query.filter(InvestigationLog.risk_score >= 40, InvestigationLog.risk_score < 60)
    elif "low" in q_lower:
        query = query.filter(InvestigationLog.risk_score < 40)
    elif q_lower:
        # Standard search over address, class, or JSON string of signals
        query = query.filter(
            or_(
                InvestigationLog.entity_address.ilike(f"%{q}%"),
                InvestigationLog.entity_class.ilike(f"%{q}%"),
                InvestigationLog.triggered_signals.ilike(f"%{q}%")
            )
        )
        
    results = query.order_by(InvestigationLog.scan_timestamp.desc()).limit(limit).all()
    
    return [
        {
            "id": r.id,
            "entity_address": r.entity_address,
            "entity_type": r.entity_type,
            "chain": r.chain,
            "scan_timestamp": r.scan_timestamp,
            "risk_score": r.risk_score,
            "entity_class": r.entity_class,
            "scan_depth": r.scan_depth,
            "case_id": r.case_id,
            "bulk_batch_id": r.bulk_batch_id
        }
        for r in results
    ]
