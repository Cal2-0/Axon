"""
Axon Backend — Investigations Router
Provides endpoints to retrieve scan history from the investigation log.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from database.db import get_db
from database.models import InvestigationLog
from schemas.models import InvestigationLogModel

router = APIRouter()

@router.get("/history", response_model=List[InvestigationLogModel])
def get_investigation_history(
    address: str, 
    limit: int = 10, 
    db: Session = Depends(get_db)
):
    """Fetch history of scans for a specific address."""
    logs = db.query(InvestigationLog).filter(
        InvestigationLog.entity_address.ilike(address)
    ).order_by(InvestigationLog.scan_timestamp.desc()).limit(limit).all()
    return logs

@router.get("/search", response_model=List[InvestigationLogModel])
def search_investigations(
    query: str, 
    limit: int = 20, 
    db: Session = Depends(get_db)
):
    """Fuzzy search across investigation logs by address or entity class."""
    search_term = f"%{query}%"
    logs = db.query(InvestigationLog).filter(
        or_(
            InvestigationLog.entity_address.ilike(search_term),
            InvestigationLog.entity_class.ilike(search_term)
        )
    ).order_by(InvestigationLog.scan_timestamp.desc()).limit(limit).all()
    return logs
