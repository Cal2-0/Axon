import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database.db import get_db
from database.models import InvestigationLog

router = APIRouter()

@router.get("/search")
def search_logs(
    q: str = Query("", description="Search term for address, risk level, or name"),
    limit: int = 100,
    entity_type: str = Query("", description="Filter by entity type: wallet or contract"),
    db: Session = Depends(get_db)
):
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
    
    # Optional entity type filter
    if entity_type in ("wallet", "contract"):
        query = query.filter(InvestigationLog.entity_type == entity_type)
        
    results = query.order_by(InvestigationLog.scan_timestamp.desc()).limit(limit).all()
    
    def parse_signals(raw):
        try:
            if isinstance(raw, str):
                return json.loads(raw)[:3]
            elif isinstance(raw, list):
                return raw[:3]
        except Exception:
            pass
        return []
    
    return [
        {
            "id": r.id,
            "entity_address": r.entity_address,
            "entity_type": r.entity_type,
            "chain": r.chain or "ETH",
            "scan_timestamp": r.scan_timestamp,
            "risk_score": r.risk_score,
            "entity_class": r.entity_class,
            "scan_depth": r.scan_depth,
            "case_id": r.case_id,
            "bulk_batch_id": r.bulk_batch_id,
            "triggered_signals": parse_signals(r.triggered_signals),
        }
        for r in results
    ]
