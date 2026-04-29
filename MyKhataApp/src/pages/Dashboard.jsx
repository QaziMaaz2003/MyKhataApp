import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiArrowRight, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import '../styles/Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [totalIOweMoney, setTotalIOweMoney] = useState(0);
  const [totalAmOwedMoney, setTotalAmOwedMoney] = useState(0);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch I Owe Money entries
      const iOweResponse = await api.get('/entries/i-owe-money');
      const iOweEntries = iOweResponse.data.data || [];
      const iOweTotal = iOweEntries.reduce((sum, entry) => sum + entry.amount, 0);
      setTotalIOweMoney(iOweTotal);

      // Fetch I'm Owed Money entries
      const iAmOwedResponse = await api.get('/entries/i-am-owed-money');
      const iAmOwedEntries = iAmOwedResponse.data.data || [];
      const iAmOwedTotal = iAmOwedEntries.reduce((sum, entry) => sum + entry.amount, 0);
      setTotalAmOwedMoney(iAmOwedTotal);

      // Combine and sort recent entries
      const combined = [
        ...iOweEntries.map(e => ({ ...e, type: 'owe' })),
        ...iAmOwedEntries.map(e => ({ ...e, type: 'owed' }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

      setRecentEntries(combined);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/auth/login');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>MyKhata</h2>
          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="sidebar-content">
          <ul className="nav-links">
            <li>
              <Link to="/" className="nav-link active" onClick={() => setSidebarOpen(false)}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/i-owe-money" className="nav-link" onClick={() => setSidebarOpen(false)}>
                I Owe Money
              </Link>
            </li>
            <li>
              <Link to="/i-am-owed-money" className="nav-link" onClick={() => setSidebarOpen(false)}>
                I'm Owed Money
              </Link>
            </li>
          </ul>

          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Header */}
        <div className="dashboard-header">
          <button
            className="toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FiMenu size={24} />
          </button>
          <div className="header-title">
            <h1>Welcome, {user.name || 'User'}</h1>
            <p>Here's your financial summary</p>
          </div>
          <div className="user-avatar">
            {user.name?.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-container">
          <div className="stat-card owe-card">
            <div className="stat-icon">📤</div>
            <div className="stat-content">
              <p className="stat-label">Total I Owe</p>
              <h2 className="stat-amount">
                {totalIOweMoney.toLocaleString('en-PK')} PKR
              </h2>
            </div>
            <Link to="/i-owe-money" className="stat-link">
              <FiArrowRight size={20} />
            </Link>
          </div>

          <div className="stat-card owed-card">
            <div className="stat-icon">📥</div>
            <div className="stat-content">
              <p className="stat-label">Total I'm Owed</p>
              <h2 className="stat-amount">
                {totalAmOwedMoney.toLocaleString('en-PK')} PKR
              </h2>
            </div>
            <Link to="/i-am-owed-money" className="stat-link">
              <FiArrowRight size={20} />
            </Link>
          </div>

          <div className="stat-card net-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <p className="stat-label">Net Balance</p>
              <h2 className={`stat-amount ${totalAmOwedMoney - totalIOweMoney >= 0 ? 'positive' : 'negative'}`}>
                {(totalAmOwedMoney - totalIOweMoney).toLocaleString('en-PK')} PKR
              </h2>
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="recent-section">
          <h2 className="section-title">Recent Entries</h2>
          {recentEntries.length > 0 ? (
            <div className="entries-list">
              {recentEntries.map((entry) => (
                <div key={entry.id} className={`entry-item ${entry.type}`}>
                  <div className="entry-info">
                    <h4>{entry.personName}</h4>
                    <p className="entry-date">{formatDate(entry.date)}</p>
                  </div>
                  <div className="entry-amount">
                    <span className={`amount ${entry.type}`}>
                      {entry.type === 'owe' ? '-' : '+'}
                      {entry.amount.toLocaleString('en-PK')} PKR
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-entries">
              <p>No entries yet. Start by creating one!</p>
              <Link to="/i-owe-money" className="btn btn-primary">
                Add Entry
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
