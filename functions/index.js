// JanSetu — Cloud Functions Index
// ════════════════════════════════════════════════════════
// All function exports live here.
// Gemini API key loaded from Firebase Functions config (NEVER from .env committed to git).
// Set with: firebase functions:config:set gemini.api_key="YOUR_KEY"
// Access as: process.env.GEMINI_API_KEY (v2 functions use process.env directly)

'use strict';

const admin = require('firebase-admin');

// Initialize Firebase Admin (only once across all functions)
if (!admin.apps.length) {
  admin.initializeApp();
}

const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

const { triageAgent }      = require('./agents/triageAgent');
const { dedupAgent }       = require('./agents/dedupAgent');
const { escalationAgent }  = require('./agents/escalationAgent');
const { coiAgent }         = require('./agents/coiAgent');
const { verificationAgent } = require('./agents/verificationAgent');

// ── HTTPS Callable Functions ─────────────────────────────────────────

/**
 * Triage Agent — POST /triageAgent
 * Input: { text, imageBase64?, location?, reporterUID }
 * Output: { ticket_id, category, severity, location_text, location_coords, sla_deadline }
 */
exports.triageAgent = onRequest(
  { timeoutSeconds: 60, memory: '256MiB', region: 'us-central1' },
  triageAgent
);

/**
 * Dedup Agent — POST /dedupAgent
 * Input: { issueId }
 * Output: { decision, cluster_id, confidence, reasoning }
 */
exports.dedupAgent = onRequest(
  { timeoutSeconds: 60, memory: '256MiB', region: 'us-central1' },
  dedupAgent
);

/**
 * Escalation Agent — POST /escalationAgent
 * Input: {} (scans all SLA-breached open tickets)
 * Output: { escalated: [...], total }
 * Also triggered on schedule (every 6 hours)
 */
exports.escalationAgent = onRequest(
  { timeoutSeconds: 120, memory: '512MiB', region: 'us-central1' },
  escalationAgent
);

/**
 * Escalation Agent Scheduled — runs every 6 hours automatically
 */
exports.escalationAgentScheduled = onSchedule(
  { schedule: 'every 6 hours', timeoutSeconds: 120, memory: '512MiB', region: 'us-central1' },
  async (_event) => {
    console.log('Scheduled escalation check running...');
    // Create a mock req/res to reuse the same logic
    const mockReq = { method: 'POST', body: {}, internal: true };
    const mockRes = {
      status: (code) => ({ json: (data) => console.log(`Escalation result (${code}):`, JSON.stringify(data)) }),
    };
    await escalationAgent(mockReq, mockRes);
  }
);

/**
 * COI Agent — POST /coiAgent
 * Input: {} (analyzes all zones)
 * Output: { zones: [...], total_zones_analyzed }
 */
exports.coiAgent = onRequest(
  { timeoutSeconds: 120, memory: '512MiB', region: 'us-central1' },
  coiAgent
);

/**
 * Verification Agent — POST /verificationAgent
 * Input: { issueId, resolutionImageBase64, officerUID }
 * Output: { verdict, confidence, reasoning, visible_changes }
 */
exports.verificationAgent = onRequest(
  { timeoutSeconds: 60, memory: '512MiB', region: 'us-central1' },
  verificationAgent
);
