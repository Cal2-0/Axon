"""
Axon Backend — Cases Router (v2.0 — Enriched Case Management)

New in v2.0:
  - Auto-generated case numbers (CASE-2026-001)
  - PATCH /cases/{id} — update title, description, status, priority, category, tags
  - DELETE /cases/{id} — delete case and unlink entities
  - DELETE /cases/{id}/entities/{log_id} — remove entity from case
  - Auto-update total_entities and highest_risk on case
  - Case categories: General, Ransomware, Rug Pull, Pig Butchering, Exchange Hack,
                     Bridge Exploit, Mixer Tracing, Sanctions Evasion, Money Laundering,
                     Asset Recovery
"""
import time
import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from database.db import get_db
from database.models import Case, CaseEntity, CaseNote, InvestigationLog
from schemas.models import CaseModel, UpdateCaseRequest
from modules.ai_analyst import generate_summary

router = APIRouter()

# ─── VALID VALUES ────────────────────────────────────────────────────────────
VALID_STATUSES = {"Open", "Active", "Closed", "Archived"}
VALID_PRIORITIES = {"P1", "P2", "P3"}
VALID_CATEGORIES = {
    "General", "Ransomware", "Rug Pull", "Pig Butchering", "Exchange Hack",
    "Bridge Exploit", "Mixer Tracing", "Sanctions Evasion", "Money Laundering",
    "Asset Recovery", "Phishing", "DeFi Exploit", "NFT Fraud"
}

# ─── REQUEST MODELS ──────────────────────────────────────────────────────────

class CreateCaseRequest(BaseModel):
    title: str
    description: str = ""
    priority: str = "P2"
    category: str = "General"
    tags: List[str] = []
    assigned_to: str = ""

class CreateNoteRequest(BaseModel):
    content: str

class LinkEntityRequest(BaseModel):
    investigation_log_id: int
    notes: str = ""


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def _generate_case_number(db: Session) -> str:
    """Generate auto-incrementing case number: CASE-2026-001"""
    year = datetime.now().year
    prefix = f"CASE-{year}-"

    # Find the highest existing case number for this year
    latest = (
        db.query(Case)
        .filter(Case.case_number.like(f"{prefix}%"))
        .order_by(Case.id.desc())
        .first()
    )

    if latest and latest.case_number:
        try:
            num = int(latest.case_number.split("-")[-1]) + 1
        except (ValueError, IndexError):
            num = 1
    else:
        num = 1

    return f"{prefix}{num:03d}"


def _refresh_case_stats(db: Session, case_id: int):
    """Update cached total_entities and highest_risk on a case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        return

    logs = db.query(InvestigationLog).filter(InvestigationLog.case_id == case_id).all()
    case.total_entities = len(logs)
    case.highest_risk = max((l.risk_score for l in logs), default=0)
    case.updated_at = time.time()
    db.commit()


# ─── ENDPOINTS ───────────────────────────────────────────────────────────────

@router.post("/", response_model=CaseModel)
def create_case(req: CreateCaseRequest, db: Session = Depends(get_db)):
    case_number = _generate_case_number(db)

    case = Case(
        case_number=case_number,
        title=req.title,
        description=req.description,
        created_at=time.time(),
        updated_at=time.time(),
        status="Open",
        priority=req.priority if req.priority in VALID_PRIORITIES else "P2",
        category=req.category if req.category in VALID_CATEGORIES else "General",
        tags=req.tags,
        assigned_to=req.assigned_to,
        total_entities=0,
        highest_risk=0,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    print(f"[CASES] Created case {case_number}: {req.title}")
    return case


@router.get("/", response_model=List[CaseModel])
def list_cases(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Case)
    if status and status in VALID_STATUSES:
        query = query.filter(Case.status == status)
    cases = query.order_by(Case.created_at.desc()).all()

    # Refresh stats for each case
    for case in cases:
        log_count = db.query(func.count(InvestigationLog.id)).filter(
            InvestigationLog.case_id == case.id
        ).scalar()
        max_risk = db.query(func.max(InvestigationLog.risk_score)).filter(
            InvestigationLog.case_id == case.id
        ).scalar()
        case.total_entities = log_count or 0
        case.highest_risk = max_risk or 0

    db.commit()
    return cases


@router.get("/{case_id}", response_model=CaseModel)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    notes = db.query(CaseNote).filter(CaseNote.case_id == case_id).order_by(CaseNote.created_at.desc()).all()
    logs = db.query(InvestigationLog).filter(InvestigationLog.case_id == case_id).order_by(InvestigationLog.scan_timestamp.desc()).all()

    return {
        "id": case.id,
        "case_number": case.case_number,
        "title": case.title,
        "description": case.description,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "status": case.status,
        "priority": case.priority or "P2",
        "category": case.category or "General",
        "tags": case.tags or [],
        "assigned_to": case.assigned_to or "",
        "total_entities": len(logs),
        "highest_risk": max((l.risk_score for l in logs), default=0),
        "notes": notes,
        "entities": logs
    }


@router.patch("/{case_id}", response_model=CaseModel)
def update_case(case_id: int, req: UpdateCaseRequest, db: Session = Depends(get_db)):
    """Update case metadata (title, description, status, priority, category, tags, assigned_to)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if req.title is not None:
        case.title = req.title
    if req.description is not None:
        case.description = req.description
    if req.status is not None and req.status in VALID_STATUSES:
        case.status = req.status
    if req.priority is not None and req.priority in VALID_PRIORITIES:
        case.priority = req.priority
    if req.category is not None and req.category in VALID_CATEGORIES:
        case.category = req.category
    if req.tags is not None:
        case.tags = req.tags
    if req.assigned_to is not None:
        case.assigned_to = req.assigned_to

    case.updated_at = time.time()
    db.commit()
    db.refresh(case)

    print(f"[CASES] Updated case {case.case_number}: status={case.status}, priority={case.priority}")
    return case


@router.delete("/{case_id}")
def delete_case(case_id: int, db: Session = Depends(get_db)):
    """Delete a case and unlink all associated entities."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Unlink all investigation logs from this case (don't delete the logs themselves)
    db.query(InvestigationLog).filter(InvestigationLog.case_id == case_id).update(
        {"case_id": None}
    )

    # Delete case entities links
    db.query(CaseEntity).filter(CaseEntity.case_id == case_id).delete()

    # Delete case notes
    db.query(CaseNote).filter(CaseNote.case_id == case_id).delete()

    # Delete the case itself
    db.delete(case)
    db.commit()

    print(f"[CASES] Deleted case {case.case_number}: {case.title}")
    return {"status": "deleted", "case_id": case_id}


@router.get("/{case_id}/logs")
def get_case_logs(case_id: int, db: Session = Depends(get_db)):
    """Return all InvestigationLog entries associated with this case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    logs = (
        db.query(InvestigationLog)
        .filter(InvestigationLog.case_id == case_id)
        .order_by(InvestigationLog.scan_timestamp.desc())
        .all()
    )

    results = []
    for r in logs:
        # Parse triggered signals safely
        signals = []
        try:
            raw = r.triggered_signals
            if isinstance(raw, str):
                signals = json.loads(raw)
            elif isinstance(raw, list):
                signals = raw
        except Exception:
            signals = []

        results.append({
            "id": r.id,
            "entity_address": r.entity_address,
            "entity_type": r.entity_type,
            "entity_class": r.entity_class,
            "chain": r.chain,
            "scan_timestamp": r.scan_timestamp,
            "risk_score": r.risk_score,
            "scan_depth": r.scan_depth,
            "case_id": r.case_id,
            "bulk_batch_id": r.bulk_batch_id,
            "triggered_signals": signals[:3],  # First 3 signals for preview
        })

    return results


@router.delete("/{case_id}/entities/{log_id}")
def remove_case_entity(case_id: int, log_id: int, db: Session = Depends(get_db)):
    """Remove an entity from a case (unlink, don't delete the scan log)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    log = db.query(InvestigationLog).filter(
        InvestigationLog.id == log_id,
        InvestigationLog.case_id == case_id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Entity not found in this case")

    log.case_id = None

    # Also remove from CaseEntity table
    db.query(CaseEntity).filter(
        CaseEntity.case_id == case_id,
        CaseEntity.investigation_log_id == log_id
    ).delete()

    db.commit()
    _refresh_case_stats(db, case_id)

    print(f"[CASES] Removed entity {log.entity_address} from case {case.case_number}")
    return {"status": "removed", "log_id": log_id}


@router.post("/{case_id}/master-report")
async def generate_master_report(case_id: int, db: Session = Depends(get_db)):
    """
    Generate a comprehensive AI-powered court-ready forensic report for all
    entities scanned in this case. Token-efficient: builds a structured summary
    prompt rather than sending raw data.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    logs = (
        db.query(InvestigationLog)
        .filter(InvestigationLog.case_id == case_id)
        .order_by(InvestigationLog.risk_score.desc())
        .all()
    )

    if not logs:
        raise HTTPException(status_code=400, detail="No entities found in this case to generate a report.")

    # Build a token-efficient structured summary for the AI
    entity_summaries = []
    for i, log in enumerate(logs):
        signals = []
        try:
            raw = log.triggered_signals
            if isinstance(raw, str):
                signals = json.loads(raw)
            elif isinstance(raw, list):
                signals = raw
        except Exception:
            signals = []

        signal_texts = [s.get("reason", "") for s in signals[:3] if isinstance(s, dict)]

        label = "Unknown"
        if log.raw_data and isinstance(log.raw_data, dict):
            identity = log.raw_data.get("identity", {})
            if isinstance(identity, dict) and "label" in identity:
                label = identity["label"]

        entity_summaries.append(
            f"Entity {i+1}: {log.entity_address[:12]}... | Type: {log.entity_type} | "
            f"Class: {log.entity_class or 'Unknown'} | Label: {label} | Risk: {log.risk_score}/100 | "
            f"Chain: {log.chain or 'ETH'} | Depth: {log.scan_depth} | "
            f"Signals: {'; '.join(signal_texts) if signal_texts else 'No significant signals'}"
        )

    # Compute aggregate stats
    total = len(logs)
    critical = sum(1 for l in logs if l.risk_score >= 80)
    high = sum(1 for l in logs if 60 <= l.risk_score < 80)
    medium = sum(1 for l in logs if 40 <= l.risk_score < 60)
    low = sum(1 for l in logs if l.risk_score < 40)
    avg_risk = round(sum(l.risk_score for l in logs) / total, 1) if total > 0 else 0
    wallets = sum(1 for l in logs if l.entity_type == "wallet")
    contracts = sum(1 for l in logs if l.entity_type == "contract")

    prompt = f"""You are Axon AI, an elite blockchain forensic system generating a court-ready investigative report.

CASE: {case.title} ({case.case_number or 'N/A'})
CATEGORY: {case.category or 'General'}
PRIORITY: {case.priority or 'P2'}
DESCRIPTION: {case.description or 'No description provided'}
DATE: {time.strftime('%Y-%m-%d', time.gmtime(case.created_at))}
TOTAL ENTITIES: {total} ({wallets} wallets, {contracts} contracts)
RISK DISTRIBUTION: {critical} Critical | {high} High | {medium} Medium | {low} Low
AVERAGE RISK SCORE: {avg_risk}/100

ENTITY INTELLIGENCE SUMMARY:
{chr(10).join(entity_summaries)}

Generate a structured court-ready forensic report. Respond ONLY in valid JSON with these EXACT keys:
{{
  "case_classification": "CRITICAL|HIGH|MEDIUM|LOW",
  "executive_summary": "2-3 sentence summary of the investigation findings suitable for a judge or law enforcement officer",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "threat_assessment": "Detailed paragraph on the nature, sophistication, and scope of any detected threats",
  "entity_breakdown": "Summary of entity types, risk levels, and notable patterns across all scanned addresses",
  "money_flow_analysis": "Summary of any financial patterns, movement indicators, or laundering signals",
  "legal_implications": "What enforcement actions or legal jurisdiction considerations apply",
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "analytical_confidence": 85,
  "report_classification": "CONFIDENTIAL"
}}"""

    ai_result = await generate_summary(prompt)

    # Build the full report response
    return {
        "case_id": case_id,
        "case_number": case.case_number,
        "case_title": case.title,
        "case_description": case.description,
        "case_category": case.category,
        "case_priority": case.priority,
        "generated_at": time.time(),
        "generated_at_str": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "stats": {
            "total_entities": total,
            "wallets": wallets,
            "contracts": contracts,
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low,
            "average_risk": avg_risk,
        },
        "entities": [
            {
                "address": log.entity_address,
                "type": log.entity_type,
                "class": log.entity_class or "Unknown",
                "risk_score": log.risk_score,
                "chain": log.chain or "ETH",
                "scan_depth": log.scan_depth,
                "scanned_at": time.strftime("%Y-%m-%d %H:%M", time.gmtime(log.scan_timestamp)),
            }
            for log in logs
        ],
        "ai_report": ai_result,
    }


@router.post("/{case_id}/notes")
def add_case_note(case_id: int, req: CreateNoteRequest, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    note = CaseNote(
        case_id=case_id,
        content=req.content,
        created_at=time.time()
    )
    db.add(note)
    case.updated_at = time.time()
    db.commit()
    db.refresh(note)
    return note


@router.post("/{case_id}/entities")
def link_case_entity(case_id: int, req: LinkEntityRequest, db: Session = Depends(get_db)):
    log = db.query(InvestigationLog).filter(InvestigationLog.id == req.investigation_log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Investigation log not found")

    log.case_id = case_id

    entity = CaseEntity(
        case_id=case_id,
        investigation_log_id=req.investigation_log_id,
        notes=req.notes
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)

    _refresh_case_stats(db, case_id)
    return entity


# ─── TIMELINE ENDPOINT ───────────────────────────────────────────────────────

@router.get("/{case_id}/timeline")
def get_case_timeline(case_id: int, db: Session = Depends(get_db)):
    """Return a chronological timeline of all activities in a case (scans + notes)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    events = []

    # Add case creation event
    events.append({
        "type": "case_created",
        "timestamp": case.created_at,
        "title": "Case Created",
        "detail": f"Case \"{case.title}\" initialized",
        "icon": "📁"
    })

    # Add all scan events
    logs = db.query(InvestigationLog).filter(InvestigationLog.case_id == case_id).all()
    for log in logs:
        risk_label = "CRITICAL" if log.risk_score >= 80 else "HIGH" if log.risk_score >= 60 else "MEDIUM" if log.risk_score >= 40 else "LOW"
        events.append({
            "type": "scan",
            "timestamp": log.scan_timestamp,
            "title": f"{log.entity_type.capitalize()} Scan: {log.entity_address[:10]}...{log.entity_address[-6:]}",
            "detail": f"Risk: {log.risk_score}/100 ({risk_label}) | Class: {log.entity_class or 'Unknown'} | Depth: {log.scan_depth}",
            "icon": "🔍" if log.entity_type == "wallet" else "📜",
            "risk_score": log.risk_score,
            "entity_address": log.entity_address,
            "entity_type": log.entity_type,
            "log_id": log.id,
        })

    # Add all note events
    notes = db.query(CaseNote).filter(CaseNote.case_id == case_id).all()
    for note in notes:
        events.append({
            "type": "note",
            "timestamp": note.created_at,
            "title": "Note Added",
            "detail": note.content[:200],
            "icon": "📝"
        })

    # Sort chronologically (newest first)
    events.sort(key=lambda e: e["timestamp"], reverse=True)

    return events
