import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="landing-footer">
      <div style={{ 
        maxWidth: 900, 
        margin: '0 auto', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 12 
      }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none' }}>Home</Link>
          <Link to="/report" style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none' }}>Report Issue</Link>
          <Link to="/map" style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none' }}>Live Map</Link>
          <Link to="/ledger" style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none' }}>Transparency Ledger</Link>
          <Link to="/admin" style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none' }}>Officer Portal</Link>
        </div>
        <p className="landing-footer__text">
          Built for <strong style={{ color: '#aaa' }}>Vibe2Ship</strong> · <a href="https://www.codingninjas.com" target="_blank" rel="noopener noreferrer">codingninjas</a> × <a href="https://developers.google.com" target="_blank" rel="noopener noreferrer">Google for Developers</a> · Powered by Gemini
        </p>
      </div>
    </footer>
  );
}
