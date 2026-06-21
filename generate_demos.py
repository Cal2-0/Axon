import random
import secrets

def gen_address():
    return "0x" + secrets.token_hex(20)

wallets = []
contracts = []

risks = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

wallet_names = ["Whale Sweep", "Defi Degen", "Suspicious Node", "Exchange Proxy", "Dormant Holder", "Airdrop Farmer", "Mixer Interaction", "Darkweb Vendor", "Cold Storage", "OTC Desk"]
contract_names = ["Lending Pool", "Staking Vault", "Router V2", "Exploit Victim", "Scam Token", "Bridge Contract", "Governance Token", "Sanctioned Mixer", "Yield Aggregator", "Flashloan Bot"]

for i in range(20):
    wallets.append({
        "name": f"{random.choice(wallet_names)} {random.randint(100, 999)}",
        "address": gen_address(),
        "type": "Wallet",
        "expectedRisk": random.choice(risks)
    })
    
    contracts.append({
        "name": f"{random.choice(contract_names)} {random.randint(100, 999)}",
        "address": gen_address(),
        "type": "Smart Contract",
        "expectedRisk": random.choice(risks)
    })

all_profiles = wallets + contracts
random.shuffle(all_profiles)

js_content = "export const REAL_PROFILES = [\n"
for p in all_profiles:
    js_content += f'  {{ name: "{p["name"]}", address: "{p["address"]}", type: "{p["type"]}", expectedRisk: "{p["expectedRisk"]}" }},\n'
js_content += "];\n"

with open("frontend/src/data/realProfiles.js", "w") as f:
    f.write(js_content)
print("done")
