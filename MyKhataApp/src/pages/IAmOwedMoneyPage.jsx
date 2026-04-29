import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiMenu, FiX, FiLogOut, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import '../styles/EntriesPage.css';

function IAmOwedMoneyPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/entries/i-am-owed-money');
      const entriesData = response.data.data || [];
      setEntries(entriesData);
      const total = entriesData.reduce((sum, entry) => sum + entry.amount, 0);
      setTotalAmount(total);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await api.delete(`/entries/i-am-owed-money/${id}`);
        toast.success('Entry deleted successfully');
        fetchEntries();
      } catch (error) {
        console.error('Error deleting entry:', error);
        toast.error('Failed to delete entry');
      }
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

  const getStatusBadge = (status) => {
    return status === 'completed' ? '✓ Completed' : '● Pending';
  };

  if (loading) {
    return <div className="loading">Loading entries...</div>;
  }

  return (
    <div className="page-container">
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
              <Link to="/" className="nav-link" onClick={() => setSidebarOpen(false)}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/i-owe-money" className="nav-link" onClick={() => setSidebarOpen(false)}>
                I Owe Money
              </Link>
            </li>
            <li>
              <Link to="/i-am-owed-money" className="nav-link active" onClick={() => setSidebarOpen(false)}>
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
      <main className="page-main">
        {/* Header */}
        <div className="page-header">
          <button
            className="toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FiMenu size={24} />
          </button>
          <div>
            <h1>I'm Owed Money</h1>
            <p>Track the money others owe to you</p>
          </div>
        </div>

        {/* Summary */}
        <div className="summary-card">
          <div className="summary-content">
            <h3>Total Amount Owed to Me</h3>
            <div className="total-amount">
              {totalAmount.toLocaleString('en-PK')} PKR
            </div>
            <p className="entries-count">{entries.length} entries</p>
          </div>
          <button className="btn btn-primary btn-add">
            <FiPlus size={20} />
            Add Entry
          </button>
        </div>

        {/* Entries List */}
        <div className="entries-section">
          {entries.length > 0 ? (
            <div className="entries-grid">
              {entries.map((entry) => (
                <div key={entry.id} className="entry-card">
                  <div className="entry-header">
                    <h3>{entry.personName}</h3>
                    <span className={`status-badge ${entry.status}`}>
                      {getStatusBadge(entry.status)}
                    </span>
                  </div>

                  <div className="entry-details">
                    <div className="detail-row">
                      <span className="label">Amount:</span>
                      <span className="value amount">
                        {entry.amount.toLocaleString('en-PK')} PKR
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Date:</span>
                      <span className="value">{formatDate(entry.date)}</span>
                    </div>
                    {entry.dueDate && (
                      <div className="detail-row">
                        <span className="label">Due Date:</span>
                        <span className="value">{formatDate(entry.dueDate)}</span>
                      </div>
                    )}
                    {entry.phoneNumber && (
                      <div className="detail-row">
                        <span className="label">Phone:</span>
                        <span className="value">{entry.phoneNumber}</span>
                      </div>
                    )}
                    {entry.description && (
                      <div className="detail-row">
                        <span className="label">Description:</span>
                        <span className="value">{entry.description}</span>
                      </div>
                    )}
                  </div>

                  {entry.billImageUrl && (
                    <div className="entry-image">
                      <img src={entry.billImageUrl} alt="Bill" />
                    </div>
                  )}

                  <div className="entry-actions">
                    <button className="btn btn-sm btn-edit">
                      <FiEdit2 size={16} />
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-delete"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <FiTrash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No entries yet</h3>
              <p>Start by adding your first entry</p>
              <button className="btn btn-primary">
                <FiPlus size={20} />
                Add Entry
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default IAmOwedMoneyPage;
