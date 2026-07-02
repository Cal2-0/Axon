import os
import httpx
import asyncio
from typing import List, Dict, Set
from sqlalchemy.orm import Session
from database.models import AttributionRecord
from modules.wallet_scorer import _get_etherscan_key, _etherscan_get

MAX_HOPS = 3  # Start with 3 to prevent rate limit explosions
DUST_LIMIT_WEI = 10000000000000000  # 0.01 ETH

class FundTracer:
    def __init__(self, db: Session, max_hops: int = MAX_HOPS):
        self.db = db
        self.max_hops = max_hops
        self.nodes = {}
        self.edges = []
        self.visited: Set[str] = set()

    def _check_attribution(self, address: str) -> dict:
        """Check if address belongs to a known entity in our Attribution table."""
        record = self.db.query(AttributionRecord).filter(AttributionRecord.address.ilike(address)).first()
        if record:
            return {"is_known": True, "name": record.entity_name, "type": record.entity_type}
        return {"is_known": False, "name": "Data Not Available", "type": "EOA"}

    async def fetch_transactions(self, address: str, client: httpx.AsyncClient) -> list:
        key = _get_etherscan_key()
        url = f"https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address={address}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey={key}"
        res = await _etherscan_get(client, url)
        if isinstance(res, dict) and res.get("status") == "1":
            return res.get("result", [])
        return []

    async def trace_forward(self, root_address: str) -> dict:
        """Trace outgoing funds using BFS."""
        root_address = root_address.lower()
        queue = [(root_address, 0)]
        
        self.nodes[root_address] = {"id": root_address, "depth": 0, **self._check_attribution(root_address)}

        async with httpx.AsyncClient(timeout=10.0) as client:
            while queue:
                current_addr, depth = queue.pop(0)
                
                if current_addr in self.visited:
                    continue
                self.visited.add(current_addr)
                
                if depth >= self.max_hops:
                    continue
                    
                # If we hit an exchange, stop tracing this branch (Attribution hit)
                if self.nodes[current_addr]["is_known"] and current_addr != root_address:
                    continue

                txs = await self.fetch_transactions(current_addr, client)
                
                # We want outgoing funds
                out_txs = [tx for tx in txs if tx.get("from", "").lower() == current_addr]
                
                for tx in out_txs:
                    val = int(tx.get("value", "0"))
                    if val < DUST_LIMIT_WEI:
                        continue
                        
                    to_addr = tx.get("to", "").lower()
                    if not to_addr:
                        continue
                        
                    edge_id = tx.get("hash")
                    self.edges.append({
                        "source": current_addr,
                        "target": to_addr,
                        "value_wei": str(val),
                        "hash": edge_id
                    })
                    
                    if to_addr not in self.nodes:
                        self.nodes[to_addr] = {"id": to_addr, "depth": depth + 1, **self._check_attribution(to_addr)}
                        
                    if to_addr not in self.visited:
                        queue.append((to_addr, depth + 1))
                        
                # Anti-rate limit sleep
                await asyncio.sleep(0.5)

        return {
            "root": root_address,
            "nodes": list(self.nodes.values()),
            "edges": self.edges
        }

async def run_trace(address: str, db: Session, max_hops: int = 3) -> dict:
    tracer = FundTracer(db, max_hops)
    return await tracer.trace_forward(address)
