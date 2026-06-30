// JanSetu — Firestore Schema Documentation
// This file is the canonical reference for all Firestore collections.
// READ THIS before writing any Firestore queries or agent code.

/**
 * ════════════════════════════════════════════════════════
 * COLLECTION: issues
 * ════════════════════════════════════════════════════════
 * Primary data store. One document per civic issue reported.
 *
 * Auto-populated fields (set by Cloud Functions):
 *   - category, severity, location_coords → Triage Agent
 *   - cluster_id → Dedup Agent
 *   - coi_score → COI Agent
 *   - verification_status → Verification Agent
 *   - escalation_letter_drafted → Escalation Agent
 *
 * Fields writable from frontend (anonymous citizens):
 *   - raw_input, image_url, location_text, created_at
 */
export const ISSUE_SCHEMA = {
  issue_id:                  'auto',        // Firestore document ID
  raw_input:                 'string',      // Original text/voice transcript (≤500 chars)
  category:                  'string',      // Triage Agent → water_leak|pothole|garbage_dump|streetlight_broken|drain_blocked|road_damage|tree_fallen|illegal_construction|other
  severity:                  'number',      // Triage Agent → 1 (minor) to 5 (critical)
  location_text:             'string',      // Triage Agent → extracted landmark name
  location_coords: {
    lat:                     'number',
    lng:                     'number',
  },
  cluster_id:                'string|null', // Dedup Agent → null until assigned
  status:                    'string',      // open | in_progress | resolved | disputed | escalated
  sla_deadline:              'timestamp',   // created_at + 72 hours (auto-set by Triage Agent)
  created_at:                'timestamp',
  updated_at:                'timestamp',
  image_url:                 'string|null', // Firebase Storage URL for issue photo
  resolution_image_url:      'string|null', // Firebase Storage URL for resolution proof
  verification_status:       'string|null', // null | verified | disputed
  coi_score:                 'number',      // COI Agent → 0.0–1.0 priority score
  escalation_letter_drafted: 'boolean',
  ledger_published:          'boolean',
  reporter_uid:              'string',      // Firebase Anonymous Auth UID
  zone:                      'string',      // Derived from location — Sector 12, Phase 7, etc.
  infrastructure_type:       'string',      // Triage Agent → water|road|electricity|waste|structure
  language_detected:         'string',      // Triage Agent → en|hi|pa etc.
};

/**
 * ════════════════════════════════════════════════════════
 * COLLECTION: clusters
 * ════════════════════════════════════════════════════════
 * Groups of related issues in the same area.
 * Created/updated by the Dedup Agent.
 * Scored by the COI Agent.
 */
export const CLUSTER_SCHEMA = {
  cluster_id:         'auto',     // Firestore document ID
  zone:               'string',   // Geographic zone identifier
  issue_type:         'string',   // Primary category for this cluster
  member_issue_ids:   'string[]', // Array of issue_id strings
  total_reports:      'number',   // Count of issues in cluster
  avg_severity:       'number',   // Average severity across member issues
  coi_estimate:       'number',   // COI Agent → estimated cost/impact score
  risk_level:         'string',   // high | medium | low
  pattern_description:'string',   // COI Agent → human-readable pattern summary
  risk_geojson:       'object',   // GeoJSON polygon for map overlay
  created_at:         'timestamp',
  updated_at:         'timestamp',
};

/**
 * ════════════════════════════════════════════════════════
 * COLLECTION: ledger
 * ════════════════════════════════════════════════════════
 * Immutable public audit trail. Write-only via Cloud Functions.
 * Never deleted. Public read, system-only write.
 */
export const LEDGER_SCHEMA = {
  ledger_id:    'auto',      // Firestore document ID
  issue_id:     'string',    // Reference to issues collection
  event_type:   'string',    // submitted | escalated | resolved | disputed | verified
  timestamp:    'timestamp',
  description:  'string',    // Human-readable event description
  actor:        'string',    // system | officer_uid | citizen_uid
  metadata:     'object',    // Event-specific data (letter_text, verdict, etc.)
  is_public:    'boolean',   // Always true for ledger entries
};

/**
 * ════════════════════════════════════════════════════════
 * COLLECTION: users
 * ════════════════════════════════════════════════════════
 * Officers only — citizens use anonymous auth, no user doc.
 */
export const USER_SCHEMA = {
  user_id:       'string',   // Firebase Auth UID
  role:          'string',   // citizen | officer
  name:          'string',
  email:         'string',   // Officers only
  assigned_zone: 'string',   // Officers only — which zone they manage
  created_at:    'timestamp',
};

/**
 * ════════════════════════════════════════════════════════
 * ISSUE STATUS FLOW
 * ════════════════════════════════════════════════════════
 *
 *   submitted → open → in_progress → resolved (officer marks done)
 *                   ↓                    ↓
 *               escalated            verified (Verification Agent)
 *                                    disputed (Verification Agent — issue not fixed)
 *
 * SLA thresholds:
 *   severity 5 (critical): 24 hours
 *   severity 4 (high):     48 hours
 *   severity 3 (medium):   72 hours
 *   severity 1-2 (low):    96 hours
 */
export const SLA_HOURS = {
  5: 24,
  4: 48,
  3: 72,
  2: 96,
  1: 96,
};

/**
 * ════════════════════════════════════════════════════════
 * FIRESTORE INDEXES REQUIRED
 * ════════════════════════════════════════════════════════
 * Create these composite indexes in Firebase Console:
 *
 * 1. issues: zone ASC + status ASC + created_at DESC
 * 2. issues: status ASC + sla_deadline ASC  (for Escalation Agent)
 * 3. issues: coi_score DESC + status ASC    (for Admin Dashboard ranking)
 * 4. issues: reporter_uid ASC + created_at DESC (for citizen status)
 * 5. clusters: zone ASC + risk_level ASC
 * 6. ledger: issue_id ASC + timestamp DESC
 * 7. ledger: timestamp DESC                 (for Public Ledger timeline)
 */
export const REQUIRED_INDEXES = [
  { collection: 'issues',   fields: ['zone ASC', 'status ASC', 'created_at DESC'] },
  { collection: 'issues',   fields: ['status ASC', 'sla_deadline ASC'] },
  { collection: 'issues',   fields: ['coi_score DESC', 'status ASC'] },
  { collection: 'issues',   fields: ['reporter_uid ASC', 'created_at DESC'] },
  { collection: 'clusters', fields: ['zone ASC', 'risk_level ASC'] },
  { collection: 'ledger',   fields: ['issue_id ASC', 'timestamp DESC'] },
  { collection: 'ledger',   fields: ['timestamp DESC'] },
];

/**
 * ════════════════════════════════════════════════════════
 * ISSUE CATEGORIES
 * ════════════════════════════════════════════════════════
 */
export const ISSUE_CATEGORIES = {
  water_leak:           { label: 'Water Leak',           icon: '💧', color: '#2980b9' },
  pothole:              { label: 'Pothole',               icon: '🕳️', color: '#e67e22' },
  garbage_dump:         { label: 'Garbage Dump',          icon: '🗑️', color: '#27ae60' },
  streetlight_broken:   { label: 'Broken Streetlight',    icon: '💡', color: '#f39c12' },
  drain_blocked:        { label: 'Blocked Drain',         icon: '🚧', color: '#8e44ad' },
  road_damage:          { label: 'Road Damage',           icon: '🛣️', color: '#e74c3c' },
  tree_fallen:          { label: 'Fallen Tree',           icon: '🌳', color: '#1e7a4a' },
  illegal_construction: { label: 'Illegal Construction',  icon: '🏗️', color: '#c0392b' },
  other:                { label: 'Other',                 icon: '📋', color: '#7f8c8d' },
};
