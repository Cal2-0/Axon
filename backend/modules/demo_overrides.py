DEMO_OVERRIDES = {
    # CRITICAL
    "0x56d8b635a7c88fd1104d23d632af40c1c3aac4e3": {"expectedRisk": "CRITICAL", "name": "Nomad Bridge Exploiter", "type": "Wallet"},
    "0x75a77dbdeab6e384d0e5cae2b70072d56ee140e6": {"expectedRisk": "CRITICAL", "name": "Lazarus Group Sub-wallet", "type": "Wallet"},
    "1ez69snzzmepmzx3wpezmktrcbf2gpnq55": {"expectedRisk": "CRITICAL", "name": "Silk Road Hacker", "type": "Wallet"},
    "9wzdxwbbmcg8zxcbjhte5ptxe7xht4flbcgt9m4p2sqj": {"expectedRisk": "CRITICAL", "name": "FTX Drainer (SOL)", "type": "Wallet"},

    # HIGH
    "0x27182842e098f60e3d576794a5bffb0777e025d3": {"expectedRisk": "HIGH", "name": "Euler Finance Exploiter", "type": "Contract"},
    "0x11111112542d85b3ef69ae05771c2dccff4faa26": {"expectedRisk": "HIGH", "name": "Flash Loan Arbitrage Bot", "type": "Wallet"},
    "tdqsqm7zfu55g4bfz2vjh9o2m74cqr56ky": {"expectedRisk": "HIGH", "name": "Offshore High-Risk Exchange", "type": "Wallet"},
    "34xp4vrocgjym3xr7ycvpfhocnxv4twseo": {"expectedRisk": "HIGH", "name": "Darknet Mixer Associate", "type": "Wallet"},

    # MEDIUM
    "0x000000000000084e91743124a982076c59f10084": {"expectedRisk": "MEDIUM", "name": "MEV Bot", "type": "Wallet"},
    "0x888888888889c00c67689029d7856aac106a6c11": {"expectedRisk": "MEDIUM", "name": "Retail Wallet (Mixer Exposure)", "type": "Wallet"},
    "tokenkegqfezyinwajbnbgkpfxcwubvf9ss623vq5da": {"expectedRisk": "MEDIUM", "name": "Solana Unverified DApp", "type": "Contract"},
    "1a1zp1ep5qgefi2dmptftl5slmv7divfna": {"expectedRisk": "MEDIUM", "name": "Genesis Block", "type": "Wallet"},

    # LOW
    "0xd8da6bf26964af9d7eed9e03e53415d37aa96045": {"expectedRisk": "LOW", "name": "Vitalik Buterin", "type": "Wallet"},
    "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": {"expectedRisk": "LOW", "name": "Coinbase Hot Wallet", "type": "Wallet"},
    "te2rzosv3wfk99w6j9unnz4vlfxyoxvrwp": {"expectedRisk": "LOW", "name": "Justin Sun", "type": "Wallet"},
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh": {"expectedRisk": "LOW", "name": "Binance Cold Storage", "type": "Wallet"},
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