import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiArrowRight, FiMenu } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import StatsCard from '../components/StatsCard';
import BreakdownChart from '../components/BreakdownChart';
import '../styles/Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [totalIOweMoney, setTotalIOweMoney] = useState(0);
  const [totalAmOwedMoney, setTotalAmOwedMoney] = useState(0);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Analytics state
  const [iOweEntries, setIOweEntries] = useState([]);
  const [iAmOwedEntries, setIAmOwedEntries] = useState([]);
  const [iOwePendingCount, setIOWePendingCount] = useState(0);
  const [iOweCompletedCount, setIOweCompletedCount] = useState(0);
  const [iAmOwedPendingCount, setIAmOwedPendingCount] = useState(0);
  const [iAmOwedCompletedCount, setIAmOwedCompletedCount] = useState(0);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch I Owe Money entries
      const iOweResponse = await api.get('/entries/i-owe-money');
      const iOweData = iOweResponse.data.data.entries || [];
      const iOweTotal = iOweData.reduce((sum, entry) => sum + entry.amount, 0);
      const iOwePending = iOweData.filter(e => e.status === 'pending').length;
      const iOweCompleted = iOweData.filter(e => e.status === 'completed').length;
      
      setTotalIOweMoney(iOweTotal);
      setIOweEntries(iOweData);
      setIOWePendingCount(iOwePending);
      setIOweCompletedCount(iOweCompleted);

      // Fetch I'm Owed Money entries
      const iAmOwedResponse = await api.get('/entries/i-am-owed-money');
      const iAmOwedData = iAmOwedResponse.data.data.entries || [];
      const iAmOwedTotal = iAmOwedData.reduce((sum, entry) => sum + entry.amount, 0);
      const iAmOwedPending = iAmOwedData.filter(e => e.status === 'pending').length;
      const iAmOwedCompleted = iAmOwedData.filter(e => e.status === 'completed').length;
      
      setTotalAmOwedMoney(iAmOwedTotal);
      setIAmOwedEntries(iAmOwedData);
      setIAmOwedPendingCount(iAmOwedPending);
      setIAmOwedCompletedCount(iAmOwedCompleted);

      // Combine and sort recent entries
      const combined = [
        ...iOweData.map(e => ({ ...e, type: 'owe' })),
        ...iAmOwedData.map(e => ({ ...e, type: 'owed' }))
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
      {/* Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        user={user}
      />

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

        {/* Analytics Section */}
        <div className="analytics-section">
          <h2 className="section-title">Analytics & Breakdown</h2>
          
          <div className="analytics-grid">
            {/* I Owe Money Stats */}
            <div className="analytics-card">
              <h3 className="analytics-title">I Owe Money</h3>
              <div className="analytics-stats">
                <StatsCard
                  title="Active Debts"
                  value={iOwePendingCount}
                  icon="📋"
                  color="pending"
                  description={`${iOweEntries.length} total entries`}
                />
                <StatsCard
                  title="Settled"
                  value={iOweCompletedCount}
                  icon="✓"
                  color="success"
                  description="Paid off"
                />
              </div>
              <BreakdownChart
                pendingCount={iOwePendingCount}
                completedCount={iOweCompletedCount}
                title="Status Breakdown"
              />
            </div>

            {/* I'm Owed Money Stats */}
            <div className="analytics-card">
              <h3 className="analytics-title">I'm Owed Money</h3>
              <div className="analytics-stats">
                <StatsCard
                  title="Pending Payments"
                  value={iAmOwedPendingCount}
                  icon="⏳"
                  color="pending"
                  description={`${iAmOwedEntries.length} total entries`}
                />
                <StatsCard
                  title="Received"
                  value={iAmOwedCompletedCount}
                  icon="✓"
                  color="success"
                  description="Completed"
                />
              </div>
              <BreakdownChart
                pendingCount={iAmOwedPendingCount}
                completedCount={iAmOwedCompletedCount}
                title="Status Breakdown"
              />
            </div>
          </div>

          {/* Summary Stats */}
          <div className="summary-stats">
            <StatsCard
              title="Total Entries"
              value={iOweEntries.length + iAmOwedEntries.length}
              icon="📊"
              color="info"
              description="Across both categories"
            />
            <StatsCard
              title="Pending Count"
              value={iOwePendingCount + iAmOwedPendingCount}
              icon="⚠️"
              color="warning"
              description="Awaiting action"
            />
            <StatsCard
              title="Completed Count"
              value={iOweCompletedCount + iAmOwedCompletedCount}
              icon="✓"
              color="success"
              description="All settled"
            />
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
