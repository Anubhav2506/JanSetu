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
    id: 'mock_map_chandigarh_1',
    category: 'streetlight_broken',
    summary: 'Streetlight failure causing safety hazard at night near Government School in Sector 12.',
    severity: 1,
    status: 'escalated',
    location_text: 'Government School, Sector 12, Chandigarh',
    location_coords: { lat: 30.74749, lng: 76.78651 },
    coi_score: 4.8,
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (-2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (0 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) },
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
    sla_deadline: { toDate: () => new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)) },
    raw_input: 'Sulphur Spring Approach Road, Sahastradhara Road area me: Kachra patra bhar gaya hai aur gandagi phaili hui hai. Please repair soon.',
    zone: 'Sahastradhara Road'
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
