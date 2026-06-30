// JanSetu — Seed Script (S04)
// ════════════════════════════════════════════════════════
// Generates 75 realistic synthetic civic issues in Firebase.
// Run ONCE against jansetu-dev. Run again (clean DB) for jansetu-prod.
//
// Usage:
//   node functions/seed/seedData.js
//
// Requirements:
//   - Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path
//   - OR run: firebase login && node this script (uses ADC)

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    // Uses Application Default Credentials
    // Run: gcloud auth application-default login
    // OR set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
  });
}

const db = admin.firestore();

// ── Realistic civic issue templates ─────────────────────────────────
const ZONES = [
  'Sector 12', 'Sector 17', 'Sector 22', 'Phase 7',
  'Industrial Area', 'Sector 34', 'Panchkula Sector 6', 'Mohali Phase 8'
];

const ISSUE_TEMPLATES = [
  // Water issues
  { category: 'water_leak', severity: 4, infrastructure_type: 'water',
    raw_input: 'pipe bahar school ke paas toot gayi, pani barbaad ho raha hai',
    summary: 'Burst water pipe near government school, severe water wastage',
    language_detected: 'hi' },
  { category: 'water_leak', severity: 3, infrastructure_type: 'water',
    raw_input: 'Water pipeline leaking near the main market, road getting flooded',
    summary: 'Water pipeline leak causing road flooding near market',
    language_detected: 'en' },
  { category: 'water_leak', severity: 5, infrastructure_type: 'water',
    raw_input: 'pani ki pipe phati hui hai, pura mohalla pani me dooba hua hai',
    summary: 'Major pipe burst — entire neighbourhood flooded',
    language_detected: 'hi' },
  { category: 'drain_blocked', severity: 3, infrastructure_type: 'water',
    raw_input: 'naali band hai, pani sadak pe aa gaya hai',
    summary: 'Blocked drain causing water overflow onto road',
    language_detected: 'hi' },
  { category: 'drain_blocked', severity: 4, infrastructure_type: 'water',
    raw_input: 'Drainage system completely choked after rains, sewage on street',
    summary: 'Choked drainage with sewage overflow after rain',
    language_detected: 'en' },

  // Road issues
  { category: 'pothole', severity: 4, infrastructure_type: 'road',
    raw_input: 'sadak mein bahut bada gaddha hai, kai accidents ho chuke hain',
    summary: 'Large dangerous pothole on main road, multiple accidents reported',
    language_detected: 'hi' },
  { category: 'pothole', severity: 3, infrastructure_type: 'road',
    raw_input: 'Multiple potholes on the road near bus stop, very dangerous at night',
    summary: 'Multiple potholes near bus stop, dangerous for commuters',
    language_detected: 'en' },
  { category: 'pothole', severity: 2, infrastructure_type: 'road',
    raw_input: 'chhota gaddha hai but badh sakta hai agr theek nahi kiya',
    summary: 'Small pothole that needs filling before worsening',
    language_detected: 'hi' },
  { category: 'road_damage', severity: 5, infrastructure_type: 'road',
    raw_input: 'sadak bilkul toot gayi hai, vehicles nahi nikal sakte',
    summary: 'Road completely broken, vehicles unable to pass',
    language_detected: 'hi' },
  { category: 'road_damage', severity: 4, infrastructure_type: 'road',
    raw_input: 'Road surface completely broken near school, students at risk',
    summary: 'Road surface severely damaged near school zone',
    language_detected: 'en' },
  { category: 'road_damage', severity: 3, infrastructure_type: 'road',
    raw_input: 'subah hoti hai baarish toh road pe pairs bann jaate hain',
    summary: 'Road develops puddles every rain — surface damage',
    language_detected: 'hi' },

  // Electricity issues
  { category: 'streetlight_broken', severity: 3, infrastructure_type: 'electricity',
    raw_input: 'bijli ka khamba gir gaya, koi bhi uthane nahi aaya',
    summary: 'Electricity pole fallen down, not attended for days',
    language_detected: 'hi' },
  { category: 'streetlight_broken', severity: 2, infrastructure_type: 'electricity',
    raw_input: 'Street light at the corner not working for 2 weeks, area very dark at night',
    summary: 'Corner streetlight non-functional for 2 weeks',
    language_detected: 'en' },
  { category: 'streetlight_broken', severity: 3, infrastructure_type: 'electricity',
    raw_input: 'raat ko andhera bahut hota hai, 4 lights nahi jal rahi',
    summary: '4 streetlights non-functional, road dangerous at night',
    language_detected: 'hi' },
  { category: 'streetlight_broken', severity: 4, infrastructure_type: 'electricity',
    raw_input: 'Exposed live wire hanging from broken pole near playground, children at risk',
    summary: 'Live wire exposed near children playground — critical safety risk',
    language_detected: 'en' },

  // Garbage/Waste
  { category: 'garbage_dump', severity: 3, infrastructure_type: 'waste',
    raw_input: 'kuda pile hain, kabse uthaya nahi gaya, bahut badsbu aa rahi hai',
    summary: 'Garbage not collected for weeks, foul smell in neighbourhood',
    language_detected: 'hi' },
  { category: 'garbage_dump', severity: 4, infrastructure_type: 'waste',
    raw_input: 'Illegal dumping ground has grown, blocking road access to market',
    summary: 'Illegal garbage dump blocking road access to market',
    language_detected: 'en' },
  { category: 'garbage_dump', severity: 2, infrastructure_type: 'waste',
    raw_input: 'dustbin toot gayi hai, kachre ka dheer lag gaya hai uske aas paas',
    summary: 'Broken dustbin causing garbage accumulation around it',
    language_detected: 'hi' },
  { category: 'garbage_dump', severity: 3, infrastructure_type: 'waste',
    raw_input: 'Park mein kuda aur kachre ki problem hai, bacchon ko khel nahi sakte',
    summary: 'Garbage in public park prevents children from playing',
    language_detected: 'hi' },

  // Structure issues
  { category: 'tree_fallen', severity: 4, infrastructure_type: 'structure',
    raw_input: 'bada pedh gir gaya hai, sadak par rakhha hai, aane jaane mein problem',
    summary: 'Large tree fallen on road, blocking traffic',
    language_detected: 'hi' },
  { category: 'tree_fallen', severity: 5, infrastructure_type: 'structure',
    raw_input: 'Tree fell on power line after storm, sparks visible, very dangerous',
    summary: 'Storm-fallen tree on power line causing electrical sparks',
    language_detected: 'en' },
  { category: 'illegal_construction', severity: 3, infrastructure_type: 'structure',
    raw_input: 'Unauthorized construction blocking the footpath, pedestrians using road',
    summary: 'Illegal construction blocking footpath, forcing pedestrians onto road',
    language_detected: 'en' },
  { category: 'illegal_construction', severity: 2, infrastructure_type: 'structure',
    raw_input: 'park ki jagah par koi dikaan bana raha hai bina permission ke',
    summary: 'Unauthorized shop being built on park land',
    language_detected: 'hi' },
];

// ── Base coordinates (Chandigarh/Mohali area) ────────────────────────
const BASE_COORDS = {
  'Sector 12':           { lat: 30.7333, lng: 76.7794 },
  'Sector 17':           { lat: 30.7412, lng: 76.7802 },
  'Sector 22':           { lat: 30.7202, lng: 76.7689 },
  'Phase 7':             { lat: 30.7080, lng: 76.6912 },
  'Industrial Area':     { lat: 30.7018, lng: 76.7124 },
  'Sector 34':           { lat: 30.7235, lng: 76.7823 },
  'Panchkula Sector 6':  { lat: 30.6942, lng: 76.8600 },
  'Mohali Phase 8':      { lat: 30.7194, lng: 76.6601 },
};

// ── Utility: random float in range ───────────────────────────────────
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function randInt(min, max) {
  return Math.floor(randFloat(min, max + 1));
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

// ── Generate a random date within the last N days ────────────────────
function randomPastDate(maxDaysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, maxDaysAgo));
  d.setHours(randInt(6, 22), randInt(0, 59), 0, 0);
  return d;
}

// ── Status distribution: 40% open, 30% resolved, 15% in_progress, 10% escalated, 5% disputed ──
const STATUS_DIST = [
  ...Array(40).fill('open'),
  ...Array(30).fill('resolved'),
  ...Array(15).fill('in_progress'),
  ...Array(10).fill('escalated'),
  ...Array(5).fill('disputed'),
];

// ── SLA deadline based on severity ──────────────────────────────────
function slaHoursForSeverity(sev) {
  return { 5: 24, 4: 48, 3: 72, 2: 96, 1: 96 }[sev] || 72;
}

// ── Main seed function ───────────────────────────────────────────────
async function seedDatabase() {
  console.log('\n🌱 JanSetu Seed Script Starting...\n');

  const batch = db.batch();
  const issueIds = [];
  const clusterMap = {}; // zone+category -> issue IDs
  const clusterMeta = {};

  // ── Create 75 issues ────────────────────────────────────────────
  for (let i = 0; i < 75; i++) {
    const template = pick(ISSUE_TEMPLATES);
    const zone = pick(ZONES);
    const base = BASE_COORDS[zone];
    const createdAt = randomPastDate(30);
    const slaHours = slaHoursForSeverity(template.severity);
    const slaDeadline = new Date(createdAt);
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);

    const status = pick(STATUS_DIST);

    // Cluster key
    const clusterKey = `${zone}::${template.category}`;
    if (!clusterMap[clusterKey]) clusterMap[clusterKey] = [];
    clusterMeta[clusterKey] = { zone, category: template.category };

    const issueRef = db.collection('issues').doc();
    const issueData = {
      issue_id:                  issueRef.id,
      raw_input:                 template.raw_input,
      category:                  template.category,
      severity:                  template.severity,
      summary:                   template.summary,
      location_text:             `${zone}, Chandigarh/Mohali area`,
      location_coords: {
        lat: base.lat + randFloat(-0.005, 0.005),
        lng: base.lng + randFloat(-0.005, 0.005),
      },
      zone,
      infrastructure_type:       template.infrastructure_type,
      language_detected:         template.language_detected,
      status,
      cluster_id:                null, // filled after cluster creation
      sla_deadline:              admin.firestore.Timestamp.fromDate(slaDeadline),
      created_at:                admin.firestore.Timestamp.fromDate(createdAt),
      updated_at:                admin.firestore.Timestamp.fromDate(createdAt),
      image_url:                 null,
      resolution_image_url:      status === 'resolved' || status === 'disputed' ? 'https://placehold.co/400x300' : null,
      verification_status:       status === 'resolved' ? 'verified' : status === 'disputed' ? 'disputed' : null,
      coi_score:                 randFloat(0.1, 0.9),
      escalation_letter_drafted: status === 'escalated',
      ledger_published:          status !== 'open' && status !== 'processing',
      reporter_uid:              `citizen_seed_${randInt(1, 10)}`,
    };

    batch.set(issueRef, issueData);
    clusterMap[clusterKey].push(issueRef.id);
    issueIds.push({ id: issueRef.id, zone, category: template.category, clusterKey });
  }

  await batch.commit();
  console.log(`✅ Created 75 issues across ${ZONES.length} zones`);

  // ── Create clusters ────────────────────────────────────────────
  const clusterBatch = db.batch();
  const clusterIdMap = {};

  for (const [key, memberIds] of Object.entries(clusterMap)) {
    if (memberIds.length === 0) continue;
    const { zone, category } = clusterMeta[key];

    const clusterRef = db.collection('clusters').doc();
    clusterIdMap[key] = clusterRef.id;

    const riskLevel = memberIds.length >= 8 ? 'high' : memberIds.length >= 4 ? 'medium' : 'low';
    const base = BASE_COORDS[zone] || { lat: 30.73, lng: 76.78 };

    clusterBatch.set(clusterRef, {
      cluster_id:          clusterRef.id,
      zone,
      issue_type:          category,
      member_issue_ids:    memberIds,
      total_reports:       memberIds.length,
      avg_severity:        randFloat(2, 4.5),
      coi_estimate:        randInt(15, 85),
      risk_level:          riskLevel,
      pattern_description: `Recurring ${category.replace(/_/g, ' ')} incidents in ${zone}. ${memberIds.length} reports in last 30 days indicate systemic infrastructure neglect.`,
      risk_geojson: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [base.lng - 0.008, base.lat - 0.006],
            [base.lng + 0.008, base.lat - 0.006],
            [base.lng + 0.008, base.lat + 0.006],
            [base.lng - 0.008, base.lat + 0.006],
            [base.lng - 0.008, base.lat - 0.006],
          ]],
        },
      },
      created_at: admin.firestore.Timestamp.fromDate(new Date()),
      updated_at: admin.firestore.Timestamp.fromDate(new Date()),
    });
  }

  await clusterBatch.commit();
  console.log(`✅ Created ${Object.keys(clusterMap).length} clusters`);

  // ── Update issues with cluster IDs ───────────────────────────
  const updateBatch = db.batch();
  for (const { id, clusterKey } of issueIds) {
    if (clusterIdMap[clusterKey]) {
      const ref = db.collection('issues').doc(id);
      updateBatch.update(ref, { cluster_id: clusterIdMap[clusterKey] });
    }
  }
  await updateBatch.commit();
  console.log('✅ Linked all issues to their clusters');

  // ── Create 2 officer users ────────────────────────────────────
  const officers = [
    { user_id: 'officer_001', name: 'Rajiv Sharma', email: 'officer1@jansetu.dev', password: 'password123', assigned_zone: 'Sector 12' },
    { user_id: 'officer_002', name: 'Priya Mehta',  email: 'officer2@jansetu.dev', password: 'password123', assigned_zone: 'Phase 7'   },
  ];
  const officerBatch = db.batch();
  for (const officer of officers) {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(officer.email);
      await admin.auth().updateUser(userRecord.uid, {
        displayName: officer.name,
        password: officer.password,
      });
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
      userRecord = await admin.auth().createUser({
        uid: officer.user_id,
        email: officer.email,
        password: officer.password,
        displayName: officer.name,
      });
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'officer' });

    const ref = db.collection('users').doc(userRecord.uid);
    officerBatch.set(ref, {
      user_id: userRecord.uid,
      name: officer.name,
      email: officer.email,
      assigned_zone: officer.assigned_zone,
      role: 'officer',
      created_at: admin.firestore.Timestamp.fromDate(new Date()),
    });
  }
  await officerBatch.commit();
  console.log('✅ Created 2 officer accounts');

  // ── Create ledger entries for non-open issues ─────────────────
  const ledgerBatch = db.batch();
  const nonOpenIssues = issueIds.slice(0, 30); // Create ledger entries for 30 issues
  for (const issue of nonOpenIssues) {
    const ref = db.collection('ledger').doc();
    ledgerBatch.set(ref, {
      ledger_id:   ref.id,
      issue_id:    issue.id,
      event_type:  'submitted',
      timestamp:   admin.firestore.Timestamp.fromDate(randomPastDate(30)),
      description: `Issue reported in ${issue.zone}`,
      actor:       `citizen_seed_${randInt(1, 10)}`,
      metadata:    { category: issue.category },
      is_public:   true,
    });
  }
  await ledgerBatch.commit();
  console.log('✅ Created 30 ledger entries');

  console.log('\n🎉 Seed complete! Database summary:');
  console.log(`   📝 75 issues across ${ZONES.length} zones`);
  console.log(`   🔗 ${Object.keys(clusterMap).length} clusters created`);
  console.log(`   👮 2 officer accounts`);
  console.log(`   📖 30 ledger entries`);
  console.log('\n✅ Run: firebase serve to test locally\n');

  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
