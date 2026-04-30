import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEdit2, FiLock } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import '../styles/Profile.css';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
  });

  // Change password form state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const userFromLS = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      const userData = response.data.data.user;
      setUser(userData);
      setFormData({
        name: userData.name || '',
        phone: userData.phone || '',
        gender: userData.gender || '',
        dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
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

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      await api.put('/profile', {
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || null,
      });
      toast.success('Profile updated successfully');
      setEditing(false);
      fetchUserProfile();
      // Update localStorage
      const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
      updatedUser.name = formData.name;
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    // Validate password strength
    const errors = [];
    
    if (passwordForm.newPassword.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(passwordForm.newPassword)) {
      errors.push('Must contain at least one uppercase letter (A-Z)');
    }
    
    if (!/[a-z]/.test(passwordForm.newPassword)) {
      errors.push('Must contain at least one lowercase letter (a-z)');
    }
    
    if (!/\d/.test(passwordForm.newPassword)) {
      errors.push('Must contain at least one number (0-9)');
    }
    
    // eslint-disable-next-line no-useless-escape
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(passwordForm.newPassword)) {
      errors.push('Must contain at least one special character (!@#$%^&*...)');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setPasswordLoading(true);
      await api.post('/profile', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      toast.success('Password changed successfully');
      setShowChangePassword(false);
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        user={userFromLS}
      />

      <main className="profile-main">
        {/* Header */}
        <div className="profile-header">
          <button
            className="back-button"
            onClick={() => navigate('/dashboard')}
          >
            <FiArrowLeft size={24} />
          </button>
          <h1>Profile</h1>
          <div className="user-avatar-large">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="profile-content">
          {/* Profile Information Card */}
          <div className="profile-card">
            <div className="card-header">
              <h2>Personal Information</h2>
              {!editing && (
                <button
                  className="edit-button"
                  onClick={() => setEditing(true)}
                >
                  <FiEdit2 size={18} />
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSaveProfile} className="edit-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleEditChange}
                    placeholder="Your name"
                  />
                </div>

                <div className="form-group">
                  <label>Email (Cannot change)</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="disabled-input"
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleEditChange}
                    placeholder="Your phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleEditChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="save-button"
                    disabled={editLoading}
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        name: user?.name || '',
                        phone: user?.phone || '',
                        gender: user?.gender || '',
                        dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-row">
                  <span className="label">Name:</span>
                  <span className="value">{user?.name || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Email:</span>
                  <span className="value">{user?.email || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Phone:</span>
                  <span className="value">{user?.phone || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Gender:</span>
                  <span className="value">{user?.gender || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Date of Birth:</span>
                  <span className="value">
                    {user?.dateOfBirth
                      ? new Date(user.dateOfBirth).toLocaleDateString('en-PK')
                      : 'N/A'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Member Since:</span>
                  <span className="value">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-PK')
                      : 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Change Password Card */}
          <div className="profile-card">
            <div className="card-header">
              <h2>
                <FiLock size={20} />
                Security
              </h2>
            </div>

            {!showChangePassword ? (
              <button
                className="change-password-button"
                onClick={() => setShowChangePassword(true)}
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="password-form">
                <div className="form-group">
                  <label>Old Password</label>
                  <input
                    type="password"
                    name="oldPassword"
                    value={passwordForm.oldPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter your current password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min 6 characters)"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="save-button"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setPasswordForm({
                        oldPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
