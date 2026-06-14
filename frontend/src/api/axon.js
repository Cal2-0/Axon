// src/api/axon.js - API client for Axon Backend
const API_BASE = "http://localhost:8001";

export const scanContract = async (address) => {
  const response = await fetch(`${API_BASE}/scan/contract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });
  if (!response.ok) throw new Error("Failed to scan contract");
  return response.json();
};

export const getAnalysisTask = async (taskId) => {
  const response = await fetch(`${API_BASE}/scan/analysis/${taskId}`);
  if (!response.ok) throw new Error("Failed to fetch analysis task status");
  return response.json();
};

export const checkApiHealth = async () => {
  const response = await fetch(`${API_BASE}/health/apis`);
  if (!response.ok) throw new Error("Failed to check API health");
  return response.json();
};

export const scanWallet = async (address) => {
  const response = await fetch(`${API_BASE}/scan/wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });
  if (!response.ok) throw new Error("Failed to scan wallet");
  return response.json();
};

export const getGraph = async (address, hops = 2) => {
  const response = await fetch(`${API_BASE}/graph/${address}?hops=${hops}`);
  if (!response.ok) throw new Error("Failed to fetch graph");
  return response.json();
};

export const getIntelWallets = async (query = "", page = 1, limit = 50, category = "", threat = "") => {
  const params = new URLSearchParams({ q: query, page, limit, category, threat });
  const response = await fetch(`${API_BASE}/intel/wallets?${params}`);
  if (!response.ok) throw new Error("Failed to fetch intel wallets");
  return response.json();
};

export const getIntelExchanges = async (query = "") => {
  const response = await fetch(`${API_BASE}/intel/exchanges?q=${query}`);
  if (!response.ok) throw new Error("Failed to fetch exchanges");
  return response.json();
};

export const getIntelMixers = async (query = "") => {
  const response = await fetch(`${API_BASE}/intel/mixers?q=${query}`);
  if (!response.ok) throw new Error("Failed to fetch mixers");
  return response.json();
};

export const getIntelThreats = async (query = "") => {
  const response = await fetch(`${API_BASE}/intel/threats?q=${query}`);
  if (!response.ok) throw new Error("Failed to fetch threat actors");
  return response.json();
};

export const getIntelStats = async () => {
  const response = await fetch(`${API_BASE}/intel/stats`);
  if (!response.ok) throw new Error("Failed to fetch intel stats");
  return response.json();
};
