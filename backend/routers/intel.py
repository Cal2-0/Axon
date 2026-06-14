"""
Axon Backend — Intelligence Routers
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.db import get_db
from modules.intel_lookup import get_wallets, get_exchanges, get_mixers, get_threats, get_stats
from schemas.models import PaginatedWallets, ExchangeWalletModel, KnownMixerModel, ThreatActorModel, IntelStats
from typing import List

router = APIRouter()

@router.get("/wallets", response_model=PaginatedWallets)
def read_wallets(
    q: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    category: str = "",
    threat: str = "",
    db: Session = Depends(get_db)
):
    return get_wallets(db, q, page, limit, category, threat)

@router.get("/exchanges", response_model=List[ExchangeWalletModel])
def read_exchanges(q: str = "", db: Session = Depends(get_db)):
    return get_exchanges(db, q)

@router.get("/mixers", response_model=List[KnownMixerModel])
def read_mixers(q: str = "", db: Session = Depends(get_db)):
    return get_mixers(db, q)

@router.get("/threats", response_model=List[ThreatActorModel])
def read_threats(q: str = "", db: Session = Depends(get_db)):
    return get_threats(db, q)

@router.get("/stats", response_model=IntelStats)
def read_stats(db: Session = Depends(get_db)):
    return get_stats(db)
