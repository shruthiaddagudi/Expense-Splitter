/**
 * config.js — Central API Configuration
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for the backend URL.
 * To switch between development and production, change API_BASE_URL here.
 *
 * Production  → https://expense-splitter-production-3448.up.railway.app
 * Development → http://localhost:5000
 */

const API_BASE_URL = "https://expense-splitter-production-3448.up.railway.app";

// All pages use ${API} in their fetch() calls — this variable name must stay as API
const API = `${API_BASE_URL}/api`;
