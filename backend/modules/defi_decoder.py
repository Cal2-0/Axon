"""
Axon Backend — DeFi Protocol Interaction Decoder
Translates raw transaction hex calldata and method IDs into human-readable narratives.
Uses Openchain API (4byte directory) to decode unknown function signatures.
"""
import asyncio
import httpx
from typing import List, Dict

# Known common signatures to avoid API calls
COMMON_SIGS = {
    "0xa9059cbb": "transfer(address,uint256)",
    "0x095ea7b3": "approve(address,uint256)",
    "0x23b872dd": "transferFrom(address,address,uint256)",
    "0xd0e30db0": "deposit()",
    "0x2e1a7d4d": "withdraw(uint256)",
    "0x18cbafe5": "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
    "0x38ed1739": "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
    "0x7ff36ab5": "swapExactETHForTokens(uint256,address[],address,uint256)",
    "0x18cbafe5": "swapExactTokensForETH(uint256,uint256,address[],address,uint256)",
    "0x4a25d94a": "swapTokensForExactETH(uint256,uint256,address[],address,uint256)",
    "0x8803dbee": "swapTokensForExactTokens(uint256,uint256,address[],address,uint256)",
    "0x5c11d795": "swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint256)",
    "0xb6f9de95": "swapExactETHForTokensSupportingFeeOnTransferTokens(uint256,address[],address,uint256)",
    "0x791ac947": "swapExactTokensForETHSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint256)",
    "0x0162e2d0": "borrow(uint256)",
    "0xfbf9a0cd": "repayBorrow(uint256)",
}

async def _fetch_signatures(client: httpx.AsyncClient, method_ids: set) -> Dict[str, str]:
    """Fetch function signatures from openchain.xyz"""
    if not method_ids:
        return {}
    
    signatures = {}
    try:
        # Join max 50 at a time
        method_list = list(method_ids)
        for i in range(0, len(method_list), 50):
            chunk = method_list[i:i+50]
            url = f"https://api.openchain.xyz/signature-database/v1/lookup?function={','.join(chunk)}"
            res = await client.get(url, timeout=10.0)
            if res.status_code == 200:
                data = res.json()
                if data.get("ok") and data.get("result", {}).get("function"):
                    for m_id, sig_list in data["result"]["function"].items():
                        if sig_list and len(sig_list) > 0:
                            # Take the first one (usually most common)
                            signatures[m_id] = sig_list[0]["name"]
            await asyncio.sleep(0.5) # Rate limit protection
    except Exception as e:
        print(f"[DEFI_DECODER] Failed to fetch signatures: {e}")
    
    return signatures

async def decode_defi_interactions(transactions: List[Dict]) -> List[Dict]:
    """
    Analyzes transactions to find DeFi interactions, decodes their calldata/methodID,
    and returns a summary of the interactions.
    """
    decoded_interactions = []
    unknown_methods = set()
    
    # 1. First pass: Collect unknown method IDs
    for tx in transactions:
        input_data = tx.get("input", "")
        # Only process if there is calldata
        if input_data and len(input_data) >= 10 and input_data != "0x":
            method_id = input_data[:10].lower()
            if method_id not in COMMON_SIGS:
                unknown_methods.add(method_id)
                
    # 2. Fetch unknown signatures
    fetched_sigs = {}
    if unknown_methods:
        async with httpx.AsyncClient() as client:
            fetched_sigs = await _fetch_signatures(client, unknown_methods)
            
    # Combine with common
    all_sigs = {**COMMON_SIGS, **fetched_sigs}
    
    # 3. Second pass: Build interaction narratives
    for tx in transactions:
        input_data = tx.get("input", "")
        if not input_data or len(input_data) < 10 or input_data == "0x":
            continue
            
        method_id = input_data[:10].lower()
        func_name = tx.get("functionName", "")
        
        # Determine the signature
        signature = func_name
        if not signature:
            signature = all_sigs.get(method_id, "Unknown Function")
            
        # Try to clean the signature (e.g. transfer(address,uint256) -> transfer)
        simple_name = signature.split('(')[0]
        
        # Build narrative
        to_addr = tx.get("to", "")
        val_eth = float(tx.get("value", 0)) / 10**18 if tx.get("value") else 0
        
        narrative = f"Called {simple_name} on {to_addr[:8]}..."
        if val_eth > 0:
            narrative += f" with {val_eth:.4f} ETH"
            
        # Add to list if it's an interesting defi interaction (e.g. swap, deposit, stake, borrow)
        defi_keywords = ["swap", "deposit", "stake", "borrow", "mint", "claim", "liquidity", "pool", "burn", "bridge"]
        is_defi = any(kw in simple_name.lower() for kw in defi_keywords)
        
        if is_defi or "Data Not Available" not in signature:
            decoded_interactions.append({
                "hash": tx.get("hash", ""),
                "timestamp": tx.get("timeStamp", "0"),
                "to": to_addr,
                "method_id": method_id,
                "signature": signature,
                "simple_name": simple_name,
                "narrative": narrative,
                "is_defi": is_defi
            })
            
    # Sort by time desc
    decoded_interactions.sort(key=lambda x: int(x["timestamp"]), reverse=True)
    
    return decoded_interactions
