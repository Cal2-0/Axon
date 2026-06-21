import json
import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from database.db import get_db
from database.models import InvestigationLog

router = APIRouter()

import time

# Load balancer / query cache simulator (1 min TTL)
log_cache = {}
CACHE_TTL = 60

@router.get("/search")
def search_logs(
    q: str = Query("", description="Search term for address, risk level, or name"),
    limit: int = Query(100, description="Max results (legacy compat)"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(25, ge=1, le=100, description="Results per page"),
    entity_type: str = Query("", description="Filter by entity type: wallet or contract"),
    risk_level: str = Query("", description="Filter by risk level: critical, high, medium, low"),
    db: Session = Depends(get_db)
):
    # Cache key based on query params
    cache_key = f"{q}_{page}_{per_page}_{entity_type}_{risk_level}"
    
    # Check cache and TTL
    if cache_key in log_cache:
        cached_result, timestamp = log_cache[cache_key]
        if time.time() - timestamp < CACHE_TTL:
            return cached_result
        else:
            del log_cache[cache_key]

    query = db.query(InvestigationLog)
    
    # Risk level filter (from dedicated param or from search text)
    risk_q = risk_level.lower().strip() if risk_level else ""
    q_lower = q.lower().strip()
    
    # Apply risk filter from the dedicated risk_level param first
    if risk_q == "critical":
        query = query.filter(InvestigationLog.risk_score >= 80)
    elif risk_q == "high":
        query = query.filter(InvestigationLog.risk_score >= 60, InvestigationLog.risk_score < 80)
    elif risk_q == "medium":
        query = query.filter(InvestigationLog.risk_score >= 40, InvestigationLog.risk_score < 60)
    elif risk_q == "low":
        query = query.filter(InvestigationLog.risk_score < 40)
    
    # Smart text search (only if no dedicated risk filter was used)
    if q_lower and not risk_q:
        if "critical" in q_lower:
            query = query.filter(InvestigationLog.risk_score >= 80)
        elif "high" in q_lower:
            query = query.filter(InvestigationLog.risk_score >= 60, InvestigationLog.risk_score < 80)
        elif "medium" in q_lower:
            query = query.filter(InvestigationLog.risk_score >= 40, InvestigationLog.risk_score < 60)
        elif "low" in q_lower:
            query = query.filter(InvestigationLog.risk_score < 40)
        else:
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
    
    # Get total count for pagination
    total = query.count()
    pages = max(1, math.ceil(total / per_page))
    
    # Clamp page
    page = min(page, pages)
    offset = (page - 1) * per_page
    
    results = (
        query
        .order_by(InvestigationLog.scan_timestamp.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )
    
    def parse_signals(raw):
        try:
            if isinstance(raw, str):
                return json.loads(raw)[:3]
            elif isinstance(raw, list):
                return raw[:3]
        except Exception:
            pass
        return []
    
    result = {
        "results": [
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
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }
    
    # Store in cache with timestamp
    log_cache[cache_key] = (result, time.time())
    
    # Cleanup old cache entries if dict grows too large (>100)
    if len(log_cache) > 100:
        now = time.time()
        keys_to_delete = [k for k, (v, ts) in log_cache.items() if now - ts > CACHE_TTL]
        for k in keys_to_delete:
            del log_cache[k]
        # If still too large, just clear it to avoid memory leak
        if len(log_cache) > 100:
            log_cache.clear()
            
    return result
