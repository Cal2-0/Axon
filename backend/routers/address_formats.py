"""
AXON address format reference endpoints.
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import AddressFormat
from schemas.models import AddressFormatModel

router = APIRouter()


@router.get("/", response_model=List[AddressFormatModel])
def read_address_formats(
    q: str = "",
    family: str = "",
    supported: str = "",
    db: Session = Depends(get_db),
):
    query = db.query(AddressFormat)

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                AddressFormat.chain.ilike(like),
                AddressFormat.symbol.ilike(like),
                AddressFormat.family.ilike(like),
                AddressFormat.address_type.ilike(like),
                AddressFormat.prefix.ilike(like),
                AddressFormat.encoding.ilike(like),
                AddressFormat.notes.ilike(like),
            )
        )

    if family:
        query = query.filter(AddressFormat.family == family)

    if supported:
        query = query.filter(AddressFormat.supported == supported)

    return query.order_by(AddressFormat.family, AddressFormat.chain, AddressFormat.address_type).all()
