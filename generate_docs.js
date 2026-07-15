const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, PageNumber, Header, Footer, VerticalAlign, LevelFormat,
  convertInchesToTwip, TabStopType, TabStopPosition
} = require("docx");
const fs = require("fs");
const path = require("path");

const BLUE = "1F5FA6";
const DARKGREY = "333333";
const FONT = "Calibri";

// ---------- helpers ----------
function bodyPar(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 264, lineRule: "auto", after: 120 }, // 1.15 line, 6pt after
    children: [new TextRun({ text, font: FONT, size: 22, ...opts })],
  });
}

function richPar(runsArr, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 264, lineRule: "auto", after: 120 },
    children: runsArr.map(r => new TextRun({ font: FONT, size: 22, ...r })),
    ...opts
  });
}

function chapterPage(num, title) {
  return [
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 200 },
      children: [new TextRun({ text: `Chapter ${num}`, bold: true, size: 32, color: BLUE, font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: title, bold: true, size: 32, color: BLUE, font: FONT })],
    }),
  ];
}

function h2(numTitle) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: numTitle, bold: true, size: 24, color: BLUE, font: FONT })],
  });
}

function h3(numTitle) {
  return new Paragraph({
    spacing: { before: 180, after: 100 },
    children: [new TextRun({ text: numTitle, bold: true, size: 22, color: DARKGREY, font: FONT })],
  });
}

function bullet(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 80 },
    numbering: { reference: "bullet-list", level: 0 },
    children: [new TextRun({ text, font: FONT, size: 22 })],
  });
}

function numbered(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 80 },
    numbering: { reference: "num-list", level: 0 },
    children: [new TextRun({ text, font: FONT, size: 22 })],
  });
}

function figureCaption(num, title) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 240 },
    children: [new TextRun({ text: `Figure ${num}: ${title}`, italics: true, size: 20, font: FONT })],
  });
}

function tableCaption(num, title) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 240 },
    children: [new TextRun({ text: `Table ${num}: ${title}`, italics: true, size: 20, font: FONT })],
  });
}

function diagramBox(lines, description) {
  const innerParas = lines.map((l, i) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: i === lines.length - 1 ? 0 : 80 },
    children: [new TextRun({ text: l, font: FONT, size: 20, bold: true })],
  }));
  if (description) {
    innerParas.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160 },
      children: [new TextRun({ text: description, font: FONT, size: 18, italics: true, color: "555555" })],
    }));
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 300, bottom: 300, left: 300, right: 300 },
            children: innerParas,
          }),
        ],
      }),
    ],
  });
}

function screenshotBox(label, description) {
  return diagramBox([label], description);
}

function chapterSummary(text) {
  return [
    new Paragraph({
      spacing: { before: 300, after: 120 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 8 } },
      children: [new TextRun({ text: "Chapter Summary", bold: true, size: 24, color: BLUE, font: FONT })],
    }),
    bodyPar(text),
  ];
}

function simpleTable(headerRow, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const mkCell = (text, bold, shade) => new TableCell({
    width: { size: (text.w || 0), type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, fill: "D9E2F3" } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      children: [new TextRun({ text: text.t, bold, font: FONT, size: 20 })],
    })],
  });
  const headerCells = headerRow.map((t, i) => mkCell({ t, w: widths[i] }, true, true));
  const bodyRows = rows.map(r => new TableRow({
    children: r.map((t, i) => mkCell({ t, w: widths[i] }, false, false)),
  }));
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...bodyRows],
  });
}

const children = [];

// ===== Title Page =====
children.push(
  new Paragraph({ spacing: { before: 1800 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "AXON", bold: true, size: 56, font: FONT, color: BLUE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 },
    children: [new TextRun({ text: "Advanced Blockchain Behavioral Forensics", bold: true, size: 30, font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [new TextRun({ text: "& Threat Intelligence Platform", bold: true, size: 30, font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
    children: [new TextRun({ text: "Final Internship Report", italics: true, size: 24, font: FONT })] }),
  new Paragraph({ spacing: { before: 1000 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Submitted by:", bold: true, size: 22, font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Calvin Jude D'Souza", size: 22, font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 },
    children: [new TextRun({ text: "B.Tech in Cybersecurity", size: 20, font: FONT })] }),
  new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Under the Guidance of:", bold: true, size: 22, font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Lt Col Indra Kumar Sahu", size: 22, font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 },
    children: [new TextRun({ text: "Reporting Officer / Mentor", italics: true, size: 20, font: FONT })] }),
  new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Internship Organization: Army Cyber Group, New Delhi", size: 20, font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 },
    children: [new TextRun({ text: "Assigned Lab: CFL (Cyber Forensics Lab)", size: 20, font: FONT })] }),
);

// ===== Contents =====
children.push(new Paragraph({ pageBreakBefore: true,
  children: [new TextRun({ text: "Contents", bold: true, size: 32, color: BLUE, font: FONT })] }));

const tocLines = [
  "Acknowledgement",
  "Abstract",
  "List of Tables",
  "List of Figures",
  "Chapter 1  Executive Summary",
  "Chapter 2  Problem Statement",
  "     2.1 Existing Solutions & the Gap",
  "Chapter 3  AXON Overview",
  "     3.1 Objectives",
  "     3.2 Intended Users",
  "     3.3 Scope",
  "Chapter 4  System Architecture",
  "     4.1 Layers & Data Flow",
  "     4.2 Technology Stack",
  "     4.3 External Intelligence Sources",
  "Chapter 5  Core System Modules",
  "     5.1 Wallet Investigation",
  "     5.2 Smart Contract Investigation",
  "     5.3 Bulk Investigation",
  "     5.4 Case Management",
  "Chapter 6  Shared Analytical Engine",
  "Chapter 7  Core Functionality",
  "     7.1 Analysis & Detection",
  "     7.2 Visualization",
  "     7.3 Evidence & Reporting",
  "Chapter 8  Investigation Methodology",
  "Chapter 9  Implementation Overview",
  "(Chapters 10-18 continue in the accompanying volume)",
];
tocLines.forEach(l => children.push(new Paragraph({
  spacing: { after: 80 },
  children: [new TextRun({ text: l, font: FONT, size: 22 })],
})));

// ===== Acknowledgement =====
children.push(new Paragraph({ pageBreakBefore: true,
  children: [new TextRun({ text: "Acknowledgement", bold: true, size: 32, color: BLUE, font: FONT })] }));
children.push(bodyPar("I would like to express my sincere gratitude to the Army Cyber Group, New Delhi, for providing me the opportunity to undertake this internship and for granting access to the CFL Laboratory, whose infrastructure and working environment were instrumental to the development of AXON."));
children.push(bodyPar("I am especially thankful to Lt Col Indra Kumar Sahu, my Reporting Officer and Mentor, for his consistent guidance, technical feedback, and the operational perspective he brought to the project. His insistence on defensible, evidence-grade output shaped several of the platform's core design decisions, including its approach to report integrity and its terminology conventions."));
children.push(bodyPar("I would also like to thank NMAM Institute of Technology, Nitte, and the Department of Computer Science and Engineering (Cybersecurity) for facilitating this internship as part of the academic curriculum and for the foundation provided through coursework in the field. I am grateful to the faculty members of the department for their continued academic support."));
children.push(bodyPar("Finally, I extend my appreciation to everyone at the CFL Laboratory who contributed time, feedback, or testing effort during the development and evaluation of AXON. This project would not have reached its present form without their collective support."));

// ===== Abstract =====
children.push(new Paragraph({ pageBreakBefore: true,
  children: [new TextRun({ text: "Abstract", bold: true, size: 32, color: BLUE, font: FONT })] }));
children.push(bodyPar("Cryptocurrency-enabled crime has outpaced the tools available to investigate it. Commercial blockchain forensics platforms remain dependent on static label lookup: an address is flagged only if it already appears in a known-bad database. This leaves two classes of threats systematically invisible — zero-day wallets with no prior history, and wallets exhibiting textbook laundering behaviour that has simply not yet been manually labelled. AXON, an Advanced Blockchain Behavioral Forensics & Threat Intelligence Platform, was built to close this gap by determining what a wallet does rather than what it is labelled as."));
children.push(bodyPar("The core of AXON is a five-axis behavioural scoring engine that evaluates temporal transaction anomalies, fund velocity and graph topology, counterparty network toxicity, mixer and privacy-protocol exposure, and active threat-intelligence corpus matches, producing a composite Threat Indicator between 0 and 100 with an associated confidence interval. This behavioural core is supported by a two-tier address identification pipeline (deterministic checksum validation with an AI fallback for exotic chains), an automated smart-contract forensic scanner combining static analysis with live security intelligence, a bulk investigation pipeline for compliance-scale batch processing, and a bounded breadth-first-search fund-tracing module with attribution circuit breakers."));
children.push(bodyPar("Methodologically, the project followed an iterative, module-by-module development process governed by a strict set of engineering non-negotiables — no regression on shared scoring or hashing logic, additive-only changes to the report engine, chain-of-custody logging on every entity resolution step, and explicit scan-depth transparency — enforced through fixture-based regression testing at each stage. The system was implemented using React, TailwindCSS, and D3.js on the frontend, and Python with FastAPI and SQLAlchemy on the backend, integrating data from Etherscan, Alchemy, Forta, GoPlus Labs, and Openchain, with large-language-model reasoning supplied through Groq and OpenRouter."));
children.push(bodyPar("Evidence integrity is preserved through a cryptographic reporting pipeline: every generated PDF is bound to a SHA-256 hash of its underlying data payload, independently verifiable against a database record, ensuring that findings cannot be silently altered after generation. Testing against real-world addresses — including known exploit wallets, mixer routers, and benign high-volume wallets — demonstrated that the behavioural engine correctly differentiates malicious activity patterns from legitimate high-frequency usage without relying on prior labelling."));
children.push(bodyPar("The resulting platform consolidates behavioural analysis, contract auditing, bulk triage, and tamper-evident reporting into a single investigation workspace. Future work is directed toward extending native behavioural scoring to additional chains, incorporating privacy-pool-specific clustering heuristics, and introducing live monitoring and graph-neural-network-based relationship discovery."));
children.push(new Paragraph({ spacing: { before: 200 },
  children: [new TextRun({ text: "Keywords: ", bold: true, font: FONT, size: 22 }),
  new TextRun({ text: "Blockchain Forensics, Behavioural Scoring, Threat Intelligence, Smart Contract Auditing, Fund Tracing, Evidence Integrity, FastAPI, React.", font: FONT, size: 22 })] }));

// ===== List of Tables =====
children.push(new Paragraph({ pageBreakBefore: true,
  children: [new TextRun({ text: "List of Tables", bold: true, size: 32, color: BLUE, font: FONT })] }));
const lot = [
  ["Table 2.1", "Existing Platforms — Strengths and Limitations", "5"],
  ["Table 4.1", "External Intelligence Sources", "8"],
  ["Table 5.1", "Core Investigation Modules", "9"],
  ["Table 6.1", "Five-Layer Behavioural Engine — Weight Distribution", "10"],
];
children.push(simpleTable(["Table No.", "Title", "Page No."], lot, [1600, 6700, 1200]));

// ===== List of Figures =====
children.push(new Paragraph({ pageBreakBefore: true,
  children: [new TextRun({ text: "List of Figures", bold: true, size: 32, color: BLUE, font: FONT })] }));
const lof = [
  ["Figure 4.1", "Overall System Architecture", "7"],
  ["Figure 6.1", "Five-Layer Behavioural Engine Flow", "10"],
  ["Figure 8.1", "Investigation Workflow", "13"],
  ["Figure 9.1", "Implementation — Component Integration", "14"],
];
children.push(simpleTable(["Figure No.", "Title", "Page No."], lof, [1600, 6700, 1200]));

// ================= CHAPTER 1 =================
children.push(...chapterPage(1, "Executive Summary"));
children.push(bodyPar("Cryptocurrency-enabled crime — scams, ransomware payments, mixer-assisted laundering, phishing, drainer wallets, rug pulls, and sanctioned-entity transfers — has outpaced the tooling investigators use to respond to it. Blockchain explorers show raw transactions; they do not explain behaviour. AXON was built to close that gap."));
children.push(bodyPar("AXON is an Advanced Blockchain Behavioral Forensics & Threat Intelligence Platform. Rather than asking \u201cis this address on a blocklist?\u201d, AXON asks \u201cwhat does this address actually do?\u201d It analyses transaction rhythm, fund-flow topology, counterparty exposure, and privacy-protocol usage to produce a Behavioral Assessment for any wallet or smart contract — including addresses that have never been labelled before."));
children.push(bodyPar("The platform combines a five-layer analytical engine, an automated smart-contract audit pipeline, bulk-processing tools for compliance teams, and a tamper-evident evidence reporting system, all wrapped in a single investigation workspace intended for cyber investigation teams, compliance officers, and law enforcement."));
children.push(bodyPar("The platform presents findings as evidentiary observations rather than conclusions. AXON automates the preparation and interpretation of blockchain evidence; investigative attribution and legal judgment remain the responsibility of the examiner.", { italics: true }));
children.push(...chapterSummary("This chapter introduced AXON's core premise — replacing static blocklist lookup with behavioural analysis — and outlined the platform's principal capabilities and intended users. The following chapter examines the specific gaps in existing tooling that motivated this approach."));

// ================= CHAPTER 2 =================
children.push(...chapterPage(2, "Problem Statement"));
children.push(bodyPar("Blockchain explorers such as Etherscan expose every transaction an address has ever made, but they leave interpretation entirely to the investigator. In practice, this creates several recurring bottlenecks:"));
[
  "Explorers display raw transaction lists with no behavioural interpretation — investigators must manually decide what is normal and what is not.",
  "Threat intelligence is fragmented across several unconnected platforms, forcing analysts to cross-reference manually.",
  "Wallet attribution is difficult: a freshly created \u201czero-day\u201d wallet has no history and passes every static blocklist check.",
  "Visualisation of fund flow and counterparty relationships is poor or entirely absent.",
  "Smart-contract risk analysis is typically a separate, disconnected step from wallet investigation.",
  "There is no centralised workflow for building a case, correlating multiple addresses, and producing a defensible report.",
].forEach(t => children.push(bullet(t)));
children.push(bodyPar("Each of these gaps adds hours to an investigation that should take minutes and increases the risk that two analysts reach different conclusions from the same evidence."));

children.push(h2("2.1 Existing Solutions & the Gap"));
children.push(bodyPar("Commercial and public platforms already address parts of this problem. Reviewed objectively, each leaves a specific gap that AXON was designed to fill, as summarised in Table 2.1."));
children.push(simpleTable(
  ["Platform", "Strength", "Limitation"],
  [
    ["Etherscan / Explorers", "Complete, authoritative raw transaction data", "No behavioural interpretation or risk context"],
    ["Chainalysis / TRM Labs", "Mature compliance tooling, large label databases", "Primarily label/lookup driven; costly for smaller teams"],
    ["Arkham", "Strong entity attribution and visual intelligence", "Limited automated contract auditing"],
    ["Breadcrumbs", "Good fund-flow visualisation", "Narrow behavioural scoring depth"],
  ], [2200, 3300, 4000]));
children.push(tableCaption("2.1", "Existing Platforms — Strengths and Limitations"));
children.push(bodyPar("The common thread is a reliance on static, label-based detection. A wallet exhibiting textbook laundering behaviour — peel chains, mixer interaction, dormancy followed by a sudden spike — is rated \u201cclean\u201d simply because no analyst has labelled it yet. AXON's contribution is to replace lookup with behavioural analysis, so a threat can be flagged the first time it appears, not after it has already been named, as summarised in Table 2.1."));
children.push(...chapterSummary("This chapter identified the recurring bottlenecks in existing blockchain investigation workflows and reviewed how established platforms leave a shared gap around behavioural, label-independent detection. Chapter 3 introduces AXON's overall approach to closing this gap."));

// ================= CHAPTER 3 =================
children.push(...chapterPage(3, "AXON Overview"));
children.push(bodyPar("AXON combines transaction analysis, behavioural profiling, threat intelligence correlation, smart-contract security analysis, and an adversarial analytical engine into a single investigation environment. Its guiding principle is simple: AXON does not ask what a wallet is — it determines what a wallet does."));

children.push(h2("3.1 Objectives"));
[
  "Primary: replace static blocklist lookups with dynamic, explainable behavioural scoring.",
  "Secondary: unify wallet, contract, and bulk-batch investigation into one workspace.",
  "Investigation goal: reduce the time from \u201csuspicious address received\u201d to \u201cactionable finding\u201d.",
  "Security goal: produce evidence that is tamper-evident and independently verifiable.",
  "Scalability goal: support single-address deep dives and multi-hundred-address bulk triage within the same engine.",
].forEach(t => children.push(bullet(t)));

children.push(h2("3.2 Intended Users"));
[
  "Cyber investigation teams and law-enforcement analysts.",
  "Compliance officers screening counterparties and transaction risk.",
  "Security researchers auditing unverified smart contracts.",
].forEach(t => children.push(bullet(t)));

children.push(h2("3.3 Scope"));
children.push(bodyPar("AXON focuses on behavioural blockchain investigation for Ethereum-compatible (EVM) networks in its current release, combining transaction analysis, smart-contract auditing, threat-intelligence correlation, and automated report generation into one workspace. Native address identification additionally covers Bitcoin, Solana, and TRON, though EVM currently carries the deepest behavioural scoring coverage."));
children.push(bodyPar("The platform is scoped as an evidence-preparation and triage layer: it accelerates the identification of behavioural anomalies and surfaces actionable leads — threat-corpus matches and exchange subpoena targets — but it does not perform real-world identity resolution, continuous surveillance, or autonomous legal action. Attribution of an address to an individual, and any legal conclusion drawn from a report, remains the responsibility of the human investigator."));
children.push(bodyPar("Outside the current scope: native behavioural scoring for Bitcoin, Solana, and TRON (address identification only at this stage), privacy-chain transaction analysis (Monero, shielded Zcash), and continuous real-time monitoring. These items are addressed in the Future Enhancements roadmap (Section 13)."));
children.push(...chapterSummary("This chapter defined AXON's objectives, intended users, and scope, establishing behavioural determination — rather than label lookup — as the platform's guiding principle. The next chapter details the system architecture that implements this approach."));

// ================= CHAPTER 4 =================
children.push(...chapterPage(4, "System Architecture"));
children.push(bodyPar("AXON is built as a modern web application with a clear separation between presentation, business logic, and data layers, allowing each layer to evolve independently as new blockchains and intelligence feeds are added. The overall architecture is illustrated in Figure 4.1."));
children.push(diagramBox(
  ["User", "\u2193", "Frontend (React)", "\u2193", "FastAPI Backend", "\u2193", "Behavioral Engine", "\u2193", "Threat Intelligence Corpus", "\u2193", "Database", "\u2193", "Report Engine"],
  "Sequential data flow from the investigator-facing React frontend, through the FastAPI orchestration layer and behavioural engine, into the threat corpus and database, before results are sealed by the reporting engine."
));
children.push(figureCaption("4.1", "Overall System Architecture"));

children.push(h2("4.1 Layers & Data Flow"));
[
  "Frontend — React 18 with TailwindCSS for the interface, D3.js for force-directed and Sankey network graphs, built with Vite and deployed on Netlify.",
  "Backend — Python 3.11+ with FastAPI and Uvicorn, providing the API layer that orchestrates investigations; deployed on Render.",
  "Database — SQLite, hosting the threat-intelligence corpus and the address-format reference table used for entity resolution.",
  "Reporting Engine — a dedicated ReportLab-based pipeline that converts investigation data into cryptographically-signed PDF dossiers.",
].forEach(t => children.push(bullet(t)));
children.push(bodyPar("As shown in Figure 4.1, a request enters through the frontend and is handled by the FastAPI backend, which fans out to the relevant blockchain and intelligence APIs, passes the normalised result through the behavioural engine and threat corpus, persists the outcome, and returns a structured payload that the frontend renders and the reporting engine can independently re-serialise into a signed document."));

children.push(h2("4.2 Technology Stack"));
children.push(bodyPar("FastAPI was chosen for its asynchronous request handling, which suits an application that fans out to several external intelligence APIs per investigation. React and D3.js were chosen because network-graph visualisation is central to the product — investigators need to see relationships, not just read tables. SQLite keeps the deployment lightweight while the intelligence corpus remains under a size where a heavier database would add operational overhead without benefit."));

children.push(h2("4.3 External Intelligence Sources"));
children.push(bodyPar("Table 4.1 summarises the external blockchain and intelligence services integrated into the investigation pipeline."));
children.push(simpleTable(
  ["Source", "Role in the Pipeline"],
  [
    ["Etherscan API v2", "Transaction history, contract source code and ABIs"],
    ["Alchemy RPC", "Live ERC-20 balances and on-chain state queries"],
    ["Forta Network", "Real-time third-party security alerts"],
    ["GoPlus Security", "Live contract risk signals — honeypots, hidden mints, admin backdoors"],
    ["Openchain (4-Byte)", "Decoding calldata on unverified contracts"],
    ["Groq / OpenRouter (Llama 3.1)", "Adversarial Analytical Engine — multi-agent reasoning layer"],
  ], [3000, 6500]));
children.push(tableCaption("4.1", "External Intelligence Sources"));
children.push(...chapterSummary("This chapter presented AXON's three-tier architecture, its constituent technology stack, and the external intelligence sources it integrates. Chapter 5 describes the investigation modules built on top of this architecture."));

// ================= CHAPTER 5 =================
children.push(...chapterPage(5, "Core System Modules"));
children.push(bodyPar("AXON is organised into four investigation modules. Each module is a distinct workflow an investigator opens; the analytical engines that power them are described separately in Chapter 6. Table 5.1 summarises the four modules."));
children.push(simpleTable(
  ["Module", "Purpose"],
  [
    ["Wallet Investigation", "Behavioural investigation of individual wallet addresses"],
    ["Smart Contract Investigation", "Security and forensic analysis of smart contracts"],
    ["Bulk Investigation", "Batch processing and prioritized triage of large address lists"],
    ["Case Management", "Organizing investigations and findings into complete, unified cases"],
  ], [3000, 6500]));
children.push(tableCaption("5.1", "Core Investigation Modules"));

children.push(h2("5.1 Wallet Investigation"));
children.push(bodyPar("Performs end-to-end forensic analysis of individual blockchain wallet addresses by retrieving on-chain activity, extracting behavioural indicators, correlating threat intelligence, calculating the composite threat score, visualising transaction relationships, and generating a structured investigation report."));

children.push(h2("5.2 Smart Contract Investigation"));
children.push(bodyPar("Performs automated forensic assessment of smart contracts through source-code inspection, vulnerability detection, protocol intelligence correlation, administrative privilege analysis, and behavioural assessment before producing a security-focused investigation report."));

children.push(h2("5.3 Bulk Investigation"));
children.push(bodyPar("Processes multiple wallet or contract addresses simultaneously, prioritises entities based on calculated threat scores, identifies behavioural similarities between addresses, and enables large-scale compliance or investigative triage."));

children.push(h2("5.4 Case Management"));
children.push(bodyPar("Consolidates findings from multiple investigations into a unified case workspace, preserving evidence, metadata, investigator observations, exported reports, and the overall investigation history."));
children.push(...chapterSummary("This chapter described AXON's four investigation modules, each representing a distinct workflow available to the investigator. Chapter 6 explains the shared analytical engines that power all four modules."));

// ================= CHAPTER 6 =================
children.push(...chapterPage(6, "Shared Analytical Engine"));
children.push(bodyPar("These are not modules an investigator opens directly — they are the engines that power all four modules described in Chapter 5."));

children.push(h3("1. Five-Layer Behavioral Engine — The Core Scoring Engine"));
children.push(bodyPar("The core analytical engine responsible for evaluating behavioral, relational, economic, attribution, and anomaly indicators. The engine combines weighted assessments from five independent analytical axes to generate the final Composite Threat Indicator and associated confidence level."));
children.push(bodyPar("The five-layer analytical engine evaluates behavioral, relational, economic, attribution, and anomaly indicators independently before synthesizing a consolidated Threat Indicator between 0 and 100, as illustrated in Figure 6.1."));
children.push(diagramBox(
  ["Wallet / Contract Address", "\u2193", "A1 \u2014 Behavioral Telemetry", "\u2193", "A2 \u2014 Graph Topology", "\u2193", "A3 \u2014 Economic Signals", "\u2193", "A4 \u2014 Attribution Intelligence", "\u2193", "A5 \u2014 Adversarial Analytical Engine", "\u2193", "Composite Threat Indicator (0\u2013100)"],
  "Sequential evaluation of the five weighted analytical axes, converging on a single Composite Threat Indicator score."
));
children.push(figureCaption("6.1", "Five-Layer Behavioural Engine Flow"));

children.push(bodyPar("Table 6.1 summarises the weighting and function of each analytical axis."));
children.push(simpleTable(
  ["Axis", "Name", "Weight", "What It Measures"],
  [
    ["A1", "Behavioural Telemetry", "30%", "Wallet age vs. transaction density — a burst of activity moments after creation suggests scripted behaviour."],
    ["A2", "Graph Topology", "25%", "Speed and direction of outbound funds; penalises peel chains, fan-out patterns, and cross-chain bridging."],
    ["A3", "Economic Signals", "20%", "Toxicity of one-hop counterparties — interaction with known exploiters or sanctioned entities raises the score."],
    ["A4", "Attribution Intelligence", "15%", "Exposure to mixers and privacy protocols, scaled to proportion of volume routed through them."],
    ["A5", "Adversarial Analytical Engine", "10%", "Cross-checks against the AXON threat corpus and third-party alert feeds such as Forta."],
  ], [900, 2400, 1200, 5000]));
children.push(tableCaption("6.1", "Five-Layer Behavioural Engine — Weight Distribution"));
children.push(bodyPar("A separate confidence calculation adjusts how much weight the final score is given: a wallet with only two transactions carries far less statistical confidence than one with a thousand, which prevents idle or near-empty wallets from being over- or under-scored."));

children.push(h3("2. Threat Intelligence Database — Corpus of Known Malicious Entities and Labels"));
children.push(bodyPar("Maintains structured intelligence on sanctioned entities, cryptocurrency exchanges, mixers, bridge protocols, exploit wallets, phishing addresses, and other known malicious infrastructure. The database is queried during every investigation to correlate observed blockchain activity with previously identified threat intelligence."));

children.push(h3("3. Address Identification Engine — Deterministic Chain and Format Detection"));
children.push(bodyPar("Automatically determines the blockchain network associated with a submitted address using deterministic validation techniques, including checksum verification and chain-specific address formats. This ensures investigations are routed through the correct analytical pipeline."));

children.push(h3("4. API Integration Layer — Orchestrates Calls to Etherscan, Alchemy, Forta, GoPlus, and Openchain"));
children.push(bodyPar("Coordinates communication with blockchain explorers, RPC providers, and threat intelligence services. It normalises externally collected data into a consistent internal representation before analysis begins."));

children.push(h3("5. AI Analysis Engine / Analytical Synthesis Engine — Adversarial, Multi-Agent Reasoning Layer"));
children.push(bodyPar("Combines behavioural observations and threat intelligence into a structured analytical assessment. Multiple reasoning passes are used to evaluate suspicious and benign explanations before producing the final investigation summary."));

children.push(h3("6. Reporting Engine — Converts Analytical Output into a Signed, Structured Forensic Report"));
children.push(bodyPar("Transforms completed investigations into structured forensic reports containing behavioral findings, supporting metadata, integrity information, and investigation summaries suitable for evidence documentation and analyst review."));
children.push(...chapterSummary("This chapter described the six shared engines — behavioural scoring, threat intelligence, address identification, API integration, adversarial synthesis, and reporting — that underpin every AXON module. Chapter 7 lists the concrete functionality investigators access through these engines."));

// ================= CHAPTER 7 =================
children.push(...chapterPage(7, "Core Functionality"));
children.push(bodyPar("These are the capabilities an investigator uses within the modules described in Chapter 5."));

children.push(h2("7.1 Analysis & Detection"));
[
  "Behavioural scoring and Composite Threat Indicator generation.",
  "Zero-day wallet detection — flagging threats with no prior label history.",
  "Threat intelligence corpus correlation.",
  "Address identification & deterministic chain detection (Ethereum, Bitcoin, Solana, TRON).",
  "Adversarial multi-agent synthesis — dual reasoning passes reconciled into one Executive Analytical Summary.",
  "Smart contract forensic audit — static vulnerability scanning, live honeypot/backdoor screening, and calldata signature decoding for unverified contracts.",
  "Bulk intelligence processing — prioritized, similarity-matrix triage of large address batches.",
  "Fund tracing & subpoena-target flagging — multi-hop forward tracing that terminates at a known KYC-verified entity.",
].forEach(t => children.push(bullet(t)));

children.push(h2("7.2 Visualization"));
[
  "Fund flow and counterparty network graphs (force-directed and Sankey, via D3.js).",
  "Timeline analysis of wallet activity.",
].forEach(t => children.push(bullet(t)));

children.push(h2("7.3 Evidence & Reporting"));
[
  "SHA-256 evidence integrity hashing computed from the sorted raw JSON payload.",
  "Cryptographically-signed PDF investigation reports.",
  "Executive Summary generation with Confidence Levels and explicit Source Attribution.",
  "Environmental metadata logging — engine version, threat-database timestamp, and active data sources per scan.",
].forEach(t => children.push(bullet(t)));
children.push(...chapterSummary("This chapter catalogued AXON's investigator-facing capabilities across analysis and detection, visualisation, and evidence and reporting. Chapter 8 describes how these capabilities are sequenced into a single investigation methodology."));

// ================= CHAPTER 8 =================
children.push(...chapterPage(8, "Investigation Methodology"));
children.push(bodyPar("Every investigation, whether a single wallet or a bulk batch, follows the same disciplined internal pipeline, moving from raw address input to a signed, distributable report, as illustrated in Figure 8.1."));
children.push(diagramBox(
  ["Address Input", "\u2193", "Blockchain Data Retrieval", "\u2193", "Feature Extraction & Enrichment", "\u2193", "Behavioral & Threat Analysis", "\u2193", "Risk Scoring", "\u2193", "Visualization", "\u2193", "Signed Investigation Report"],
  "End-to-end investigation pipeline from raw address input through data retrieval, enrichment, scoring, and visualisation to a signed final report."
));
children.push(figureCaption("8.1", "Investigation Workflow"));
children.push(bodyPar("As shown in Figure 8.1, address identification and blockchain retrieval populate the raw feature set; enrichment and the five-layer engine convert that raw data into behavioural indicators; threat-intelligence correlation and adversarial synthesis produce a plain-language assessment; and the result is visualised before being sealed into the final report."));
children.push(bodyPar("Every investigation executed by AXON follows a structured analytical workflow to ensure consistency across supported blockchain networks. The investigation begins with address validation and blockchain identification, after which transaction and metadata are collected through native blockchain APIs. The retrieved information is normalised into a common internal representation, allowing chain-independent behavioural analysis."));
children.push(bodyPar("The normalised dataset is processed by the Five-Layer Behavioural Analysis Engine, where multiple analytical dimensions including temporal activity, transaction topology, economic behaviour, attribution intelligence, and anomaly indicators are evaluated. The resulting findings are correlated with threat intelligence sources before being synthesised into a Composite Threat Indicator. Finally, the investigation is visualised and exported as a structured forensic investigation report containing analytical findings, supporting evidence, metadata, and integrity verification."));
children.push(bodyPar("The generated report is intended to support investigator decision-making, not to replace it.", { italics: true }));
children.push(...chapterSummary("This chapter traced the seven-stage investigation pipeline common to every AXON scan, from address input through to a signed final report. Chapter 9 describes how this pipeline is implemented across the frontend, backend, and reporting components."));

// ================= CHAPTER 9 =================
children.push(...chapterPage(9, "Implementation Overview"));
children.push(diagramBox(
  ["Frontend", "\u2193", "REST APIs", "\u2193", "Backend (FastAPI)", "\u2193", "Database", "\u2193", "External APIs", "\u2193", "Report Engine"],
  "Component integration diagram showing the decoupled path from the frontend through REST APIs, the FastAPI backend, database, external intelligence APIs, and the report engine."
));
children.push(figureCaption("9.1", "Implementation — Component Integration"));
children.push(bodyPar("As illustrated in Figure 9.1, the frontend communicates with the backend exclusively through versioned REST endpoints (for example, /scan/wallet, /scan/contract, /scan/bulk, and /cases), keeping the presentation layer fully decoupled from analytical logic. Incoming requests are handled asynchronously by FastAPI, which orchestrates external intelligence sources, persists results and corpus lookups to the database, and hands the finished analytical payload to the Reporting Engine for signing and PDF generation."));
children.push(bodyPar("This separation means a new blockchain or intelligence feed can be added by extending the backend orchestration layer without requiring any change to the frontend."));
children.push(bodyPar("Wallet investigations produce a twelve-section report, contract investigations produce nine sections, and bulk batches produce eight — any section with no data is omitted entirely rather than shown as a wall of blank fields. AXON follows modular client-server architecture."));
children.push(bodyPar("The frontend developed using React provides investigators with an interactive interface for wallet investigations, contract analysis, bulk investigations, and case management. User requests are processed by the FastAPI backend, which orchestrates blockchain data collection, behavioral analysis, threat intelligence correlation, and report generation."));
children.push(bodyPar("Each analytical module operates independently while sharing common services including the API Integration Layer, Threat Intelligence Database, Behavioral Analysis Engine, Analytical Synthesis Engine, and Reporting Engine. This modular architecture improves maintainability, scalability, and simplifies the integration of additional blockchain networks in future versions."));
children.push(...chapterSummary("This chapter described how AXON's architecture is realised in practice, from the decoupled REST interface to the modular backend services shared across all investigation types. Chapter 10 (Demonstration Results) presents the developed system in operation, continuing in the accompanying volume."));

// ---------- document assembly ----------
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 260 } } } }],
      },
      {
        reference: "num-list",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 260 } } } }],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA", space: 4 } },
            children: [new TextRun({ text: "AXON — Final Internship Report", size: 16, italics: true, font: FONT, color: "666666" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FONT })],
          })],
        }),
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  const outputPath = path.join(__dirname, "AXON_Formatted_Ch1-9.docx");
  fs.writeFileSync(outputPath, buf);
  console.log("done:", outputPath);
});
