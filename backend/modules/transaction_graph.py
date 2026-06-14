"""
Axon Backend — Transaction Graph Module
"""
import random

def build_graph(address: str, hops: int = 2) -> dict:
    nodes = [{"id": address, "label": address[:6] + "...", "type": "target", "risk": 95}]
    edges = []
    
    # Generate random connected nodes
    node_types = ["hacker", "mixer", "exchange", "victim", "default"]
    
    for i in range(random.randint(5, 15)):
        node_id = f"0x{random.randint(10**39, 10**40-1):040x}"
        node_type = random.choice(node_types)
        risk = random.randint(10, 99) if node_type in ["hacker", "mixer"] else random.randint(10, 40)
        
        nodes.append({
            "id": node_id,
            "label": node_id[:6] + "...",
            "type": node_type,
            "risk": risk
        })
        
        edges.append({
            "source": address if random.random() > 0.5 else node_id,
            "target": node_id if random.random() > 0.5 else address,
            "value": random.randint(1, 100)
        })
        
        # Second hop
        if hops >= 2 and random.random() > 0.5:
            hop2_id = f"0x{random.randint(10**39, 10**40-1):040x}"
            nodes.append({
                "id": hop2_id,
                "label": hop2_id[:6] + "...",
                "type": random.choice(node_types),
                "risk": random.randint(10, 90)
            })
            edges.append({
                "source": node_id,
                "target": hop2_id,
                "value": random.randint(1, 50)
            })
            
    return {"nodes": nodes, "edges": edges}
