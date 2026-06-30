import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { seedDemoData } from '../../services/demoSeeder';

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
    event_type: 'submitted',
    timestamp_display: '6/30/2026, 9:00:00 AM',
    description: 'Streetlight outage ticket initialized in Sector 15. Assigned to Electricity Maintenance Division.',
    actor: 'system',
    issue_id: 'mock_map_2'
  },
  {
    id: 'mock_led_4',
    event_type: 'submitted',
    timestamp_display: '6/28/2026, 11:30:00 AM',
    description: 'Commercial waste overflow ticket registered in Sector 22 market zone.',
    actor: 'system',
    issue_id: 'mock_map_3'
  },
  {
    id: 'mock_led_5',
    event_type: 'submitted',
    timestamp_display: '6/27/2026, 2:15:00 PM',
    description: 'Sector 35 road pothole complaint registered via photo submission.',
    actor: 'system',
    issue_id: 'mock_map_4'
  },
  {
    id: 'mock_led_6',
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

export default function PublicLedger() {
  const [events, setEvents] = useState(MOCK_LEDGER_EVENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch last 100 ledger events
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
      default:          return '📌';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'submitted': return '#2980b9';
      case 'escalated': return '#e74c3c';
      case 'verified':  return '#27ae60';
      case 'disputed':  return '#8e44ad';
      default:          return '#888';
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: 800 }}>
      <header className="flex justify-between items-center" style={{ marginBottom: 40 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', color: 'var(--saffron)', fontSize: 10, letterSpacing: '0.2em', marginBottom: 8 }}>TRANSPARENCY PORTAL</div>
          <h1 style={{ fontSize: '2.4rem', marginBottom: 8 }}>Public Ledger</h1>
          <p style={{ margin: 0, maxWidth: 500 }}>
            An immutable audit trail of every civic issue, SLA breach, and official action. 
            All records are cryptographically timestamped by Firebase.
          </p>
        </div>
        <a href="/report" className="btn btn-secondary">← Report an Issue</a>
      </header>

      {loading ? (
        <div className="spinner" style={{ margin: '40px auto' }}></div>
      ) : (
        <div className="flex-col" style={{ position: 'relative' }}>
          {/* Vertical timeline line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 24, width: 2, background: '#222', zIndex: 0 }}></div>



          {events.map((event) => (
            <div key={event.id} className="flex" style={{ marginBottom: 32, position: 'relative', zIndex: 1 }}>
              {/* Timeline dot */}
              <div style={{ 
                width: 48, height: 48, borderRadius: '50%', background: '#111', border: `2px solid ${getEventColor(event.event_type)}`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 
              }}>
                {getEventIcon(event.event_type)}
              </div>

              {/* Event card */}
              <div className="card" style={{ flex: 1, marginLeft: 24, padding: '20px 24px', borderLeft: `4px solid ${getEventColor(event.event_type)}` }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                  <div className="badge" style={{ background: '#111', border: `1px solid ${getEventColor(event.event_type)}`, color: getEventColor(event.event_type) }}>
                    {event.event_type}
                  </div>
                   <div style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#666' }}>
                     {event.timestamp_display || event.timestamp?.toDate().toLocaleString()}
                   </div>
                </div>

                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--paper)' }}>{event.description}</h3>
                
                <div className="flex justify-between items-end" style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#888' }}>
                    Actor: <span style={{ color: '#aaa' }}>{event.actor?.slice(0, 15)}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#666' }}>
                    Ticket Ref: {event.issue_id?.slice(-6).toUpperCase()}
                  </div>
                </div>

                {/* Show Escalation Letter Snippet if exists */}
                {event.event_type === 'escalated' && event.metadata?.letter_preview && (
                  <div style={{ background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.2)', padding: 12, borderRadius: 4, marginTop: 16, fontSize: '0.85rem', fontStyle: 'italic', color: '#e74c3c' }}>
                    "{event.metadata.letter_preview}..."
                  </div>
                )}

                {/* Show Verification Verdict if exists */}
                {event.event_type === 'verified' && event.metadata?.verdict && (
                  <div style={{ background: 'rgba(39,174,96,0.05)', border: '1px solid rgba(39,174,96,0.2)', padding: 12, borderRadius: 4, marginTop: 16, fontSize: '0.85rem', color: '#27ae60' }}>
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
  );
}
