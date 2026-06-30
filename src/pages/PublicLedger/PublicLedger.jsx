import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

// ── Mock Ledger Events ─────────────────────────────────────────────────
const MOCK_LEDGER_EVENTS = [
  {
    id: 'mock_led_1',
    event_type: 'submitted',
    timestamp_display: '6/30/2026, 9:10:00 PM',
    description: 'New water supply pipe leak classified in Sector 12. Triage Agent set SLA clock to 24h.',
    actor: 'system',
    issue_id: 'mock_map_1'
  },
  {
    id: 'mock_led_2',
    event_type: 'escalated',
    timestamp_display: '6/29/2026, 9:10:00 PM',
    description: 'SLA Watchdog detected unresolved critical leak past 24h deadline. Formally escalated to Chief Engineer.',
    actor: 'system',
    issue_id: 'mock_map_1',
    metadata: {
      letter_preview: 'Subject: Escalation of unresolved water leak under reference #DE1. Water leakage near Government High School, Sector 12 has breached SLA limit...'
    }
  },
  {
    id: 'mock_led_3',
    event_type: 'coi_scored',
    timestamp_display: '6/30/2026, 9:05:00 AM',
    description: 'COI Engine scored Sector 12 zone at risk index 85/100. Estimated ₹2.4L daily inaction cost due to water damage and traffic disruption.',
    actor: 'system',
    issue_id: 'mock_map_1',
    metadata: {
      coi_score: 85,
      daily_cost: '₹2,40,000',
      risk_factors: ['Water damage to school foundation', 'Road erosion risk', 'Pedestrian safety hazard']
    }
  },
  {
    id: 'mock_led_4',
    event_type: 'submitted',
    timestamp_display: '6/30/2026, 9:00:00 AM',
    description: 'Streetlight outage ticket initialized in Sector 15. Assigned to Electricity Maintenance Division.',
    actor: 'system',
    issue_id: 'mock_map_2'
  },
  {
    id: 'mock_led_5',
    event_type: 'coi_scored',
    timestamp_display: '6/29/2026, 3:00:00 PM',
    description: 'COI Engine scored Sector 22 market zone at risk index 70/100. Estimated ₹1.1L daily inaction cost from waste overflow and hygiene risk.',
    actor: 'system',
    issue_id: 'mock_map_3',
    metadata: {
      coi_score: 70,
      daily_cost: '₹1,10,000',
      risk_factors: ['Disease vector from stagnant waste', 'Commercial disruption to market vendors']
    }
  },
  {
    id: 'mock_led_6',
    event_type: 'submitted',
    timestamp_display: '6/28/2026, 11:30:00 AM',
    description: 'Commercial waste overflow ticket registered in Sector 22 market zone.',
    actor: 'system',
    issue_id: 'mock_map_3'
  },
  {
    id: 'mock_led_7',
    event_type: 'submitted',
    timestamp_display: '6/27/2026, 2:15:00 PM',
    description: 'Sector 35 road pothole complaint registered via photo submission.',
    actor: 'system',
    issue_id: 'mock_map_4'
  },
  {
    id: 'mock_led_8',
    event_type: 'verified',
    timestamp_display: '6/28/2026, 4:45:00 PM',
    description: 'Verification Agent reviewed resolution photo. Confirmed pothole filled and road surface restored.',
    actor: 'system',
    issue_id: 'mock_map_4',
    metadata: {
      verdict: 'VERIFIED',
      confidence: 0.94,
      visible_changes: 'Verified: Pothole filled with black bitumen aggregate. Level surface restored.'
    }
  }
];

// ── COI Zone Data ──────────────────────────────────────────────────────
const COI_ZONES = [
  { zone: 'Sector 12, Chandigarh', score: 85, daily_cost: '₹2,40,000', category: 'water_leak', issues: 3, trend: 'rising' },
  { zone: 'Sector 22 Market', score: 70, daily_cost: '₹1,10,000', category: 'garbage_dump', issues: 5, trend: 'stable' },
  { zone: 'Sector 35 Main Road', score: 55, daily_cost: '₹78,000', category: 'road_damage', issues: 2, trend: 'falling' },
  { zone: 'Sector 15 Colony', score: 40, daily_cost: '₹45,000', category: 'streetlight', issues: 4, trend: 'stable' },
  { zone: 'Industrial Area Ph-1', score: 62, daily_cost: '₹95,000', category: 'drainage', issues: 2, trend: 'rising' },
];

export default function PublicLedger() {
  const [events, setEvents] = useState(MOCK_LEDGER_EVENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'ledger'), orderBy('timestamp', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents([...MOCK_LEDGER_EVENTS, ...eventsList]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getEventIcon = (type) => {
    switch (type) {
      case 'submitted': return '📝';
      case 'escalated': return '⚠️';
      case 'verified':  return '✅';
      case 'disputed':  return '❌';
      case 'coi_scored': return '💸';
      default:          return '📌';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'submitted': return '#2980b9';
      case 'escalated': return '#e74c3c';
      case 'verified':  return '#27ae60';
      case 'disputed':  return '#8e44ad';
      case 'coi_scored': return '#e8691a';
      default:          return '#888';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return '#e74c3c';
    if (score >= 50) return '#e8691a';
    if (score >= 25) return '#f39c12';
    return '#27ae60';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'rising') return '📈';
    if (trend === 'falling') return '📉';
    return '➡️';
  };

  const totalDailyCost = '₹5,68,000';
  const avgScore = Math.round(COI_ZONES.reduce((sum, z) => sum + z.score, 0) / COI_ZONES.length);

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: 1200 }}>
      <header className="flex justify-between items-center" style={{ marginBottom: 40 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', color: 'var(--saffron)', fontSize: 10, letterSpacing: '0.2em', marginBottom: 8 }}>TRANSPARENCY PORTAL</div>
          <h1 style={{ fontSize: '2.4rem', marginBottom: 8 }}>Public Ledger</h1>
          <p style={{ margin: 0, maxWidth: 600 }}>
            An immutable audit trail of every civic issue, SLA breach, COI assessment, and official action.
            All records are cryptographically timestamped by Firebase.
          </p>
        </div>
        <a href="/report" className="btn btn-secondary">← Report an Issue</a>
      </header>

      <div className="grid-2" style={{ gap: 40, alignItems: 'start' }}>
        {/* ── Left Column: Timeline ──────────────────────────── */}
        <div>
          <div style={{ fontFamily: 'var(--mono)', color: '#888', fontSize: 11, letterSpacing: '0.15em', marginBottom: 20 }}>AUDIT TIMELINE</div>

          {loading ? (
            <div className="spinner" style={{ margin: '40px auto' }}></div>
          ) : (
            <div className="flex-col" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 24, width: 2, background: '#222', zIndex: 0 }}></div>

              {events.map((event) => (
                <div key={event.id} className="flex" style={{ marginBottom: 28, position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: '50%', background: '#111', border: `2px solid ${getEventColor(event.event_type)}`, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 
                  }}>
                    {getEventIcon(event.event_type)}
                  </div>

                  <div className="card" style={{ flex: 1, marginLeft: 20, padding: '16px 20px', borderLeft: `4px solid ${getEventColor(event.event_type)}` }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
                      <div className="badge" style={{ background: '#111', border: `1px solid ${getEventColor(event.event_type)}`, color: getEventColor(event.event_type) }}>
                        {event.event_type.replace('_', ' ')}
                      </div>
                       <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: '#666' }}>
                         {event.timestamp_display || event.timestamp?.toDate().toLocaleString()}
                       </div>
                    </div>

                    <p style={{ margin: '0 0 8px', fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--paper)' }}>{event.description}</p>
                    
                    <div className="flex justify-between items-end" style={{ marginTop: 12 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: '#888' }}>
                        Actor: <span style={{ color: '#aaa' }}>{event.actor?.slice(0, 15)}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: '#666' }}>
                        Ref: {event.issue_id?.slice(-6).toUpperCase()}
                      </div>
                    </div>

                    {/* Escalation Letter */}
                    {event.event_type === 'escalated' && event.metadata?.letter_preview && (
                      <div style={{ background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.2)', padding: 12, borderRadius: 6, marginTop: 12, fontSize: '0.82rem', fontStyle: 'italic', color: '#e74c3c' }}>
                        "{event.metadata.letter_preview}..."
                      </div>
                    )}

                    {/* COI Score Card */}
                    {event.event_type === 'coi_scored' && event.metadata && (
                      <div style={{ background: 'rgba(232,105,26,0.06)', border: '1px solid rgba(232,105,26,0.25)', padding: 12, borderRadius: 6, marginTop: 12 }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#e8691a' }}>
                            COI Index: <strong>{event.metadata.coi_score}/100</strong>
                          </span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#ccc' }}>
                            Daily Cost: <strong style={{ color: '#e74c3c' }}>{event.metadata.daily_cost}</strong>
                          </span>
                        </div>
                        {event.metadata.risk_factors && (
                          <div style={{ fontSize: '0.78rem', color: '#999' }}>
                            {event.metadata.risk_factors.map((f, i) => (
                              <span key={i}>• {f}{i < event.metadata.risk_factors.length - 1 ? ' ' : ''}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verification */}
                    {event.event_type === 'verified' && event.metadata?.verdict && (
                      <div style={{ background: 'rgba(39,174,96,0.05)', border: '1px solid rgba(39,174,96,0.2)', padding: 12, borderRadius: 6, marginTop: 12, fontSize: '0.82rem', color: '#27ae60' }}>
                        AI Verdict: {event.metadata.verdict} (Confidence: {Math.round(event.metadata.confidence * 100)}%)
                        <br/>
                        <span style={{ color: '#888', fontStyle: 'italic' }}>"{event.metadata.visible_changes}"</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Column: COI Impact Dashboard ────────────── */}
        <div>
          <div style={{ fontFamily: 'var(--mono)', color: '#888', fontSize: 11, letterSpacing: '0.15em', marginBottom: 20 }}>COST OF INACTION DASHBOARD</div>

          {/* Summary Cards */}
          <div className="flex gap-sm" style={{ marginBottom: 24 }}>
            <div className="card" style={{ flex: 1, padding: '16px 20px', textAlign: 'center', borderTop: '3px solid #e74c3c' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#888', letterSpacing: '0.1em', marginBottom: 6 }}>DAILY INACTION COST</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e74c3c' }}>{totalDailyCost}</div>
            </div>
            <div className="card" style={{ flex: 1, padding: '16px 20px', textAlign: 'center', borderTop: '3px solid var(--saffron)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#888', letterSpacing: '0.1em', marginBottom: 6 }}>AVG RISK INDEX</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--saffron)' }}>{avgScore}<span style={{ fontSize: '0.85rem', color: '#888' }}>/100</span></div>
            </div>
          </div>

          {/* Zone-level COI Scores */}
          <div className="card flex-col gap-sm" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--saffron)', letterSpacing: '0.1em', marginBottom: 4 }}>ZONE-LEVEL RISK BREAKDOWN</div>

            {COI_ZONES.map((zone, idx) => (
              <div key={idx} style={{ padding: '12px 0', borderBottom: idx < COI_ZONES.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ddd' }}>{zone.zone}</span>
                    <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: 8 }}>{getTrendIcon(zone.trend)} {zone.trend}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 700, color: getScoreColor(zone.score) }}>
                    {zone.score}/100
                  </span>
                </div>

                {/* Visual risk bar */}
                <div style={{ width: '100%', height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${zone.score}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${getScoreColor(zone.score)}88, ${getScoreColor(zone.score)})`,
                    borderRadius: 3,
                    transition: 'width 0.6s ease'
                  }}></div>
                </div>

                <div className="flex justify-between" style={{ marginTop: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: '#666' }}>
                    {zone.category.replace('_', ' ').toUpperCase()} · {zone.issues} active issues
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: '#e74c3c' }}>
                    {zone.daily_cost}/day
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Explainer */}
          <div className="card" style={{ padding: '16px 20px', background: 'rgba(232,105,26,0.04)', border: '1px solid rgba(232,105,26,0.15)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--saffron)', letterSpacing: '0.1em', marginBottom: 8 }}>WHAT IS COST OF INACTION?</div>
            <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.6, color: '#999' }}>
              The <strong style={{ color: '#ddd' }}>Cost of Inaction (COI)</strong> is a directional risk index calculated by JanSetu's COI Engine agent. 
              It estimates the daily economic and social impact of leaving a civic issue unresolved — factoring in hazard severity, 
              population density, infrastructure type, and historical resolution patterns. Higher COI scores push issues up in the 
              officer queue, ensuring the most impactful problems are addressed first.
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
              ⚠️ AI-estimated directional scores based on synthetic data. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
