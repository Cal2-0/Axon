export const DEMO_PROFILES = {
  "0x098B716B8Aaf21512996dC57EB0615e2383E2f96": {
    "shortName": "Ronin Bridge Exploiter",
    "tag": "CRITICAL",
    "identity": {
      "address": "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
      "ens": null,
      "label": "Ronin Bridge Exploiter",
      "tag": "HACKER",
      "firstSeen": "2022-03-23",
      "lastSeen": "2024-11-14",
      "ethBalance": "0.0412",
      "totalReceived": "173,600 ETH",
      "totalSent": "173,598 ETH",
      "txCount": 4821,
      "uniqueCounterparties": 312,
      "walletAgeDays": 991,
      "totalVolumeUSD": "$622,000,000"
    },
    "risk": {
      "score": 97,
      "label": "CRITICAL",
      "mlClassification": "Anomaly",
      "anomalyScore": 94,
      "factors": [
        {
          "penalty": 40,
          "icon": "\ud83d\udd34",
          "reason": "Direct interaction with Tornado Cash mixer contracts"
        },
        {
          "penalty": 25,
          "icon": "\ud83d\udd34",
          "reason": "Address flagged by OFAC sanctions list (SDN)"
        },
        {
          "penalty": 20,
          "icon": "\ud83d\udfe0",
          "reason": "Source of $622M Ronin Bridge exploit (2022-03-23)"
        },
        {
          "penalty": 8,
          "icon": "\ud83d\udfe1",
          "reason": "Abnormal transaction velocity \u2014 847 txns in 72hrs"
        },
        {
          "penalty": 4,
          "icon": "\ud83d\udfe1",
          "reason": "Interaction with multiple known money mule wallets"
        }
      ]
    },
    "graph": {
      "nodes": [
        {
          "id": "0x098B71",
          "label": "0x098B...",
          "type": "hacker",
          "risk": 97
        },
        {
          "id": "0xTornado1",
          "label": "Tornado Cash",
          "type": "mixer",
          "risk": 95
        }
      ],
      "edges": [
        {
          "source": "0x098B71",
          "target": "0xTornado1"
        }
      ]
    },
    "osint": {
      "summary": "High-confidence attribution. Linked to Lazarus Group.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "lazarus_eth"
      ],
      "walletMentions": 10
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 2,
      "totalCashOutUSD": "$52,400,000",
      "summary": "Attempted to cash out."
    },
    "mixer": {
      "detected": true,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "13,244 ETH"
    }
  },
  "0xd42a0e662ca7fa3c10ae4eaf79e00bb5970e6dc8": {
    "shortName": "Money mule #1",
    "tag": "CRITICAL",
    "identity": {
      "address": "0xd42a0e662ca7fa3c10ae4eaf79e00bb5970e6dc8",
      "ens": null,
      "label": "Random MONEY MULE Account",
      "tag": "MONEY MULE",
      "firstSeen": "2021-10-25",
      "lastSeen": "2024-06-15",
      "ethBalance": "167.38",
      "totalReceived": "6622 ETH",
      "totalSent": "9913 ETH",
      "txCount": 66,
      "uniqueCounterparties": 505,
      "walletAgeDays": 1398,
      "totalVolumeUSD": "$8,805,122"
    },
    "risk": {
      "score": 96,
      "label": "CRITICAL",
      "mlClassification": "Anomaly",
      "anomalyScore": 14,
      "factors": [
        {
          "penalty": 0,
          "icon": "\ud83d\udd34",
          "reason": "Identified as MONEY MULE"
        },
        {
          "penalty": 2,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as CRITICAL risk. Tagged as MONEY MULE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0xd42a0e",
          "label": "0xd42a...",
          "type": "suspect",
          "risk": 96
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_291"
      ],
      "walletMentions": 1,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 1,
      "totalCashOutUSD": "$919,254",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "684 ETH"
    },
    "stablecoin": {
      "total_volume": 3217244,
      "flows": {
        "USDT": {
          "inflow": 2776515,
          "outflow": 1329751
        },
        "USDC": {
          "inflow": 440729,
          "outflow": 20590
        }
      }
    },
    "erc20": [
      {
        "symbol": "UNI",
        "balance": 6966.11,
        "usd_value": 15131.72
      },
      {
        "symbol": "LINK",
        "balance": 3156.14,
        "usd_value": 2348.74
      },
      {
        "symbol": "MKR",
        "balance": 8889.48,
        "usd_value": 25767.59
      },
      {
        "symbol": "UNI",
        "balance": 9871.46,
        "usd_value": 49978.56
      },
      {
        "symbol": "UNI",
        "balance": 9285.09,
        "usd_value": 12622.43
      },
      {
        "symbol": "DAI",
        "balance": 2288.66,
        "usd_value": 22653.59
      },
      {
        "symbol": "AAVE",
        "balance": 1628.8,
        "usd_value": 29223.34
      }
    ]
  },
  "0x30455ba70dc99d2a232ed762b8559e56d0a530e4": {
    "shortName": "Public figure #2",
    "tag": "SAFE",
    "identity": {
      "address": "0x30455ba70dc99d2a232ed762b8559e56d0a530e4",
      "ens": null,
      "label": "Random PUBLIC FIGURE Account",
      "tag": "PUBLIC FIGURE",
      "firstSeen": "2024-10-24",
      "lastSeen": "2024-06-15",
      "ethBalance": "441.52",
      "totalReceived": "7505 ETH",
      "totalSent": "7699 ETH",
      "txCount": 3095,
      "uniqueCounterparties": 178,
      "walletAgeDays": 1355,
      "totalVolumeUSD": "$2,098,387"
    },
    "risk": {
      "score": 28,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 6,
      "factors": [
        {
          "penalty": 38,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as PUBLIC FIGURE"
        },
        {
          "penalty": 18,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as PUBLIC FIGURE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x30455b",
          "label": "0x3045...",
          "type": "default",
          "risk": 28
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_491"
      ],
      "walletMentions": 8,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 3,
      "totalCashOutUSD": "$604,062",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "167 ETH"
    },
    "stablecoin": {
      "total_volume": 643611,
      "flows": {
        "USDT": {
          "inflow": 41807,
          "outflow": 31858
        },
        "USDC": {
          "inflow": 601804,
          "outflow": 55703
        }
      }
    },
    "erc20": [
      {
        "symbol": "DAI",
        "balance": 6745.52,
        "usd_value": 49133.46
      },
      {
        "symbol": "SNX",
        "balance": 8269.19,
        "usd_value": 12292.73
      },
      {
        "symbol": "SHIB",
        "balance": 1901.54,
        "usd_value": 15268.28
      },
      {
        "symbol": "AAVE",
        "balance": 1435.81,
        "usd_value": 15931.88
      }
    ]
  },
  "0x187cf399c88fb484d12c27a9e9341f12415c8549": {
    "shortName": "Hacker #3",
    "tag": "HIGH",
    "identity": {
      "address": "0x187cf399c88fb484d12c27a9e9341f12415c8549",
      "ens": null,
      "label": "Random HACKER Account",
      "tag": "HACKER",
      "firstSeen": "2020-04-27",
      "lastSeen": "2024-06-15",
      "ethBalance": "461.20",
      "totalReceived": "4941 ETH",
      "totalSent": "9994 ETH",
      "txCount": 3102,
      "uniqueCounterparties": 91,
      "walletAgeDays": 1146,
      "totalVolumeUSD": "$3,622,136"
    },
    "risk": {
      "score": 64,
      "label": "HIGH",
      "mlClassification": "Fraud",
      "anomalyScore": 48,
      "factors": [
        {
          "penalty": 38,
          "icon": "\ud83d\udd34",
          "reason": "Identified as HACKER"
        },
        {
          "penalty": 12,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as HIGH risk. Tagged as HACKER.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x187cf3",
          "label": "0x187c...",
          "type": "suspect",
          "risk": 64
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_738"
      ],
      "walletMentions": 28,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 5,
      "totalCashOutUSD": "$20,425",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "344 ETH"
    },
    "stablecoin": {
      "total_volume": 1025456,
      "flows": {
        "USDT": {
          "inflow": 569834,
          "outflow": 432299
        },
        "USDC": {
          "inflow": 455622,
          "outflow": 364996
        }
      }
    },
    "erc20": [
      {
        "symbol": "LINK",
        "balance": 5683.67,
        "usd_value": 12857.87
      }
    ]
  },
  "0x432ec317ca2ebbd114d65a9d8785a0210c5b9875": {
    "shortName": "Exchange #4",
    "tag": "SAFE",
    "identity": {
      "address": "0x432ec317ca2ebbd114d65a9d8785a0210c5b9875",
      "ens": "anon3.eth",
      "label": "Random EXCHANGE Account",
      "tag": "EXCHANGE",
      "firstSeen": "2023-02-28",
      "lastSeen": "2024-06-15",
      "ethBalance": "316.46",
      "totalReceived": "4750 ETH",
      "totalSent": "1703 ETH",
      "txCount": 1901,
      "uniqueCounterparties": 504,
      "walletAgeDays": 399,
      "totalVolumeUSD": "$8,622,687"
    },
    "risk": {
      "score": 4,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 27,
      "factors": [
        {
          "penalty": 31,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as EXCHANGE"
        },
        {
          "penalty": 8,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as EXCHANGE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x432ec3",
          "label": "0x432e...",
          "type": "default",
          "risk": 4
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_158"
      ],
      "walletMentions": 46,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 5,
      "totalCashOutUSD": "$219,332",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "180 ETH"
    },
    "stablecoin": {
      "total_volume": 580236,
      "flows": {
        "USDT": {
          "inflow": 30007,
          "outflow": 8369
        },
        "USDC": {
          "inflow": 550229,
          "outflow": 209069
        }
      }
    },
    "erc20": [
      {
        "symbol": "AAVE",
        "balance": 8866.64,
        "usd_value": 16434.78
      },
      {
        "symbol": "SNX",
        "balance": 4063.38,
        "usd_value": 14310.99
      },
      {
        "symbol": "SHIB",
        "balance": 8752.46,
        "usd_value": 4236.01
      },
      {
        "symbol": "AAVE",
        "balance": 6384.22,
        "usd_value": 44938.4
      },
      {
        "symbol": "PEPE",
        "balance": 246.34,
        "usd_value": 13413.01
      },
      {
        "symbol": "PEPE",
        "balance": 4839.63,
        "usd_value": 38706.4
      }
    ]
  },
  "0x68ac76b7469d86a509756b6f711b39426a14b64d": {
    "shortName": "Safe #5",
    "tag": "SAFE",
    "identity": {
      "address": "0x68ac76b7469d86a509756b6f711b39426a14b64d",
      "ens": "anon4.eth",
      "label": "Random SAFE Account",
      "tag": "SAFE",
      "firstSeen": "2021-04-02",
      "lastSeen": "2024-06-15",
      "ethBalance": "107.03",
      "totalReceived": "9967 ETH",
      "totalSent": "7548 ETH",
      "txCount": 3065,
      "uniqueCounterparties": 768,
      "walletAgeDays": 661,
      "totalVolumeUSD": "$4,127,222"
    },
    "risk": {
      "score": 13,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 2,
      "factors": [
        {
          "penalty": 5,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as SAFE"
        },
        {
          "penalty": 14,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as SAFE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x68ac76",
          "label": "0x68ac...",
          "type": "default",
          "risk": 13
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_971"
      ],
      "walletMentions": 47,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 2,
      "totalCashOutUSD": "$720,220",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "148 ETH"
    },
    "stablecoin": {
      "total_volume": 164269,
      "flows": {
        "USDT": {
          "inflow": 18801,
          "outflow": 11672
        },
        "USDC": {
          "inflow": 145468,
          "outflow": 66960
        }
      }
    },
    "erc20": [
      {
        "symbol": "UNI",
        "balance": 1621.15,
        "usd_value": 25196.54
      },
      {
        "symbol": "SHIB",
        "balance": 3865.81,
        "usd_value": 36983.86
      },
      {
        "symbol": "AAVE",
        "balance": 7755.26,
        "usd_value": 30381.22
      },
      {
        "symbol": "UNI",
        "balance": 8961.68,
        "usd_value": 38520.37
      },
      {
        "symbol": "MKR",
        "balance": 2327.85,
        "usd_value": 19256.09
      },
      {
        "symbol": "AAVE",
        "balance": 8276.93,
        "usd_value": 49292.41
      },
      {
        "symbol": "CRV",
        "balance": 1214.55,
        "usd_value": 41416.85
      },
      {
        "symbol": "SHIB",
        "balance": 43.59,
        "usd_value": 15760.02
      },
      {
        "symbol": "WBTC",
        "balance": 1365.96,
        "usd_value": 25315.01
      },
      {
        "symbol": "LINK",
        "balance": 9231.94,
        "usd_value": 1590.48
      },
      {
        "symbol": "SNX",
        "balance": 8057.64,
        "usd_value": 14605.74
      }
    ]
  },
  "0xf23b0ea7bbf0762964ff0c6e44d2fb2d7f7e6ad3": {
    "shortName": "Phishing #6",
    "tag": "CRITICAL",
    "identity": {
      "address": "0xf23b0ea7bbf0762964ff0c6e44d2fb2d7f7e6ad3",
      "ens": null,
      "label": "Random PHISHING Account",
      "tag": "PHISHING",
      "firstSeen": "2020-01-15",
      "lastSeen": "2024-06-15",
      "ethBalance": "85.10",
      "totalReceived": "2447 ETH",
      "totalSent": "7794 ETH",
      "txCount": 963,
      "uniqueCounterparties": 553,
      "walletAgeDays": 589,
      "totalVolumeUSD": "$6,447,341"
    },
    "risk": {
      "score": 86,
      "label": "CRITICAL",
      "mlClassification": "Anomaly",
      "anomalyScore": 30,
      "factors": [
        {
          "penalty": 12,
          "icon": "\ud83d\udd34",
          "reason": "Identified as PHISHING"
        },
        {
          "penalty": 1,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as CRITICAL risk. Tagged as PHISHING.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0xf23b0e",
          "label": "0xf23b...",
          "type": "suspect",
          "risk": 86
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_726"
      ],
      "walletMentions": 39,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 1,
      "totalCashOutUSD": "$72,703",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "695 ETH"
    },
    "stablecoin": {
      "total_volume": 4531855,
      "flows": {
        "USDT": {
          "inflow": 4528252,
          "outflow": 3991790
        },
        "USDC": {
          "inflow": 3603,
          "outflow": 1741
        }
      }
    },
    "erc20": [
      {
        "symbol": "DAI",
        "balance": 8781.73,
        "usd_value": 24143.17
      },
      {
        "symbol": "CRV",
        "balance": 9537.62,
        "usd_value": 24922.65
      },
      {
        "symbol": "LINK",
        "balance": 7825.24,
        "usd_value": 14054.03
      },
      {
        "symbol": "CRV",
        "balance": 8095.67,
        "usd_value": 31727.75
      },
      {
        "symbol": "CRV",
        "balance": 5374.16,
        "usd_value": 6591.14
      },
      {
        "symbol": "UNI",
        "balance": 4630.3,
        "usd_value": 48337.37
      },
      {
        "symbol": "AAVE",
        "balance": 4788.26,
        "usd_value": 3288.62
      },
      {
        "symbol": "LINK",
        "balance": 3267.83,
        "usd_value": 8112.77
      }
    ]
  },
  "0x6bdcec88e73fc0af80ec444e947b36dec16cddc5": {
    "shortName": "Public figure #7",
    "tag": "SAFE",
    "identity": {
      "address": "0x6bdcec88e73fc0af80ec444e947b36dec16cddc5",
      "ens": null,
      "label": "Random PUBLIC FIGURE Account",
      "tag": "PUBLIC FIGURE",
      "firstSeen": "2020-11-11",
      "lastSeen": "2024-06-15",
      "ethBalance": "497.25",
      "totalReceived": "8576 ETH",
      "totalSent": "8676 ETH",
      "txCount": 1339,
      "uniqueCounterparties": 611,
      "walletAgeDays": 690,
      "totalVolumeUSD": "$3,314,610"
    },
    "risk": {
      "score": 10,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 37,
      "factors": [
        {
          "penalty": 37,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as PUBLIC FIGURE"
        },
        {
          "penalty": 9,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as PUBLIC FIGURE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x6bdcec",
          "label": "0x6bdc...",
          "type": "default",
          "risk": 10
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_665"
      ],
      "walletMentions": 11,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 2,
      "totalCashOutUSD": "$76,194",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "132 ETH"
    },
    "stablecoin": {
      "total_volume": 1487571,
      "flows": {
        "USDT": {
          "inflow": 13652,
          "outflow": 10705
        },
        "USDC": {
          "inflow": 1473919,
          "outflow": 1317013
        }
      }
    },
    "erc20": [
      {
        "symbol": "SNX",
        "balance": 4226.08,
        "usd_value": 22228.48
      },
      {
        "symbol": "SHIB",
        "balance": 5556.62,
        "usd_value": 6436.43
      }
    ]
  },
  "0x5f263850395ccc951dfdf2e7b7d1d5d52132a7f5": {
    "shortName": "Safe #8",
    "tag": "SAFE",
    "identity": {
      "address": "0x5f263850395ccc951dfdf2e7b7d1d5d52132a7f5",
      "ens": null,
      "label": "Random SAFE Account",
      "tag": "SAFE",
      "firstSeen": "2020-03-09",
      "lastSeen": "2024-06-15",
      "ethBalance": "16.32",
      "totalReceived": "5130 ETH",
      "totalSent": "1944 ETH",
      "txCount": 2094,
      "uniqueCounterparties": 767,
      "walletAgeDays": 641,
      "totalVolumeUSD": "$1,827,937"
    },
    "risk": {
      "score": 21,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 64,
      "factors": [
        {
          "penalty": 31,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as SAFE"
        },
        {
          "penalty": 18,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as SAFE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x5f2638",
          "label": "0x5f26...",
          "type": "default",
          "risk": 21
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_465"
      ],
      "walletMentions": 45,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 3,
      "totalCashOutUSD": "$595,206",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "879 ETH"
    },
    "stablecoin": {
      "total_volume": 484879,
      "flows": {
        "USDT": {
          "inflow": 32124,
          "outflow": 14243
        },
        "USDC": {
          "inflow": 452755,
          "outflow": 81031
        }
      }
    },
    "erc20": [
      {
        "symbol": "DAI",
        "balance": 6016.32,
        "usd_value": 3313.68
      },
      {
        "symbol": "CRV",
        "balance": 6004.45,
        "usd_value": 16458.82
      },
      {
        "symbol": "WBTC",
        "balance": 8039.36,
        "usd_value": 18262.89
      },
      {
        "symbol": "CRV",
        "balance": 9990.89,
        "usd_value": 48103.39
      },
      {
        "symbol": "CRV",
        "balance": 4848.46,
        "usd_value": 46210.98
      },
      {
        "symbol": "UNI",
        "balance": 3247.51,
        "usd_value": 29699.68
      },
      {
        "symbol": "CRV",
        "balance": 1863.48,
        "usd_value": 447.69
      },
      {
        "symbol": "WBTC",
        "balance": 1069.8,
        "usd_value": 14036.41
      }
    ]
  },
  "0xe755d76422316032a5d531752142ee8ef3e6735b": {
    "shortName": "Public figure #9",
    "tag": "SAFE",
    "identity": {
      "address": "0xe755d76422316032a5d531752142ee8ef3e6735b",
      "ens": null,
      "label": "Random PUBLIC FIGURE Account",
      "tag": "PUBLIC FIGURE",
      "firstSeen": "2022-12-15",
      "lastSeen": "2024-06-15",
      "ethBalance": "148.10",
      "totalReceived": "2085 ETH",
      "totalSent": "570 ETH",
      "txCount": 4645,
      "uniqueCounterparties": 779,
      "walletAgeDays": 1236,
      "totalVolumeUSD": "$7,871,441"
    },
    "risk": {
      "score": 17,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 2,
      "factors": [
        {
          "penalty": 23,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as PUBLIC FIGURE"
        },
        {
          "penalty": 21,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as PUBLIC FIGURE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0xe755d7",
          "label": "0xe755...",
          "type": "default",
          "risk": 17
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_681"
      ],
      "walletMentions": 35,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 5,
      "totalCashOutUSD": "$110,828",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "637 ETH"
    },
    "stablecoin": {
      "total_volume": 199607,
      "flows": {
        "USDT": {
          "inflow": 26599,
          "outflow": 13388
        },
        "USDC": {
          "inflow": 173008,
          "outflow": 102873
        }
      }
    },
    "erc20": [
      {
        "symbol": "UNI",
        "balance": 175.91,
        "usd_value": 10074.67
      },
      {
        "symbol": "WBTC",
        "balance": 3965.83,
        "usd_value": 44826.37
      }
    ]
  },
  "0x47ee9f3419af77001237d3a869393f1f0fad4c02": {
    "shortName": "Money mule #10",
    "tag": "CRITICAL",
    "identity": {
      "address": "0x47ee9f3419af77001237d3a869393f1f0fad4c02",
      "ens": null,
      "label": "Random MONEY MULE Account",
      "tag": "MONEY MULE",
      "firstSeen": "2020-06-19",
      "lastSeen": "2024-06-15",
      "ethBalance": "171.80",
      "totalReceived": "7374 ETH",
      "totalSent": "5826 ETH",
      "txCount": 138,
      "uniqueCounterparties": 614,
      "walletAgeDays": 1175,
      "totalVolumeUSD": "$7,302,012"
    },
    "risk": {
      "score": 85,
      "label": "CRITICAL",
      "mlClassification": "Normal",
      "anomalyScore": 91,
      "factors": [
        {
          "penalty": 9,
          "icon": "\ud83d\udd34",
          "reason": "Identified as MONEY MULE"
        },
        {
          "penalty": 1,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as CRITICAL risk. Tagged as MONEY MULE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x47ee9f",
          "label": "0x47ee...",
          "type": "suspect",
          "risk": 85
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_717"
      ],
      "walletMentions": 35,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 5,
      "totalCashOutUSD": "$536,788",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "380 ETH"
    },
    "stablecoin": {
      "total_volume": 4858410,
      "flows": {
        "USDT": {
          "inflow": 4652492,
          "outflow": 4560201
        },
        "USDC": {
          "inflow": 205918,
          "outflow": 47122
        }
      }
    },
    "erc20": [
      {
        "symbol": "WBTC",
        "balance": 5775.55,
        "usd_value": 6400.82
      },
      {
        "symbol": "CRV",
        "balance": 3865.64,
        "usd_value": 32939.61
      },
      {
        "symbol": "DAI",
        "balance": 1681.96,
        "usd_value": 44506.97
      },
      {
        "symbol": "PEPE",
        "balance": 2702.71,
        "usd_value": 4102.18
      },
      {
        "symbol": "PEPE",
        "balance": 7592.72,
        "usd_value": 23384.42
      },
      {
        "symbol": "CRV",
        "balance": 5743.51,
        "usd_value": 22818.4
      },
      {
        "symbol": "MKR",
        "balance": 5118.7,
        "usd_value": 20194.53
      },
      {
        "symbol": "DAI",
        "balance": 4843.49,
        "usd_value": 9263.37
      },
      {
        "symbol": "LINK",
        "balance": 6364.03,
        "usd_value": 13808.94
      },
      {
        "symbol": "SNX",
        "balance": 6229.06,
        "usd_value": 929.1
      },
      {
        "symbol": "PEPE",
        "balance": 8445.52,
        "usd_value": 31586.68
      },
      {
        "symbol": "CRV",
        "balance": 8037.05,
        "usd_value": 20094.3
      },
      {
        "symbol": "AAVE",
        "balance": 4927.37,
        "usd_value": 2654.91
      }
    ]
  },
  "0x025cfe518a7fee22b42b6f671150758e1d87d983": {
    "shortName": "Public figure #11",
    "tag": "SAFE",
    "identity": {
      "address": "0x025cfe518a7fee22b42b6f671150758e1d87d983",
      "ens": null,
      "label": "Random PUBLIC FIGURE Account",
      "tag": "PUBLIC FIGURE",
      "firstSeen": "2020-02-05",
      "lastSeen": "2024-06-15",
      "ethBalance": "230.17",
      "totalReceived": "6274 ETH",
      "totalSent": "4657 ETH",
      "txCount": 1721,
      "uniqueCounterparties": 239,
      "walletAgeDays": 247,
      "totalVolumeUSD": "$4,702,759"
    },
    "risk": {
      "score": 18,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 25,
      "factors": [
        {
          "penalty": 16,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as PUBLIC FIGURE"
        },
        {
          "penalty": 4,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as PUBLIC FIGURE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x025cfe",
          "label": "0x025c...",
          "type": "default",
          "risk": 18
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_787"
      ],
      "walletMentions": 39,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 4,
      "totalCashOutUSD": "$434,753",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "548 ETH"
    },
    "stablecoin": {
      "total_volume": 199876,
      "flows": {
        "USDT": {
          "inflow": 29042,
          "outflow": 16031
        },
        "USDC": {
          "inflow": 170834,
          "outflow": 89349
        }
      }
    },
    "erc20": [
      {
        "symbol": "AAVE",
        "balance": 9538.37,
        "usd_value": 26672.01
      },
      {
        "symbol": "MKR",
        "balance": 1042.46,
        "usd_value": 42417.27
      },
      {
        "symbol": "AAVE",
        "balance": 4974.05,
        "usd_value": 24123.59
      },
      {
        "symbol": "SHIB",
        "balance": 1395.65,
        "usd_value": 44757.09
      },
      {
        "symbol": "DAI",
        "balance": 5526.44,
        "usd_value": 4984.98
      }
    ]
  },
  "0xfb554298992d66eb4bb0948c2f3a28c60403b6ea": {
    "shortName": "Ransomware #12",
    "tag": "MEDIUM",
    "identity": {
      "address": "0xfb554298992d66eb4bb0948c2f3a28c60403b6ea",
      "ens": null,
      "label": "Random RANSOMWARE Account",
      "tag": "RANSOMWARE",
      "firstSeen": "2022-12-01",
      "lastSeen": "2024-06-15",
      "ethBalance": "290.18",
      "totalReceived": "8993 ETH",
      "totalSent": "4186 ETH",
      "txCount": 4358,
      "uniqueCounterparties": 471,
      "walletAgeDays": 984,
      "totalVolumeUSD": "$4,547,613"
    },
    "risk": {
      "score": 53,
      "label": "MEDIUM",
      "mlClassification": "Laundering",
      "anomalyScore": 83,
      "factors": [
        {
          "penalty": 8,
          "icon": "\ud83d\udd34",
          "reason": "Identified as RANSOMWARE"
        },
        {
          "penalty": 13,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as MEDIUM risk. Tagged as RANSOMWARE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0xfb5542",
          "label": "0xfb55...",
          "type": "suspect",
          "risk": 53
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_175"
      ],
      "walletMentions": 22,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 3,
      "totalCashOutUSD": "$73,902",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "633 ETH"
    },
    "stablecoin": {
      "total_volume": 6460710,
      "flows": {
        "USDT": {
          "inflow": 4665224,
          "outflow": 2184279
        },
        "USDC": {
          "inflow": 1795486,
          "outflow": 113130
        }
      }
    },
    "erc20": [
      {
        "symbol": "SHIB",
        "balance": 2389.64,
        "usd_value": 32393.61
      },
      {
        "symbol": "AAVE",
        "balance": 5719.61,
        "usd_value": 7622.02
      },
      {
        "symbol": "SHIB",
        "balance": 3946.83,
        "usd_value": 22427.36
      },
      {
        "symbol": "LINK",
        "balance": 1514.57,
        "usd_value": 47985.42
      },
      {
        "symbol": "CRV",
        "balance": 7199.55,
        "usd_value": 14277.87
      },
      {
        "symbol": "UNI",
        "balance": 1914.82,
        "usd_value": 5596.58
      },
      {
        "symbol": "CRV",
        "balance": 3285.76,
        "usd_value": 49632.61
      },
      {
        "symbol": "WBTC",
        "balance": 5113.9,
        "usd_value": 49081.48
      },
      {
        "symbol": "LINK",
        "balance": 4091.89,
        "usd_value": 39742.35
      }
    ]
  },
  "0x8dd71511b301040207f0237cd3d1974fbc8ea2ff": {
    "shortName": "Mixer #13",
    "tag": "MEDIUM",
    "identity": {
      "address": "0x8dd71511b301040207f0237cd3d1974fbc8ea2ff",
      "ens": null,
      "label": "Random MIXER Account",
      "tag": "MIXER",
      "firstSeen": "2020-02-02",
      "lastSeen": "2024-06-15",
      "ethBalance": "307.20",
      "totalReceived": "5027 ETH",
      "totalSent": "6033 ETH",
      "txCount": 2537,
      "uniqueCounterparties": 867,
      "walletAgeDays": 381,
      "totalVolumeUSD": "$6,451,366"
    },
    "risk": {
      "score": 50,
      "label": "MEDIUM",
      "mlClassification": "Laundering",
      "anomalyScore": 93,
      "factors": [
        {
          "penalty": 1,
          "icon": "\ud83d\udd34",
          "reason": "Identified as MIXER"
        },
        {
          "penalty": 14,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as MEDIUM risk. Tagged as MIXER.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x8dd715",
          "label": "0x8dd7...",
          "type": "suspect",
          "risk": 50
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_798"
      ],
      "walletMentions": 28,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 2,
      "totalCashOutUSD": "$91,562",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "774 ETH"
    },
    "stablecoin": {
      "total_volume": 1179565,
      "flows": {
        "USDT": {
          "inflow": 122474,
          "outflow": 88536
        },
        "USDC": {
          "inflow": 1057091,
          "outflow": 65485
        }
      }
    },
    "erc20": [
      {
        "symbol": "AAVE",
        "balance": 945.0,
        "usd_value": 14667.01
      },
      {
        "symbol": "UNI",
        "balance": 4388.43,
        "usd_value": 24726.82
      },
      {
        "symbol": "SNX",
        "balance": 6933.56,
        "usd_value": 34763.99
      },
      {
        "symbol": "LINK",
        "balance": 2187.73,
        "usd_value": 3419.83
      },
      {
        "symbol": "SHIB",
        "balance": 9613.5,
        "usd_value": 3921.33
      },
      {
        "symbol": "UNI",
        "balance": 6495.48,
        "usd_value": 26825.74
      }
    ]
  },
  "0xa07e35bd954a4569de41e1c386dd7bcbd18896ea": {
    "shortName": "Exchange #14",
    "tag": "SAFE",
    "identity": {
      "address": "0xa07e35bd954a4569de41e1c386dd7bcbd18896ea",
      "ens": "anon13.eth",
      "label": "Random EXCHANGE Account",
      "tag": "EXCHANGE",
      "firstSeen": "2023-12-05",
      "lastSeen": "2024-06-15",
      "ethBalance": "199.93",
      "totalReceived": "2931 ETH",
      "totalSent": "2456 ETH",
      "txCount": 2606,
      "uniqueCounterparties": 448,
      "walletAgeDays": 1281,
      "totalVolumeUSD": "$2,205,262"
    },
    "risk": {
      "score": 26,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 0,
      "factors": [
        {
          "penalty": 36,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as EXCHANGE"
        },
        {
          "penalty": 18,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as EXCHANGE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0xa07e35",
          "label": "0xa07e...",
          "type": "default",
          "risk": 26
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_347"
      ],
      "walletMentions": 0,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 1,
      "totalCashOutUSD": "$696,108",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "31 ETH"
    },
    "stablecoin": {
      "total_volume": 1405085,
      "flows": {
        "USDT": {
          "inflow": 40477,
          "outflow": 27902
        },
        "USDC": {
          "inflow": 1364608,
          "outflow": 639686
        }
      }
    },
    "erc20": [
      {
        "symbol": "PEPE",
        "balance": 2039.12,
        "usd_value": 35702.85
      },
      {
        "symbol": "WBTC",
        "balance": 9173.02,
        "usd_value": 40446.02
      },
      {
        "symbol": "WBTC",
        "balance": 9548.93,
        "usd_value": 21982.13
      },
      {
        "symbol": "MKR",
        "balance": 5678.34,
        "usd_value": 8607.75
      },
      {
        "symbol": "PEPE",
        "balance": 8340.1,
        "usd_value": 40137.0
      },
      {
        "symbol": "CRV",
        "balance": 7555.89,
        "usd_value": 20629.92
      },
      {
        "symbol": "CRV",
        "balance": 5996.04,
        "usd_value": 40709.25
      },
      {
        "symbol": "DAI",
        "balance": 8820.45,
        "usd_value": 37151.21
      },
      {
        "symbol": "WBTC",
        "balance": 5032.99,
        "usd_value": 46719.87
      },
      {
        "symbol": "WBTC",
        "balance": 1486.87,
        "usd_value": 10466.45
      },
      {
        "symbol": "PEPE",
        "balance": 5820.53,
        "usd_value": 25542.67
      },
      {
        "symbol": "AAVE",
        "balance": 8058.84,
        "usd_value": 45505.35
      }
    ]
  },
  "0xadf01f2f34e7688a0522e1685ec4c6b4a307e4ee": {
    "shortName": "Exchange #15",
    "tag": "SAFE",
    "identity": {
      "address": "0xadf01f2f34e7688a0522e1685ec4c6b4a307e4ee",
      "ens": "anon14.eth",
      "label": "Random EXCHANGE Account",
      "tag": "EXCHANGE",
      "firstSeen": "2021-02-22",
      "lastSeen": "2024-06-15",
      "ethBalance": "111.94",
      "totalReceived": "968 ETH",
      "totalSent": "3357 ETH",
      "txCount": 4483,
      "uniqueCounterparties": 533,
      "walletAgeDays": 331,
      "totalVolumeUSD": "$8,751,984"
    },
    "risk": {
      "score": 23,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 88,
      "factors": [
        {
          "penalty": 14,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as EXCHANGE"
        },
        {
          "penalty": 13,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as EXCHANGE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0xadf01f",
          "label": "0xadf0...",
          "type": "default",
          "risk": 23
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_783"
      ],
      "walletMentions": 44,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 4,
      "totalCashOutUSD": "$900,176",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "686 ETH"
    },
    "stablecoin": {
      "total_volume": 79840,
      "flows": {
        "USDT": {
          "inflow": 26350,
          "outflow": 16509
        },
        "USDC": {
          "inflow": 53490,
          "outflow": 34631
        }
      }
    },
    "erc20": [
      {
        "symbol": "LINK",
        "balance": 4056.03,
        "usd_value": 12018.2
      },
      {
        "symbol": "MKR",
        "balance": 244.16,
        "usd_value": 18465.17
      },
      {
        "symbol": "WBTC",
        "balance": 6370.47,
        "usd_value": 34695.44
      },
      {
        "symbol": "SHIB",
        "balance": 9179.1,
        "usd_value": 37022.03
      },
      {
        "symbol": "AAVE",
        "balance": 5108.25,
        "usd_value": 16860.09
      },
      {
        "symbol": "AAVE",
        "balance": 7398.15,
        "usd_value": 9782.33
      },
      {
        "symbol": "LINK",
        "balance": 1035.44,
        "usd_value": 24865.39
      },
      {
        "symbol": "CRV",
        "balance": 38.0,
        "usd_value": 47412.44
      },
      {
        "symbol": "SNX",
        "balance": 2820.3,
        "usd_value": 15220.25
      },
      {
        "symbol": "AAVE",
        "balance": 1857.82,
        "usd_value": 15474.13
      },
      {
        "symbol": "LINK",
        "balance": 2763.56,
        "usd_value": 2086.36
      },
      {
        "symbol": "LINK",
        "balance": 9854.67,
        "usd_value": 16623.96
      },
      {
        "symbol": "PEPE",
        "balance": 457.57,
        "usd_value": 14490.35
      }
    ]
  },
  "0x8b30705de647a3dc6dba035fa4ac46934a5179b4": {
    "shortName": "Ransomware #16",
    "tag": "HIGH",
    "identity": {
      "address": "0x8b30705de647a3dc6dba035fa4ac46934a5179b4",
      "ens": null,
      "label": "Random RANSOMWARE Account",
      "tag": "RANSOMWARE",
      "firstSeen": "2023-06-10",
      "lastSeen": "2024-06-15",
      "ethBalance": "323.40",
      "totalReceived": "9923 ETH",
      "totalSent": "6554 ETH",
      "txCount": 3849,
      "uniqueCounterparties": 167,
      "walletAgeDays": 805,
      "totalVolumeUSD": "$7,927,252"
    },
    "risk": {
      "score": 60,
      "label": "HIGH",
      "mlClassification": "Exploit",
      "anomalyScore": 82,
      "factors": [
        {
          "penalty": 28,
          "icon": "\ud83d\udd34",
          "reason": "Identified as RANSOMWARE"
        },
        {
          "penalty": 25,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as HIGH risk. Tagged as RANSOMWARE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x8b3070",
          "label": "0x8b30...",
          "type": "suspect",
          "risk": 60
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_216"
      ],
      "walletMentions": 11,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 2,
      "totalCashOutUSD": "$588,017",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "557 ETH"
    },
    "stablecoin": {
      "total_volume": 1861784,
      "flows": {
        "USDT": {
          "inflow": 901369,
          "outflow": 731178
        },
        "USDC": {
          "inflow": 960415,
          "outflow": 546219
        }
      }
    },
    "erc20": [
      {
        "symbol": "LINK",
        "balance": 2552.45,
        "usd_value": 10249.52
      },
      {
        "symbol": "SHIB",
        "balance": 6909.0,
        "usd_value": 6957.8
      },
      {
        "symbol": "UNI",
        "balance": 1351.2,
        "usd_value": 45756.09
      },
      {
        "symbol": "SHIB",
        "balance": 3546.62,
        "usd_value": 33590.39
      },
      {
        "symbol": "SNX",
        "balance": 196.02,
        "usd_value": 34925.22
      },
      {
        "symbol": "SNX",
        "balance": 881.2,
        "usd_value": 13710.14
      },
      {
        "symbol": "SHIB",
        "balance": 5960.05,
        "usd_value": 32711.5
      },
      {
        "symbol": "AAVE",
        "balance": 6133.37,
        "usd_value": 36183.42
      }
    ]
  },
  "0xd605a55faee723c645ded0db31bd0db1c0f9b00b": {
    "shortName": "Mixer #17",
    "tag": "HIGH",
    "identity": {
      "address": "0xd605a55faee723c645ded0db31bd0db1c0f9b00b",
      "ens": null,
      "label": "Random MIXER Account",
      "tag": "MIXER",
      "firstSeen": "2021-10-09",
      "lastSeen": "2024-06-15",
      "ethBalance": "34.60",
      "totalReceived": "7361 ETH",
      "totalSent": "7612 ETH",
      "txCount": 2049,
      "uniqueCounterparties": 184,
      "walletAgeDays": 1340,
      "totalVolumeUSD": "$8,155,921"
    },
    "risk": {
      "score": 73,
      "label": "HIGH",
      "mlClassification": "Exploit",
      "anomalyScore": 74,
      "factors": [
        {
          "penalty": 32,
          "icon": "\ud83d\udd34",
          "reason": "Identified as MIXER"
        },
        {
          "penalty": 23,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as HIGH risk. Tagged as MIXER.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0xd605a5",
          "label": "0xd605...",
          "type": "suspect",
          "risk": 73
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_626"
      ],
      "walletMentions": 11,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 5,
      "totalCashOutUSD": "$254,866",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "830 ETH"
    },
    "stablecoin": {
      "total_volume": 3268133,
      "flows": {
        "USDT": {
          "inflow": 1477968,
          "outflow": 816067
        },
        "USDC": {
          "inflow": 1790165,
          "outflow": 561725
        }
      }
    },
    "erc20": [
      {
        "symbol": "WBTC",
        "balance": 8097.4,
        "usd_value": 6746.6
      }
    ]
  },
  "0xfc4f9c9920340262a2d80af713e7918075f1832e": {
    "shortName": "Exchange #18",
    "tag": "SAFE",
    "identity": {
      "address": "0xfc4f9c9920340262a2d80af713e7918075f1832e",
      "ens": null,
      "label": "Random EXCHANGE Account",
      "tag": "EXCHANGE",
      "firstSeen": "2024-06-16",
      "lastSeen": "2024-06-15",
      "ethBalance": "461.32",
      "totalReceived": "3609 ETH",
      "totalSent": "5492 ETH",
      "txCount": 2170,
      "uniqueCounterparties": 519,
      "walletAgeDays": 912,
      "totalVolumeUSD": "$9,648,530"
    },
    "risk": {
      "score": 1,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 24,
      "factors": [
        {
          "penalty": 23,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as EXCHANGE"
        },
        {
          "penalty": 23,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as EXCHANGE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0xfc4f9c",
          "label": "0xfc4f...",
          "type": "default",
          "risk": 1
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_795"
      ],
      "walletMentions": 23,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 1,
      "totalCashOutUSD": "$15,017",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "304 ETH"
    },
    "stablecoin": {
      "total_volume": 1410326,
      "flows": {
        "USDT": {
          "inflow": 46930,
          "outflow": 23090
        },
        "USDC": {
          "inflow": 1363396,
          "outflow": 219206
        }
      }
    },
    "erc20": [
      {
        "symbol": "CRV",
        "balance": 9195.66,
        "usd_value": 12986.89
      },
      {
        "symbol": "LINK",
        "balance": 5491.93,
        "usd_value": 17200.28
      },
      {
        "symbol": "CRV",
        "balance": 4242.27,
        "usd_value": 28247.35
      },
      {
        "symbol": "MKR",
        "balance": 1867.44,
        "usd_value": 1255.81
      },
      {
        "symbol": "SHIB",
        "balance": 6048.77,
        "usd_value": 40466.85
      },
      {
        "symbol": "CRV",
        "balance": 696.07,
        "usd_value": 19061.62
      },
      {
        "symbol": "PEPE",
        "balance": 5854.38,
        "usd_value": 22746.22
      },
      {
        "symbol": "SHIB",
        "balance": 4515.61,
        "usd_value": 4181.84
      },
      {
        "symbol": "CRV",
        "balance": 641.88,
        "usd_value": 31861.19
      }
    ]
  },
  "0x1afdd38ad557bb0854476bc850b414445ec43ee0": {
    "shortName": "Hacker #19",
    "tag": "HIGH",
    "identity": {
      "address": "0x1afdd38ad557bb0854476bc850b414445ec43ee0",
      "ens": null,
      "label": "Random HACKER Account",
      "tag": "HACKER",
      "firstSeen": "2021-02-02",
      "lastSeen": "2024-06-15",
      "ethBalance": "368.14",
      "totalReceived": "5555 ETH",
      "totalSent": "375 ETH",
      "txCount": 1710,
      "uniqueCounterparties": 339,
      "walletAgeDays": 596,
      "totalVolumeUSD": "$9,566,827"
    },
    "risk": {
      "score": 75,
      "label": "HIGH",
      "mlClassification": "Fraud",
      "anomalyScore": 73,
      "factors": [
        {
          "penalty": 9,
          "icon": "\ud83d\udd34",
          "reason": "Identified as HACKER"
        },
        {
          "penalty": 17,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as HIGH risk. Tagged as HACKER.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x1afdd3",
          "label": "0x1afd...",
          "type": "suspect",
          "risk": 75
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_201"
      ],
      "walletMentions": 23,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 5,
      "totalCashOutUSD": "$977,404",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "191 ETH"
    },
    "stablecoin": {
      "total_volume": 2291349,
      "flows": {
        "USDT": {
          "inflow": 750048,
          "outflow": 143638
        },
        "USDC": {
          "inflow": 1541301,
          "outflow": 421296
        }
      }
    },
    "erc20": [
      {
        "symbol": "AAVE",
        "balance": 4889.76,
        "usd_value": 4035.64
      },
      {
        "symbol": "MKR",
        "balance": 671.3,
        "usd_value": 24445.53
      },
      {
        "symbol": "PEPE",
        "balance": 5904.4,
        "usd_value": 31699.09
      }
    ]
  },
  "0x4b809c608fc7393e692d9a3617fd6639da8e4a66": {
    "shortName": "Safe #20",
    "tag": "SAFE",
    "identity": {
      "address": "0x4b809c608fc7393e692d9a3617fd6639da8e4a66",
      "ens": null,
      "label": "Random SAFE Account",
      "tag": "SAFE",
      "firstSeen": "2023-05-14",
      "lastSeen": "2024-06-15",
      "ethBalance": "205.51",
      "totalReceived": "2869 ETH",
      "totalSent": "1253 ETH",
      "txCount": 2841,
      "uniqueCounterparties": 101,
      "walletAgeDays": 625,
      "totalVolumeUSD": "$936,877"
    },
    "risk": {
      "score": 2,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 88,
      "factors": [
        {
          "penalty": 9,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as SAFE"
        },
        {
          "penalty": 16,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as SAFE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x4b809c",
          "label": "0x4b80...",
          "type": "default",
          "risk": 2
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_391"
      ],
      "walletMentions": 38,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 4,
      "totalCashOutUSD": "$893,154",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "264 ETH"
    },
    "stablecoin": {
      "total_volume": 1110946,
      "flows": {
        "USDT": {
          "inflow": 14600,
          "outflow": 6537
        },
        "USDC": {
          "inflow": 1096346,
          "outflow": 767229
        }
      }
    },
    "erc20": [
      {
        "symbol": "UNI",
        "balance": 5027.47,
        "usd_value": 27283.51
      },
      {
        "symbol": "UNI",
        "balance": 651.79,
        "usd_value": 26153.89
      },
      {
        "symbol": "SHIB",
        "balance": 5212.38,
        "usd_value": 5813.22
      },
      {
        "symbol": "LINK",
        "balance": 6899.07,
        "usd_value": 16674.78
      }
    ]
  },
  "0x3628da5fcc83ef4b95711399003549b624dff558": {
    "shortName": "Public figure #21",
    "tag": "SAFE",
    "identity": {
      "address": "0x3628da5fcc83ef4b95711399003549b624dff558",
      "ens": null,
      "label": "Random PUBLIC FIGURE Account",
      "tag": "PUBLIC FIGURE",
      "firstSeen": "2024-08-01",
      "lastSeen": "2024-06-15",
      "ethBalance": "133.22",
      "totalReceived": "5783 ETH",
      "totalSent": "4821 ETH",
      "txCount": 2582,
      "uniqueCounterparties": 980,
      "walletAgeDays": 767,
      "totalVolumeUSD": "$7,834,724"
    },
    "risk": {
      "score": 20,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 47,
      "factors": [
        {
          "penalty": 9,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as PUBLIC FIGURE"
        },
        {
          "penalty": 23,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as PUBLIC FIGURE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x3628da",
          "label": "0x3628...",
          "type": "default",
          "risk": 20
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_400"
      ],
      "walletMentions": 28,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 0,
      "totalCashOutUSD": "$247,940",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "606 ETH"
    },
    "stablecoin": {
      "total_volume": 153606,
      "flows": {
        "USDT": {
          "inflow": 18042,
          "outflow": 16730
        },
        "USDC": {
          "inflow": 135564,
          "outflow": 75985
        }
      }
    },
    "erc20": [
      {
        "symbol": "PEPE",
        "balance": 6981.45,
        "usd_value": 22141.48
      }
    ]
  },
  "0x019c4755f75ec85a97fa8f0215e91e559c6cbe1b": {
    "shortName": "Ransomware #22",
    "tag": "CRITICAL",
    "identity": {
      "address": "0x019c4755f75ec85a97fa8f0215e91e559c6cbe1b",
      "ens": null,
      "label": "Random RANSOMWARE Account",
      "tag": "RANSOMWARE",
      "firstSeen": "2020-03-03",
      "lastSeen": "2024-06-15",
      "ethBalance": "331.70",
      "totalReceived": "2265 ETH",
      "totalSent": "5945 ETH",
      "txCount": 1714,
      "uniqueCounterparties": 313,
      "walletAgeDays": 458,
      "totalVolumeUSD": "$5,905,189"
    },
    "risk": {
      "score": 89,
      "label": "CRITICAL",
      "mlClassification": "Laundering",
      "anomalyScore": 61,
      "factors": [
        {
          "penalty": 9,
          "icon": "\ud83d\udd34",
          "reason": "Identified as RANSOMWARE"
        },
        {
          "penalty": 8,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as CRITICAL risk. Tagged as RANSOMWARE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x019c47",
          "label": "0x019c...",
          "type": "suspect",
          "risk": 89
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_357"
      ],
      "walletMentions": 33,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 5,
      "totalCashOutUSD": "$918,003",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "697 ETH"
    },
    "stablecoin": {
      "total_volume": 5107405,
      "flows": {
        "USDT": {
          "inflow": 3381142,
          "outflow": 2283219
        },
        "USDC": {
          "inflow": 1726263,
          "outflow": 57526
        }
      }
    },
    "erc20": [
      {
        "symbol": "UNI",
        "balance": 1149.28,
        "usd_value": 32416.7
      },
      {
        "symbol": "AAVE",
        "balance": 9818.67,
        "usd_value": 15786.95
      },
      {
        "symbol": "AAVE",
        "balance": 957.91,
        "usd_value": 21507.57
      },
      {
        "symbol": "WBTC",
        "balance": 340.44,
        "usd_value": 1133.53
      },
      {
        "symbol": "WBTC",
        "balance": 8905.15,
        "usd_value": 36816.77
      },
      {
        "symbol": "LINK",
        "balance": 5906.73,
        "usd_value": 32083.2
      },
      {
        "symbol": "DAI",
        "balance": 4702.81,
        "usd_value": 32375.26
      },
      {
        "symbol": "SHIB",
        "balance": 7374.47,
        "usd_value": 26509.3
      },
      {
        "symbol": "DAI",
        "balance": 5393.16,
        "usd_value": 1586.68
      },
      {
        "symbol": "LINK",
        "balance": 3484.84,
        "usd_value": 25418.69
      },
      {
        "symbol": "UNI",
        "balance": 7641.21,
        "usd_value": 3117.13
      },
      {
        "symbol": "MKR",
        "balance": 9631.93,
        "usd_value": 5324.12
      },
      {
        "symbol": "SHIB",
        "balance": 9862.25,
        "usd_value": 45673.57
      }
    ]
  },
  "0xd140a653a644405d57829cb445ce9908dd2be737": {
    "shortName": "Public figure #23",
    "tag": "SAFE",
    "identity": {
      "address": "0xd140a653a644405d57829cb445ce9908dd2be737",
      "ens": null,
      "label": "Random PUBLIC FIGURE Account",
      "tag": "PUBLIC FIGURE",
      "firstSeen": "2022-12-21",
      "lastSeen": "2024-06-15",
      "ethBalance": "444.49",
      "totalReceived": "4003 ETH",
      "totalSent": "8891 ETH",
      "txCount": 1625,
      "uniqueCounterparties": 633,
      "walletAgeDays": 351,
      "totalVolumeUSD": "$4,596,110"
    },
    "risk": {
      "score": 12,
      "label": "SAFE",
      "mlClassification": "Normal",
      "anomalyScore": 52,
      "factors": [
        {
          "penalty": 24,
          "icon": "\ud83d\udfe2",
          "reason": "Identified as PUBLIC FIGURE"
        },
        {
          "penalty": 18,
          "icon": "\ud83d\udfe2",
          "reason": "Normal holding pattern"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as SAFE risk. Tagged as PUBLIC FIGURE.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "N/A"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0xd140a6",
          "label": "0xd140...",
          "type": "default",
          "risk": 12
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_568"
      ],
      "walletMentions": 34,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": true,
      "findings": [],
      "cashOutEvents": 0,
      "totalCashOutUSD": "$98,931",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [],
      "totalMixedETH": "141 ETH"
    },
    "stablecoin": {
      "total_volume": 1831457,
      "flows": {
        "USDT": {
          "inflow": 11027,
          "outflow": 3920
        },
        "USDC": {
          "inflow": 1820430,
          "outflow": 862157
        }
      }
    },
    "erc20": [
      {
        "symbol": "PEPE",
        "balance": 6107.56,
        "usd_value": 19626.26
      },
      {
        "symbol": "WBTC",
        "balance": 5356.18,
        "usd_value": 31513.46
      },
      {
        "symbol": "SNX",
        "balance": 4458.52,
        "usd_value": 29226.98
      }
    ]
  },
  "0xe7ac02b133c52cc6bdfb3c8701342727e7d44b83": {
    "shortName": "Hacker #24",
    "tag": "MEDIUM",
    "identity": {
      "address": "0xe7ac02b133c52cc6bdfb3c8701342727e7d44b83",
      "ens": null,
      "label": "Random HACKER Account",
      "tag": "HACKER",
      "firstSeen": "2023-09-13",
      "lastSeen": "2024-06-15",
      "ethBalance": "98.37",
      "totalReceived": "8079 ETH",
      "totalSent": "9782 ETH",
      "txCount": 2304,
      "uniqueCounterparties": 733,
      "walletAgeDays": 1077,
      "totalVolumeUSD": "$5,902,506"
    },
    "risk": {
      "score": 45,
      "label": "MEDIUM",
      "mlClassification": "Normal",
      "anomalyScore": 13,
      "factors": [
        {
          "penalty": 2,
          "icon": "\ud83d\udd34",
          "reason": "Identified as HACKER"
        },
        {
          "penalty": 13,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as MEDIUM risk. Tagged as HACKER.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0xe7ac02",
          "label": "0xe7ac...",
          "type": "suspect",
          "risk": 45
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_812"
      ],
      "walletMentions": 11,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 1,
      "totalCashOutUSD": "$167,165",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "813 ETH"
    },
    "stablecoin": {
      "total_volume": 3650589,
      "flows": {
        "USDT": {
          "inflow": 2614097,
          "outflow": 1973468
        },
        "USDC": {
          "inflow": 1036492,
          "outflow": 198538
        }
      }
    },
    "erc20": [
      {
        "symbol": "UNI",
        "balance": 4216.46,
        "usd_value": 39780.01
      },
      {
        "symbol": "WBTC",
        "balance": 2879.32,
        "usd_value": 11252.1
      },
      {
        "symbol": "CRV",
        "balance": 5871.21,
        "usd_value": 28161.72
      },
      {
        "symbol": "CRV",
        "balance": 3308.88,
        "usd_value": 10104.24
      },
      {
        "symbol": "LINK",
        "balance": 5425.93,
        "usd_value": 43780.0
      },
      {
        "symbol": "UNI",
        "balance": 9439.99,
        "usd_value": 49801.62
      },
      {
        "symbol": "MKR",
        "balance": 6055.15,
        "usd_value": 26352.87
      },
      {
        "symbol": "WBTC",
        "balance": 5956.89,
        "usd_value": 19945.0
      },
      {
        "symbol": "PEPE",
        "balance": 8447.49,
        "usd_value": 5663.45
      },
      {
        "symbol": "SHIB",
        "balance": 9492.28,
        "usd_value": 42061.04
      },
      {
        "symbol": "DAI",
        "balance": 1923.18,
        "usd_value": 18321.64
      },
      {
        "symbol": "MKR",
        "balance": 7583.12,
        "usd_value": 33971.55
      },
      {
        "symbol": "LINK",
        "balance": 3780.51,
        "usd_value": 24367.12
      },
      {
        "symbol": "DAI",
        "balance": 4765.66,
        "usd_value": 47671.03
      },
      {
        "symbol": "SNX",
        "balance": 8107.32,
        "usd_value": 17317.18
      }
    ]
  },
  "0x7cd62121240a70e9130b7ce4f3259ce837a2a47b": {
    "shortName": "Hacker #25",
    "tag": "CRITICAL",
    "identity": {
      "address": "0x7cd62121240a70e9130b7ce4f3259ce837a2a47b",
      "ens": null,
      "label": "Random HACKER Account",
      "tag": "HACKER",
      "firstSeen": "2020-11-23",
      "lastSeen": "2024-06-15",
      "ethBalance": "471.51",
      "totalReceived": "8675 ETH",
      "totalSent": "185 ETH",
      "txCount": 4693,
      "uniqueCounterparties": 801,
      "walletAgeDays": 951,
      "totalVolumeUSD": "$4,779,229"
    },
    "risk": {
      "score": 90,
      "label": "CRITICAL",
      "mlClassification": "Anomaly",
      "anomalyScore": 84,
      "factors": [
        {
          "penalty": 11,
          "icon": "\ud83d\udd34",
          "reason": "Identified as HACKER"
        },
        {
          "penalty": 8,
          "icon": "\ud83d\udfe0",
          "reason": "High volume of anonymous transactions"
        }
      ],
      "aiAnalysis": {
        "verdict": "AI has classified this as CRITICAL risk. Tagged as HACKER.",
        "hypothesis": "Based on transaction timing and volume.",
        "mitre_tag": "T1566"
      }
    },
    "graph": {
      "nodes": [
        {
          "id": "0x7cd621",
          "label": "0x7cd6...",
          "type": "suspect",
          "risk": 90
        }
      ],
      "edges": []
    },
    "osint": {
      "summary": "Generated OSINT report.",
      "githubMentions": [],
      "redditMentions": [],
      "aliases": [
        "alias_328"
      ],
      "walletMentions": 17,
      "aiAnalysis": {
        "verdict": "OSINT confirms pattern.",
        "hypothesis": "Actor active on forums.",
        "mitre_tag": "OSINT"
      }
    },
    "exchange": {
      "detected": false,
      "findings": [],
      "cashOutEvents": 5,
      "totalCashOutUSD": "$511,068",
      "summary": "Exchange interactions recorded."
    },
    "mixer": {
      "detected": false,
      "findings": [],
      "bridgeActivity": [],
      "launderingIndicators": [
        "Layering detected"
      ],
      "totalMixedETH": "830 ETH"
    },
    "stablecoin": {
      "total_volume": 3296262,
      "flows": {
        "USDT": {
          "inflow": 1583111,
          "outflow": 1072634
        },
        "USDC": {
          "inflow": 1713151,
          "outflow": 1214668
        }
      }
    },
    "erc20": [
      {
        "symbol": "SHIB",
        "balance": 9077.19,
        "usd_value": 31641.77
      },
      {
        "symbol": "SHIB",
        "balance": 5628.79,
        "usd_value": 6988.81
      },
      {
        "symbol": "CRV",
        "balance": 4791.52,
        "usd_value": 18962.93
      },
      {
        "symbol": "WBTC",
        "balance": 5578.13,
        "usd_value": 27018.27
      },
      {
        "symbol": "CRV",
        "balance": 863.36,
        "usd_value": 10728.77
      },
      {
        "symbol": "MKR",
        "balance": 8209.87,
        "usd_value": 21637.0
      },
      {
        "symbol": "MKR",
        "balance": 5488.91,
        "usd_value": 31739.39
      },
      {
        "symbol": "PEPE",
        "balance": 2164.52,
        "usd_value": 49599.28
      },
      {
        "symbol": "WBTC",
        "balance": 3102.75,
        "usd_value": 48866.96
      },
      {
        "symbol": "SHIB",
        "balance": 2344.31,
        "usd_value": 35694.19
      }
    ]
  }
};
