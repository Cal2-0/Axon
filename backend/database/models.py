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
    status = Column(String(20), default="Active")
    threat_level = Column(String(20), default="HIGH")
