import { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <NavLink to="/" className="navbar-brand" onClick={closeMenu}>
          <span>Jan</span>Setu <div className="brand-dot"></div>
        </NavLink>

        <button className="navbar-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          {isOpen ? '✕' : '☰'}
        </button>

        <div className={`navbar-menu ${isOpen ? 'open' : ''}`}>
          <NavLink 
            to="/" 
            end
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Home
          </NavLink>
          <NavLink 
            to="/report" 
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Report Issue
          </NavLink>
          <NavLink 
            to="/map" 
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Live Map
          </NavLink>
          <NavLink 
            to="/ledger" 
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Transparency Ledger
          </NavLink>
          <NavLink 
            to="/admin" 
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Officer Portal
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
