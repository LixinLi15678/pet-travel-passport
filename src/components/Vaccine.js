import React, { useState, useRef } from 'react';
import fileUploadService from '../services/fileUploadService';
import { compressImage, isImageFile } from '../utils/imageCompression';
import './shared.css';
import './Vaccine.css';

const VaccineEnhanced = ({ user, onNext, onBack, onLogout, initialFiles = [] }) => {
  const [vaccineFiles, setVaccineFiles] = useState(initialFiles);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPreview, setCameraPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showAccountPopup, setShowAccountPopup] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // File upload handler with compression
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) return;

    setIsUploading(true);
    const validFiles = [];
    const errors = [];

    // Validate and compress images
    for (const file of files) {
      const validation = fileUploadService.validateFile(file);
      if (validation.valid) {
        if (isImageFile(file)) {
          try {
            const compressed = await compressImage(file, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.8
            });
            validFiles.push(compressed);
          } catch (error) {
            console.error('Compression failed:', error);
            validFiles.push(file); // Use original if compression fails
          }
        } else {
          validFiles.push(file);
        }
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (errors.length > 0) {
      alert('Some files were rejected:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      try {
        const results = await fileUploadService.uploadFiles(
          validFiles,
          user.uid,
          'vaccine',
          (index, progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [`temp_${index}`]: progress
            }));
          }
        );
        setVaccineFiles(prev => [...prev, ...results]);
        setUploadProgress({});
        alert(`Successfully uploaded ${results.length} file(s)!`);
      } catch (error) {
        console.error('File upload error:', error);
        alert('File upload failed: ' + error.message);
      }
    }

    setIsUploading(false);
  };

  // Photo upload handler with compression
  const handlePhotoSelect = async (event) => {
    await handleFileSelect(event);
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      setCameraPreview(null);
      setShowCamera(true);

      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      }, 100);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Cannot access camera: ' + error.message);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (cameraPreview?.previewUrl) {
      URL.revokeObjectURL(cameraPreview.previewUrl);
    }

    setCameraPreview(null);
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert('Camera is still initializing. Please try again.');
      return;
    }

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().getTime();
        const file = new File([blob], `vaccine_photo_${timestamp}.jpg`, {
          type: 'image/jpeg'
        });

        setCameraPreview({
          file,
          previewUrl: URL.createObjectURL(file)
        });
      }
    }, 'image/jpeg', 0.9);
  };

  const handleRetakePhoto = () => {
    if (cameraPreview?.previewUrl) {
      URL.revokeObjectURL(cameraPreview.previewUrl);
    }
    setCameraPreview(null);
  };

  const handleSavePhoto = async () => {
    if (!cameraPreview?.file) return;

    setIsUploading(true);
    try {
      // Compress before upload
      const compressed = await compressImage(cameraPreview.file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8
      });

      const results = await fileUploadService.uploadFiles(
        [compressed],
        user.uid,
        'vaccine',
        (index, progress) => {
          setUploadProgress({ camera: progress });
        }
      );

      setVaccineFiles(prev => [...prev, ...results]);

      if (cameraPreview.previewUrl) {
        URL.revokeObjectURL(cameraPreview.previewUrl);
      }

      setCameraPreview(null);
      setUploadProgress({});
      closeCamera();
      alert('Photo uploaded successfully!');
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Photo upload failed: ' + error.message);
    }
    setIsUploading(false);
  };

  // Remove file
  const removeFile = async (index) => {
    const fileToRemove = vaccineFiles[index];
    if (!fileToRemove) return;

    if (!window.confirm('Remove this file?')) return;

    try {
      await fileUploadService.deleteFiles([fileToRemove], user.uid);
      setVaccineFiles(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Delete file error:', error);
      alert('Failed to remove file: ' + error.message);
    }
  };

  // Re-upload file
  const reuploadFile = async (index) => {
    const fileToReupload = vaccineFiles[index];
    if (!fileToReupload) return;

    // Trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/jpeg,image/jpg,image/png';

    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const file = files[0];
      const validation = fileUploadService.validateFile(file);

      if (!validation.valid) {
        alert(`File rejected: ${validation.error}`);
        return;
      }

      setIsUploading(true);
      try {
        // Delete old file
        await fileUploadService.deleteFiles([fileToReupload], user.uid);

        // Compress if image
        let fileToUpload = file;
        if (isImageFile(file)) {
          fileToUpload = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.8
          });
        }

        // Upload new file
        const results = await fileUploadService.uploadFiles(
          [fileToUpload],
          user.uid,
          'vaccine',
          (_, progress) => {
            setUploadProgress({ [`reupload_${index}`]: progress });
          }
        );

        // Replace in array
        setVaccineFiles(prev => {
          const newFiles = [...prev];
          newFiles[index] = results[0];
          return newFiles;
        });

        setUploadProgress({});
        alert('File replaced successfully!');
      } catch (error) {
        console.error('Reupload error:', error);
        alert('File replacement failed: ' + error.message);
      }
      setIsUploading(false);
    };

    input.click();
  };

  // Preview file
  const previewFileHandler = (file) => {
    setPreviewFile(file);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  // Drag and drop sorting
  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'));

    if (dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newFiles = [...vaccineFiles];
    const [removed] = newFiles.splice(dragIndex, 1);
    newFiles.splice(dropIndex, 0, removed);

    setVaccineFiles(newFiles);
    setDragOverIndex(null);
  };

  const handleContinue = () => {
    if (vaccineFiles.length === 0) {
      if (!window.confirm('No vaccine documents uploaded. Continue anyway?')) {
        return;
      }
    }

    if (onNext) {
      onNext({ vaccineFiles });
    }
  };

  const accountIconSrc = `${process.env.PUBLIC_URL}/assets/icons/cat-login.svg`;
  const vaccineIconSrc = `${process.env.PUBLIC_URL}/assets/icons/vaccination.svg`;

  return (
    <div className="page-background">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="page-title">Pet Travel Passport</h1>
            <p className="page-subtitle">Vaccine verification</p>
          </div>
          {user && (
            <div className="login-status">
              <button
                className="account-icon-button"
                onClick={() => setShowAccountPopup(!showAccountPopup)}
              >
                <img src={accountIconSrc} alt="Account" className="account-icon" />
              </button>
              {showAccountPopup && (
                <div
                  className="account-popup"
                  onClick={() => setShowAccountPopup(false)}
                >
                  <div
                    className="account-popup-content"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="account-email">{user.email}</p>
                    <button
                      className="popup-logout-button"
                      onClick={() => {
                        setShowAccountPopup(false);
                        if (onLogout) onLogout();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="header-divider" />

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="step-divider" />

          <div className="progress-step completed">
            <div className="step-circle">
              <span className="step-icon">✓</span>
            </div>
            <div className="step-label">MEASURE</div>
          </div>

          <div className="progress-step completed">
            <div className="step-circle">
              <span className="step-icon">✓</span>
            </div>
            <div className="step-label">WEIGH</div>
          </div>

          <div className="progress-step active">
            <div className="step-circle">
              <span className="step-number">3</span>
            </div>
            <div className="step-label">VACCINE</div>
          </div>

          <div className="progress-step">
            <div className="step-circle">
              <span className="step-number">4</span>
            </div>
            <div className="step-label">DONE</div>
          </div>
        </div>

        <div className="statusbar-divider" />
      </div>

      {/* Main Content */}
      <main className="page-main">
        <div className="content-card vaccine-card">
          {/* Title Section */}
          <div className="card-header">
            <div className="vaccine-icon">
              <img src={vaccineIconSrc} alt="Vaccination icon" />
            </div>
            <div className="card-title-section">
              <h2 className="card-title">Proof of Vaccination</h2>
              <p className="card-subtitle">Choose one of the options below</p>
            </div>
          </div>

          <div className="title-divider" />

          {/* Upload Options */}
          <div className="upload-options">
            {/* File Upload */}
            <div className="upload-option">
              <h3 className="option-title">Upload File (PDF/JPG)</h3>
              <p className="option-description">Official record or vet receipt</p>
              <button
                className="upload-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                multiple
              />
            </div>

            <div className="divider-text">OR</div>

            {/* Photo Upload */}
            <div className="upload-option">
              <h3 className="option-title">Upload Photo(s)</h3>
              <p className="option-description">Clear, well-lit, no glare</p>
              <button
                className="upload-button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploading}
              >
                Choose Photo(s)
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
                multiple
              />
            </div>

            <div className="divider-text">OR</div>

            {/* Camera Scan */}
            <div className="upload-option">
              <h3 className="option-title">Scan with Camera</h3>
              <p className="option-description">Clear, well-lit, no glare</p>
              <button
                className="upload-button"
                onClick={startCamera}
                disabled={isUploading}
              >
                Scan with Camera
              </button>
            </div>
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="upload-progress-section">
              <div className="progress-bar-container">
                <div className="progress-bar-label">Uploading...</div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Object.values(uploadProgress)[0]}%` }}
                  />
                </div>
                <div className="progress-bar-percent">
                  {Math.round(Object.values(uploadProgress)[0])}%
                </div>
              </div>
            </div>
          )}

          {/* Uploaded Files List with Drag & Drop */}
          {vaccineFiles.length > 0 && (
            <div className="uploaded-files">
              <h3 className="files-title">Uploaded Files ({vaccineFiles.length})</h3>
              <p className="files-hint">Drag to reorder files</p>
              <ul className="files-list">
                {vaccineFiles.map((file, index) => (
                  <li
                    key={file.id || index}
                    className={`file-item ${dragOverIndex === index ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <div className="file-info">
                      <span className="file-number">#{index + 1}</span>
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="file-actions">
                      <button
                        className="file-action-btn preview-btn"
                        onClick={() => previewFileHandler(file)}
                        title="Preview"
                      >
                        👁️
                      </button>
                      <button
                        className="file-action-btn reupload-btn"
                        onClick={() => reuploadFile(index)}
                        disabled={isUploading}
                        title="Replace"
                      >
                        🔄
                      </button>
                      <button
                        className="file-action-btn remove-btn"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        title="Remove"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="primary-button continue-button"
              onClick={handleContinue}
              disabled={isUploading}
            >
              Continue to Review
            </button>
            <button
              className="secondary-button back-button"
              onClick={onBack}
              disabled={isUploading}
            >
              ← Back to Weight
            </button>
          </div>
        </div>
      </main>

      {/* Camera Modal */}
      {showCamera && (
        <div className="camera-modal">
          <div className="camera-container">
            {cameraPreview ? (
              <img
                src={cameraPreview.previewUrl}
                alt="Captured"
                className="camera-preview"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
              />
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="camera-controls">
              {cameraPreview ? (
                <>
                  <button onClick={handleRetakePhoto} className="camera-btn retake-btn">
                    Retake
                  </button>
                  <button
                    onClick={handleSavePhoto}
                    className="camera-btn save-btn"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Save Photo'}
                  </button>
                  <button onClick={closeCamera} className="camera-btn cancel-btn">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={capturePhoto} className="camera-btn capture-btn">
                    Capture
                  </button>
                  <button onClick={closeCamera} className="camera-btn cancel-btn">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="preview-modal" onClick={closePreview}>
          <div className="preview-container" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={closePreview}>✕</button>
            {previewFile.type?.startsWith('image/') || previewFile.name?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <img
                src={previewFile.data || previewFile.url}
                alt={previewFile.name}
                className="preview-image"
              />
            ) : previewFile.type === 'application/pdf' || previewFile.name?.endsWith('.pdf') ? (
              <iframe
                src={previewFile.data || previewFile.url}
                title={previewFile.name}
                className="preview-pdf"
              />
            ) : (
              <div className="preview-unsupported">
                <p>Preview not available for this file type</p>
                <p className="file-name">{previewFile.name}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VaccineEnhanced;
