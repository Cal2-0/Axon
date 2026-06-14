"""
Axon Backend — Database Connection & Session Management
SQLite via SQLAlchemy for the intelligence database.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./axon_intel.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables if they don't exist."""
    from database.models import MaliciousWallet, ExchangeWallet, KnownMixer, ThreatActor  # noqa: F401
    Base.metadata.create_all(bind=engine)
