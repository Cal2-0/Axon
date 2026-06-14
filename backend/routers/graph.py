"""
Axon Backend — Graph Router
"""
from fastapi import APIRouter, Query
from modules.transaction_graph import build_graph

router = APIRouter()

@router.get("/{address}")
def get_graph(address: str, hops: int = Query(2, ge=1, le=3)):
    return build_graph(address, hops)
