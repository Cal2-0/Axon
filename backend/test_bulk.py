import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database.db import SessionLocal
from modules.bulk_scanner import run_bulk_scan

async def main():
    db = SessionLocal()
    addrs = [
        "JUP6LkbZbjS1jKKuapdHHy74zcZ3tLUZoi5NtSe4q9",
        "TXLAQ63Xg1N4ZckPuKMvzW7C5EmLKEqcdj",
        "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cung5pxj3jh6ydzer"
    ]
    try:
        res = await run_bulk_scan(addrs, db)
        print("Success:", res["summary"])
    except Exception as e:
        print("Crash:", type(e).__name__, str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
