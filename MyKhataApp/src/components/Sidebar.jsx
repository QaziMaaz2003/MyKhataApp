import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiX, FiLogOut, FiHome, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import '../styles/Sidebar.css';

function Sidebar({ isOpen, onClose, onLogout, user }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: FiHome },
    { path: '/i-owe-money', label: 'Supplier', icon: FiArrowUp },
    { path: '/i-am-owed-money', label: 'Customer', icon: FiArrowDown }
  ];

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div className="sidebar-backdrop" onClick={onClose}></div>
      )}
      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
        <div className="app-logo">
          <span className="logo-icon">₨</span>
          <span className="logo-text">MyKhata</span>
        </div>
        <button className="close-sidebar" onClick={onClose}>
          <FiX size={24} />
        </button>
      </div>

      {/* User Profile Section */}
      <div className="user-profile">
        <div className="profile-avatar">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="profile-info">
          <h4 className="profile-name">{user?.name || 'User'}</h4>
          <p className="profile-email">{user?.email || 'email@example.com'}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-content">
        <ul className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout}>
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
    </>
  );
}

export default Sidebar;
