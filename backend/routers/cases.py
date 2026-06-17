"""
Axon Backend — Cases Router
"""
import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.db import get_db
from database.models import Case, CaseEntity, CaseNote, InvestigationLog
from schemas.models import CaseModel

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
    
    # Get linked entities via CaseEntity link table, or we can just query InvestigationLog by case_id
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
