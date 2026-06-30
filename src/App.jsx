import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar           from './components/Navbar/Navbar';
import Footer           from './components/Footer/Footer';
import LandingPage      from './pages/LandingPage/LandingPage';
import CitizenView      from './pages/CitizenView/CitizenView';
import AdminDashboard   from './pages/AdminDashboard/AdminDashboard';
import PublicLedger     from './pages/PublicLedger/PublicLedger';
import MapView          from './pages/MapView/MapView';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"       element={<LandingPage />} />
        <Route path="/report" element={<CitizenView />} />
        <Route path="/admin"  element={<AdminDashboard />} />
        <Route path="/ledger" element={<PublicLedger />} />
        <Route path="/map"    element={<MapView />} />
        <Route path="*"       element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
