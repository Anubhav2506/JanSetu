import { useState, useEffect, useRef } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { submitIssue } from '../../services/api';
import L from 'leaflet';

export default function CitizenView() {
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMimeType, setImageMimeType] = useState(null);
  const [imageName, setImageName] = useState('');
  const [location, setLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const fileInputRef = useRef(null);

  // Speech recognition ref
  const recognitionRef = useRef(null);
  const successMapRef = useRef(null);

  // Leaflet map initialization on success
  useEffect(() => {
    if (!successData || !successData.location_coords?.lat || !successData.location_coords?.lng || !successMapRef.current) return;

    const container = successMapRef.current;
    container.innerHTML = ''; // Clear prior loading indicators or maps

    const lat = successData.location_coords.lat;
    const lng = successData.location_coords.lng;

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
  }, [successData]);

  // Auto-login anonymously
  useEffect(() => {
    signInAnonymously(auth).catch(err => {
      console.error('Anonymous auth failed:', err);
    });

    // Initialize Speech Recognition if supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN'; // Defaults to Hindi/English mix support
      
      recognition.onstart = () => setIsRecording(true);
      
      recognition.onresult = (event) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setText(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setText(''); // clear text before recording new
      recognitionRef.current?.start();
    }
  };

  const processFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image.');
      return;
    }
    setImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
      setImageBase64(base64String);
      setImageMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeImage = () => {
    setImageBase64(null);
    setImageMimeType(null);
    setImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setError('');
      },
      () => setError('Unable to retrieve your location. Please ensure location services are enabled.')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imageBase64) {
      setError('Please provide a description or a photo of the issue.');
      return;
    }

    const now = Date.now();
    if (now - lastSubmitTime < 3000) {
      setError('Please wait at least 3 seconds before submitting again.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    setLastSubmitTime(now);

    try {
      const payload = {
        text,
        imageBase64,
        imageMimeType,
        location,
        reporterUID: auth.currentUser?.uid || 'anonymous'
      };

      const result = await submitIssue(payload);
      setSuccessData(result);
    } catch (err) {
      if (err.message.includes('429')) {
        setError('Too many submissions. Maximum 5 submissions per hour are allowed.');
      } else {
        setError('Failed to submit issue. Please try again.');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div className="badge badge-resolved" style={{ marginBottom: 16 }}>Issue Reported</div>
          <h2>Ticket #{successData.ticket_id?.slice(-6).toUpperCase() || 'NEW'}</h2>
          
          <div className="flex gap-md justify-center" style={{ margin: '20px 0' }}>
            <span className="badge badge-processing">{successData.category?.replace(/_/g, ' ')}</span>
            <span className={`badge`} style={{ background: '#333', color: '#fff' }}>Severity {successData.severity}/5</span>
          </div>

          <p>{successData.summary}</p>
          
          {successData.location_coords?.lat && (
            <div 
              ref={successMapRef} 
              style={{ marginTop: 24, borderRadius: 8, overflow: 'hidden', height: 250, border: '1px solid #333' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', background: '#111' }}>
                Loading map...
              </div>
            </div>
          )}

          <button className="btn btn-secondary" style={{ marginTop: 24 }} onClick={() => {
            setSuccessData(null);
            setText('');
            setImageBase64(null);
            setImageMimeType(null);
          }}>
            Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '1200px' }}>
      <div className="grid-2" style={{ gap: '40px', alignItems: 'start' }}>
        {/* Left Column: Form */}
        <div>
          <h1 style={{ marginBottom: 8 }}>Report an Issue</h1>
          <p style={{ marginBottom: 32 }}>Your voice matters. Describe the civic issue, and JanSetu will analyze, route, and escalate it automatically.</p>

          <form onSubmit={handleSubmit} className="card flex-col gap-lg">
            {error && <div className="callout danger" style={{ margin: 0 }}>{error}</div>}

            <div>
              <label>Describe the problem</label>
              <div className="flex gap-sm" style={{ marginBottom: 8 }}>
                {recognitionRef.current && (
                  <button 
                    type="button" 
                    className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`} 
                    onClick={toggleRecording}
                    style={{ flexShrink: 0 }}
                  >
                    {isRecording ? '🛑 Recording...' : '🎙️ Speak Hindi/English'}
                  </button>
                )}
              </div>
              <textarea 
                rows="4" 
                placeholder="e.g., Pipe bahar school ke paas toot gayi hai..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              ></textarea>
            </div>

            <div>
              <label>Attach Photo (Optional)</label>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              {!imageBase64 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  style={{
                    border: isDragging ? '2px solid var(--saffron)' : '2px dashed #333',
                    borderRadius: 12,
                    padding: '40px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    background: isDragging ? 'rgba(232, 105, 26, 0.06)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.5 }}>📷</div>
                  <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>
                    Drag an image here or <span style={{ color: 'var(--saffron)', textDecoration: 'underline', fontWeight: 600 }}>upload a file</span>
                  </p>
                  <p style={{ margin: '8px 0 0', color: '#555', fontSize: '0.75rem' }}>JPG, PNG, or WebP · Max 5 MB</p>
                </div>
              ) : (
                <div style={{
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(39, 174, 96, 0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.4rem' }}>✅</span>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#ccc', fontWeight: 600 }}>{imageName}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#27ae60' }}>Image attached successfully</p>
                    </div>
                  </div>
                  <button type="button" onClick={removeImage} style={{
                    background: 'rgba(231, 76, 60, 0.1)',
                    border: '1px solid rgba(231, 76, 60, 0.3)',
                    color: '#e74c3c',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}>Remove</button>
                </div>
              )}
            </div>

            <div>
              <label>Location</label>
              <div className="flex gap-sm items-center">
                <button type="button" className="btn btn-secondary" onClick={captureLocation}>
                  📍 {location ? 'Location Captured' : 'Use Current Location'}
                </button>
                {location && <span style={{ fontSize: '0.8rem', color: '#27ae60' }}>✓ Saved</span>}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary justify-center" 
              disabled={isSubmitting}
              style={{ marginTop: 16 }}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner"></div>
                  Processing with AI...
                </>
              ) : 'Submit Issue'}
            </button>
          </form>
        </div>

        {/* Right Column: Other User Reports from India */}
        <div className="card" style={{ maxHeight: '720px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🇮🇳 Live Citizen Reports</span>
            <span className="badge badge-processing" style={{ background: '#222', fontSize: 10 }}>India-wide feed</span>
          </h2>
          <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 20 }}>
            Recent civic issues automatically triaged, geocoded, and logged by JanSetu.
          </p>

          <div className="flex-col gap-md">
            {[
              {
                id: 'IND-01',
                region: 'Karol Bagh, New Delhi',
                category: 'water_leak',
                severity: 4,
                text: 'Water supply pipe leakage near Karol Bagh metro station, New Delhi. Water logging on main road.',
                status: 'open',
                time: '10 mins ago'
              },
              {
                id: 'IND-02',
                region: 'Salt Lake Sector V, Kolkata',
                category: 'garbage_dump',
                severity: 3,
                text: 'Huge garbage pile lying near Salt Lake sector V bus stand, Kolkata. Breeding ground for mosquitoes.',
                status: 'open',
                time: '25 mins ago'
              },
              {
                id: 'IND-03',
                region: 'Indiranagar, Bengaluru',
                category: 'road_damage',
                severity: 5,
                text: 'Potholes all over the flyover connecting Indiranagar to Domlur, Bengaluru. Highly dangerous for two wheelers.',
                status: 'escalated',
                time: '1 hour ago'
              },
              {
                id: 'IND-04',
                region: 'Gachibowli, Hyderabad',
                category: 'streetlight_broken',
                severity: 3,
                text: 'Streetlight not working since last 3 weeks near Gachibowli flyover side lane, Hyderabad. Very dark at night.',
                status: 'open',
                time: '3 hours ago'
              },
              {
                id: 'IND-05',
                region: 'Marine Drive, Mumbai',
                category: 'tree_fallen',
                severity: 4,
                text: 'Fallen tree blocking the main lane near Marine Drive promenade, Mumbai. Traffic disrupted.',
                status: 'resolved',
                time: '5 hours ago'
              },
              {
                id: 'IND-06',
                region: 'Sector 15, Chandigarh',
                category: 'drain_blocked',
                severity: 4,
                text: 'Drainage overflow causing dirty water to accumulate in Sector 15 market, Chandigarh. Foul smell.',
                status: 'open',
                time: '6 hours ago'
              },
              {
                id: 'IND-07',
                region: 'Anna Nagar, Chennai',
                category: 'road_damage',
                severity: 4,
                text: 'Road damage with deep craters near Anna Nagar West extension main road, Chennai. Causing vehicle damage.',
                status: 'open',
                time: '8 hours ago'
              },
              {
                id: 'IND-08',
                region: 'Gomti Nagar, Lucknow',
                category: 'illegal_construction',
                severity: 3,
                text: 'Illegal debris dumping near Gomti Nagar railway line side, Lucknow. Blocking the walking track.',
                status: 'open',
                time: '12 hours ago'
              },
              {
                id: 'IND-09',
                region: 'Mall Road, Shimla',
                category: 'drain_blocked',
                severity: 5,
                text: 'Open sewer cover near Mall Road, Shimla. Poses immediate danger to pedestrians in tourist area.',
                status: 'escalated',
                time: '1 day ago'
              },
              {
                id: 'IND-10',
                region: 'Swargate, Pune',
                category: 'streetlight_broken',
                severity: 5,
                text: 'Power cable hanging low near Swargate bus stand, Pune. Sparks flying when buses pass.',
                status: 'resolved',
                time: '2 days ago'
              }
            ].map(item => (
              <div 
                key={item.id} 
                className="card" 
                style={{ 
                  background: '#0f0f0f', 
                  border: '1px solid #222', 
                  padding: 16,
                  borderLeft: `3px solid ${
                    item.status === 'resolved' ? 'var(--green)' :
                    item.status === 'escalated' ? 'var(--red)' : 'var(--saffron)'
                  }`
                }}
              >
                <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                  <span className="badge" style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa', fontSize: 9 }}>
                    {item.region}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#666', fontFamily: 'var(--mono)' }}>{item.time}</span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: '#bbb', lineHeight: 1.5 }}>
                  "{item.text}"
                </p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-sm">
                    <span className="badge" style={{ background: 'rgba(232, 105, 26, 0.08)', color: 'var(--saffron)' }}>
                      {item.category.replace('_', ' ')}
                    </span>
                    <span className="badge" style={{ background: '#222', color: '#fff' }}>
                      Severity {item.severity}/5
                    </span>
                  </div>
                  <span className={`badge badge-${item.status}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
