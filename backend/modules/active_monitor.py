import asyncio
from typing import List

class ActiveMonitor:
    """
    Background worker stub for Active Monitoring (Phase 4).
    In production, this would be a Celery worker subscribing to Alchemy Webhooks
    or polling the mempool for watched addresses.
    """
    def __init__(self):
        self.watched_addresses = set()
        self.is_running = False

    def add_watch(self, address: str):
        self.watched_addresses.add(address.lower())

    def remove_watch(self, address: str):
        if address.lower() in self.watched_addresses:
            self.watched_addresses.remove(address.lower())

    async def poll_mempool(self):
        """Simulate polling the mempool/RPC for new transactions."""
        self.is_running = True
        print("[MONITOR] Starting active monitoring loop...")
        while self.is_running:
            if self.watched_addresses:
                # Stub: Fetch latest block, check if any watched addresses are involved.
                pass
            await asyncio.sleep(15) # Poll every 15s (Ethereum block time)

    def stop(self):
        self.is_running = False
        print("[MONITOR] Stopping active monitoring loop.")

# Singleton instance
monitor = ActiveMonitor()
