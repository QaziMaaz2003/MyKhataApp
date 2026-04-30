import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiX, FiUpload, FiCamera } from 'react-icons/fi';
import CameraCapture from './CameraCapture';
import '../styles/Modal.css';
import 'react-calendar/dist/Calendar.css';

function AddEditEntryForm({ isOpen, onClose, entryType, onSave, editingEntry }) {
  const [formData, setFormData] = useState({
    personName: '',
    amount: '',
    date: new Date(),
    dueDate: null,
    phoneNumber: '',
    description: '',
    billImageUrl: '',
    status: 'pending'
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setFormData({
        personName: editingEntry.personName || '',
        amount: editingEntry.amount || '',
        date: new Date(editingEntry.date),
        dueDate: editingEntry.dueDate ? new Date(editingEntry.dueDate) : null,
        phoneNumber: editingEntry.phoneNumber || '',
        description: editingEntry.description || '',
        billImageUrl: editingEntry.billImageUrl || '',
        status: editingEntry.status || 'pending'
      });
      if (editingEntry.billImageUrl) {
        setImagePreview(editingEntry.billImageUrl);
      }
    } else {
      setFormData({
        personName: '',
        amount: '',
        date: new Date(),
        dueDate: null,
        phoneNumber: '',
        description: '',
        billImageUrl: '',
        status: 'pending'
      });
      setImagePreview('');
    }
  }, [editingEntry, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || '' : value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date: date
    }));
    setShowDatePicker(false);
  };

  const handleDueDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      dueDate: date
    }));
    setShowDueDatePicker(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    await processImageFile(file);
  };

  const handleCameraCapture = async (blob) => {
    // Convert blob to file
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    await processImageFile(file);
  };

  const processImageFile = async (file) => {
    // Preview image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary via backend
    try {
      setUploading(true);
      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);

      const response = await api.post('/upload', formDataToUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          billImageUrl: response.data.data.url
        }));
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      setImagePreview('');
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const input = document.getElementById('billImage');
      input.files = files;
      handleImageUpload({ target: { files: files } });
    }
  };

  const handleRemoveImage = async () => {
    try {
      // If there's an existing image URL from editing, try to delete from Cloudinary
      if (formData.billImageUrl && editingEntry) {
        try {
          await api.post('/delete-image', {
            url: formData.billImageUrl
          });
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }

      // Reset file input
      const fileInput = document.getElementById('billImage');
      if (fileInput) {
        fileInput.value = '';
      }

      // Clear preview and form data
      setImagePreview('');
      setFormData(prev => ({
        ...prev,
        billImageUrl: ''
      }));
      toast.success('Image removed');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    }
  };

  const validateForm = () => {
    if (!formData.personName.trim()) {
      toast.error('Person name is required');
      return false;
    }
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return false;
    }
    if (!formData.date) {
      toast.error('Date is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const payload = {
        personName: formData.personName,
        amount: formData.amount,
        date: formData.date.toISOString(),
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : null,
        phoneNumber: formData.phoneNumber,
        description: formData.description,
        billImageUrl: formData.billImageUrl,
        status: formData.status
      };

      let response;
      if (editingEntry) {
        // Update existing entry
        response = await api.put(`/entries/${entryType}/${editingEntry.id}`, payload);
        toast.success('Entry updated successfully');
      } else {
        // Create new entry
        response = await api.post(`/entries/${entryType}`, payload);
        toast.success('Entry created successfully');
      }

      if (response.data.success) {
        onSave();
        handleClose();
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error(error.response?.data?.message || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      personName: '',
      amount: '',
      date: new Date(),
      dueDate: null,
      phoneNumber: '',
      description: '',
      billImageUrl: '',
      status: 'pending'
    });
    setImagePreview('');
    setShowDatePicker(false);
    setShowDueDatePicker(false);
    onClose();
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingEntry ? 'Edit Entry' : 'Add New Entry'}</h2>
          <button className="modal-close" onClick={handleClose}>
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="entry-form">
          {/* Person Name */}
          <div className="form-group">
            <label htmlFor="personName">Person's Name *</label>
            <input
              type="text"
              id="personName"
              name="personName"
              value={formData.personName}
              onChange={handleInputChange}
              placeholder="Enter person's name"
              required
            />
          </div>

          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount">Amount (PKR) *</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="Enter amount"
              step="0.01"
              min="0"
              required
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <div className="date-input-wrapper">
              <input
                type="text"
                id="date"
                readOnly
                value={formatDate(formData.date)}
                placeholder="Select date"
                className="date-input"
                onClick={() => setShowDatePicker(true)}
              />
              {showDatePicker && (
                <div className="date-picker-overlay">
                  <Calendar
                    value={formData.date}
                    onChange={handleDateChange}
                    maxDate={new Date()}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div className="form-group">
            <label htmlFor="dueDate">Due Date (Optional)</label>
            <div className="date-input-wrapper">
              <input
                type="text"
                id="dueDate"
                readOnly
                value={formData.dueDate ? formatDate(formData.dueDate) : ''}
                placeholder="Select due date"
                className="date-input"
                onClick={() => setShowDueDatePicker(true)}
              />
              {showDueDatePicker && (
                <div className="date-picker-overlay">
                  <Calendar
                    value={formData.dueDate || new Date()}
                    onChange={handleDueDateChange}
                    minDate={formData.date}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="Enter phone number"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter description (e.g., reason for transaction)"
              rows="3"
            />
          </div>

          {/* Status */}
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label>Bill Image (Optional)</label>
            <div
              className={`image-upload-wrapper ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="image-button-group">
                <label htmlFor="billImage" className="file-input-label upload-btn">
                  <FiUpload size={20} />
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </label>
                <button
                  type="button"
                  className="file-input-label camera-btn"
                  onClick={() => setShowCameraModal(true)}
                  disabled={uploading}
                >
                  <FiCamera size={20} />
                  Capture Image
                </button>
              </div>
              <input
                type="file"
                id="billImage"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                hidden
              />
              {imagePreview && formData.billImageUrl && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Bill preview" />
                  <button
                    type="button"
                    className="remove-image"
                    onClick={handleRemoveImage}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || uploading}
            >
              {loading ? 'Saving...' : editingEntry ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>

        <CameraCapture
          isOpen={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          onCapture={handleCameraCapture}
          isCapturing={uploading}
        />
      </div>
    </div>
  );
}

export default AddEditEntryForm;
