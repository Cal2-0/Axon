import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()
import asyncio
from database.db import SessionLocal
from modules.bulk_scanner import run_bulk_scan

async def test():
    db = SessionLocal()
    targets = [
        "0x27182842E098f60e3D576794A5bFFb0777E025d3",
        "0x11111112542D85B3ef694E05771c2dCCff4fAa26",
        "TDqsqm7ZfU5Sg4bFz2VjH9o2m74CqR56kY",
        "3txp4vRoCGJym3xR7yCVPFHoCNxv4Twseo"
    ]
    try:
        res = await run_bulk_scan(targets, db, case_id=1)
        print("Done")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
