"""
Axon Backend — Intelligence Lookup Module
Handles DB queries for intelligence pages.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database.models import MaliciousWallet, ExchangeWallet, KnownMixer, ThreatActor
from schemas.models import PaginatedWallets

def get_wallets(db: Session, query: str = "", page: int = 1, limit: int = 50, category: str = "", threat: str = "") -> PaginatedWallets:
    offset = (page - 1) * limit
    db_query = db.query(MaliciousWallet)

    if query:
        search = f"%{query}%"
        db_query = db_query.filter(
            or_(
                MaliciousWallet.address.ilike(search),
                MaliciousWallet.label.ilike(search),
                MaliciousWallet.description.ilike(search)
            )
        )
    if category and category != "All":
        db_query = db_query.filter(MaliciousWallet.category == category)
    if threat and threat != "All":
        db_query = db_query.filter(MaliciousWallet.threat_level == threat)

    total = db_query.count()
    wallets = db_query.order_by(MaliciousWallet.id.desc()).offset(offset).limit(limit).all()
    pages = (total + limit - 1) // limit

    return PaginatedWallets(
        total=total,
        page=page,
        limit=limit,
        pages=pages,
        data=wallets
    )

def get_exchanges(db: Session, query: str = ""):
    db_query = db.query(ExchangeWallet)
    if query:
        search = f"%{query}%"
        db_query = db_query.filter(
            or_(
                ExchangeWallet.name.ilike(search),
                ExchangeWallet.category.ilike(search)
            )
        )
    return db_query.all()

def get_mixers(db: Session, query: str = ""):
    db_query = db.query(KnownMixer)
    if query:
        search = f"%{query}%"
        db_query = db_query.filter(
            or_(
                KnownMixer.name.ilike(search),
                KnownMixer.address.ilike(search)
            )
        )
    return db_query.all()

def get_threats(db: Session, query: str = ""):
    db_query = db.query(ThreatActor)
    if query:
        search = f"%{query}%"
        db_query = db_query.filter(
            or_(
                ThreatActor.name.ilike(search),
                ThreatActor.origin.ilike(search),
                ThreatActor.type.ilike(search)
            )
        )
    return db_query.all()

def get_stats(db: Session):
    return {
        "malicious_wallets": db.query(MaliciousWallet).count(),
        "exchange_wallets": db.query(ExchangeWallet).count(),
        "known_mixers": db.query(KnownMixer).count(),
        "threat_actors": db.query(ThreatActor).count(),
    }
