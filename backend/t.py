import asyncio
import json
from database.db import SessionLocal
from modules.contract_scanner import scan_contract

async def run():
    db = SessionLocal()
    res = await scan_contract('0xdac17f958d2ee523a2206206994597c13d831ec7', db, 'quick')
    print('info' in res)
    print('verified' in res.get('info', {}))
    print(res.get('info', {}).get('verified'))

asyncio.run(run())
