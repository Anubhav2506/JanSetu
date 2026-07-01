import { collection, addDoc, doc, setDoc, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function seedDemoData() {
  try {
    const batch = writeBatch(db);

    // 2. Define Issues
    const demoIssues = [
      {
        id: 'demo_issue_1',
        raw_input: 'Government school Sector 12 ke paas pani ki badi pipe toot gayi hai, bahut pani waste ho raha hai aur street block ho gayi hai. 30 seconds me bus aane wali hai so voice note bhej raha hu.',
        category: 'water_leak',
        severity: 5,
        location_text: 'Sector 12, near Government High School, Chandigarh',
        location_coords: { lat: 30.7588, lng: 76.7685 },
        status: 'escalated',
        created_at: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)), // 5 days ago
        sla_deadline: Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)), // SLA breached 4 days ago
        updated_at: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
        cluster_id: 'demo_cluster_1',
        coi_score: 8.5,
        escalation_letter_drafted: true,
        escalation_letter: 'To The Chief Engineer, Water Supply & Sanitation Department, Chandigarh Administration. Subject: Escalation of unresolved water leak under SLA reference #DE1. This is to formally escalate the water leakage issue reported near Government High School, Sector 12, Chandigarh which has remained unresolved for 120 hours, breaching the critical 24-hour SLA. Responsible official has been notified of this compliance failure.',
        ledger_published: true,
        reporter_uid: 'demo_reporter_1',
        zone: 'Sector 12',
        infrastructure_type: 'water',
        language_detected: 'hi'
      },
      {
        id: 'demo_issue_2',
        raw_input: 'Corner of Sector 15 streetlight is completely out. It is dark and unsafe for students returning from university library at night.',
        category: 'streetlight_broken',
        severity: 3,
        location_text: 'Sector 15 Main Corner, Chandigarh',
        location_coords: { lat: 30.7516, lng: 76.7589 },
        status: 'open',
        created_at: Timestamp.fromDate(new Date(Date.now() - 1 * 12 * 60 * 60 * 1000)), // 12 hours ago
        sla_deadline: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)), // 48 hours left
        updated_at: Timestamp.fromDate(new Date(Date.now() - 1 * 12 * 60 * 60 * 1000)),
        cluster_id: null,
        coi_score: 6.0,
        escalation_letter_drafted: false,
        ledger_published: true,
        reporter_uid: 'demo_reporter_2',
        zone: 'Sector 15',
        infrastructure_type: 'electricity',
        language_detected: 'en'
      },
      {
        id: 'demo_issue_3',
        raw_input: 'Huge garbage dump pile accumulated in Sector 22 market. Extremely foul smell and stray dogs are tearing packets.',
        category: 'garbage_dump',
        severity: 4,
        location_text: 'Sector 22 Market Parking Area, Chandigarh',
        location_coords: { lat: 30.7380, lng: 76.7600 },
        status: 'open',
        created_at: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // 3 days ago
        sla_deadline: Timestamp.fromDate(new Date(Date.now() - 12 * 60 * 60 * 1000)), // Breached 12 hours ago
        updated_at: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
        cluster_id: 'demo_cluster_2',
        coi_score: 7.5,
        escalation_letter_drafted: false,
        ledger_published: true,
        reporter_uid: 'demo_reporter_3',
        zone: 'Sector 22',
        infrastructure_type: 'waste',
        language_detected: 'en'
      },
      {
        id: 'demo_issue_4',
        raw_input: 'Sector 35-B outer road has a massive pothole, dangerous for two-wheelers especially in the rain.',
        category: 'pothole',
        severity: 4,
        location_text: 'Sector 35-B Outer Circular Road, Chandigarh',
        location_coords: { lat: 30.7258, lng: 76.7522 },
        status: 'resolved',
        created_at: Timestamp.fromDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)), // 6 days ago
        sla_deadline: Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)),
        updated_at: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
        cluster_id: null,
        coi_score: 4.0,
        escalation_letter_drafted: false,
        ledger_published: true,
        reporter_uid: 'demo_reporter_4',
        zone: 'Sector 35',
        infrastructure_type: 'road',
        language_detected: 'en',
        resolution_image_url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=300&q=80',
        verification_status: 'verified'
      },
      {
        id: 'demo_issue_jaipur',
        raw_input: 'C-scheme area me kachra phaila hua hai aur cleaning ward staff 3 din se nahi aaya hai, smell bahut bad hai.',
        category: 'garbage_dump',
        severity: 4,
        location_text: 'C-Scheme, near Central Park, Jaipur',
        location_coords: { lat: 26.9124, lng: 75.7873 },
        status: 'open',
        created_at: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
        sla_deadline: Timestamp.fromDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)),
        updated_at: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
        cluster_id: null,
        coi_score: 8.0,
        escalation_letter_drafted: false,
        ledger_published: true,
        reporter_uid: 'demo_reporter_jaipur',
        zone: 'C-Scheme',
        infrastructure_type: 'waste',
        language_detected: 'hi'
      },
      {
        id: 'demo_issue_gurgaon',
        raw_input: 'Sector 45 intersection road has huge broken surface and deep craters after rains. Vehicles are breaking down.',
        category: 'road_damage',
        severity: 5,
        location_text: 'Sector 45 Circular Road, Gurgaon',
        location_coords: { lat: 28.4595, lng: 77.0266 },
        status: 'escalated',
        created_at: Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)),
        sla_deadline: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // breached
        updated_at: Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)),
        cluster_id: null,
        coi_score: 9.0,
        escalation_letter_drafted: true,
        escalation_letter: 'To Nodal Grievance Officer, Gurugram Municipal Corporation (MCG). Subject: SLA Breach Escalation for Road Damage Reference #GG1. Serious road damage at Sector 45 intersection remains unresolved after 96 hours.',
        ledger_published: true,
        reporter_uid: 'demo_reporter_gurgaon',
        zone: 'Sector 45',
        infrastructure_type: 'road',
        language_detected: 'en'
      },
      {
        id: 'demo_issue_dehradun',
        raw_input: 'Rajpur road streetlights are off for last two days. Complete blackout makes it very unsafe for evening commuters.',
        category: 'streetlight_broken',
        severity: 3,
        location_text: 'Rajpur Road, near Mussoorie diversion, Dehradun',
        location_coords: { lat: 30.3165, lng: 78.0322 },
        status: 'open',
        created_at: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
        sla_deadline: Timestamp.fromDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)),
        updated_at: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
        cluster_id: null,
        coi_score: 6.5,
        ledger_published: true,
        reporter_uid: 'demo_reporter_dehradun',
        zone: 'Rajpur Road',
        infrastructure_type: 'electricity',
        language_detected: 'en'
      }
    ];

    // 3. Define Clusters
    const demoClusters = [
      {
        id: 'demo_cluster_1',
        zone: 'Sector 12',
        issue_type: 'water_leak',
        member_issue_ids: ['demo_issue_1'],
        total_reports: 3,
        avg_severity: 4.7,
        coi_estimate: 85,
        risk_level: 'high',
        pattern_description: 'Recurrent leakage in major municipal supply pipeline near school zones. High public consequence.',
        risk_geojson: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [76.764, 30.762],
              [76.773, 30.762],
              [76.773, 30.755],
              [76.764, 30.755],
              [76.764, 30.762]
            ]]
          }
        },
        created_at: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
        updated_at: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))
      },
      {
        id: 'demo_cluster_2',
        zone: 'Sector 22',
        issue_type: 'garbage_dump',
        member_issue_ids: ['demo_issue_3'],
        total_reports: 5,
        avg_severity: 4.0,
        coi_estimate: 70,
        risk_level: 'medium',
        pattern_description: 'Commercial collection backlog in dense market sector. Poses sanitary hazards.',
        risk_geojson: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [76.755, 30.742],
              [76.766, 30.742],
              [76.766, 30.733],
              [76.755, 30.733],
              [76.755, 30.742]
            ]]
          }
        },
        created_at: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
        updated_at: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
      }
    ];

    // 4. Define Ledger events
    const demoLedger = [
      {
        id: 'demo_ledger_1',
        issue_id: 'demo_issue_1',
        event_type: 'submitted',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
        description: 'New water leak report classified in Sector 12. Triage Agent set SLA clock to 24h.',
        actor: 'system',
        is_public: true
      },
      {
        id: 'demo_ledger_2',
        issue_id: 'demo_issue_1',
        event_type: 'escalated',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)),
        description: 'SLA Watchdog detected unresolved critical leak past 24h deadline. Formally escalated to Chief Engineer.',
        actor: 'system',
        metadata: {
          letter_preview: 'Subject: Escalation of unresolved water leak under SLA reference #DE1. Water leakage near Government High School, Sector 12 has breached SLA limit...'
        },
        is_public: true
      },
      {
        id: 'demo_ledger_3',
        issue_id: 'demo_issue_2',
        event_type: 'submitted',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 12 * 60 * 60 * 1000)),
        description: 'Streetlight outage ticket initialized in Sector 15. Assigned to Electricity Maintenance Division.',
        actor: 'system',
        is_public: true
      },
      {
        id: 'demo_ledger_4',
        issue_id: 'demo_issue_3',
        event_type: 'submitted',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
        description: 'Commercial waste overflow ticket registered in Sector 22 market zone.',
        actor: 'system',
        is_public: true
      },
      {
        id: 'demo_ledger_5',
        issue_id: 'demo_issue_4',
        event_type: 'submitted',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)),
        description: 'Sector 35 road pothole complaint registered via photo submission.',
        actor: 'system',
        is_public: true
      },
      {
        id: 'demo_ledger_6',
        issue_id: 'demo_issue_4',
        event_type: 'verified',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
        description: 'Verification Agent reviewed resolution photo. Confirmed pothole filled and road surface restored.',
        actor: 'system',
        metadata: {
          verdict: 'VERIFIED',
          confidence: 0.94,
          visible_changes: 'Verified: Pothole filled with black bitumen aggregate. Level surface restored.'
        },
        is_public: true
      }
    ];

    // Add to Batch writes
    demoIssues.forEach(issue => {
      const { id, ...data } = issue;
      batch.set(doc(db, 'issues', id), data);
    });

    demoClusters.forEach(cluster => {
      const { id, ...data } = cluster;
      batch.set(doc(db, 'clusters', id), data);
    });

    demoLedger.forEach(item => {
      const { id, ...data } = item;
      batch.set(doc(db, 'ledger', id), data);
    });

    await batch.commit();
    return { success: true, message: 'Demo environment initialized with geocoded reports, risk clusters, and audit ledger!' };
  } catch (err) {
    console.error('Seeding error:', err);
    return { success: false, message: 'Failed to seed demo data: ' + err.message };
  }
}
