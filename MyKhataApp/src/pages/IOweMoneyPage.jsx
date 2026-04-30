import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiMenu, FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import AddEditEntryForm from '../components/AddEditEntryForm';
import ImageLightbox from '../components/ImageLightbox';
import ConfirmationDialog from '../components/ConfirmationDialog';
import '../styles/EntriesPage.css';

function IOweMoneyPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('none');
  const [sortOrder, setSortOrder] = useState('asc');
  const [appliedFilters, setAppliedFilters] = useState({ sortBy: 'none', sortOrder: 'asc' });
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, entryId: null });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/entries/i-owe-money');
      const entriesData = response.data.data.entries || [];
      setEntries(entriesData);
      // Only count pending entries in total
      const total = entriesData
        .filter(entry => entry.status === 'pending')
        .reduce((sum, entry) => sum + entry.amount, 0);
      setTotalAmount(total);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = (id) => {
    setDeleteConfirmation({ isOpen: true, entryId: id });
  };

  const handleConfirmDelete = async () => {
    const { entryId } = deleteConfirmation;
    setDeleteConfirmation({ isOpen: false, entryId: null });

    try {
      await api.delete(`/entries/i-owe-money/${entryId}`);
      toast.success('Entry deleted successfully');
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, entryId: null });
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setShowModal(true);
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    setShowModal(true);
  };

  const handleModalSave = () => {
    fetchEntries();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await api.delete(`/entries/i-owe-money/${id}`);
        toast.success('Entry deleted successfully');
        fetchEntries();
      } catch (error) {
        console.error('Error deleting entry:', error);
        toast.error('Failed to delete entry');
      }
    }
  };

  const openImageLightbox = (imageUrl) => {
    setLightboxImage(imageUrl);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
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

  const getSortedEntries = () => {
    let sorted = entries
      .filter((entry) =>
        entry.personName.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (appliedFilters.sortBy !== 'none' && sorted.length > 0) {
      sorted = [...sorted].sort((a, b) => {
        let compareA, compareB;

        if (appliedFilters.sortBy === 'amount') {
          compareA = a.amount;
          compareB = b.amount;
        } else if (appliedFilters.sortBy === 'date') {
          compareA = new Date(a.date).getTime();
          compareB = new Date(b.date).getTime();
        } else if (appliedFilters.sortBy === 'dueDate') {
          compareA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          compareB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        }

        return appliedFilters.sortOrder === 'asc' ? compareA - compareB : compareB - compareA;
      });
    }

    return sorted;
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ sortBy, sortOrder });
  };

  const handleClearFilters = () => {
    setSortBy('none');
    setSortOrder('asc');
    setAppliedFilters({ sortBy: 'none', sortOrder: 'asc' });
  };

  if (loading) {
    return <div className="loading">Loading entries...</div>;
  }

  return (
    <div className="page-container">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        user={user}
      />

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
            <h1>I need to pay</h1>
            <p>Track the money you need to pay to others</p>
          </div>
        </div>

        {/* Summary */}
        <div className="summary-card">
          <div className="summary-content">
            <h3>Total Amount Owed</h3>
            <div className="total-amount">
              {totalAmount.toLocaleString('en-PK')} PKR
            </div>
            <p className="entries-count">{entries.length} entries</p>
          </div>
        </div>

        {/* Entries List */}
        <div className="entries-section">
          {/* Search and Filter Bar */}
          <div className="search-filter-bar">
            <div className="search-bar-container">
              <FiSearch className="search-bar-icon" size={18} />
              <input
                type="text"
                className="search-bar"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="none">Sort By</option>
              <option value="amount">Amount</option>
              <option value="date">Date Taken</option>
              <option value="dueDate">Due Date</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="filter-select"
              disabled={sortBy === 'none'}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>

            <button className="filter-button apply-btn" onClick={handleApplyFilters}>
              Apply
            </button>

            <button className="filter-button clear-btn" onClick={handleClearFilters}>
              Clear
            </button>
          </div>

          {entries.length > 0 ? (
            <div className="entries-grid">
              {getSortedEntries().map((entry) => (
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
                    <div className="entry-image" onClick={() => openImageLightbox(entry.billImageUrl)}>
                      <img src={entry.billImageUrl} alt="Bill" />
                      <div className="image-overlay">
                        <span className="view-label">Click to view</span>
                      </div>
                    </div>
                  )}

                  <div className="entry-actions">
                    <button className="btn btn-sm btn-edit" onClick={() => handleEditEntry(entry)}>
                      <FiEdit2 size={16} />
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-delete"
                      onClick={() => handleDeleteEntry(entry.id)}
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
              <button className="btn btn-primary" onClick={handleAddEntry}>
                <FiPlus size={20} />
                Add Entry
              </button>
            </div>
          )}
        </div>

        {/* Floating Add Entry Button */}
        {entries.length > 0 && (
          <button className="fab-button" onClick={handleAddEntry} title="Add Entry">
            <FiPlus size={24} />
          </button>
        )}
      </main>

      {/* Add/Edit Entry Modal */}
      <AddEditEntryForm
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEntry(null);
        }}
        entryType="i-owe-money"
        editingEntry={editingEntry}
        onSave={handleModalSave}
      />

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage}
        alt="Bill Image"
        onClose={closeLightbox}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        title="Delete Entry"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export default IOweMoneyPage;
