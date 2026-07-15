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

import asyncio
from functools import partial

async def run_sync(func, *args, **kwargs):
    """Run a synchronous function in the asyncio threadpool executor."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, partial(func, *args, **kwargs))


def init_db():
    """Create all tables if they don't exist."""
    from database.models import (
        MaliciousWallet, ExchangeWallet, KnownMixer, ThreatActor,
        InvestigationLog, VerificationReport, Case, CaseEntity, CaseNote, CandidateEntity,
        AddressFormat
    )  # noqa: F401
    Base.metadata.create_all(bind=engine)
    
    # Safely alter tables to handle longer non-EVM addresses
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            if engine.dialect.name == 'postgresql':
                conn.execute(text("ALTER TABLE investigation_log ALTER COLUMN entity_address TYPE VARCHAR(100)"))
                conn.execute(text("ALTER TABLE verification_reports ALTER COLUMN entity_address TYPE VARCHAR(100)"))
                conn.execute(text("ALTER TABLE malicious_wallets ALTER COLUMN address TYPE VARCHAR(100)"))
                conn.execute(text("ALTER TABLE candidate_entities ALTER COLUMN address TYPE VARCHAR(100)"))
    except Exception as e:
        print(f"DB Migration warning: {e}")
    from modules.address_format_reference import seed_address_formats
    seed_address_formats()
