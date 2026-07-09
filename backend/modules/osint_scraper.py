import warnings
warnings.filterwarnings("ignore", category=RuntimeWarning, module="duckduckgo_search")

import asyncio
import httpx
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup
from typing import Dict, Any, List
import time
async def search_reddit(address: str, client: httpx.AsyncClient) -> List[Dict]:
    """Search Reddit for mentions of the address using pushshift or standard json."""
    results = []
    try:
        # Standard reddit search JSON
        url = f"https://www.reddit.com/search.json?q={address}&sort=new"
        response = await client.get(url, headers={"User-Agent": "Axon/1.0"})
        if response.status_code == 200:
            data = response.json()
            for child in data.get("data", {}).get("children", [])[:5]:
                post = child["data"]
                results.append({
                    "title": post.get("title", ""),
                    "subreddit": post.get("subreddit_name_prefixed", ""),
                    "url": f"https://reddit.com{post.get('permalink', '')}",
                    "upvotes": post.get("ups", 0),
                    "created_utc": post.get("created_utc", 0)
                })
    except Exception as e:
        print(f"[OSINT] Reddit search failed for {address}: {e}")
    return results

async def search_github(address: str, client: httpx.AsyncClient) -> List[Dict]:
    """Search Github via their REST API (requires token for high rate limits, but free tier works for low volume)."""
    results = []
    try:
        url = f"https://api.github.com/search/code?q={address}"
        response = await client.get(url, headers={"User-Agent": "Axon/1.0", "Accept": "application/vnd.github.v3+json"})
        if response.status_code == 200:
            data = response.json()
            for item in data.get("items", [])[:5]:
                results.append({
                    "repository": item.get("repository", {}).get("full_name", ""),
                    "file_name": item.get("name", ""),
                    "url": item.get("html_url", "")
                })
    except Exception as e:
        print(f"[OSINT] Github search failed for {address}: {e}")
    return results

async def search_ens(address: str, client: httpx.AsyncClient) -> Dict:
    """Resolve ENS domain for address using ensideas public API."""
    try:
        url = f"https://api.ensideas.com/ens/resolve/{address}"
        response = await client.get(url)
        if response.status_code == 200:
            data = response.json()
            return {
                "name": data.get("name"),
                "address": data.get("address"),
                "displayName": data.get("displayName")
            }
    except Exception as e:
        print(f"[OSINT] ENS search failed for {address}: {e}")
    return {"name": None, "address": address, "displayName": None}

def _sync_ddgs_search(query: str, max_results=5) -> List[Dict]:
    """Run DDGS in a synchronous wrapper."""
    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", "")
                })
    except Exception as e:
        print(f"[OSINT] DDGS search failed for {query}: {e}")
    return results

async def search_web_mentions(address: str) -> Dict[str, List[Dict]]:
    """Use DuckDuckGo to search for mentions on Twitter/X and general web."""
    # We run the sync DDGS in a thread pool to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    
    # 1. Twitter/X mentions
    twitter_query = f'"{address}" site:twitter.com OR site:x.com'
    twitter_task = loop.run_in_executor(None, _sync_ddgs_search, twitter_query)
    
    # 2. General web mentions (forums, news, etc)
    general_query = f'"{address}" -site:twitter.com -site:x.com -site:reddit.com'
    general_task = loop.run_in_executor(None, _sync_ddgs_search, general_query)
    
    try:
        twitter_results, general_results = await asyncio.wait_for(
            asyncio.gather(twitter_task, general_task), timeout=10.0
        )
    except asyncio.TimeoutError:
        print(f"[OSINT] DDGS web search timed out for {address}")
        twitter_results, general_results = [], []
    
    return {
        "twitter": twitter_results,
        "general_web": general_results
    }

async def run_osint_scan(address: str, chain: str = "Ethereum") -> Dict[str, Any]:
    """
    Run a full OSINT sweep for a given blockchain address.
    Returns structured data from Reddit, GitHub, ENS, Twitter, and General Web.
    """
    print(f"[OSINT] Starting scan for {address}...")
    start_time = time.time()
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Run API tasks concurrently
        reddit_task = search_reddit(address, client)
        github_task = search_github(address, client)
        ens_task = search_ens(address, client)
        
        # Run web search task
        web_task = search_web_mentions(address)
        
        reddit, github, ens, web = await asyncio.gather(
            reddit_task, github_task, ens_task, web_task, return_exceptions=True
        )
        
    # Handle possible exceptions
    if isinstance(reddit, Exception): reddit = []
    if isinstance(github, Exception): github = []
    if isinstance(ens, Exception): ens = {"name": None}
    if isinstance(web, Exception): web = {"twitter": [], "general_web": []}
        
    summary = {
        "ens_name": ens.get("name"),
        "reddit_mentions": len(reddit),
        "github_mentions": len(github),
        "twitter_mentions": len(web.get("twitter", [])),
        "web_mentions": len(web.get("general_web", []))
    }
    
    print(f"[OSINT] Scan complete in {time.time() - start_time:.2f}s. Summary: {summary}")
    
    return {
        "summary": summary,
        "details": {
            "ens": ens,
            "reddit": reddit,
            "github": github,
            "twitter": web.get("twitter", []),
            "general_web": web.get("general_web", [])
        }
    }
