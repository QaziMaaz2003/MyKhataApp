import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import toast from 'react-hot-toast';
import api from '../utils/api';
import 'react-calendar/dist/Calendar.css';
import '../styles/Auth.css';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    dateOfBirth: null,
    phone: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For phone field, only allow digits
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: digitsOnly,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validatePasswordStrength = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Must contain at least one uppercase letter (A-Z)');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Must contain at least one lowercase letter (a-z)');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Must contain at least one number (0-9)');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Must contain at least one special character (!@#$%^&*...)');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) return { isValid: true }; // Phone is optional
    
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length !== 11) {
      return {
        isValid: false,
        error: 'Phone number must be exactly 11 digits'
      };
    }
    
    return { isValid: true };
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      dateOfBirth: date,
    }));
    setShowDatePicker(false);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      toast.error('Please enter a valid email');
      return false;
    }
    if (!formData.password) {
      toast.error('Password is required');
      return false;
    }
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(formData.password);
    if (!passwordValidation.isValid) {
      passwordValidation.errors.forEach(error => toast.error(error));
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    
    // Validate phone number
    if (formData.phone) {
      const phoneValidation = validatePhoneNumber(formData.phone);
      if (!phoneValidation.isValid) {
        toast.error(phoneValidation.error);
        return false;
      }
    }
    
    if (!formData.gender) {
      toast.error('Please select a gender');
      return false;
    }
    if (!formData.dateOfBirth) {
      toast.error('Date of birth is required');
      return false;
    }
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth.toISOString(),
        phone: formData.phone,
      });

      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Signup failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join KhataApp to manage your finances</p>

        <form onSubmit={handleSignup} className="auth-form">
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
            />
          </div>

          {/* Gender */}
          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date of Birth */}
          <div className="form-group">
            <label htmlFor="dob">Date of Birth</label>
            <input
              type="text"
              id="dob"
              readOnly
              value={formData.dateOfBirth ? formData.dateOfBirth.toLocaleDateString() : ''}
              onClick={() => setShowDatePicker(!showDatePicker)}
              placeholder="Click to select"
              className="date-input"
            />
            {showDatePicker && (
              <div className="date-picker-overlay">
                <Calendar
                  onChange={handleDateChange}
                  value={formData.dateOfBirth}
                  maxDate={new Date()}
                />
              </div>
            )}
          </div>

          {/* Phone (Optional) */}
          <div className="form-group">
            <label htmlFor="phone">Phone (Optional - 11 digits)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="01234567890 (11 digits)"
              maxLength="11"
              inputMode="numeric"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password (Min 8 chars, uppercase, lowercase, number, special char)</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter strong password"
            />
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter your password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        {/* Login Link */}
        <p className="auth-link">
          Already have an account? <Link to="/auth/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}
