// src/api/axon.js - API client for Axon Backend
const API_BASE = import.meta.env.VITE_API_URL || 'https://axon-backend-rf6y.onrender.com';

export const scanContract = async (address, caseId = null, depth = 'quick') => {
  const response = await fetch(`${API_BASE}/scan/contract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, depth, case_id: caseId })
  });
  if (!response.ok) throw new Error('Failed to scan contract');
  return response.json();
};

export const getAnalysisTask = async (taskId) => {
  const response = await fetch(`${API_BASE}/scan/analysis/${taskId}`);
  if (!response.ok) throw new Error('Failed to fetch analysis task status');
  return response.json();
};

export const checkApiHealth = async () => {
  const response = await fetch(`${API_BASE}/health/apis`);
  if (!response.ok) throw new Error('Failed to check API health');
  return response.json();
};

export const scanWallet = async (address, caseId = null, depth = 'quick') => {
  const response = await fetch(`${API_BASE}/scan/wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, depth, case_id: caseId })
  });
  if (!response.ok) throw new Error('Failed to scan wallet');
  return response.json();
};

export const scanDeepDive = async (entityType, evidenceContext) => {
  const response = await fetch(`${API_BASE}/scan/deep-dive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_type: entityType, evidence_context: evidenceContext })
  });
  if (!response.ok) throw new Error('Failed to run deep dive analysis');
  return response.json();
};

export const getGraph = async (address, hops = 2) => {
  const response = await fetch(`${API_BASE}/graph/${address}?hops=${hops}`);
  if (!response.ok) throw new Error('Failed to fetch graph');
  return response.json();
};

export const getCrossChainHoldings = async (address) => {
  const response = await fetch(`${API_BASE}/scan/wallet/${address}/cross-chain-holdings`);
  if (!response.ok) throw new Error('Failed to fetch cross-chain holdings');
  return response.json();
};

export const resolveChain = async (address) => {
  const response = await fetch(`${API_BASE}/scan/chain-resolution/${address}`);
  if (!response.ok) throw new Error('Failed to resolve chain');
  return response.json();
};

/** Deterministic address format analysis — regex + checksum, no LLM. */
export const analyzeAddressFormat = async (address) => {
  const response = await fetch(`${API_BASE}/scan/chain-resolution/${address}`);
  if (!response.ok) throw new Error('Failed to analyze address format');
  return response.json();
};

/** @deprecated Use analyzeAddressFormat */
export const resolveChainAI = analyzeAddressFormat;

export const getIntelWallets = async (query = '', page = 1, limit = 50, category = '', threat = '') => {
  const params = new URLSearchParams({ q: query, page, limit, category, threat });
  const response = await fetch(`${API_BASE}/intel/wallets?${params}`);
  if (!response.ok) throw new Error('Failed to fetch intel wallets');
  return response.json();
};

export const getIntelExchanges = async (query = '') => {
  const response = await fetch(`${API_BASE}/intel/exchanges?q=${query}`);
  if (!response.ok) throw new Error('Failed to fetch exchanges');
  return response.json();
};

export const getIntelMixers = async (query = '') => {
  const response = await fetch(`${API_BASE}/intel/mixers?q=${query}`);
  if (!response.ok) throw new Error('Failed to fetch mixers');
  return response.json();
};

export const getIntelThreats = async (query = '') => {
  const response = await fetch(`${API_BASE}/intel/threats?q=${query}`);
  if (!response.ok) throw new Error('Failed to fetch threat actors');
  return response.json();
};

export const getIntelBridges = async (query = '') => {
  const response = await fetch(`${API_BASE}/intel/bridges?q=${query}`);
  if (!response.ok) throw new Error('Failed to fetch bridges');
  return response.json();
};

export const getIntelStats = async () => {
  const response = await fetch(`${API_BASE}/intel/stats`);
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
};

export const getAddressFormats = async (query = '', family = '', supported = '') => {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (family) params.set('family', family);
  if (supported) params.set('supported', supported);
  const response = await fetch(`${API_BASE}/address-formats/?${params}`);
  if (!response.ok) throw new Error('Failed to fetch address formats');
  return response.json();
};

export const bulkScan = async (addresses, caseId = null) => {
  const response = await fetch(`${API_BASE}/scan/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addresses, case_id: caseId })
  });
  if (!response.ok) throw new Error('Failed to run bulk scan');
  return response.json();
};

export const createCase = async (title, description = '', priority = 'P2', category = 'General', assignedTo = '', tags = []) => {
  const response = await fetch(`${API_BASE}/cases/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, priority, category, assigned_to: assignedTo, tags })
  });
  if (!response.ok) throw new Error('Failed to create case');
  return response.json();
};

export const listCases = async () => {
  const response = await fetch(`${API_BASE}/cases/`);
  if (!response.ok) throw new Error('Failed to list cases');
  return response.json();
};


export const getCase = async (caseId) => {
  const response = await fetch(`${API_BASE}/cases/${caseId}`);
  if (!response.ok) throw new Error("Failed to fetch case");
  return response.json();
};

export const updateCase = async (caseId, data) => {
  const response = await fetch(`${API_BASE}/cases/${caseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Failed to update case");
  return response.json();
};

export const deleteCase = async (caseId) => {
  const response = await fetch(`${API_BASE}/cases/${caseId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error("Failed to delete case");
  return response.json();
};

export const addCaseNote = async (caseId, content) => {
  const response = await fetch(`${API_BASE}/cases/${caseId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  if (!response.ok) throw new Error("Failed to add case note");
  return response.json();
};

export const linkCaseEntity = async (caseId, investigationLogId, notes = "") => {
  const response = await fetch(`${API_BASE}/cases/${caseId}/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investigation_log_id: investigationLogId, notes })
  });
  if (!response.ok) throw new Error("Failed to link case entity");
  return response.json();
};

export const removeCaseEntity = async (caseId, logId) => {
  const response = await fetch(`${API_BASE}/cases/${caseId}/entities/${logId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error("Failed to remove case entity");
  return response.json();
};

export const getCaseTimeline = async (caseId) => {
  const response = await fetch(`${API_BASE}/cases/${caseId}/timeline`);
  if (!response.ok) throw new Error("Failed to fetch case timeline");
  return response.json();
};

// ─── LOGS ────────────────────────────────────────────────────────────────────

export const searchLogs = async (query = "", page = 1, perPage = 25, entityType = "", riskLevel = "") => {
  const params = new URLSearchParams({ q: query, page, per_page: perPage });
  if (entityType) params.set("entity_type", entityType);
  if (riskLevel) params.set("risk_level", riskLevel);
  const response = await fetch(`${API_BASE}/logs/search?${params}`);
  if (!response.ok) throw new Error("Failed to search logs");
  return response.json();
};

// ─── CASE LOGS + MASTER REPORT ───────────────────────────────────────────────

export const getCaseLogs = async (caseId) => {
  const response = await fetch(`${API_BASE}/cases/${caseId}/logs`);
  if (!response.ok) throw new Error("Failed to fetch case logs");
  return response.json();
};

export const generateMasterReport = async (caseId) => {
  const response = await fetch(`${API_BASE}/cases/${caseId}/master-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to generate master report");
  return response.json();
};
