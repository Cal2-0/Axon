"""
Axon Backend — Cases Router
Includes case management, logs fetch, and master court-ready report generation.
"""
import time
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.db import get_db
from database.models import Case, CaseEntity, CaseNote, InvestigationLog
from schemas.models import CaseModel
from modules.ai_analyst import generate_summary

router = APIRouter()

class CreateCaseRequest(BaseModel):
    title: str
    description: str = ""

class CreateNoteRequest(BaseModel):
    content: str

class LinkEntityRequest(BaseModel):
    investigation_log_id: int
    notes: str = ""

@router.post("/", response_model=CaseModel)
def create_case(req: CreateCaseRequest, db: Session = Depends(get_db)):
    case = Case(
        title=req.title,
        description=req.description,
        created_at=time.time(),
        status="Open"
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case

@router.get("/", response_model=List[CaseModel])
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(Case.created_at.desc()).all()
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
        "title": case.title,
        "description": case.description,
        "created_at": case.created_at,
        "status": case.status,
        "notes": notes,
        "entities": logs
    }

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
        
        entity_summaries.append(
            f"Entity {i+1}: {log.entity_address[:12]}... | Type: {log.entity_type} | "
            f"Class: {log.entity_class or 'Unknown'} | Risk: {log.risk_score}/100 | "
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

CASE: {case.title}
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
        "case_title": case.title,
        "case_description": case.description,
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
    note = CaseNote(
        case_id=case_id,
        content=req.content,
        created_at=time.time()
    )
    db.add(note)
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
    return entity
