from typing import List, Dict
import hashlib

def generate_wallet_dna(transactions: List[Dict]) -> str:
    """
    Generates a Behavioral Fingerprint (DNA) for an EVM wallet.
    Used for clustering and cross-case similarity matching.
    """
    if not transactions:
        return "NO_DNA"
        
    # Example heuristic: common interaction times + common gas prices + contract interaction types
    interactions = [tx.get("to", "").lower() for tx in transactions if tx.get("to")]
    interactions.sort()
    
    # Hash the sorted interactions to create a fingerprint
    dna_string = "|".join(interactions)
    return hashlib.sha256(dna_string.encode()).hexdigest()[:16]

def btc_change_address_heuristic(txs: List[Dict]) -> List[str]:
    """
    Applies the classical BTC Change-Address heuristic.
    If a transaction has 2 outputs, and one has never been seen before on the network,
    it is highly likely the change address belonging to the same entity.
    """
    clustered_addresses = []
    # Stub: Requires deep indexer graph. 
    return clustered_addresses

def evm_gas_funding_heuristic(txs: List[Dict]) -> List[str]:
    """
    Applies EVM Gas Funding heuristic.
    If Address A sends exactly enough ETH to Address B to cover gas for exactly 1 transaction,
    they are highly likely operated by the same entity or an automated script.
    """
    clustered_addresses = []
    # Stub: Check for specific tx values (e.g., 0.01 ETH) followed immediately by a token transfer.
    return clustered_addresses
