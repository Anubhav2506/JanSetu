// JanSetu — API call wrappers for Cloud Functions / Client-side Agents
// All Gemini calls go through client-side fallback in production to support credit-card-free deployment.

import { auth } from './firebase';
import { 
  triageAgentClient, 
  coiAgentClient, 
  escalationAgentClient, 
  verificationAgentClient 
} from './agents';

const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL || '';

function functionUrl(name) {
  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Port 5001 is the default port for Firebase functions emulator
    return `http://127.0.0.1:5001/jansetu-dev/us-central1/${name}`;
  }
  const baseUrl = FUNCTIONS_BASE_URL.replace(/\/$/, '');
  return baseUrl ? `${baseUrl}/${name}` : `/${name}`;
}

async function buildHeaders({ requireAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = await auth.currentUser?.getIdToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new Error('Officer login required.');
  }

  return headers;
}

/**
 * Submit a civic issue — calls the Triage Agent (either Cloud Function or Client-side).
 * @param {Object} payload - { text: string, imageBase64?: string, location?: {lat, lng} }
 * @returns {Promise<Object>} - { ticket_id, category, severity, location_text, ... }
 */
export async function submitIssue(payload) {
  if (import.meta.env.PROD || !import.meta.env.VITE_USE_BACKEND_EMULATOR) {
    return triageAgentClient(
      payload.text, 
      payload.imageBase64, 
      payload.imageMimeType, 
      payload.location, 
      payload.reporterUID
    );
  }

  const response = await fetch(functionUrl('triageAgent'), {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Triage Agent error: ${response.status}`);
  return response.json();
}

/**
 * Run the COI / Insight Agent (either Cloud Function or Client-side).
 * @returns {Promise<Object>} - { zones: [...], clusters: [...] }
 */
export async function runCOIAgent() {
  if (import.meta.env.PROD || !import.meta.env.VITE_USE_BACKEND_EMULATOR) {
    return coiAgentClient();
  }

  const response = await fetch(functionUrl('coiAgent'), {
    method: 'POST',
    headers: await buildHeaders({ requireAuth: true }),
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`COI Agent error: ${response.status}`);
  return response.json();
}

/**
 * Trigger the Escalation Agent (either Cloud Function or Client-side).
 * @returns {Promise<Object>} - { escalated: [...] }
 */
export async function runEscalationAgent() {
  if (import.meta.env.PROD || !import.meta.env.VITE_USE_BACKEND_EMULATOR) {
    return escalationAgentClient();
  }

  const response = await fetch(functionUrl('escalationAgent'), {
    method: 'POST',
    headers: await buildHeaders({ requireAuth: true }),
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Escalation Agent error: ${response.status}`);
  return response.json();
}

/**
 * Mark an issue resolved + trigger Verification Agent.
 * @param {string} issueId - The Firestore issue document ID
 * @param {string} resolutionImageBase64 - Base64 encoded resolution proof image
 * @returns {Promise<Object>} - { verdict: 'VERIFIED' | 'DISPUTED', confidence, reasoning }
 */
export async function resolveIssue(issueId, resolutionImageBase64, resolutionImageMimeType) {
  if (import.meta.env.PROD || !import.meta.env.VITE_USE_BACKEND_EMULATOR) {
    const officerUID = auth.currentUser?.uid || 'officer';
    return verificationAgentClient(issueId, resolutionImageBase64, resolutionImageMimeType, officerUID);
  }

  const response = await fetch(functionUrl('verificationAgent'), {
    method: 'POST',
    headers: await buildHeaders({ requireAuth: true }),
    body: JSON.stringify({ issueId, resolutionImageBase64, resolutionImageMimeType }),
  });
  if (!response.ok) throw new Error(`Verification Agent error: ${response.status}`);
  return response.json();
}
