"""
AXON — Bulk Intelligence Clustering & Analysis Engine
Computes clusters, similarity matrices, key findings, and investigative recommendations
from already-fetched scan results. No additional external API calls.
"""
from typing import List, Dict, Any, Set, Tuple
from collections import defaultdict
import statistics
import time


def _extract_counterparties(result: dict) -> Set[str]:
    """Extract all counterparty addresses from a scan result."""
    counterparties = set()
    
    # From graph nodes
    nodes = result.get("data", {}).get("graph", {}).get("nodes", [])
    target_addr = result.get("address", "").lower()
    for node in nodes:
        nid = node.get("id", "").lower()
        if nid and nid != target_addr:
            counterparties.add(nid)
    
    # From graph edges
    edges = result.get("data", {}).get("graph", {}).get("edges", [])
    for edge in edges:
        src = edge.get("source", "").lower()
        tgt = edge.get("target", "").lower()
        if src and src != target_addr:
            counterparties.add(src)
        if tgt and tgt != target_addr:
            counterparties.add(tgt)
    
    return counterparties


def _extract_timestamps(result: dict) -> List[float]:
    """Extract transaction timestamps from a scan result."""
    timestamps = []
    
    # From temporal_activity
    temporal = result.get("data", {}).get("temporal_activity", [])
    for entry in temporal:
        ts = entry.get("timestamp") or entry.get("time")
        if ts:
            if isinstance(ts, (int, float)):
                timestamps.append(float(ts))
            elif isinstance(ts, str):
                try:
                    timestamps.append(float(ts))
                except ValueError:
                    pass
    
    # From transactions
    txs = result.get("data", {}).get("transactions", [])
    for tx in txs:
        ts = tx.get("timeStamp") or tx.get("timestamp") or tx.get("block_time")
        if ts:
            try:
                timestamps.append(float(ts))
            except (ValueError, TypeError):
                pass
    
    return sorted(timestamps)


def _get_risk_score(result: dict) -> int:
    return result.get("data", {}).get("risk", {}).get("score", 0)


def _get_label(result: dict) -> str:
    return result.get("data", {}).get("identity", {}).get("label", "Unknown")


def _get_entity_class(result: dict) -> str:
    return result.get("data", {}).get("risk", {}).get("entityClass", "Unknown")


def _get_volume(result: dict) -> float:
    """Try to extract USD volume as a float."""
    vol = result.get("data", {}).get("identity", {}).get("totalVolumeUSD", "0")
    if isinstance(vol, (int, float)):
        return float(vol)
    if isinstance(vol, str):
        cleaned = vol.replace("$", "").replace(",", "").replace("~", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    return 0.0


def _get_tx_count(result: dict) -> int:
    val = result.get("data", {}).get("identity", {}).get("txCount", 0)
    if isinstance(val, int): return val
    try: return int(val)
    except: return 0


def _get_counterparty_count(result: dict) -> int:
    val = result.get("data", {}).get("identity", {}).get("uniqueCounterparties", 0)
    if isinstance(val, int): return val
    try: return int(val)
    except: return 0


def _has_mixer(result: dict) -> bool:
    return result.get("data", {}).get("mixer_exposure", False) or \
           result.get("data", {}).get("mixer", {}).get("detected", False)


def _has_exchange(result: dict) -> bool:
    return result.get("data", {}).get("exchange_exposure", False) or \
           result.get("data", {}).get("exchange", {}).get("detected", False)


def _has_threat_db(result: dict) -> bool:
    signals = result.get("data", {}).get("signals", [])
    for s in signals:
        reason = s[0].lower() if isinstance(s, (list, tuple)) else str(s).lower()
        if "threat" in reason or "sanctioned" in reason or "ofac" in reason:
            return True
    return False


def _is_sanctioned(result: dict) -> bool:
    signals = result.get("data", {}).get("signals", [])
    for s in signals:
        reason = s[0].lower() if isinstance(s, (list, tuple)) else str(s).lower()
        if "sanctioned" in reason or "ofac" in reason:
            return True
    return False


def _detect_chain(result: dict) -> str:
    """Detect which chain a result belongs to."""
    addr = result.get("address", "")
    if addr.startswith("0x") and len(addr) == 42:
        return "ethereum"
    elif addr.startswith(("1", "3", "bc1")):
        return "bitcoin"
    elif addr.startswith("T") and len(addr) == 34:
        return "tron"
    elif len(addr) >= 32 and len(addr) <= 44 and not addr.startswith("0x"):
        return "solana"
    return "unknown"


# ═══════════════════════════════════════════════════════════════════════════════
# CORE INTELLIGENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def compute_chain_breakdown(results: List[dict]) -> dict:
    """Count how many addresses belong to each chain."""
    breakdown = defaultdict(int)
    for r in results:
        chain = _detect_chain(r)
        breakdown[chain] += 1
    return dict(breakdown)


def compute_entity_breakdown(results: List[dict]) -> dict:
    """Count entity types across all results."""
    breakdown = defaultdict(int)
    for r in results:
        ec = _get_entity_class(r)
        if ec and ec != "Unknown":
            breakdown[ec] += 1
        else:
            breakdown["Unclassified"] += 1
    return dict(breakdown)


def build_priority_queue(results: List[dict]) -> List[dict]:
    """
    Build a priority queue ranking wallets by investigative urgency.
    Priority = composite of risk score, mixer exposure, threat DB matches, and sanctions.
    """
    queue = []
    for r in results:
        score = _get_risk_score(r)
        mixer = _has_mixer(r)
        threat = _has_threat_db(r)
        sanctioned = _is_sanctioned(r)
        exchange = _has_exchange(r)
        
        # Composite priority (1-5 stars)
        priority = 1
        if score >= 80:
            priority = 5
        elif score >= 60:
            priority = 4
        elif score >= 40:
            priority = 3
        elif score >= 20:
            priority = 2
        
        # Boost for specific indicators
        if sanctioned:
            priority = 5
        if mixer and score >= 50:
            priority = max(priority, 4)
        if threat:
            priority = max(priority, 4)
        
        # Determine primary reason and recommended action
        reasons = []
        if sanctioned:
            reasons.append("OFAC Sanctioned Entity")
        if mixer:
            reasons.append("Mixer/Privacy Protocol Exposure")
        if threat:
            reasons.append("Threat Intelligence Match")
        if exchange:
            reasons.append("Exchange Interaction")
        if score >= 80:
            reasons.append("Critical Risk Score")
        elif score >= 60:
            reasons.append("High Risk Score")
        
        if not reasons:
            if score >= 40:
                reasons.append("Elevated Behavioral Score")
            else:
                reasons.append("Routine — Low Risk Profile")
        
        # Determine action
        if sanctioned:
            action = "Immediate"
        elif priority == 5:
            action = "Escalate"
        elif priority >= 4:
            action = "Review"
        elif priority >= 3:
            action = "Monitor"
        else:
            action = "Archive"
        
        queue.append({
            "address": r.get("address", ""),
            "label": _get_label(r),
            "risk_score": score,
            "priority": priority,
            "reason": " + ".join(reasons[:3]),
            "action": action,
            "chain": _detect_chain(r),
            "mixer_exposure": mixer,
            "exchange_exposure": exchange,
            "threat_db": threat,
            "sanctioned": sanctioned,
        })
    
    queue.sort(key=lambda x: (-x["priority"], -x["risk_score"]))
    return queue


def compute_statistics(results: List[dict]) -> dict:
    """Compute aggregate statistics across all scan results."""
    scores = [_get_risk_score(r) for r in results]
    volumes = [_get_volume(r) for r in results]
    tx_counts = [_get_tx_count(r) for r in results]
    cp_counts = [_get_counterparty_count(r) for r in results]
    
    exchange_count = sum(1 for r in results if _has_exchange(r))
    mixer_count = sum(1 for r in results if _has_mixer(r))
    threat_count = sum(1 for r in results if _has_threat_db(r))
    sanction_count = sum(1 for r in results if _is_sanctioned(r))
    
    # Count entity types
    wallet_count = sum(1 for r in results if _get_entity_class(r) not in ("Contract", "Token", "DEX", "Bridge"))
    contract_count = sum(1 for r in results if _get_entity_class(r) in ("Contract", "Token", "DEX", "Bridge"))
    
    return {
        "total_wallets": wallet_count,
        "total_contracts": contract_count,
        "total_entities": len(results),
        "exchange_count": exchange_count,
        "mixer_count": mixer_count,
        "threat_db_matches": threat_count,
        "sanctioned": sanction_count,
        "avg_risk": round(statistics.mean(scores)) if scores else 0,
        "median_risk": round(statistics.median(scores)) if scores else 0,
        "max_risk": max(scores) if scores else 0,
        "min_risk": min(scores) if scores else 0,
        "total_volume_usd": f"${sum(volumes):,.0f}" if any(v > 0 for v in volumes) else "Data Not Available",
        "total_counterparties": sum(cp_counts),
        "total_transactions": sum(tx_counts),
    }


def cluster_by_counterparties(results: List[dict]) -> List[dict]:
    """
    Group wallets that share counterparties using Union-Find.
    """
    if len(results) < 2:
        return [{"id": "A", "label": "All Subjects", "wallets": [r.get("address", "") for r in results], "reason": "Single entity batch"}]
    
    # Build counterparty sets per address
    addr_counterparties = {}
    for r in results:
        addr = r.get("address", "").lower()
        addr_counterparties[addr] = _extract_counterparties(r)
    
    addresses = list(addr_counterparties.keys())
    
    # Union-Find
    parent = {a: a for a in addresses}
    
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
    
    # Merge addresses that share counterparties
    for i in range(len(addresses)):
        for j in range(i + 1, len(addresses)):
            shared = addr_counterparties[addresses[i]] & addr_counterparties[addresses[j]]
            if len(shared) >= 1:  # At least 1 shared counterparty
                union(addresses[i], addresses[j])
    
    # Build clusters
    cluster_map = defaultdict(list)
    for addr in addresses:
        root = find(addr)
        cluster_map[root].append(addr)
    
    clusters = []
    for idx, (root, members) in enumerate(sorted(cluster_map.items(), key=lambda x: -len(x[1]))):
        label_chr = chr(65 + idx) if idx < 26 else str(idx)
        
        # Determine cluster characteristic
        member_classes = set()
        for m in members:
            for r in results:
                if r.get("address", "").lower() == m:
                    member_classes.add(_get_entity_class(r))
        
        if "Exchange" in member_classes or any(_has_exchange(r) for r in results if r.get("address", "").lower() in members):
            label = f"Exchange Group"
        elif any(_has_mixer(r) for r in results if r.get("address", "").lower() in members):
            label = f"Mixer-Linked Group"
        elif "Bridge" in member_classes:
            label = f"Bridge Users"
        elif "DeFi" in member_classes:
            label = f"DeFi Cluster"
        elif len(members) == 1:
            label = f"Isolated Entity"
        else:
            label = f"Connected Group"
        
        # Find shared counterparties
        if len(members) >= 2:
            shared = addr_counterparties[members[0]]
            for m in members[1:]:
                shared = shared & addr_counterparties[m]
            reason = f"Shared {len(shared)} counterpart{'y' if len(shared) == 1 else 'ies'}" if shared else "Graph-linked through intermediaries"
        else:
            reason = "No shared counterparties detected"
        
        # Restore original case
        original_members = []
        for m in members:
            for r in results:
                if r.get("address", "").lower() == m:
                    original_members.append(r.get("address", ""))
                    break
        
        clusters.append({
            "id": label_chr,
            "label": label,
            "wallets": original_members,
            "count": len(original_members),
            "reason": reason,
            "avg_risk": round(statistics.mean([_get_risk_score(r) for r in results if r.get("address", "").lower() in members])) if members else 0,
        })
    
    return clusters


def compute_similarity_matrix(results: List[dict], min_score: float = 0.1) -> List[dict]:
    """
    Compute Jaccard similarity between all pairs of wallets based on counterparty overlap.
    Only returns pairs with similarity >= min_score.
    """
    addr_counterparties = {}
    for r in results:
        addr = r.get("address", "")
        addr_counterparties[addr] = _extract_counterparties(r)
    
    addresses = list(addr_counterparties.keys())
    pairs = []
    
    for i in range(len(addresses)):
        for j in range(i + 1, len(addresses)):
            set_a = addr_counterparties[addresses[i]]
            set_b = addr_counterparties[addresses[j]]
            
            if not set_a or not set_b:
                continue
            
            intersection = set_a & set_b
            union = set_a | set_b
            
            if len(union) == 0:
                continue
            
            jaccard = len(intersection) / len(union)
            
            if jaccard >= min_score:
                # Classify the similarity
                if jaccard >= 0.7:
                    classification = "Likely Same Actor"
                elif jaccard >= 0.4:
                    classification = "Strong Behavioral Overlap"
                elif jaccard >= 0.2:
                    classification = "Shared Counterparties"
                else:
                    classification = "Weak Overlap"
                
                pairs.append({
                    "wallet_a": addresses[i],
                    "wallet_b": addresses[j],
                    "score": round(jaccard, 3),
                    "shared_count": len(intersection),
                    "classification": classification,
                    "label_a": _get_label(next((r for r in results if r.get("address") == addresses[i]), {})),
                    "label_b": _get_label(next((r for r in results if r.get("address") == addresses[j]), {})),
                })
    
    pairs.sort(key=lambda x: -x["score"])
    return pairs[:50]  # Cap at 50 pairs


def merge_timelines(results: List[dict]) -> List[dict]:
    """Merge all transaction timestamps into a single chronological timeline."""
    merged = []
    
    for r in results:
        addr = r.get("address", "")
        label = _get_label(r)
        chain = _detect_chain(r)
        
        txs = r.get("data", {}).get("transactions", [])
        for tx in txs[:20]:  # Cap per wallet to prevent enormous payloads
            ts = tx.get("timeStamp") or tx.get("timestamp") or tx.get("block_time")
            if not ts:
                continue
            try:
                ts_float = float(ts)
            except (ValueError, TypeError):
                continue
            
            value = tx.get("value", "0")
            try:
                value_eth = int(value) / 1e18 if isinstance(value, (int, str)) and str(value).isdigit() else 0
            except:
                value_eth = 0
            
            to_addr = tx.get("to", "") or tx.get("recipient", "")
            from_addr = tx.get("from", "") or tx.get("sender", "")
            
            is_inflow = to_addr.lower() == addr.lower() if to_addr else False
            
            merged.append({
                "timestamp": ts_float,
                "address": addr,
                "label": label,
                "chain": chain,
                "type": "inflow" if is_inflow else "outflow",
                "value_eth": round(value_eth, 4),
                "counterparty": from_addr if is_inflow else to_addr,
                "tx_hash": tx.get("hash", "")[:16] + "..." if tx.get("hash") else "",
                "token_symbol": tx.get("token_symbol"),
                "token_value_formatted": tx.get("token_value_formatted")
            })
    
    merged.sort(key=lambda x: x["timestamp"])
    return merged[:200]  # Cap at 200 events


def generate_key_findings(results: List[dict], clusters: List[dict], similarity: List[dict]) -> List[str]:
    """Generate rule-based forensic observations about the batch."""
    findings = []
    
    # 1. Shared counterparties / bridge interactions
    multi_clusters = [c for c in clusters if c["count"] >= 2]
    for cluster in multi_clusters:
        findings.append(f"{cluster['count']} wallets form {cluster['label']} (Cluster {cluster['id']}): {cluster['reason']}")
    
    # 2. High similarity pairs
    high_sim = [s for s in similarity if s["score"] >= 0.4]
    for pair in high_sim[:3]:
        findings.append(f"{pair['label_a'][:20]} and {pair['label_b'][:20]} show {int(pair['score']*100)}% behavioral similarity — {pair['classification']}")
    
    # 3. Time proximity detection
    all_timestamps = {}
    for r in results:
        addr = r.get("address", "")
        ts_list = _extract_timestamps(r)
        if ts_list:
            all_timestamps[addr] = ts_list
    
    # Find wallets active within 15-minute windows
    if len(all_timestamps) >= 2:
        for addr_a, ts_a in all_timestamps.items():
            for addr_b, ts_b in all_timestamps.items():
                if addr_a >= addr_b:
                    continue
                for ta in ts_a[-5:]:  # Check last 5 transactions
                    for tb in ts_b[-5:]:
                        if abs(ta - tb) < 900:  # 15 minutes
                            findings.append(f"Two wallets active within a 15-minute window ({addr_a[:10]}... and {addr_b[:10]}...)")
                            break
                    else:
                        continue
                    break
    
    # 4. Isolated wallets
    isolated = [c for c in clusters if c["count"] == 1]
    if isolated:
        findings.append(f"{len(isolated)} wallet{'s' if len(isolated) > 1 else ''} appear{'s' if len(isolated) == 1 else ''} isolated — no shared counterparties with other subjects")
    
    # 5. Mixer exposure count
    mixer_count = sum(1 for r in results if _has_mixer(r))
    if mixer_count > 0:
        findings.append(f"{mixer_count} wallet{'s' if mixer_count > 1 else ''} show{'s' if mixer_count == 1 else ''} direct mixer/privacy protocol exposure")
    
    # 6. Sanctioned entity detection
    sanction_count = sum(1 for r in results if _is_sanctioned(r))
    if sanction_count > 0:
        findings.append(f"⚠ {sanction_count} wallet{'s' if sanction_count > 1 else ''} match{'es' if sanction_count == 1 else ''} OFAC/sanctioned entity records")
    
    # 7. Exchange concentration
    exchange_wallets = [r for r in results if _has_exchange(r)]
    if len(exchange_wallets) >= 2:
        findings.append(f"{len(exchange_wallets)} wallets interact with known exchanges — potential fiat on/off-ramp activity")
    
    if not findings:
        findings.append("No significant cross-wallet patterns detected in this batch")
    
    return findings[:12]  # Cap at 12 findings


def generate_recommendations(results: List[dict], clusters: List[dict]) -> List[dict]:
    """Generate deterministic, rule-based investigative recommendations."""
    recs = []
    
    # Sort by risk for priority
    sorted_results = sorted(results, key=lambda r: -_get_risk_score(r))
    
    # 1. Review highest risk wallets
    critical = [r for r in sorted_results if _get_risk_score(r) >= 80]
    for r in critical[:3]:
        recs.append({
            "action": "Review",
            "target": r.get("address", ""),
            "target_label": _get_label(r),
            "reason": f"Risk score {_get_risk_score(r)}/100 — requires manual deep-dive analysis",
        })
    
    # 2. Subpoena exchanges
    exchange_names = set()
    for r in results:
        if _has_exchange(r):
            # Try to find exchange names from signals
            signals = r.get("data", {}).get("signals", [])
            for s in signals:
                reason = s[0] if isinstance(s, (list, tuple)) else str(s)
                if "exchange" in reason.lower() or "binance" in reason.lower() or "coinbase" in reason.lower():
                    # Extract exchange name
                    for name in ["Binance", "Coinbase", "Kraken", "Huobi", "OKX", "Bybit", "KuCoin", "Gemini", "Bitstamp"]:
                        if name.lower() in reason.lower():
                            exchange_names.add(name)
    
    if not exchange_names and any(_has_exchange(r) for r in results):
        exchange_names.add("Detected Exchange(s)")
    
    for ex in list(exchange_names)[:3]:
        count = sum(1 for r in results if _has_exchange(r))
        recs.append({
            "action": "Subpoena",
            "target": ex,
            "target_label": ex,
            "reason": f"{count} subject{'s' if count > 1 else ''} interact{'s' if count == 1 else ''} with {ex} — request transaction records and KYC data",
        })
    
    # 3. Inspect contracts touched by multiple wallets
    contract_touch_count = defaultdict(int)
    for r in results:
        nodes = r.get("data", {}).get("graph", {}).get("nodes", [])
        for node in nodes:
            if node.get("type") in ("contract", "Contract", "token", "Token"):
                contract_touch_count[node.get("id", "")] += 1
    
    shared_contracts = [(addr, count) for addr, count in contract_touch_count.items() if count >= 2]
    shared_contracts.sort(key=lambda x: -x[1])
    for addr, count in shared_contracts[:2]:
        recs.append({
            "action": "Inspect",
            "target": addr,
            "target_label": f"Contract {addr[:12]}...",
            "reason": f"Touched by {count} subject wallets — investigate contract functionality and interactions",
        })
    
    # 4. Mixer review
    mixer_wallets = [r for r in results if _has_mixer(r)]
    if mixer_wallets:
        recs.append({
            "action": "Review",
            "target": "Mixer Exposure",
            "target_label": "Privacy Protocol Analysis",
            "reason": f"{len(mixer_wallets)} wallet{'s' if len(mixer_wallets) > 1 else ''} show{'s' if len(mixer_wallets) == 1 else ''} mixer exposure — trace fund flows through mixing protocols",
        })
    
    # 5. Preserve evidence for active wallets
    recent_activity = []
    now = time.time()
    for r in results:
        ts_list = _extract_timestamps(r)
        if ts_list and (now - ts_list[-1]) < 86400 * 7:  # Active in last 7 days
            recent_activity.append(r)
    
    if recent_activity:
        recs.append({
            "action": "Preserve",
            "target": "Active Wallets",
            "target_label": "Evidence Preservation",
            "reason": f"{len(recent_activity)} wallet{'s' if len(recent_activity) > 1 else ''} show{'s' if len(recent_activity) == 1 else ''} activity within the last 7 days — snapshot balances and transaction history immediately",
        })
    
    if not recs:
        recs.append({
            "action": "Archive",
            "target": "Batch",
            "target_label": "Low Risk Batch",
            "reason": "No actionable leads detected — archive for future reference",
        })
    
    return recs[:10]


def compute_top5(results: List[dict]) -> dict:
    """Compute Top 5 lists across multiple dimensions."""
    def _top5_by(key_func, results):
        sorted_r = sorted(results, key=lambda r: -key_func(r))
        return [{
            "address": r.get("address", ""),
            "label": _get_label(r),
            "value": key_func(r),
            "risk_score": _get_risk_score(r),
        } for r in sorted_r[:5]]
    
    return {
        "highest_risk": _top5_by(_get_risk_score, results),
        "highest_volume": _top5_by(_get_volume, results),
        "most_active": _top5_by(_get_tx_count, results),
        "most_connected": _top5_by(_get_counterparty_count, results),
        "most_valuable": _top5_by(_get_volume, results),  # Same as volume for now
    }


def build_heatmap_data(results: List[dict]) -> List[dict]:
    """Build heatmap data for the investigation matrix."""
    heatmap = []
    for r in results:
        heatmap.append({
            "address": r.get("address", ""),
            "label": _get_label(r),
            "chain": _detect_chain(r),
            "risk": _get_risk_score(r),
            "tx_count": _get_tx_count(r),
            "volume_usd": _get_volume(r),
            "counterparties": _get_counterparty_count(r),
            "exchange": _has_exchange(r),
            "mixer": _has_mixer(r),
            "threat_db": _has_threat_db(r),
            "sanctioned": _is_sanctioned(r),
            "entity_class": _get_entity_class(r),
        })
    
    heatmap.sort(key=lambda x: -x["risk"])
    return heatmap


# ═══════════════════════════════════════════════════════════════════════════════
# MASTER INTELLIGENCE BUILDER
# ═══════════════════════════════════════════════════════════════════════════════

def build_bulk_intelligence(results: List[dict]) -> dict:
    """
    Master function: takes the raw scan results and produces the full
    investigation intelligence payload. No external API calls.
    """
    if not results:
        return {}
    
    print(f"[CLUSTERING] Building intelligence for {len(results)} results...")
    
    chain_breakdown = compute_chain_breakdown(results)
    entity_breakdown = compute_entity_breakdown(results)
    priority_queue = build_priority_queue(results)
    stats = compute_statistics(results)
    clusters = cluster_by_counterparties(results)
    similarity = compute_similarity_matrix(results)
    timeline = merge_timelines(results)
    findings = generate_key_findings(results, clusters, similarity)
    recommendations = generate_recommendations(results, clusters)
    top5 = compute_top5(results)
    heatmap = build_heatmap_data(results)
    
    print(f"[CLUSTERING] Intelligence complete: {len(clusters)} clusters, {len(similarity)} similarity pairs, {len(findings)} findings")
    
    return {
        "chain_breakdown": chain_breakdown,
        "entity_breakdown": entity_breakdown,
        "priority_queue": priority_queue,
        "statistics": stats,
        "clusters": clusters,
        "similarity_matrix": similarity,
        "merged_timeline": timeline,
        "key_findings": findings,
        "recommendations": recommendations,
        "top5": top5,
        "heatmap_data": heatmap,
    }
