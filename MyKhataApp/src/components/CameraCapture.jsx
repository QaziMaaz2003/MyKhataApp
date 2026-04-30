import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiCamera } from 'react-icons/fi';
import '../styles/CameraCapture.css';

function CameraCapture({ isOpen, onClose, onCapture, isCapturing }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    if (isOpen && !isCameraActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, isCameraActive, stream]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      const video = videoRef.current;
      
      // Set canvas dimensions to match video
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      // Convert canvas to blob and pass to parent
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onCapture(blob);
          stopCamera();
          onClose();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-overlay" onClick={handleClose}>
      <div className="camera-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="camera-modal-header">
          <h2>Capture Photo</h2>
          <button className="camera-modal-close" onClick={handleClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className="camera-container">
          {error ? (
            <div className="camera-error">
              <p>{error}</p>
              <button onClick={startCamera} className="camera-retry-btn">
                Try Again
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-video"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </>
          )}
        </div>

        <div className="camera-actions">
          <button
            className="camera-cancel-btn"
            onClick={handleClose}
            disabled={isCapturing}
          >
            Cancel
          </button>
          <button
            className="camera-capture-btn"
            onClick={capturePhoto}
            disabled={!isCameraActive || isCapturing}
          >
            <FiCamera size={20} />
            {isCapturing ? 'Capturing...' : 'Capture'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CameraCapture;
