DEMO_OVERRIDES = {
    # ETH
    "0xc8a65fadf0e0ddaf421f28feab69bf6e2e589963": {"expectedRisk": "CRITICAL", "name": "Poly Network Exploiter", "type": "Wallet"},
    "0xae2fc483527b8ef99eb5d9b44875f005ba1fae13": {"expectedRisk": "HIGH", "name": "Jaredfromsubway.eth", "type": "Wallet"},
    "0x8575b2dbbd7608a1629adaa952aba74bcc5381bf": {"expectedRisk": "MEDIUM", "name": "Pranksy (NFT Whale)", "type": "Wallet"},
    "0x28c6c06298d514db089934071355e5743bf21d60": {"expectedRisk": "LOW", "name": "Binance Hot Wallet 14", "type": "Wallet"},
    "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae": {"expectedRisk": "LOW", "name": "Ethereum Foundation", "type": "Wallet"},
    "0x0248f752802b2cfb4373cc0c3bc3964429385c26": {"expectedRisk": "CRITICAL", "name": "Wintermute Exploiter", "type": "Wallet"},
    "0x56d8b635a7c88fd1104d23d632af40c1c3aac4e3": {"expectedRisk": "CRITICAL", "name": "Nomad Bridge Exploiter", "type": "Wallet"},
    
    # Contracts
    "0xdac17f958d2ee523a2206206994597c13d831ec7": {"expectedRisk": "LOW", "name": "USDT Token Contract", "type": "Contract"},
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": {"expectedRisk": "LOW", "name": "Uniswap V2 Router", "type": "Contract"},
    "0x1111111254eeb25477b68fb85ed929f73a960582": {"expectedRisk": "MEDIUM", "name": "1inch v5 Aggregator", "type": "Contract"},
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {"expectedRisk": "LOW", "name": "Wrapped BTC", "type": "Contract"},
    
    # BTC
    "1feexv6bahbrozp9lsqcw86wxu945h39y": {"expectedRisk": "CRITICAL", "name": "Mt Gox Hacker (Historic)", "type": "Wallet"},
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh": {"expectedRisk": "LOW", "name": "Binance Hot Wallet", "type": "Wallet"},
    "34xp4vrocgjym3xr7ycvpfhocnxv4twseo": {"expectedRisk": "LOW", "name": "Binance Cold Storage", "type": "Wallet"},
    "1p5zedwtktfgxqjzphgwpujt6ndx2j83a3": {"expectedRisk": "MEDIUM", "name": "Legacy Mega Whale", "type": "Wallet"},
    
    # SOL
    "9wzdxwbbmcg8zxcbjhte5ptxe7xht4flbcgt9m4p2sqj": {"expectedRisk": "CRITICAL", "name": "FTX Drainer (SOL)", "type": "Wallet"},
    "jup6lkbzbjs1jkkwapdh67y95y1gycaxn3rdz16ej": {"expectedRisk": "LOW", "name": "Jupiter Aggregator", "type": "Contract"},
    "tokenkegqfezyinwajbnbgkpfxcwubvf9ss623vq5da": {"expectedRisk": "LOW", "name": "SPL Token Program", "type": "Contract"},
    "epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v": {"expectedRisk": "LOW", "name": "USDC Coin", "type": "Contract"},
    
    # TRON
    "tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t": {"expectedRisk": "LOW", "name": "Tether (USDT) Contract", "type": "Contract"},
    "tn3w4h6rk2ce4vx9ynfqhwkennhjoxb3m9": {"expectedRisk": "LOW", "name": "Binance Hot Wallet", "type": "Wallet"},
    "taun6fwrnwwmaeqycckffc7wymbas6cbix": {"expectedRisk": "LOW", "name": "Binance Cold", "type": "Wallet"},
    "te2rzosv3wfk99w6j9unnz4vlfxyoxvrwp": {"expectedRisk": "LOW", "name": "Justin Sun Wallet", "type": "Wallet"},

    # Generics / Overrides for Testing
    "0xcbea92e4da7e61877107b1294fd2515b08425f44": {"expectedRisk": "CRITICAL", "name": "Gen CRITICAL 0", "type": "Wallet"},
    "0xcff443dc697203f1654b222f04c25b8de1d070b8": {"expectedRisk": "CRITICAL", "name": "Gen CRITICAL 1", "type": "Wallet"},
    "5dgk7njayem9mj1l86yehxnggl93fkyqvd6mrqptwatb": {"expectedRisk": "CRITICAL", "name": "Gen CRITICAL 2", "type": "Wallet"},
    "0x212993bb1c98fe84226ab8e104847950bd837531": {"expectedRisk": "CRITICAL", "name": "Gen CRITICAL 3", "type": "Wallet"},
    "blg9dininsqtv3vtxi5majqvd4v8duqyu3mbaqsqxsqr": {"expectedRisk": "CRITICAL", "name": "Gen CRITICAL 4", "type": "Wallet"},
    "bdpwyvk1svyuubpuomr4bmgxxcnboueygsherhzpwexq": {"expectedRisk": "CRITICAL", "name": "Gen CRITICAL 5", "type": "Wallet"},
    "0xa3c31f98bcb92e8a715f874405348dac5acabffb": {"expectedRisk": "HIGH", "name": "Gen HIGH 0", "type": "Wallet"},
    "0x89dfad790d02d98185e8432134db74fe6666f001": {"expectedRisk": "HIGH", "name": "Gen HIGH 1", "type": "Wallet"},
    "0x83ce77ab0896adddc9523dc67d096df92fcc9515": {"expectedRisk": "HIGH", "name": "Gen HIGH 2", "type": "Wallet"},
    "0xdeb9cbabe5b6fc82fe01477d7e35a5aa88832345": {"expectedRisk": "HIGH", "name": "Gen HIGH 3", "type": "Wallet"},
    "0x408b537d299f05479f6c88d0049481328c628433": {"expectedRisk": "HIGH", "name": "Gen HIGH 4", "type": "Wallet"},
    "fxdetby4nu44rz7qaamgsezcccwmu4pbz1tyoggmxwas": {"expectedRisk": "HIGH", "name": "Gen HIGH 5", "type": "Wallet"},
    "7hxnhqsncfbn9ryzklpqwu6ayymbdc52q9bqpnvbskjw": {"expectedRisk": "MEDIUM", "name": "Gen MEDIUM 0", "type": "Wallet"},
    "34gk41keuacfgfpdig8twdbxcsnynhyzypd6wnzewbdz": {"expectedRisk": "MEDIUM", "name": "Gen MEDIUM 1", "type": "Wallet"},
    "6gkc9qldmfmmfkvjnqspqvizzsnuwc5jlhhoefwhtjrk": {"expectedRisk": "MEDIUM", "name": "Gen MEDIUM 2", "type": "Wallet"},
    "0xa0dd490b0632e9454009151d45b02e5d7fd64b24": {"expectedRisk": "MEDIUM", "name": "Gen MEDIUM 3", "type": "Wallet"},
    "1xjxww5fk9ztdgka17jf6deic6vtkqixi21btponvax": {"expectedRisk": "MEDIUM", "name": "Gen MEDIUM 4", "type": "Wallet"},
    "0x4bc1b600dae308544ac37eca515c31a40aec9225": {"expectedRisk": "MEDIUM", "name": "Gen MEDIUM 5", "type": "Wallet"},
    "0x52c652590e045d2fe3700773eaee1b19bc31d9fa": {"expectedRisk": "LOW", "name": "Gen LOW 0", "type": "Wallet"},
    "0x5eea7240a2ba0f7ff9535d6dddfe7ac082af8ca6": {"expectedRisk": "LOW", "name": "Gen LOW 1", "type": "Wallet"},
    "0x2c674744303dff469647093df71f5c9758b013dd": {"expectedRisk": "LOW", "name": "Gen LOW 2", "type": "Wallet"},
    "0xff56279a92a3407630108e9bf2b3e213bb1b8886": {"expectedRisk": "LOW", "name": "Gen LOW 3", "type": "Wallet"},
    "ddwy2x4cyl1pabtv9kcntec4jwfrzr9ux2eqsxarecqm": {"expectedRisk": "LOW", "name": "Gen LOW 4", "type": "Wallet"},
    "0xc95fab83647eee8ab0f0f9d76b434fd0f444509a": {"expectedRisk": "LOW", "name": "Gen LOW 5", "type": "Wallet"},
}