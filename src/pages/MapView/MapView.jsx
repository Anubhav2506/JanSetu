import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import L from 'leaflet';

// Fix Leaflet default marker icon issue in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// CartoDB Positron tiles for clean, light-grey minimalist aesthetic (matching friend's map)
const CARTO_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const CARTO_TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Severity color mapping
const getSeverityColor = (severity) => {
  if (severity >= 5) return '#c0392b'; // Dark Red (Critical)
  if (severity === 4) return '#e74c3c'; // Red (High)
  if (severity === 3) return '#e67e22'; // Orange (Medium)
  if (severity === 2) return '#f39c12'; // Yellow (Low)
  return '#27ae60'; // Green (Very Low)
};

// SVG Paths for Category Icons
const CATEGORY_ICONS = {
  water_leak: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  `,
  garbage_dump: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  `,
  pothole: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  `,
  road_damage: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  `,
  illegal_construction: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <line x1="15" y1="3" x2="15" y2="21"></line>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="3" y1="15" x2="21" y2="15"></line>
    </svg>
  `,
  streetlight_broken: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .4 2.5 1.5 3.5.7.8 1.3 1.5 1.5 2.5"></path>
      <line x1="9" y1="18" x2="15" y2="18"></line>
      <line x1="10" y1="22" x2="14" y2="22"></line>
    </svg>
  `,
  default: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  `
};

// Generate Custom HTML Pin Icon
const createCustomPinIcon = (severity, category) => {
  const pinColor = getSeverityColor(severity);
  const iconSvg = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;

  // Modern HTML/CSS pin element mimicking Folium's AwesomeMarkers
  const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.3));
    ">
      <!-- Pin background shape -->
      <svg viewBox="0 0 384 512" style="
        position: absolute;
        top: 0;
        left: 0;
        width: 32px;
        height: 32px;
        fill: ${pinColor};
        stroke: #ffffff;
        stroke-width: 15px;
      ">
        <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
      </svg>
      <!-- Central icon container -->
      <div style="
        position: relative;
        z-index: 1;
        margin-top: -6px;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${iconSvg}
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-pin-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const MOCK_ISSUES = [
  {
    id: 'mock_map_1',
    category: 'water_leak',
    summary: 'A pipe bursts near a government school in Sector 12. Water is logging all over the street.',
    severity: 5,
    status: 'escalated',
    location_text: 'Sector 12, Chandigarh',
    location_coords: { lat: 30.7588, lng: 76.7685 }
  },
  {
    id: 'mock_map_2',
    category: 'streetlight_broken',
    summary: 'Streetlight not working on the corner of Sector 15. The road is pitch dark and unsafe.',
    severity: 3,
    status: 'open',
    location_text: 'Sector 15, Chandigarh',
    location_coords: { lat: 30.7516, lng: 76.7589 }
  },
  {
    id: 'mock_map_3',
    category: 'garbage_dump',
    summary: 'Municipal garbage container is overflowing. Stray dogs are scattering trash everywhere in Sector 22 market.',
    severity: 4,
    status: 'open',
    location_text: 'Sector 22 Market, Chandigarh',
    location_coords: { lat: 30.7380, lng: 76.7600 }
  },
  {
    id: 'mock_map_4',
    category: 'pothole',
    summary: 'Sector 35 pothole repaired. Level surface restored.',
    severity: 4,
    status: 'resolved',
    location_text: 'Sector 35-B, Chandigarh',
    location_coords: { lat: 30.7258, lng: 76.7522 }
  },
  {
    id: 'mock_map_5',
    category: 'road_damage',
    summary: 'Huge craters on Indiranagar flyover path, causing traffic blockages.',
    severity: 5,
    status: 'open',
    location_text: 'Indiranagar, Bengaluru',
    location_coords: { lat: 30.7410, lng: 76.7820 }
  },
  {
    id: 'mock_map_6',
    category: 'tree_fallen',
    summary: 'Fallen tree blocking the main lane near Sector 8 avenue.',
    severity: 4,
    status: 'resolved',
    location_text: 'Sector 8 Avenue, Chandigarh',
    location_coords: { lat: 30.7480, lng: 76.7900 }
  },
  {
    id: 'mock_map_7',
    category: 'drain_blocked',
    summary: 'Sewerage line backing up and flooding the Sector 34 library intersection.',
    severity: 5,
    status: 'escalated',
    location_text: 'Sector 34, Chandigarh',
    location_coords: { lat: 30.7230, lng: 76.7690 }
  },
  {
    id: 'mock_map_8',
    category: 'illegal_construction',
    summary: 'Commercial building rubble dumped illegally on roadside.',
    severity: 3,
    status: 'open',
    location_text: 'Swargate, Pune',
    location_coords: { lat: 30.7395, lng: 76.7940 }
  }
];

const MOCK_CLUSTERS = [
  {
    id: 'mock_cluster_1',
    zone: 'Sector 12',
    issue_type: 'water_leak',
    total_reports: 3,
    avg_severity: 4.7,
    coi_estimate: 85,
    risk_level: 'high',
    pattern_description: 'Recurrent leakage in major supply pipeline near school zones.',
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
    }
  },
  {
    id: 'mock_cluster_2',
    zone: 'Sector 22',
    issue_type: 'garbage_dump',
    total_reports: 5,
    avg_severity: 4.0,
    coi_estimate: 70,
    risk_level: 'medium',
    pattern_description: 'Commercial collection backlog in dense market sector.',
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
    }
  }
];

export default function MapView() {
  const [issues, setIssues] = useState(MOCK_ISSUES);
  const [clusters, setClusters] = useState(MOCK_CLUSTERS);
  const [loading, setLoading] = useState(true);
  
  // Interactive client-side filters
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const markersLayerRef = useRef(null);
  const polygonsLayerRef = useRef(null);
  const issueMarkersRef = useRef({}); // Store markers by issue ID for performance

  // Initialize Leaflet map once
  useEffect(() => {
    if (map || !mapContainerRef.current) return;

    const containerEl = mapContainerRef.current;

    const mapInst = L.map(containerEl, {
      center: [30.7333, 76.7794], // Chandigarh
      zoom: 12,
      zoomControl: true,
      attributionControl: true
    });

    // CartoDB Positron style tile layer
    L.tileLayer(CARTO_TILE_URL, {
      attribution: CARTO_TILE_ATTR,
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
    }).addTo(mapInst);

    markersLayerRef.current = L.layerGroup().addTo(mapInst);
    polygonsLayerRef.current = L.layerGroup().addTo(mapInst);

    setMap(mapInst);
    window.JANSETU_MAP = mapInst;
    setLoading(false);

    mapInst.whenReady(() => {
        mapInst.invalidateSize(true);
    });
    const timeout1 = setTimeout(() => mapInst.invalidateSize(true), 250);
    const timeout2 = setTimeout(() => mapInst.invalidateSize(true), 500);
    const timeout3 = setTimeout(() => mapInst.invalidateSize(true), 1000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      if (mapInst) {
        mapInst.remove();
        setMap(null);
        window.JANSETU_MAP = null;
      }
      issueMarkersRef.current = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle resizing helper
  useEffect(() => {
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, [map]);

  // Listen to Firestore Issues & Clusters
  useEffect(() => {
    const issuesQuery = query(collection(db, 'issues'), limit(100));
    const unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
      const issuesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIssues([...MOCK_ISSUES, ...issuesList]);
      setLoading(false);
    });

    const clustersQuery = query(collection(db, 'clusters'));
    const unsubscribeClusters = onSnapshot(clustersQuery, (snapshot) => {
      const clustersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClusters([...MOCK_CLUSTERS, ...clustersList]);
    });

    return () => {
      unsubscribeIssues();
      unsubscribeClusters();
    };
  }, []);

  // Compute filtered issues list instantly client-side
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Category Filter
      if (filterCategory !== 'ALL' && issue.category !== filterCategory) {
        return false;
      }
      
      // Severity Filter
      if (filterSeverity !== 'ALL') {
        if (filterSeverity === 'HIGH' && issue.severity < 4) return false;
        if (filterSeverity === 'LOW' && issue.severity >= 4) return false;
      }

      // Status Filter
      if (filterStatus !== 'ALL' && issue.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [issues, filterCategory, filterSeverity, filterStatus]);

  // Render markers and polygons when data, map, or filters change
  useEffect(() => {
    if (!map) return;

    // Clear previous layers
    if (markersLayerRef.current) markersLayerRef.current.clearLayers();
    if (polygonsLayerRef.current) polygonsLayerRef.current.clearLayers();
    issueMarkersRef.current = {};

    // --- Render Filtered Issue Markers (using custom HTML pins) ---
    filteredIssues.forEach(issue => {
      const lat = issue.location_coords?.lat;
      const lng = issue.location_coords?.lng;
      if (!lat || !lng) return;

      const pinIcon = createCustomPinIcon(issue.severity, issue.category);

      const marker = L.marker([lat, lng], { icon: pinIcon });

      const severityBadgeColor = getSeverityColor(issue.severity);
      
      // Highly-detailed popup content matching dashboard design
      const popupContent = `
        <div style="
          color: #111;
          padding: 8px 12px;
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 250px;
          border-radius: 8px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h4 style="margin: 0; color: #111; text-transform: capitalize; font-size: 13px; font-weight: 700;">
              ${issue.category ? issue.category.replace(/_/g, ' ') : 'Civic Issue'}
            </h4>
            <span style="
              background: ${issue.status === 'resolved' ? '#e8f5ee' : issue.status === 'escalated' ? '#fdf0e7' : '#eaf2f8'};
              color: ${issue.status === 'resolved' ? '#1e7a4a' : issue.status === 'escalated' ? '#e8691a' : '#2980b9'};
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              border: 1px solid currentColor;
            ">
              ${issue.status}
            </span>
          </div>

          <p style="margin: 0 0 10px 0; font-size: 12px; color: #555; line-height: 1.4; font-style: italic;">
            "${issue.summary || issue.raw_input || 'No description provided.'}"
          </p>

          <div style="
            border-top: 1px solid #eee;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <span style="font-size: 10px; color: #777;">
              Severity: <strong style="color: ${severityBadgeColor};">${issue.severity}/5</strong>
            </span>
            <span style="font-size: 10px; color: #888; font-family: monospace;">
              Ref: ${issue.id.slice(-6).toUpperCase()}
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 270, closeButton: false });

      // Store reference
      issueMarkersRef.current[issue.id] = marker;
      markersLayerRef.current.addLayer(marker);
    });

    // --- Render Cluster Risk Polygons ---
    clusters.forEach(cluster => {
      if (!cluster.risk_geojson?.geometry?.coordinates) return;

      try {
        const coordinates = cluster.risk_geojson.geometry.coordinates[0].map(coord => [
          coord[1], // lat
          coord[0], // lng
        ]);

        let polygonColor = '#f1c40f';
        if (cluster.risk_level === 'high') polygonColor = '#c0392b';
        else if (cluster.risk_level === 'medium') polygonColor = '#e67e22';

        const polygon = L.polygon(coordinates, {
          color: polygonColor,
          weight: cluster.risk_level === 'high' ? 2 : 1.5,
          opacity: 0.8,
          fillColor: polygonColor,
          fillOpacity: cluster.risk_level === 'high' ? 0.22 : 0.12,
        });

        const clusterPopup = `
          <div style="color: #111; padding: 4px; font-family: system-ui, sans-serif; max-width: 250px;">
            <h4 style="margin: 0 0 4px 0; color: #1a6e6e; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; font-weight: 700;">
              AI Risk Zone · ${cluster.zone || 'Zone'}
            </h4>
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; color: ${polygonColor === '#c0392b' ? '#c0392b' : '#d35400'}">
              ${cluster.issue_type ? cluster.issue_type.replace(/_/g, ' ').toUpperCase() : 'CIVIC'} CLUSTER
            </p>
            <p style="margin: 0 0 8px 0; font-size: 11px; line-height: 1.4; color: #555;">
              ${cluster.pattern_description || 'Active cluster risk area.'}
            </p>
            <div style="border-top: 1px solid #eee; padding-top: 6px; display: flex; justify-content: space-between; font-size: 10px; color: #666;">
              <span>Total Reports: <strong>${cluster.total_reports}</strong></span>
              <span>COI Index: <strong style="color: #e8691a;">${cluster.coi_estimate}/100</strong></span>
            </div>
          </div>
        `;

        polygon.bindPopup(clusterPopup, { maxWidth: 280 });
        polygonsLayerRef.current.addLayer(polygon);
      } catch (err) {
        console.error('Failed parsing cluster polygon coordinates:', err);
      }
    });

    // Recalculate container size to resolve any layout/tile glitching
    setTimeout(() => {
      if (map) map.invalidateSize(true);
    }, 100);

  }, [filteredIssues, clusters, map]); // Rerender layer list when filtered list changes

  const handleIssueClick = useCallback((issue) => {
    if (!map || !issue.location_coords) return;

    map.setView([issue.location_coords.lat, issue.location_coords.lng], 15, { animate: true });

    const marker = issueMarkersRef.current[issue.id];
    if (marker) {
      marker.openPopup();
    }
  }, [map]);

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <header className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: 4 }}>Live Issue Map</h1>
          <p style={{ margin: 0 }}>Interactive geocoded markers and cost-of-inaction risk zones</p>
        </div>
      </header>

      {/* Filter Toolbar Panel */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#888', letterSpacing: '0.1em' }}>CATEGORY</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 4, background: '#111', border: '1px solid #222', color: '#eee', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Categories</option>
            <option value="water_leak">Water Leaks</option>
            <option value="garbage_dump">Garbage Accumulation</option>
            <option value="pothole">Potholes</option>
            <option value="road_damage">Road Damage</option>
            <option value="streetlight_broken">Streetlights</option>
            <option value="illegal_construction">Construction Violations</option>
            <option value="drain_blocked">Blocked Drains</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#888', letterSpacing: '0.1em' }}>SEVERITY</label>
          <select 
            value={filterSeverity} 
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 4, background: '#111', border: '1px solid #222', color: '#eee', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Severities</option>
            <option value="HIGH">High / Critical (4+)</option>
            <option value="LOW">Low / Medium (1-3)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#888', letterSpacing: '0.1em' }}>STATUS</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 4, background: '#111', border: '1px solid #222', color: '#eee', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="open">Open</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--saffron)' }}>
          Showing <strong>{filteredIssues.length}</strong> of <strong>{issues.length}</strong> reports
        </div>
      </div>

      <div className="grid-2">
        {/* Dynamic Map Div */}
        <div 
          className="card map-card-container" 
          style={{ padding: 0, overflow: 'hidden', height: '600px', position: 'relative', minHeight: '600px' }}
        >
          <div 
            ref={mapContainerRef}
            style={{ width: '100%', height: '600px', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          ></div>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(18,18,18,0.85)' }}>
              <div className="spinner"></div>
              <p style={{ color: '#888' }}>Loading Map & Issues...</p>
            </div>
          )}
        </div>

        {/* Sidebar Issue List */}
        <div className="flex-col gap-md" style={{ overflowY: 'auto', height: '600px', paddingRight: 12 }}>
          <h3 style={{ borderBottom: '1px solid #222', paddingBottom: 12, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Active Reports</span>
            <span className="badge badge-processing" style={{ background: '#222' }}>{filteredIssues.length} Matches</span>
          </h3>
          
          {loading && <div className="spinner" style={{ margin: '40px auto' }}></div>}
          
          {filteredIssues.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
              No issues match the selected filters.
            </div>
          ) : (
            filteredIssues.map(issue => (
              <div 
                key={issue.id} 
                className="card" 
                style={{ 
                  padding: '16px', 
                  cursor: 'pointer', 
                  transition: 'border-color 0.2s, transform 0.2s',
                  borderLeft: `3px solid ${
                    issue.status === 'resolved' ? 'var(--green)' :
                    issue.severity >= 4 ? 'var(--red)' : 'var(--saffron)'
                  }`
                }}
                onClick={() => handleIssueClick(issue)}
              >
                <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                  <span className={`badge badge-${issue.status === 'open' ? 'open' : issue.status === 'resolved' ? 'resolved' : 'processing'}`}>
                    {issue.status}
                  </span>
                  <span 
                    className="severity-dot" 
                    style={{ 
                      background: getSeverityColor(issue.severity),
                      boxShadow: issue.severity >= 5 ? '0 0 8px var(--red)' : 'none'
                    }}
                  ></span>
                </div>
                <h4 style={{ marginBottom: 4, color: 'var(--paper)', fontSize: '0.95rem', fontWeight: 700 }}>
                  {issue.category ? issue.category.replace(/_/g, ' ') : 'Civic Issue'}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8, fontFamily: 'var(--mono)' }}>
                  📍 {issue.location_text || 'Location unknown'}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#888', margin: 0, fontStyle: 'italic' }}>
                  &quot;{issue.summary || (issue.raw_input && issue.raw_input.substring(0, 70) + '...') || 'No details'}&quot;
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
