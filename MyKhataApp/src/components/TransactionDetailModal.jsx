import React, { useState } from 'react';
import { FiX, FiEdit2, FiTrash2, FiSave } from 'react-icons/fi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ImageLightbox from './ImageLightbox';
import CameraCapture from './CameraCapture';

export default function TransactionDetailModal({ payment, onClose, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    amount: payment?.amount || '',
    date: payment?.date ? new Date(payment.date).toISOString().split('T')[0] : '',
    description: payment?.description || '',
    type: payment?.type || 'payment',
    imageUrl: payment?.imageUrl || '',
  });
  const [imagePreview, setImagePreview] = useState(payment?.imageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  if (!payment) return null;

  const processFile = async (file) => {
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setEditData(prev => ({ ...prev, imageUrl: res.data.data.url }));
        toast.success('Image uploaded');
      }
    } catch {
      toast.error('Failed to upload image');
      setImagePreview(payment?.imageUrl || '');
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
    await processFile(file);
  };

  const handleCameraCapture = async (blob) => {
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    await processFile(file);
  };

  const handleSave = async () => {
    if (!editData.amount || parseFloat(editData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    try {
      setSaving(true);
      await api.put(`/payments/${payment.id}`, {
        amount: parseFloat(editData.amount),
        date: new Date(editData.date).toISOString(),
        description: editData.description,
        type: editData.type,
        imageUrl: editData.imageUrl,
      });
      toast.success('Transaction updated');
      onUpdate();
      onClose();
    } catch {
      toast.error('Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/payments/${payment.id}`);
      toast.success('Transaction deleted');
      onDelete();
      onClose();
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const viewImageUrl = isEditing ? (editData.imageUrl || imagePreview) : payment.imageUrl;

  return (
    <>
      <div className="txn-modal-overlay" onClick={onClose}>
        <div className="txn-modal" onClick={e => e.stopPropagation()}>
          <div className="txn-modal-header">
            <h3>{isEditing ? 'Edit Transaction' : 'Transaction Details'}</h3>
            <button className="txn-modal-close" onClick={onClose}>
              <FiX size={20} />
            </button>
          </div>

          <div className="txn-modal-body">
            {isEditing ? (
              <>
                <div className="form-group">
                  <label>Transaction Type</label>
                  <select
                    value={editData.type}
                    onChange={e => setEditData(p => ({ ...p, type: e.target.value }))}
                  >
                    <option value="payment">Payment</option>
                    <option value="additional_debt">Additional Debt</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (PKR)</label>
                  <input
                    type="number"
                    value={editData.amount}
                    onChange={e => setEditData(p => ({ ...p, amount: e.target.value }))}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editData.date}
                    onChange={e => setEditData(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={editData.description}
                    onChange={e => setEditData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="form-group">
                  <label>Image</label>
                  {imagePreview ? (
                    <div className="payment-image-preview">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        onClick={() => setLightboxOpen(true)}
                        style={{ cursor: 'pointer' }}
                      />
                      <button
                        type="button"
                        onClick={() => { setImagePreview(''); setEditData(p => ({ ...p, imageUrl: '' })); }}
                        className="remove-image-btn"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <div className="payment-upload-options">
                      <label htmlFor="txnEditImage" className="payment-upload-label">
                        {uploading ? 'Uploading...' : '📁 Upload'}
                        <input
                          id="txnEditImage"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                          disabled={uploading}
                        />
                      </label>
                      <button type="button" className="payment-upload-label" onClick={() => setShowCamera(true)} disabled={uploading}>
                        📷 Capture
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="txn-detail-row">
                  <span className="txn-detail-label">Type</span>
                  <span className={`txn-type-badge ${payment.type}`}>
                    {payment.type === 'payment' ? 'Payment' : 'Additional Debt'}
                  </span>
                </div>
                <div className="txn-detail-row">
                  <span className="txn-detail-label">Amount</span>
                  <span className={`txn-detail-value txn-amount ${payment.type}`}>
                    {payment.type === 'payment' ? '-' : '+'}{payment.amount?.toLocaleString('en-PK')} PKR
                  </span>
                </div>
                <div className="txn-detail-row">
                  <span className="txn-detail-label">Date</span>
                  <span className="txn-detail-value">{formatDate(payment.date)}</span>
                </div>
                {payment.description && (
                  <div className="txn-detail-row">
                    <span className="txn-detail-label">Description</span>
                    <span className="txn-detail-value">{payment.description}</span>
                  </div>
                )}
                {payment.imageUrl && (
                  <div className="txn-image-thumb" onClick={() => setLightboxOpen(true)}>
                    <img src={payment.imageUrl} alt="Transaction" />
                    <span>Click to enlarge</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="txn-modal-footer">
            {isEditing ? (
              <>
                <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving || uploading}>
                  <FiSave size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => {
                  setIsEditing(false);
                  setImagePreview(payment?.imageUrl || '');
                  setEditData({
                    amount: payment?.amount || '',
                    date: payment?.date ? new Date(payment.date).toISOString().split('T')[0] : '',
                    description: payment?.description || '',
                    type: payment?.type || 'payment',
                    imageUrl: payment?.imageUrl || '',
                  });
                }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-sm btn-edit" onClick={() => setIsEditing(true)}>
                  <FiEdit2 size={14} /> Edit
                </button>
                {!showDeleteConfirm ? (
                  <button className="btn btn-sm btn-delete" onClick={() => setShowDeleteConfirm(true)}>
                    <FiTrash2 size={14} /> Delete
                  </button>
                ) : (
                  <div className="txn-delete-confirm">
                    <span>Delete this transaction?</span>
                    <button className="btn btn-sm btn-delete" onClick={handleDelete}>Yes, Delete</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {lightboxOpen && viewImageUrl && (
        <ImageLightbox
          isOpen={lightboxOpen}
          imageUrl={viewImageUrl}
          alt="Transaction Image"
          onClose={() => setLightboxOpen(false)}
        />
      )}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
        isCapturing={uploading}
      />
    </>
  );
}
