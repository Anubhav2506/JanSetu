import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { seedDemoData } from '../../services/demoSeeder';
import L from 'leaflet';

// Fix Leaflet default marker icon issue in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// OpenStreetMap tile layer for better compatibility
const DARK_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Severity color mapping function for reusability
const getSeverityColor = (severity) => {
  switch (true) {
    case severity >= 5:
      return '#c0392b';
    case severity === 4:
      return '#e74c3c';
    case severity === 3:
      return '#e67e22';
    case severity === 2:
      return '#f39c12';
    default:
      return '#27ae60';
  }
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

    L.tileLayer(DARK_TILE_URL, {
      attribution: DARK_TILE_ATTR,
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
    }).addTo(mapInst);

    markersLayerRef.current = L.layerGroup().addTo(mapInst);
    polygonsLayerRef.current = L.layerGroup().addTo(mapInst);

    setMap(mapInst);
    window.JANSETU_MAP = mapInst;
    setLoading(false);

    // Multiple delayed invalidateSize calls to ensure full tile rendering
    mapInst.whenReady(() => {
        mapInst.invalidateSize(true);
    });
    const timeout1 = setTimeout(() => mapInst.invalidateSize(true), 250);
    const timeout2 = setTimeout(() => mapInst.invalidateSize(true), 500);
    const timeout3 = setTimeout(() => mapInst.invalidateSize(true), 1000);

    // Cleanup on unmount
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

  // Ensure map resizes properly after container is fully rendered
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

  // Render markers and polygons when data or map changes
  useEffect(() => {
    if (!map) return;

    // Clear previous layers
    if (markersLayerRef.current) markersLayerRef.current.clearLayers();
    if (polygonsLayerRef.current) polygonsLayerRef.current.clearLayers();
    issueMarkersRef.current = {};

    // --- Render Issue Markers ---
    issues.forEach(issue => {
      const lat = issue.location_coords?.lat;
      const lng = issue.location_coords?.lng;
      if (!lat || !lng) return;

      // Severity color mapping
      const markerColor = getSeverityColor(issue.severity);

      // Create a circle marker (looks great on dark tiles)
      const circleMarker = L.circleMarker([lat, lng], {
        radius: 7.5,
        fillColor: markerColor,
        fillOpacity: 0.9,
        color: '#ffffff',
        weight: 1.5,
      });

      // Popup content
      const popupContent = `
        <div style="color: #111; padding: 4px; font-family: system-ui, sans-serif; max-width: 240px;">
          <h4 style="margin: 0 0 6px 0; color: #e8691a; text-transform: capitalize; font-size: 13px; font-weight: 700;">
            ${issue.category ? issue.category.replace(/_/g, ' ') : 'Civic Issue'}
          </h4>
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #333; line-height: 1.4;">
            "${issue.summary || issue.raw_input || 'No description provided.'}"
          </p>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span style="background: #f7f5f0; border: 1px solid #ddd; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; color: #444;">
              Severity ${issue.severity}/5
            </span>
            <span style="background: ${issue.status === 'resolved' ? '#e8f5ee' : '#fdf0e7'}; color: ${issue.status === 'resolved' ? '#1e7a4a' : '#e8691a'}; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 700; text-transform: uppercase;">
              ${issue.status}
            </span>
          </div>
        </div>
      `;

      circleMarker.bindPopup(popupContent, { maxWidth: 260 });

      // Store reference on the issue object and in ref for sidebar click interaction
      issueMarkersRef.current[issue.id] = circleMarker;

      markersLayerRef.current.addLayer(circleMarker);
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

  }, [issues, clusters, map]);

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
            <span className="badge badge-processing" style={{ background: '#222' }}>{issues.length} Total</span>
          </h3>
          
          {loading && <div className="spinner" style={{ margin: '40px auto' }}></div>}
          


          {issues.map(issue => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
