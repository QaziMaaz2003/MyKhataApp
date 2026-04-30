import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import '../styles/OTPVerification.css';

export default function OTPVerification({ email, tempToken, verifyEndpoint, onSuccess, onResend }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) {
      toast.error('Please paste only numbers');
      return;
    }

    const newOtp = pastedData.split('');
    while (newOtp.length < 6) {
      newOtp.push('');
    }
    setOtp(newOtp);

    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
    }
  };

  const otpString = otp.join('');

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (otpString.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email,
        otp: otpString,
      };

      // Include tempToken for signup verification
      if (tempToken) {
        payload.tempToken = tempToken;
      }

      const response = await api.post(verifyEndpoint, payload);

      if (response.data.success) {
        const { token, user } = response.data.data;

        // Store token and user info
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        toast.success(response.data.message || 'Email verified successfully!');
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to verify OTP';
      toast.error(errorMessage);
      console.error('Verify OTP error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      await api.post('/auth/resend-otp', { email });
      toast.success('OTP sent to your email');
      setOtp(['', '', '', '', '', '']);
      setTimeLeft(600);
      setCanResend(false);
      if (onResend) {
        onResend();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="otp-verification-container">
      <div className="otp-verification-card">
        <h2 className="otp-title">Verify Your Email</h2>
        <p className="otp-subtitle">Enter the 6-digit code sent to {email}</p>

        <form onSubmit={handleVerifyOTP} className="otp-form">
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOTPChange(index, e.target.value)}
                onKeyDown={(e) => handleBackspace(index, e)}
                onPaste={handlePaste}
                className="otp-input"
                disabled={loading}
              />
            ))}
          </div>

          <div className="otp-timer">
            {timeLeft > 0 ? (
              <p className="timer-text">
                Code expires in: <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
              </p>
            ) : (
              <p className="timer-expired">Code has expired</p>
            )}
          </div>

          <button
            type="submit"
            className="verify-btn"
            disabled={loading || otpString.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div className="otp-footer">
          <p className="resend-text">
            Didn't receive the code?{' '}
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={!canResend || loading}
              className="resend-btn"
            >
              {canResend ? 'Resend' : `Resend in ${minutes}:${seconds.toString().padStart(2, '0')}`}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
