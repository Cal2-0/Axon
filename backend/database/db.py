"""
Axon Backend — Database Connection & Session Management
SQLite via SQLAlchemy for the intelligence database.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./axon_intel.db")

# If using SQLite, we need check_same_thread=False. If Postgres (Supabase), we don't.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
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
