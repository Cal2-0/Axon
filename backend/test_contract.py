import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import asyncio
from database.db import SessionLocal
from modules.contract_scanner import scan_contract
from dotenv import load_dotenv

load_dotenv()

async def test():
    db = SessionLocal()
    try:
        res = await scan_contract('0xdac17f958d2ee523a2206206994597c13d831ec7', db, depth='deep')
        print("Success")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
