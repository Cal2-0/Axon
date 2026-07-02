"""
Axon Backend — SQLAlchemy ORM Models
4 tables: malicious_wallets, exchange_wallets, known_mixers, threat_actors
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, JSON
from database.db import Base


class MaliciousWallet(Base):
    """10,000+ flagged wallet addresses with risk metadata."""
    __tablename__ = "malicious_wallets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    address = Column(String(42), unique=True, index=True, nullable=False)
    label = Column(String(200), nullable=False)
    category = Column(String(50), index=True, nullable=False)
    chain = Column(String(30), default="ETH")
    amount_usd = Column(String(30), default="$0")
    threat_level = Column(String(20), index=True, default="HIGH")
    sanctioned = Column(Boolean, default=False)
    last_active = Column(String(20), default="2024-01-01")
    risk_score = Column(Integer, default=50)
    description = Column(Text, default="")
    tags = Column(JSON, default=list)
    first_seen = Column(String(20), default="2020-01-01")
    total_received_eth = Column(String(30), default="0")
    total_sent_eth = Column(String(30), default="0")
    tx_count = Column(Integer, default=0)
    counterparties = Column(Integer, default=0)
    source = Column(String(50), default="unknown")
    confidence = Column(Integer, default=50)
    cluster_id = Column(String(50), nullable=True, index=True)


class ExchangeWallet(Base):
    """Known exchange wallet addresses for attribution."""
    __tablename__ = "exchange_wallets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    addresses = Column(JSON, default=list)
    chain = Column(String(30), default="ETH")
    volume_24h = Column(String(30), default="$0")
    kyc_level = Column(String(30), default="Unknown")
    status = Column(String(20), default="Active")
    type = Column(String(10), default="CEX")
    category = Column(String(20), default="Tier 2")


class KnownMixer(Base):
    """Known mixer/tumbler/bridge services."""
    __tablename__ = "known_mixers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    address = Column(String(100), default="")
    type = Column(String(50), default="Mixer")
    chain = Column(String(30), default="ETH")
    status = Column(String(20), default="Active")
    total_processed = Column(String(30), default="Unknown")
    first_seen = Column(String(20), default="2020-01-01")
    sanctioned_by = Column(String(100), default="None")
    risk_level = Column(String(20), default="HIGH")


class ThreatActor(Base):
    """Known threat actor profiles."""
    __tablename__ = "threat_actors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    origin = Column(String(100), default="Unknown")
    type = Column(String(50), default="Unknown")
    aliases = Column(JSON, default=list)
    total_stolen = Column(String(30), default="Unknown")
    known_attacks = Column(JSON, default=list)
    status = Column(String(200), default="Active")
    threat_level = Column(String(20), default="HIGH")


class InvestigationLog(Base):
    """Log of all scans and their results."""
    __tablename__ = "investigation_log"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    entity_address = Column(String(42), index=True, nullable=False)
    entity_type = Column(String(20), default="wallet")  # wallet, contract
    chain = Column(String(30), default="ETH")
    scan_timestamp = Column(Float, nullable=False)
    risk_score = Column(Integer, default=0)
    entity_class = Column(String(100), default="")
    triggered_signals = Column(JSON, default=list)
    scan_depth = Column(String(20), default="quick")
    case_id = Column(Integer, index=True, nullable=True)
    bulk_batch_id = Column(String(50), index=True, nullable=True)
    raw_data = Column(JSON, default=dict)

class AttributionRecord(Base):
    """Mapping of raw addresses to known entities (e.g., Binance Hot Wallet 2)."""
    __tablename__ = "attribution_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    address = Column(String(100), unique=True, index=True, nullable=False)
    chain = Column(String(30), default="ETH", index=True)
    entity_name = Column(String(100), nullable=False)
    entity_type = Column(String(50), default="Exchange") # Exchange, Mixer, Phishing, etc.
    risk_level = Column(String(20), default="MEDIUM")

class VerificationReport(Base):
    """Tamper-proof verifiable reports stored independently."""
    __tablename__ = "verification_reports"

    report_id = Column(String(50), primary_key=True, index=True)
    report_hash = Column(String(64), nullable=False)
    entity_address = Column(String(42), index=True, nullable=False)
    entity_type = Column(String(20), default="wallet")
    risk_score = Column(Integer, default=0)
    scan_timestamp = Column(Float, nullable=False)
    scan_depth = Column(String(20), default="quick")

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_number = Column(String(30), unique=True, nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    created_at = Column(Float, nullable=False)
    updated_at = Column(Float, nullable=True)
    status = Column(String(20), default="Open")  # Open, Active, Closed, Archived
    priority = Column(String(10), default="P2")  # P1, P2, P3
    category = Column(String(50), default="General")  # Ransomware, Rug Pull, etc.
    tags = Column(JSON, default=list)
    assigned_to = Column(String(100), default="")
    total_entities = Column(Integer, default=0)
    highest_risk = Column(Integer, default=0)


class CaseEntity(Base):
    __tablename__ = "case_entities"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, index=True, nullable=False)
    investigation_log_id = Column(Integer, index=True, nullable=False)
    notes = Column(Text, default="")
    internal_tag = Column(String(100), nullable=True)  # e.g., "Target", "Victim", "Suspect"

class CaseNote(Base):
    __tablename__ = "case_notes"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, index=True, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(Float, nullable=False)

class CandidateEntity(Base):
    __tablename__ = "candidate_entities"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    address = Column(String(42), index=True, nullable=False)
    label = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    source = Column(String(100), nullable=False)
    confidence = Column(Integer, default=50)
    chain = Column(String(30), default="ETH")
    status = Column(String(20), default="pending")
    discovered_at = Column(Float, nullable=True)  # unix timestamp
    auto_detected = Column(Boolean, default=False)
    promoted_to_db = Column(Boolean, default=False)  # Track if promoted

