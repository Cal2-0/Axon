import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
from modules.coin_identifier import get_active_evm_chains

async def test():
    address = "0x27182842E098f60e3D576794A5bFFb0777E025d3"
    res = await get_active_evm_chains(address)
    print(res)

asyncio.run(test())
