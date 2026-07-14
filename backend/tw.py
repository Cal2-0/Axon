import asyncio
from database.db import SessionLocal
from modules.wallet_scorer import scan_wallet
from database.models import VerificationReport

async def test():
    db = SessionLocal()
    res = await scan_wallet("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", db, "quick")
    rep_id = res.get("report_metadata", {}).get("report_id")
    print("Generated Report ID:", rep_id)
    
    rep = db.query(VerificationReport).filter(VerificationReport.report_id == rep_id).first()
    print("Found in DB?", rep is not None)

asyncio.run(test())
