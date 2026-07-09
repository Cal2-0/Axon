"""
Axon Backend — Pydantic Schemas for API Requests & Responses
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# --- Requests ---

class ScanRequest(BaseModel):
    address: str = Field(..., pattern=r"^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59}|T[a-zA-Z0-9]{33}|[1-9A-HJ-NP-Za-km-z]{32,44})$", description="Valid EVM, BTC, SOL, or TRON address")
    chain_id: Optional[str] = Field("1", description="Target Chain ID (default 1 for Ethereum)")
    depth: Optional[str] = Field("quick", pattern="^(quick|deep)$")
    case_id: Optional[int] = None
    examiner_name: Optional[str] = Field("AXON Automated Engine", description="Name of the forensic examiner")
    agency: Optional[str] = Field("", description="Agency or Organization")
    case_reference: Optional[str] = Field("", description="External case reference number")

class BulkScanRequest(BaseModel):
    addresses: List[str]
    case_id: Optional[int] = None

class DeepDiveRequest(BaseModel):
    entity_type: str = Field("wallet", pattern="^(wallet|contract)$")
    evidence_context: str

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


class AddressFormatModel(BaseModel):
    id: int
    chain: str
    symbol: str
    family: str
    address_type: str
    prefix: str
    min_length: int
    max_length: int
    encoding: str
    checksum: str
    traceability: str
    privacy_level: str
    supported: str
    notes: str
    example: str

    class Config:
        from_attributes = True

class InvestigationLogModel(BaseModel):
    id: int
    entity_address: str
    entity_type: str
    chain: str
    scan_timestamp: float
    risk_score: int
    entity_class: str
    triggered_signals: List[Any]
    scan_depth: str
    case_id: Optional[int]
    bulk_batch_id: Optional[str] = None
    raw_data: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True

class CaseNoteModel(BaseModel):
    id: int
    case_id: int
    content: str
    created_at: float

    class Config:
        from_attributes = True

class CaseEntityModel(BaseModel):
    id: int
    case_id: int
    investigation_log_id: int
    notes: str

    class Config:
        from_attributes = True

class UpdateCaseRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    assigned_to: Optional[str] = None

class CaseModel(BaseModel):
    id: int
    case_number: Optional[str] = None
    title: str
    description: str
    created_at: float
    updated_at: Optional[float] = None
    status: str
    priority: Optional[str] = "P2"
    category: Optional[str] = "General"
    tags: Optional[List[str]] = []
    assigned_to: Optional[str] = ""
    total_entities: Optional[int] = 0
    highest_risk: Optional[int] = 0
    notes: Optional[List[CaseNoteModel]] = []
    entities: Optional[List[InvestigationLogModel]] = []

    class Config:
        from_attributes = True

class CandidateEntityModel(BaseModel):
    id: int
    address: str
    label: str
    category: str
    source: str
    confidence: int
    chain: str
    status: str

    class Config:
        from_attributes = True


