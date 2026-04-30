import React from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import '../styles/ImageLightbox.css';

function ImageLightbox({ isOpen, imageUrl, alt, onClose, onPrevious, onNext }) {
  const handleKeyDown = React.useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && onPrevious) onPrevious();
    if (e.key === 'ArrowRight' && onNext) onNext();
  }, [onClose, onPrevious, onNext]);

  React.useEffect(() => {
    if (!isOpen || !imageUrl) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, imageUrl, handleKeyDown]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `bill-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {/* Navigation */}
        <div className="lightbox-header">
          {onPrevious && (
            <button className="lightbox-nav-btn prev" onClick={onPrevious}>
              <FiChevronLeft size={28} />
            </button>
          )}
          <div className="lightbox-title">{alt || 'Bill Image'}</div>
          {onNext && (
            <button className="lightbox-nav-btn next" onClick={onNext}>
              <FiChevronRight size={28} />
            </button>
          )}
        </div>

        {/* Image */}
        <div className="lightbox-image-container">
          <img src={imageUrl} alt={alt} />
        </div>

        {/* Footer */}
        <div className="lightbox-footer">
          <button className="lightbox-action-btn download" onClick={handleDownload}>
            <FiDownload size={20} />
            Download
          </button>
        </div>

        {/* Close Button */}
        <button className="lightbox-close" onClick={onClose}>
          <FiX size={28} />
        </button>
      </div>
    </div>
  );
}

export default ImageLightbox;
