"""
Axon Backend — Pydantic Schemas for API Requests & Responses
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# --- Requests ---

class ScanRequest(BaseModel):
    address: str

# --- Responses (Matching Frontend DEMO_PROFILES structure) ---

# Intelligence Database Models
class MaliciousWalletModel(BaseModel):
    id: int
    address: str
    label: str
    category: str
    chain: str
    amount_usd: str
    threat_level: str
    sanctioned: bool
    last_active: str
    risk_score: int
    description: str
    tags: List[str]
    first_seen: str
    total_received_eth: str
    total_sent_eth: str
    tx_count: int
    counterparties: int

    class Config:
        from_attributes = True

class ExchangeWalletModel(BaseModel):
    id: int
    name: str
    addresses: List[str]
    chain: str
    volume_24h: str
    kyc_level: str
    status: str
    type: str
    category: str

    class Config:
        from_attributes = True

class KnownMixerModel(BaseModel):
    id: int
    name: str
    address: str
    type: str
    chain: str
    status: str
    total_processed: str
    first_seen: str
    sanctioned_by: str
    risk_level: str

    class Config:
        from_attributes = True

class ThreatActorModel(BaseModel):
    id: int
    name: str
    origin: str
    type: str
    aliases: List[str]
    total_stolen: str
    known_attacks: List[str]
    status: str
    threat_level: str

    class Config:
        from_attributes = True

# Pagination Models
class PaginatedWallets(BaseModel):
    total: int
    page: int
    limit: int
    pages: int
    data: List[MaliciousWalletModel]

class IntelStats(BaseModel):
    malicious_wallets: int
    exchange_wallets: int
    known_mixers: int
    threat_actors: int
