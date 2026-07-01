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

// CartoDB Voyager tiles for a colorful, high-fidelity aesthetic (parks, water, and highways highlighted)
const CARTO_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
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
    id: 'mock_map_chandigarh_1',
    category: 'streetlight_broken',
    summary: 'Streetlight failure causing safety hazard at night near Government School in Sector 12.',
    severity: 1,
    status: 'escalated',
    location_text: 'Government School, Sector 12, Chandigarh',
    location_coords: { lat: 30.74749, lng: 76.78651 },
    coi_score: 4.8,
    raw_input: 'Government School, Sector 12 area me: Streetlight kharab hai aur raat ko andhera rehta hai. Please repair soon.',
    zone: 'Sector 12'
  },
  {
    id: 'mock_map_chandigarh_2',
    category: 'road_damage',
    summary: 'Severe asphalt erosion and broken road surface near Main Market Corner in Sector 15.',
    severity: 2,
    status: 'resolved',
    location_text: 'Main Market Corner, Sector 15, Chandigarh',
    location_coords: { lat: 30.72254, lng: 76.76597 },
    coi_score: 5.4,
    raw_input: 'Main Market Corner, Sector 15 area me: Sadak toot gayi hai aur vehicle nikalne me dikkat ho rahi hai. Please repair soon.',
    zone: 'Sector 15'
  },
  {
    id: 'mock_map_chandigarh_3',
    category: 'pothole',
    summary: 'Deep pothole dangerous for two-wheelers near Market Parking Area in Sector 22.',
    severity: 3,
    status: 'open',
    location_text: 'Market Parking Area, Sector 22, Chandigarh',
    location_coords: { lat: 30.74611, lng: 76.77495 },
    coi_score: 7.4,
    raw_input: 'Market Parking Area, Sector 22 area me: Bada gaddha hai, accident hone ka darr hai. Please repair soon.',
    zone: 'Sector 22'
  },
  {
    id: 'mock_map_chandigarh_4',
    category: 'illegal_construction',
    summary: 'Illegal construction debris dumped on public road near Outer Circular Road in Sector 35-B.',
    severity: 4,
    status: 'escalated',
    location_text: 'Outer Circular Road, Sector 35-B, Chandigarh',
    location_coords: { lat: 30.74369, lng: 76.77953 },
    coi_score: 8.4,
    raw_input: 'Outer Circular Road, Sector 35-B area me: Sadak par building ka malba fenka gaya hai. Please repair soon.',
    zone: 'Sector 35-B'
  },
  {
    id: 'mock_map_chandigarh_5',
    category: 'tree_fallen',
    summary: 'Fallen tree blocking the primary transit lane near Avenue Road in Sector 8.',
    severity: 5,
    status: 'resolved',
    location_text: 'Avenue Road, Sector 8, Chandigarh',
    location_coords: { lat: 30.74034, lng: 76.76999 },
    coi_score: 9.9,
    raw_input: 'Avenue Road, Sector 8 area me: Ped gir gaya hai aur rasta block ho gaya hai. Please repair soon.',
    zone: 'Sector 8'
  },
  {
    id: 'mock_map_chandigarh_6',
    category: 'drain_blocked',
    summary: 'Blocked drainage line flooding the local intersection near Library Intersection in Sector 34.',
    severity: 1,
    status: 'open',
    location_text: 'Library Intersection, Sector 34, Chandigarh',
    location_coords: { lat: 30.74566, lng: 76.78121 },
    coi_score: 4.4,
    raw_input: 'Library Intersection, Sector 34 area me: Nala block ho gaya hai aur paani bhad raha hai. Please repair soon.',
    zone: 'Sector 34'
  },
  {
    id: 'mock_map_chandigarh_7',
    category: 'water_leak',
    summary: 'water pipe leak causing municipal supply wastage near Shopping Plaza in Sector 17.',
    severity: 2,
    status: 'escalated',
    location_text: 'Shopping Plaza, Sector 17, Chandigarh',
    location_coords: { lat: 30.7475, lng: 76.77177 },
    coi_score: 6.3,
    raw_input: 'Shopping Plaza, Sector 17 area me: Paani ki pipe tootne se paani waste ho raha hai. Please repair soon.',
    zone: 'Sector 17'
  },
  {
    id: 'mock_map_chandigarh_8',
    category: 'garbage_dump',
    summary: 'Overflowing waste bin and scattered garbage accumulation near Industrial Area Road in Sector 26.',
    severity: 3,
    status: 'resolved',
    location_text: 'Industrial Area Road, Sector 26, Chandigarh',
    location_coords: { lat: 30.72608, lng: 76.77719 },
    coi_score: 6.7,
    raw_input: 'Industrial Area Road, Sector 26 area me: Kachra patra bhar gaya hai aur gandagi phaili hui hai. Please repair soon.',
    zone: 'Sector 26'
  },
  {
    id: 'mock_map_chandigarh_9',
    category: 'streetlight_broken',
    summary: 'Streetlight failure causing safety hazard at night near Interstate Bus Terminal in Sector 43.',
    severity: 4,
    status: 'open',
    location_text: 'Interstate Bus Terminal, Sector 43, Chandigarh',
    location_coords: { lat: 30.72695, lng: 76.78899 },
    coi_score: 8.3,
    raw_input: 'Interstate Bus Terminal, Sector 43 area me: Streetlight kharab hai aur raat ko andhera rehta hai. Please repair soon.',
    zone: 'Sector 43'
  },
  {
    id: 'mock_map_chandigarh_10',
    category: 'road_damage',
    summary: 'Severe asphalt erosion and broken road surface near Residential Boulevard in Sector 19.',
    severity: 5,
    status: 'escalated',
    location_text: 'Residential Boulevard, Sector 19, Chandigarh',
    location_coords: { lat: 30.73416, lng: 76.78238 },
    coi_score: 9.6,
    raw_input: 'Residential Boulevard, Sector 19 area me: Sadak toot gayi hai aur vehicle nikalne me dikkat ho rahi hai. Please repair soon.',
    zone: 'Sector 19'
  },
  {
    id: 'mock_map_bengaluru_1',
    category: 'garbage_dump',
    summary: 'Overflowing waste bin and scattered garbage accumulation near 100 Feet Road in Indiranagar.',
    severity: 1,
    status: 'open',
    location_text: '100 Feet Road, Indiranagar, Bengaluru',
    location_coords: { lat: 12.96609, lng: 77.59695 },
    coi_score: 4.5,
    raw_input: '100 Feet Road, Indiranagar area me: Kachra patra bhar gaya hai aur gandagi phaili hui hai. Please repair soon.',
    zone: 'Indiranagar'
  },
  {
    id: 'mock_map_bengaluru_2',
    category: 'streetlight_broken',
    summary: 'Streetlight failure causing safety hazard at night near Sony World Signal in Koramangala.',
    severity: 2,
    status: 'escalated',
    location_text: 'Sony World Signal, Koramangala, Bengaluru',
    location_coords: { lat: 12.96073, lng: 77.60399 },
    coi_score: 5.6,
    raw_input: 'Sony World Signal, Koramangala area me: Streetlight kharab hai aur raat ko andhera rehta hai. Please repair soon.',
    zone: 'Koramangala'
  },
  {
    id: 'mock_map_bengaluru_3',
    category: 'road_damage',
    summary: 'Severe asphalt erosion and broken road surface near ITPB Main Gate in Whitefield.',
    severity: 3,
    status: 'resolved',
    location_text: 'ITPB Main Gate, Whitefield, Bengaluru',
    location_coords: { lat: 12.9617, lng: 77.59473 },
    coi_score: 7.2,
    raw_input: 'ITPB Main Gate, Whitefield area me: Sadak toot gayi hai aur vehicle nikalne me dikkat ho rahi hai. Please repair soon.',
    zone: 'Whitefield'
  },
  {
    id: 'mock_map_bengaluru_4',
    category: 'pothole',
    summary: 'Deep pothole dangerous for two-wheelers near Outer Ring Road Junction in HSR Layout.',
    severity: 4,
    status: 'open',
    location_text: 'Outer Ring Road Junction, HSR Layout, Bengaluru',
    location_coords: { lat: 12.97143, lng: 77.60201 },
    coi_score: 8.1,
    raw_input: 'Outer Ring Road Junction, HSR Layout area me: Bada gaddha hai, accident hone ka darr hai. Please repair soon.',
    zone: 'HSR Layout'
  },
  {
    id: 'mock_map_bengaluru_5',
    category: 'illegal_construction',
    summary: 'Illegal construction debris dumped on public road near Metro Station Entrance in MG Road.',
    severity: 5,
    status: 'escalated',
    location_text: 'Metro Station Entrance, MG Road, Bengaluru',
    location_coords: { lat: 12.95846, lng: 77.60472 },
    coi_score: 9.3,
    raw_input: 'Metro Station Entrance, MG Road area me: Sadak par building ka malba fenka gaya hai. Please repair soon.',
    zone: 'MG Road'
  },
  {
    id: 'mock_map_bengaluru_6',
    category: 'tree_fallen',
    summary: 'Fallen tree blocking the primary transit lane near 8th Cross Road in Malleshwaram.',
    severity: 1,
    status: 'resolved',
    location_text: '8th Cross Road, Malleshwaram, Bengaluru',
    location_coords: { lat: 12.98248, lng: 77.60413 },
    coi_score: 4.3,
    raw_input: '8th Cross Road, Malleshwaram area me: Ped gir gaya hai aur rasta block ho gaya hai. Please repair soon.',
    zone: 'Malleshwaram'
  },
  {
    id: 'mock_map_bengaluru_7',
    category: 'drain_blocked',
    summary: 'Blocked drainage line flooding the local intersection near 4th Block Complex in Jayanagar.',
    severity: 2,
    status: 'open',
    location_text: '4th Block Complex, Jayanagar, Bengaluru',
    location_coords: { lat: 12.96148, lng: 77.60467 },
    coi_score: 5.5,
    raw_input: '4th Block Complex, Jayanagar area me: Nala block ho gaya hai aur paani bhad raha hai. Please repair soon.',
    zone: 'Jayanagar'
  },
  {
    id: 'mock_map_bengaluru_8',
    category: 'water_leak',
    summary: 'water pipe leak causing municipal supply wastage near Phase 1 Flyover Exit in Electronic City.',
    severity: 3,
    status: 'escalated',
    location_text: 'Phase 1 Flyover Exit, Electronic City, Bengaluru',
    location_coords: { lat: 12.98508, lng: 77.60343 },
    coi_score: 7.4,
    raw_input: 'Phase 1 Flyover Exit, Electronic City area me: Paani ki pipe tootne se paani waste ho raha hai. Please repair soon.',
    zone: 'Electronic City'
  },
  {
    id: 'mock_map_bengaluru_9',
    category: 'garbage_dump',
    summary: 'Overflowing waste bin and scattered garbage accumulation near Bashyam Circle in Sadashivanagar.',
    severity: 4,
    status: 'resolved',
    location_text: 'Bashyam Circle, Sadashivanagar, Bengaluru',
    location_coords: { lat: 12.97198, lng: 77.59628 },
    coi_score: 8.7,
    raw_input: 'Bashyam Circle, Sadashivanagar area me: Kachra patra bhar gaya hai aur gandagi phaili hui hai. Please repair soon.',
    zone: 'Sadashivanagar'
  },
  {
    id: 'mock_map_bengaluru_10',
    category: 'streetlight_broken',
    summary: 'Streetlight failure causing safety hazard at night near Water Tank Junction in BTM Layout.',
    severity: 5,
    status: 'open',
    location_text: 'Water Tank Junction, BTM Layout, Bengaluru',
    location_coords: { lat: 12.96289, lng: 77.58109 },
    coi_score: 9.1,
    raw_input: 'Water Tank Junction, BTM Layout area me: Streetlight kharab hai aur raat ko andhera rehta hai. Please repair soon.',
    zone: 'BTM Layout'
  },
  {
    id: 'mock_map_pune_1',
    category: 'pothole',
    summary: 'Deep pothole dangerous for two-wheelers near Bus Stand Road in Swargate.',
    severity: 1,
    status: 'escalated',
    location_text: 'Bus Stand Road, Swargate, Pune',
    location_coords: { lat: 18.51818, lng: 73.85957 },
    coi_score: 4.5,
    raw_input: 'Bus Stand Road, Swargate area me: Bada gaddha hai, accident hone ka darr hai. Please repair soon.',
    zone: 'Swargate'
  },
  {
    id: 'mock_map_pune_2',
    category: 'illegal_construction',
    summary: 'Illegal construction debris dumped on public road near Karve Road Circle in Kothrud.',
    severity: 2,
    status: 'resolved',
    location_text: 'Karve Road Circle, Kothrud, Pune',
    location_coords: { lat: 18.51337, lng: 73.8464 },
    coi_score: 6.2,
    raw_input: 'Karve Road Circle, Kothrud area me: Sadak par building ka malba fenka gaya hai. Please repair soon.',
    zone: 'Kothrud'
  },
  {
    id: 'mock_map_pune_3',
    category: 'tree_fallen',
    summary: 'Fallen tree blocking the primary transit lane near Good Luck Cafe Junction in Deccan Gymkhana.',
    severity: 3,
    status: 'open',
    location_text: 'Good Luck Cafe Junction, Deccan Gymkhana, Pune',
    location_coords: { lat: 18.51878, lng: 73.86411 },
    coi_score: 6.7,
    raw_input: 'Good Luck Cafe Junction, Deccan Gymkhana area me: Ped gir gaya hai aur rasta block ho gaya hai. Please repair soon.',
    zone: 'Deccan Gymkhana'
  },
  {
    id: 'mock_map_pune_4',
    category: 'drain_blocked',
    summary: 'Blocked drainage line flooding the local intersection near Symbiosis Road in Viman Nagar.',
    severity: 4,
    status: 'escalated',
    location_text: 'Symbiosis Road, Viman Nagar, Pune',
    location_coords: { lat: 18.52307, lng: 73.85289 },
    coi_score: 7.8,
    raw_input: 'Symbiosis Road, Viman Nagar area me: Nala block ho gaya hai aur paani bhad raha hai. Please repair soon.',
    zone: 'Viman Nagar'
  },
  {
    id: 'mock_map_pune_5',
    category: 'water_leak',
    summary: 'water pipe leak causing municipal supply wastage near Phase 2 IT Park Corridor in Hinjewadi.',
    severity: 5,
    status: 'resolved',
    location_text: 'Phase 2 IT Park Corridor, Hinjewadi, Pune',
    location_coords: { lat: 18.52386, lng: 73.8511 },
    coi_score: 9.7,
    raw_input: 'Phase 2 IT Park Corridor, Hinjewadi area me: Paani ki pipe tootne se paani waste ho raha hai. Please repair soon.',
    zone: 'Hinjewadi'
  },
  {
    id: 'mock_map_pune_6',
    category: 'garbage_dump',
    summary: 'Overflowing waste bin and scattered garbage accumulation near District Court Metro Gate in Shivajinagar.',
    severity: 1,
    status: 'open',
    location_text: 'District Court Metro Gate, Shivajinagar, Pune',
    location_coords: { lat: 18.51119, lng: 73.84411 },
    coi_score: 4.8,
    raw_input: 'District Court Metro Gate, Shivajinagar area me: Kachra patra bhar gaya hai aur gandagi phaili hui hai. Please repair soon.',
    zone: 'Shivajinagar'
  },
  {
    id: 'mock_map_pune_7',
    category: 'streetlight_broken',
    summary: 'Streetlight failure causing safety hazard at night near High Street Outer Lane in Baner.',
    severity: 2,
    status: 'escalated',
    location_text: 'High Street Outer Lane, Baner, Pune',
    location_coords: { lat: 18.50888, lng: 73.84234 },
    coi_score: 5.9,
    raw_input: 'High Street Outer Lane, Baner area me: Streetlight kharab hai aur raat ko andhera rehta hai. Please repair soon.',
    zone: 'Baner'
  },
  {
    id: 'mock_map_pune_8',
    category: 'road_damage',
    summary: 'Severe asphalt erosion and broken road surface near Bremen Circle in Aundh.',
    severity: 3,
    status: 'resolved',
    location_text: 'Bremen Circle, Aundh, Pune',
    location_coords: { lat: 18.50801, lng: 73.86804 },
    coi_score: 7.1,
    raw_input: 'Bremen Circle, Aundh area me: Sadak toot gayi hai aur vehicle nikalne me dikkat ho rahi hai. Please repair soon.',
    zone: 'Aundh'
  },
  {
    id: 'mock_map_pune_9',
    category: 'pothole',
    summary: 'Deep pothole dangerous for two-wheelers near Magarpatta Bypass in Hadapsar.',
    severity: 4,
    status: 'open',
    location_text: 'Magarpatta Bypass, Hadapsar, Pune',
    location_coords: { lat: 18.52698, lng: 73.84445 },
    coi_score: 8.0,
    raw_input: 'Magarpatta Bypass, Hadapsar area me: Bada gaddha hai, accident hone ka darr hai. Please repair soon.',
    zone: 'Hadapsar'
  },
  {
    id: 'mock_map_pune_10',
    category: 'illegal_construction',
    summary: 'Illegal construction debris dumped on public road near Joggers Park Corner in Kalyani Nagar.',
    severity: 5,
    status: 'escalated',
    location_text: 'Joggers Park Corner, Kalyani Nagar, Pune',
    location_coords: { lat: 18.51715, lng: 73.8649 },
    coi_score: 9.4,
    raw_input: 'Joggers Park Corner, Kalyani Nagar area me: Sadak par building ka malba fenka gaya hai. Please repair soon.',
    zone: 'Kalyani Nagar'
  },
  {
    id: 'mock_map_jaipur_1',
    category: 'tree_fallen',
    summary: 'Fallen tree blocking the primary transit lane near Central Park Outer Lane in C-Scheme.',
    severity: 1,
    status: 'open',
    location_text: 'Central Park Outer Lane, C-Scheme, Jaipur',
    location_coords: { lat: 26.91639, lng: 75.80129 },
    coi_score: 5.0,
    raw_input: 'Central Park Outer Lane, C-Scheme area me: Ped gir gaya hai aur rasta block ho gaya hai. Please repair soon.',
    zone: 'C-Scheme'
  },
  {
    id: 'mock_map_jaipur_2',
    category: 'drain_blocked',
    summary: 'Blocked drainage line flooding the local intersection near GT Mall Crossing in Malviya Nagar.',
    severity: 2,
    status: 'escalated',
    location_text: 'GT Mall Crossing, Malviya Nagar, Jaipur',
    location_coords: { lat: 26.90809, lng: 75.79038 },
    coi_score: 5.8,
    raw_input: 'GT Mall Crossing, Malviya Nagar area me: Nala block ho gaya hai aur paani bhad raha hai. Please repair soon.',
    zone: 'Malviya Nagar'
  },
  {
    id: 'mock_map_jaipur_3',
    category: 'water_leak',
    summary: 'water pipe leak causing municipal supply wastage near Amrapali Marg in Vaishali Nagar.',
    severity: 3,
    status: 'resolved',
    location_text: 'Amrapali Marg, Vaishali Nagar, Jaipur',
    location_coords: { lat: 26.9246, lng: 75.7748 },
    coi_score: 7.5,
    raw_input: 'Amrapali Marg, Vaishali Nagar area me: Paani ki pipe tootne se paani waste ho raha hai. Please repair soon.',
    zone: 'Vaishali Nagar'
  },
  {
    id: 'mock_map_jaipur_4',
    category: 'garbage_dump',
    summary: 'Overflowing waste bin and scattered garbage accumulation near Metro Station Depot in Mansarovar.',
    severity: 4,
    status: 'open',
    location_text: 'Metro Station Depot, Mansarovar, Jaipur',
    location_coords: { lat: 26.92169, lng: 75.78681 },
    coi_score: 8.7,
    raw_input: 'Metro Station Depot, Mansarovar area me: Kachra patra bhar gaya hai aur gandagi phaili hui hai. Please repair soon.',
    zone: 'Mansarovar'
  },
  {
    id: 'mock_map_jaipur_5',
    category: 'streetlight_broken',
    summary: 'Streetlight failure causing safety hazard at night near Gali Number 3 in Raja Park.',
    severity: 5,
    status: 'escalated',
    location_text: 'Gali Number 3, Raja Park, Jaipur',
    location_coords: { lat: 26.92391, lng: 75.78441 },
    coi_score: 9.1,
    raw_input: 'Gali Number 3, Raja Park area me: Streetlight kharab hai aur raat ko andhera rehta hai. Please repair soon.',
    zone: 'Raja Park'
  },
  {
    id: 'mock_map_jaipur_6',
    category: 'road_damage',
    summary: 'Severe asphalt erosion and broken road surface near Elevated Road Entry Pillar in Sodala.',
    severity: 1,
    status: 'resolved',
    location_text: 'Elevated Road Entry Pillar, Sodala, Jaipur',
    location_coords: { lat: 26.91891, lng: 75.7797 },
    coi_score: 5.2,
    raw_input: 'Elevated Road Entry Pillar, Sodala area me: Sadak toot gayi hai aur vehicle nikalne me dikkat ho rahi hai. Please repair soon.',
    zone: 'Sodala'
  },
  {
    id: 'mock_map_jaipur_7',
    category: 'pothole',
    summary: 'Deep pothole dangerous for two-wheelers near Collectorate Road in Bani Park.',
    severity: 2,
    status: 'open',
    location_text: 'Collectorate Road, Bani Park, Jaipur',
    location_coords: { lat: 26.91381, lng: 75.77694 },
    coi_score: 5.9,
    raw_input: 'Collectorate Road, Bani Park area me: Bada gaddha hai, accident hone ka darr hai. Please repair soon.',
    zone: 'Bani Park'
  },
  {
    id: 'mock_map_jaipur_8',
    category: 'illegal_construction',
    summary: 'Illegal construction debris dumped on public road near Railway Flyover Bridge in Jagatpura.',
    severity: 3,
    status: 'escalated',
    location_text: 'Railway Flyover Bridge, Jagatpura, Jaipur',
    location_coords: { lat: 26.92385, lng: 75.79836 },
    coi_score: 7.3,
    raw_input: 'Railway Flyover Bridge, Jagatpura area me: Sadak par building ka malba fenka gaya hai. Please repair soon.',
    zone: 'Jagatpura'
  },
  {
    id: 'mock_map_jaipur_9',
    category: 'tree_fallen',
    summary: 'Fallen tree blocking the primary transit lane near Choti Chaupar Corner in Tonk Road.',
    severity: 4,
    status: 'resolved',
    location_text: 'Choti Chaupar Corner, Tonk Road, Jaipur',
    location_coords: { lat: 26.92307, lng: 75.78812 },
    coi_score: 7.8,
    raw_input: 'Choti Chaupar Corner, Tonk Road area me: Ped gir gaya hai aur rasta block ho gaya hai. Please repair soon.',
    zone: 'Tonk Road'
  },
  {
    id: 'mock_map_jaipur_10',
    category: 'drain_blocked',
    summary: 'Blocked drainage line flooding the local intersection near Raj Bhavan Outer Perimeter in Civil Lines.',
    severity: 5,
    status: 'open',
    location_text: 'Raj Bhavan Outer Perimeter, Civil Lines, Jaipur',
    location_coords: { lat: 26.9165, lng: 75.79414 },
    coi_score: 9.6,
    raw_input: 'Raj Bhavan Outer Perimeter, Civil Lines area me: Nala block ho gaya hai aur paani bhad raha hai. Please repair soon.',
    zone: 'Civil Lines'
  },
  {
    id: 'mock_map_gurgaon_1',
    category: 'drain_blocked',
    summary: 'Blocked drainage line flooding the local intersection near Greenwood Public School in Sector 45.',
    severity: 1,
    status: 'escalated',
    location_text: 'Greenwood Public School, Sector 45, Gurgaon',
    location_coords: { lat: 28.4529, lng: 77.04158 },
    coi_score: 4.7,
    raw_input: 'Greenwood Public School, Sector 45 area me: Nala block ho gaya hai aur paani bhad raha hai. Please repair soon.',
    zone: 'Sector 45'
  },
  {
    id: 'mock_map_gurgaon_2',
    category: 'water_leak',
    summary: 'water pipe leak causing municipal supply wastage near U-Block Lane 12 in DLF Phase 3.',
    severity: 2,
    status: 'resolved',
    location_text: 'U-Block Lane 12, DLF Phase 3, Gurgaon',
    location_coords: { lat: 28.46949, lng: 77.01873 },
    coi_score: 6.2,
    raw_input: 'U-Block Lane 12, DLF Phase 3 area me: Paani ki pipe tootne se paani waste ho raha hai. Please repair soon.',
    zone: 'DLF Phase 3'
  },
  {
    id: 'mock_map_gurgaon_3',
    category: 'garbage_dump',
    summary: 'Overflowing waste bin and scattered garbage accumulation near Rapid Metro Pillar 42 in Golf Course Road.',
    severity: 3,
    status: 'open',
    location_text: 'Rapid Metro Pillar 42, Golf Course Road, Gurgaon',
    location_coords: { lat: 28.47356, lng: 77.02014 },
    coi_score: 7.5,
    raw_input: 'Rapid Metro Pillar 42, Golf Course Road area me: Kachra patra bhar gaya hai aur gandagi phaili hui hai. Please repair soon.',
    zone: 'Golf Course Road'
  },
  {
    id: 'mock_map_gurgaon_4',
    category: 'streetlight_broken',
    summary: 'Streetlight failure causing safety hazard at night near Subhash Chowk Flyover in Sohna Road.',
    severity: 4,
    status: 'escalated',
    location_text: 'Subhash Chowk Flyover, Sohna Road, Gurgaon',
    location_coords: { lat: 28.46676, lng: 77.04003 },
    coi_score: 8.7,
    raw_input: 'Subhash Chowk Flyover, Sohna Road area me: Streetlight kharab hai aur raat ko andhera rehta hai. Please repair soon.',
    zone: 'Sohna Road'
  },
  {
    id: 'mock_map_gurgaon_5',
    category: 'road_damage',
    summary: 'Severe asphalt erosion and broken road surface near Huda Market Plaza in Sector 56.',
    severity: 5,
    status: 'resolved',
    location_text: 'Huda Market Plaza, Sector 56, Gurgaon',
    location_coords: { lat: 28.45549, lng: 77.03622 },
    coi_score: 9.3,
    raw_input: 'Huda Market Plaza, Sector 56 area me: Sadak toot gayi hai aur vehicle nikalne me dikkat ho rahi hai. Please repair soon.',
    zone: 'Sector 56'
  },
  {
    id: 'mock_map_gurgaon_6',
    category: 'pothole',
    summary: 'Deep pothole dangerous for two-wheelers near Cyber Hub Back Entrance in Cyber City.',
    severity: 1,
    status: 'open',
    location_text: 'Cyber Hub Back Entrance, Cyber City, Gurgaon',
    location_coords: { lat: 28.44685, lng: 77.03243 },
    coi_score: 4.5,
    raw_input: 'Cyber Hub Back Entrance, Cyber City area me: Bada gaddha hai, accident hone ka darr hai. Please repair soon.',
    zone: 'Cyber City'
  },
  {
    id: 'mock_map_gurgaon_7',
    category: 'illegal_construction',
    summary: 'Illegal construction debris dumped on public road near Leisure Valley Outer Gate in Sector 29.',
    severity: 2,
    status: 'escalated',
    location_text: 'Leisure Valley Outer Gate, Sector 29, Gurgaon',
    location_coords: { lat: 28.46712, lng: 77.03504 },
    coi_score: 5.6,
    raw_input: 'Leisure Valley Outer Gate, Sector 29 area me: Sadak par building ka malba fenka gaya hai. Please repair soon.',
    zone: 'Sector 29'
  },
  {
    id: 'mock_map_gurgaon_8',
    category: 'tree_fallen',
    summary: 'Fallen tree blocking the primary transit lane near Carterpuri Road Junction in Palam Vihar.',
    severity: 3,
    status: 'resolved',
    location_text: 'Carterpuri Road Junction, Palam Vihar, Gurgaon',
    location_coords: { lat: 28.45033, lng: 77.02636 },
    coi_score: 7.0,
    raw_input: 'Carterpuri Road Junction, Palam Vihar area me: Ped gir gaya hai aur rasta block ho gaya hai. Please repair soon.',
    zone: 'Palam Vihar'
  },
  {
    id: 'mock_map_gurgaon_9',
    category: 'drain_blocked',
    summary: 'Blocked drainage line flooding the local intersection near Phase 5 Highway Exit in Udyog Vihar.',
    severity: 4,
    status: 'open',
    location_text: 'Phase 5 Highway Exit, Udyog Vihar, Gurgaon',
    location_coords: { lat: 28.46765, lng: 77.02617 },
    coi_score: 8.2,
    raw_input: 'Phase 5 Highway Exit, Udyog Vihar area me: Nala block ho gaya hai aur paani bhad raha hai. Please repair soon.',
    zone: 'Udyog Vihar'
  },
  {
    id: 'mock_map_gurgaon_10',
    category: 'water_leak',
    summary: 'water pipe leak causing municipal supply wastage near Vatika Crossing in Sector 82.',
    severity: 5,
    status: 'escalated',
    location_text: 'Vatika Crossing, Sector 82, Gurgaon',
    location_coords: { lat: 28.47092, lng: 77.02673 },
    coi_score: 9.3,
    raw_input: 'Vatika Crossing, Sector 82 area me: Paani ki pipe tootne se paani waste ho raha hai. Please repair soon.',
    zone: 'Sector 82'
  },
  {
    id: 'mock_map_dehradun_1',
    category: 'water_leak',
    summary: 'water pipe leak causing municipal supply wastage near Mussoorie Diversion in Rajpur Road.',
    severity: 1,
    status: 'resolved',
    location_text: 'Mussoorie Diversion, Rajpur Road, Dehradun',
    location_coords: { lat: 30.33071, lng: 78.02144 },
    coi_score: 4.7,
    raw_input: 'Mussoorie Diversion, Rajpur Road area me: Paani ki pipe tootne se paani waste ho raha hai. Please repair soon.',
    zone: 'Rajpur Road'
  },
  {
    id: 'mock_map_dehradun_2',
    category: 'garbage_dump',
    summary: 'Overflowing waste bin and scattered garbage accumulation near Subharti Hospital Gate in Clement Town.',
    severity: 2,
    status: 'open',
    location_text: 'Subharti Hospital Gate, Clement Town, Dehradun',
    location_coords: { lat: 30.32128, lng: 78.01962 },
    coi_score: 6.0,
    raw_input: 'Subharti Hospital Gate, Clement Town area me: Kachra patra bhar gaya hai aur gandagi phaili hui hai. Please repair soon.',
    zone: 'Clement Town'
  },
  {
    id: 'mock_map_dehradun_3',
    category: 'streetlight_broken',
    summary: 'Streetlight failure causing safety hazard at night near DAV College Road in Karanpur.',
    severity: 3,
    status: 'escalated',
    location_text: 'DAV College Road, Karanpur, Dehradun',
    location_coords: { lat: 30.30558, lng: 78.03125 },
    coi_score: 7.4,
    raw_input: 'DAV College Road, Karanpur area me: Streetlight kharab hai aur raat ko andhera rehta hai. Please repair soon.',
    zone: 'Karanpur'
  },
  {
    id: 'mock_map_dehradun_4',
    category: 'road_damage',
    summary: 'Severe asphalt erosion and broken road surface near Saharanpur Road Crossing in Patel Nagar.',
    severity: 4,
    status: 'resolved',
    location_text: 'Saharanpur Road Crossing, Patel Nagar, Dehradun',
    location_coords: { lat: 30.3163, lng: 78.02044 },
    coi_score: 7.8,
    raw_input: 'Saharanpur Road Crossing, Patel Nagar area me: Sadak toot gayi hai aur vehicle nikalne me dikkat ho rahi hai. Please repair soon.',
    zone: 'Patel Nagar'
  },
  {
    id: 'mock_map_dehradun_5',
    category: 'pothole',
    summary: 'Deep pothole dangerous for two-wheelers near IMA Perimeter Road in Premnagar.',
    severity: 5,
    status: 'open',
    location_text: 'IMA Perimeter Road, Premnagar, Dehradun',
    location_coords: { lat: 30.31364, lng: 78.0377 },
    coi_score: 9.4,
    raw_input: 'IMA Perimeter Road, Premnagar area me: Bada gaddha hai, accident hone ka darr hai. Please repair soon.',
    zone: 'Premnagar'
  },
  {
    id: 'mock_map_dehradun_6',
    category: 'illegal_construction',
    summary: 'Illegal construction debris dumped on public road near Maharana Pratap Complex in Vasant Vihar.',
    severity: 1,
    status: 'escalated',
    location_text: 'Maharana Pratap Complex, Vasant Vihar, Dehradun',
    location_coords: { lat: 30.32026, lng: 78.02286 },
    coi_score: 4.5,
    raw_input: 'Maharana Pratap Complex, Vasant Vihar area me: Sadak par building ka malba fenka gaya hai. Please repair soon.',
    zone: 'Vasant Vihar'
  },
  {
    id: 'mock_map_dehradun_7',
    category: 'tree_fallen',
    summary: 'Fallen tree blocking the primary transit lane near EC Road Intersection in Dalanwala.',
    severity: 2,
    status: 'resolved',
    location_text: 'EC Road Intersection, Dalanwala, Dehradun',
    location_coords: { lat: 30.30924, lng: 78.04495 },
    coi_score: 5.7,
    raw_input: 'EC Road Intersection, Dalanwala area me: Ped gir gaya hai aur rasta block ho gaya hai. Please repair soon.',
    zone: 'Dalanwala'
  },
  {
    id: 'mock_map_dehradun_8',
    category: 'drain_blocked',
    summary: 'Blocked drainage line flooding the local intersection near Chowk Circle in Ballupur.',
    severity: 3,
    status: 'open',
    location_text: 'Chowk Circle, Ballupur, Dehradun',
    location_coords: { lat: 30.32963, lng: 78.02371 },
    coi_score: 6.6,
    raw_input: 'Chowk Circle, Ballupur area me: Nala block ho gaya hai aur paani bhad raha hai. Please repair soon.',
    zone: 'Ballupur'
  },
  {
    id: 'mock_map_dehradun_9',
    category: 'water_leak',
    summary: 'water pipe leak causing municipal supply wastage near Pacific Mall Outer Lane in Jakhan.',
    severity: 4,
    status: 'escalated',
    location_text: 'Pacific Mall Outer Lane, Jakhan, Dehradun',
    location_coords: { lat: 30.32476, lng: 78.03422 },
    coi_score: 8.7,
    raw_input: 'Pacific Mall Outer Lane, Jakhan area me: Paani ki pipe tootne se paani waste ho raha hai. Please repair soon.',
    zone: 'Jakhan'
  },
  {
    id: 'mock_map_dehradun_10',
    category: 'garbage_dump',
    summary: 'Overflowing waste bin and scattered garbage accumulation near Sulphur Spring Approach Road in Sahastradhara Road.',
    severity: 5,
    status: 'resolved',
    location_text: 'Sulphur Spring Approach Road, Sahastradhara Road, Dehradun',
    location_coords: { lat: 30.30902, lng: 78.02006 },
    coi_score: 9.3,
    raw_input: 'Sulphur Spring Approach Road, Sahastradhara Road area me: Kachra patra bhar gaya hai aur gandagi phaili hui hai. Please repair soon.',
    zone: 'Sahastradhara Road'
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
  const isInitialFitRef = useRef(true); // Track initial map boundary auto-fitting

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

    // Auto-fit map boundaries to include all markers on initial load
    if (isInitialFitRef.current && filteredIssues.length > 0 && map) {
      const coords = filteredIssues
        .map(issue => issue.location_coords)
        .filter(c => c && c.lat && c.lng)
        .map(c => L.latLng(c.lat, c.lng));
      
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        // Turn off animation on the very first frame to prevent visual zoom jump
        map.fitBounds(bounds, { padding: [50, 50], animate: false });
        isInitialFitRef.current = false;
      }
    }

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
