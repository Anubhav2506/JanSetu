import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import { runEscalationAgent, resolveIssue } from '../../services/api';
import { seedDemoData } from '../../services/demoSeeder';
import L from 'leaflet';



export default function AdminDashboard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Auth state
  const [user, setUser] = useState(auth.currentUser);
  const [email, setEmail] = useState('officer1@jansetu.dev');
  const [password, setPassword] = useState('password123'); // Hackathon default
  const [authError, setAuthError] = useState('');

  // UI state
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationResult, setEscalationResult] = useState(null);
  const [resolutionImageBase64, setResolutionImageBase64] = useState(null);
  const [resolutionImageMimeType, setResolutionImageMimeType] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const miniMapRef = useRef(null);
  const isOfficerSession = Boolean(user && !user.isAnonymous && user.email);

  // Leaflet mini-map inside issue details modal
  useEffect(() => {
    if (!selectedIssue || !selectedIssue.location_coords?.lat || !selectedIssue.location_coords?.lng || !miniMapRef.current) return;

    const container = miniMapRef.current;
    container.innerHTML = '';

    const lat = selectedIssue.location_coords.lat;
    const lng = selectedIssue.location_coords.lng;

    const map = L.map(container, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: '#e8691a',
      fillOpacity: 0.9,
      color: '#ffffff',
      weight: 1.5
    }).addTo(map);

    return () => {
      map.remove();
    };
  }, [selectedIssue]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(u => setUser(u));
    return () => unsubscribeAuth();
  }, []);

const MOCK_DASHBOARD_ISSUES = [
  {
    id: 'mock_map_1',
    category: 'water_leak',
    summary: 'A pipe bursts near a government school in Sector 12. Water is logging all over the street.',
    severity: 5,
    status: 'escalated',
    location_text: 'Sector 12, Chandigarh',
    location_coords: { lat: 30.7588, lng: 76.7685 },
    coi_score: 8.5,
    sla_deadline: { toDate: () => new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    raw_input: 'Government school Sector 12 ke paas pani ki supply pipe toot gayi hai, street supply block hai.',
    zone: 'Sector 12'
  },
  {
    id: 'mock_map_3',
    category: 'garbage_dump',
    summary: 'Municipal garbage container is overflowing. Stray dogs are scattering trash everywhere in Sector 22 market.',
    severity: 4,
    status: 'open',
    location_text: 'Sector 22 Market, Chandigarh',
    location_coords: { lat: 30.7380, lng: 76.7600 },
    coi_score: 7.5,
    sla_deadline: { toDate: () => new Date(Date.now() - 12 * 60 * 60 * 1000) },
    raw_input: 'Huge garbage dump pile accumulated in Sector 22 market. Extremely foul smell.',
    zone: 'Sector 22'
  },
  {
    id: 'mock_map_2',
    category: 'streetlight_broken',
    summary: 'Streetlight not working on the corner of Sector 15. The road is pitch dark and unsafe.',
    severity: 3,
    status: 'open',
    location_text: 'Sector 15, Chandigarh',
    location_coords: { lat: 30.7516, lng: 76.7589 },
    coi_score: 6.0,
    sla_deadline: { toDate: () => new Date(Date.now() + 48 * 60 * 60 * 1000) },
    raw_input: 'Corner of Sector 15 streetlight is completely out. It is dark and unsafe.',
    zone: 'Sector 15'
  },
  {
    id: 'mock_map_5',
    category: 'road_damage',
    summary: 'Huge craters on Indiranagar flyover path, causing traffic blockages.',
    severity: 5,
    status: 'open',
    location_text: 'Indiranagar, Bengaluru',
    location_coords: { lat: 30.7410, lng: 76.7820 },
    coi_score: 5.0,
    sla_deadline: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
    raw_input: 'Huge potholes on Indiranagar road, dangerous for commuters.',
    zone: 'Indiranagar'
  },
  {
    id: 'mock_map_7',
    category: 'drain_blocked',
    summary: 'Sewerage line backing up and flooding the Sector 34 library intersection.',
    severity: 5,
    status: 'escalated',
    location_text: 'Sector 34, Chandigarh',
    location_coords: { lat: 30.7230, lng: 76.7690 },
    coi_score: 5.0,
    sla_deadline: { toDate: () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    raw_input: 'Blocked sewer flooding public streets and Sector 34 entrance.',
    zone: 'Sector 34'
  },
  {
    id: 'mock_map_8',
    category: 'illegal_construction',
    summary: 'Commercial building debris dumped illegally on roadside.',
    severity: 3,
    status: 'open',
    location_text: 'Swargate, Pune',
    location_coords: { lat: 30.7395, lng: 76.7940 },
    coi_score: 3.0,
    sla_deadline: { toDate: () => new Date(Date.now() + 72 * 60 * 60 * 1000) },
    raw_input: 'Debris left by builders blocking Swargate side lane.',
    zone: 'Swargate'
  },
  {
    id: 'mock_map_4',
    category: 'pothole',
    summary: 'Sector 35 pothole repaired. Level surface restored.',
    severity: 4,
    status: 'resolved',
    location_text: 'Sector 35-B, Chandigarh',
    location_coords: { lat: 30.7258, lng: 76.7522 },
    coi_score: 4.0,
    sla_deadline: { toDate: () => new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
    raw_input: 'Deep pothole filled up with concrete aggregate.',
    zone: 'Sector 35'
  },
  {
    id: 'mock_map_6',
    category: 'tree_fallen',
    summary: 'Fallen tree blocking the main lane near Sector 8 avenue.',
    severity: 4,
    status: 'resolved',
    location_text: 'Sector 8 Avenue, Chandigarh',
    location_coords: { lat: 30.7480, lng: 76.7900 },
    coi_score: 4.0,
    sla_deadline: { toDate: () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    raw_input: 'Banyan tree fell across Sector 8 road block.',
    zone: 'Sector 8'
  }
];

  useEffect(() => {
    if (!isOfficerSession) {
      setIssues([]);
      setLoading(false);
      return;
    }

    // Fetch issues sorted by COI score descending (The JanSetu Differentiator)
    const q = query(collection(db, 'issues'), orderBy('coi_score', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort issues combined by coi_score descending
      const combined = [...MOCK_DASHBOARD_ISSUES, ...issuesList].sort((a, b) => (b.coi_score || 0) - (a.coi_score || 0));
      setIssues(combined);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOfficerSession, user?.uid]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthError('');
    } catch {
      setAuthError('Invalid credentials. For the demo, ensure the officer user exists in Firebase Auth.');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Please upload an image under 5MB.");
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
      setResolutionImageBase64(base64String);
      setResolutionImageMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleMarkResolved = async (issueId) => {
    if (!resolutionImageBase64) {
      alert("Please upload a resolution photo for AI Verification.");
      return;
    }
    setIsResolving(true);
    try {
      const result = await resolveIssue(issueId, resolutionImageBase64, resolutionImageMimeType);
      setVerificationResult(result);
    } catch (err) {
      console.error('Failed to resolve:', err);
      alert("Verification Agent error: " + err.message);
    } finally {
      setIsResolving(false);
    }
  };

  const triggerEscalation = async () => {
    setIsEscalating(true);
    setEscalationResult(null);
    try {
      const result = await runEscalationAgent();
      setEscalationResult(`Escalated ${result.total || 0} breached issues.`);
    } catch {
      setEscalationResult('Error running escalation agent.');
    } finally {
      setIsEscalating(false);
    }
  };

  // ── Render Resources Panel ──────────────────────────────────────────
  const renderResourcesPanel = () => (
    <div className="card flex-col gap-lg" style={{ background: '#141414', border: '1px solid #222', padding: 24 }}>
      <div>
        <span className="section-eyebrow" style={{ color: 'var(--teal)' }}>Government Grievance Systems</span>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0 16px', color: 'var(--paper)' }}>Central & State Portals</h3>
        
        <div className="flex-col gap-md">
          <div style={{ paddingBottom: 16, borderBottom: '1px solid #222' }}>
            <h4 style={{ color: 'var(--paper)', fontSize: '0.95rem', margin: '0 0 4px', fontWeight: 600 }}>CPGRAMS Central Portal</h4>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 8px', lineHeight: 1.4 }}>
              Centralized Public Grievance Redress and Monitoring System overseen by Shri V. Srinivas, IAS (Secretary, DARPG).
            </p>
            <a href="https://cpgrams.darpg.gov.in" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--saffron)', fontWeight: 600 }}>
              Visit cpgrams.darpg.gov.in →
            </a>
          </div>

          <div style={{ paddingBottom: 16, borderBottom: '1px solid #222' }}>
            <h4 style={{ color: 'var(--paper)', fontSize: '0.95rem', margin: '0 0 4px', fontWeight: 600 }}>MyGov India Platform</h4>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 8px', lineHeight: 1.4 }}>
              Citizen engagement and feedback platform led by Shri Akash Tripathi, IAS (CEO, MyGov).
            </p>
            <a href="https://www.mygov.in" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--saffron)', fontWeight: 600 }}>
              Visit mygov.in →
            </a>
          </div>

          <div style={{ paddingBottom: 16, borderBottom: '1px solid #222' }}>
            <h4 style={{ color: 'var(--paper)', fontSize: '0.95rem', margin: '0 0 4px', fontWeight: 600 }}>MoHUA - Swachhata Complaints</h4>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 8px', lineHeight: 1.4 }}>
              Ministry of Housing and Urban Affairs portal managing waste, sanitation, and municipal failures.
            </p>
            <a href="https://mohua.gov.in" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--saffron)', fontWeight: 600 }}>
              Visit Swachhata MoHUA →
            </a>
          </div>
        </div>
      </div>

      <div>
        <span className="section-eyebrow" style={{ color: 'var(--teal)' }}>Civic Action & Audits (NGOs)</span>
        <div className="flex-col gap-md" style={{ marginTop: 12 }}>
          <div style={{ paddingBottom: 16, borderBottom: '1px solid #222' }}>
            <h4 style={{ color: 'var(--paper)', fontSize: '0.95rem', margin: '0 0 4px', fontWeight: 600 }}>Janaagraha Centre for Democracy</h4>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 8px', lineHeight: 1.4 }}>
              Bangalore-based NGO driving citizen engagement programs. Developed the Swachhata app integration.
            </p>
            <a href="https://www.janaagraha.org" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--teal)', fontWeight: 600 }}>
              Visit janaagraha.org →
            </a>
          </div>

          <div>
            <h4 style={{ color: 'var(--paper)', fontSize: '0.95rem', margin: '0 0 4px', fontWeight: 600 }}>Praja Foundation Mumbai & Delhi</h4>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 8px', lineHeight: 1.4 }}>
              Conducts annual audits on civic complaints, municipal accountability, and ward counselor performance reports.
            </p>
            <a href="https://www.praja.org" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--teal)', fontWeight: 600 }}>
              Visit praja.org →
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Render Login ──────────────────────────────────────────────────
  if (!isOfficerSession) {
    return (
      <div className="container" style={{ padding: '40px 20px', maxWidth: '1200px' }}>
        <div className="grid-2" style={{ gap: '40px', alignItems: 'start' }}>
          <div className="card text-center" style={{ maxWidth: '450px', margin: '0 auto', width: '100%' }}>
            <div style={{ fontFamily: 'var(--mono)', color: 'var(--saffron)', fontSize: 10, letterSpacing: '0.2em', marginBottom: 16 }}>JANSETU OS</div>
            <h2 style={{ marginBottom: 24 }}>Officer Portal</h2>
            <form onSubmit={handleLogin} className="flex-col gap-md">
              {authError && <div className="callout danger" style={{ margin: 0, padding: 8, fontSize: 12 }}>{authError}</div>}
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="submit" className="btn btn-primary justify-center">Login</button>
            </form>
            <div style={{ marginTop: 24 }}>
              <a href="/" style={{ fontSize: 12 }}>← Back to Citizen View</a>
            </div>
          </div>
          {renderResourcesPanel()}
        </div>
      </div>
    );
  }

  // ── Stats Calculation ─────────────────────────────────────────────
  const openCount = issues.filter(i => i.status === 'open').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const escalatedCount = issues.filter(i => i.status === 'escalated').length;

  // ── Render Dashboard ──────────────────────────────────────────────
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '1200px' }}>
      <div className="grid-2" style={{ gap: '40px', alignItems: 'start' }}>
        <div>
          <header className="flex justify-between items-center" style={{ marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: '2rem' }}>Queue</h1>
              <p style={{ margin: 0 }}>Ranked by Cost of Inaction (COI)</p>
            </div>
            <div className="flex gap-md items-center">
              <span style={{ fontSize: '0.85rem', color: '#888' }}>{user.email}</span>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => signOut(auth)}>Logout</button>
            </div>
          </header>

          {/* Stats Bar */}
          <div className="grid-3" style={{ marginBottom: 32 }}>
            <div className="card flex-col items-center">
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--saffron)' }}>{openCount}</div>
              <div className="badge">Open Issues</div>
            </div>
            <div className="card flex-col items-center">
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--red)' }}>{escalatedCount}</div>
              <div className="badge">Escalated</div>
            </div>
            <div className="card flex-col items-center">
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--green)' }}>{resolvedCount}</div>
              <div className="badge">Resolved</div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center" style={{ marginBottom: 24, background: '#1a1a1a', padding: 16, borderRadius: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>SLA Watchdog</h3>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Manually trigger the Escalation Agent for demo purposes.</p>
            </div>
            <div className="flex items-center gap-md">
              {escalationResult && <span style={{ fontSize: '0.8rem', color: 'var(--saffron)' }}>{escalationResult}</span>}
              <button className="btn btn-secondary" onClick={triggerEscalation} disabled={isEscalating}>
                {isEscalating ? 'Scanning...' : 'Run SLA Check'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="spinner" style={{ margin: '40px auto' }}></div>
          ) : (
            <div className="flex-col gap-md">
              {issues.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: 40, padding: 32 }}>
                  <p style={{ color: '#888', marginBottom: 16 }}>No active issues in the queue.</p>
                </div>
              ) : (
                issues.filter(i => i.status !== 'resolved').map(issue => {
                  // SLA Calculation
                  const deadline = issue.sla_deadline?.toDate();
                  const now = new Date();
                  const hoursLeft = deadline ? Math.round((deadline - now) / (1000 * 60 * 60)) : 0;
                  const isOverdue = hoursLeft < 0;

                  return (
                    <div 
                      key={issue.id} 
                      className="card flex justify-between items-center" 
                      style={{ cursor: 'pointer', transition: 'border-color 0.2s', borderLeft: isOverdue ? '3px solid var(--red)' : '1px solid #222' }}
                      onClick={() => {
                        setSelectedIssue(issue);
                        setVerificationResult(null);
                        setResolutionImageBase64(null);
                        setResolutionImageMimeType(null);
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-md" style={{ marginBottom: 8 }}>
                          <span className={`badge badge-${issue.status === 'open' ? 'open' : 'escalated'}`}>{issue.status}</span>
                          <span style={{ fontSize: '0.8rem', color: isOverdue ? 'var(--red)' : '#888', fontWeight: 600 }}>
                            {isOverdue ? `SLA BREACHED: ${Math.abs(hoursLeft)}h ago` : `${hoursLeft}h remaining`}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, color: '#e8691a' }}>{issue.category?.replace(/_/g, ' ')}</h3>
                        <p style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>{issue.location_text}</p>
                      </div>

                      <div className="flex-col items-center" style={{ background: 'rgba(232,105,26,0.1)', padding: '12px 20px', borderRadius: 8 }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--saffron)' }}>
                          {issue.coi_score ? (issue.coi_score * 10).toFixed(1) : 'N/A'}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', color: '#e8691a' }}>COI SCORE</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        {renderResourcesPanel()}
      </div>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
              <h2>Ticket #{selectedIssue.id.slice(-6).toUpperCase()}</h2>
              <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setSelectedIssue(null)}>✕</button>
            </div>
            
            <div className="callout info">
              <div className="callout-title">AI Summary</div>
              <p style={{ margin: 0, color: 'var(--paper)' }}>{selectedIssue.summary}</p>
            </div>

            <div className="grid-2" style={{ marginBottom: 24 }}>
              <div>
                <label>Category</label>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedIssue.category?.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <label>Severity</label>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: selectedIssue.severity >= 4 ? 'var(--red)' : 'var(--paper)' }}>{selectedIssue.severity} / 5</div>
              </div>
              <div>
                <label>Zone</label>
                <div>{selectedIssue.zone || 'Unknown'}</div>
              </div>
              <div>
                <label>COI Score</label>
                <div style={{ color: 'var(--saffron)', fontWeight: 600 }}>{selectedIssue.coi_score}</div>
              </div>
            </div>

            <div>
              <label>Citizen's Raw Input</label>
              <div style={{ background: '#111', padding: 16, borderRadius: 4, fontFamily: 'var(--mono)', fontSize: '0.9rem', marginBottom: 24, fontStyle: 'italic' }}>
                "{selectedIssue.raw_input}"
              </div>
            </div>

            <div>
              <label>Location Map</label>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: 8 }}>
                📍 {selectedIssue.location_text || 'Location coordinates not detailed'}
              </div>
              <div 
                ref={miniMapRef} 
                style={{ width: '100%', height: '200px', borderRadius: '6px', marginBottom: 24, border: '1px solid #333', overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', background: '#111' }}>
                  Loading mini-map...
                </div>
              </div>
            </div>

            {selectedIssue.status === 'escalated' && selectedIssue.escalation_letter && (
              <div className="callout danger">
                <div className="callout-title">Escalation Letter Sent</div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>{selectedIssue.escalation_letter.slice(0, 150)}...</p>
              </div>
            )}

            {!verificationResult && selectedIssue.status !== 'resolved' && (
              <div style={{ marginTop: 24, borderTop: '1px solid #333', paddingTop: 24 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Verify Resolution</h3>
                <div style={{ marginBottom: 16 }}>
                  <label>Upload proof photo</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                </div>
                <div className="flex gap-md">
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, justifyContent: 'center', background: 'var(--green)' }}
                    onClick={() => handleMarkResolved(selectedIssue.id)}
                    disabled={isResolving || !resolutionImageBase64}
                  >
                    {isResolving ? 'Verifying with AI...' : 'Mark Resolved'}
                  </button>
                  <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSelectedIssue(null)}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {verificationResult && (
              <div className={`callout ${verificationResult.verdict === 'VERIFIED' ? 'success' : 'danger'}`} style={{ marginTop: 24 }}>
                <div className="callout-title">AI Verification Result: {verificationResult.verdict}</div>
                <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>{verificationResult.reasoning}</p>
                <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => setSelectedIssue(null)}>Close Ticket</button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
