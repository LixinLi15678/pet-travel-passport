import React, { useState } from 'react';
import fileUploadService from '../services/fileUploadService';
import './FileUpload.css';

/**
 * Multi-file Upload Component
 * Supports camera capture, image upload, and file upload
 * Supports re-upload without losing previous data
 */
const FileUpload = ({ userId, category = 'general', onUploadComplete, existingFiles = [] }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);

    // Validate files
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      const validation = fileUploadService.validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      alert('Some files were rejected:\n' + errors.join('\n'));
    }

    setSelectedFiles(validFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files first');
      return;
    }

    setUploading(true);
    setUploadProgress({});

    try {
      const progressCallback = (index, progress) => {
        setUploadProgress(prev => ({
          ...prev,
          [index]: progress
        }));
      };

      const results = await fileUploadService.uploadFiles(
        selectedFiles,
        userId,
        category,
        progressCallback
      );

      // Add new files to existing files (without losing previous data)
      const updatedFiles = [...uploadedFiles, ...results];
      setUploadedFiles(updatedFiles);
      setSelectedFiles([]);
      setUploadProgress({});

      if (onUploadComplete) {
        onUploadComplete(updatedFiles);
      }

      alert(`Successfully uploaded ${results.length} file(s)!`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleReUpload = async (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    setUploading(true);

    try {
      // Re-upload will replace the old files
      const results = await fileUploadService.reUploadFiles(
        files,
        uploadedFiles,
        userId,
        category
      );

      setUploadedFiles(results);
      setSelectedFiles([]);

      if (onUploadComplete) {
        onUploadComplete(results);
      }

      alert(`Successfully re-uploaded ${results.length} file(s)!`);
    } catch (error) {
      console.error('Re-upload error:', error);
      alert('Re-upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);

    if (onUploadComplete) {
      onUploadComplete(newFiles);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Cannot access camera: ' + error.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().getTime();
        const file = new File([blob], `photo_${timestamp}.jpg`, { type: 'image/jpeg' });

        // Add to selected files
        setSelectedFiles(prev => [...prev, file]);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files);

    // Filter only images
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      alert('Only image files are allowed for image upload');
    }

    // Validate image files
    const validFiles = [];
    const errors = [];

    imageFiles.forEach(file => {
      const validation = fileUploadService.validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      alert('Some images were rejected:\n' + errors.join('\n'));
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  return (
    <div className="file-upload-container">
      <div className="upload-section">
        <h3>Upload Files</h3>

        <div className="upload-buttons-row">
          {/* Camera Button */}
          <button
            onClick={startCamera}
            disabled={uploading || showCamera}
            className="action-button camera-button"
            type="button"
          >
            📷 Take Photos
          </button>

          {/* Image Upload Button */}
          <div className="file-input-wrapper">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageSelect}
              disabled={uploading}
              id="image-input"
              style={{ display: 'none' }}
            />
            <label htmlFor="image-input" className="action-button image-button">
              🖼️ Upload Images
            </label>
          </div>

          {/* File Upload Button */}
          <div className="file-input-wrapper">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              id="file-input"
              style={{ display: 'none' }}
            />
            <label htmlFor="file-input" className="action-button file-button">
              📄 Upload Files
            </label>
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="camera-modal">
            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-video"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="camera-controls">
                <button
                  onClick={capturePhoto}
                  className="capture-button"
                  type="button"
                >
                  📸 Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="close-camera-button"
                  type="button"
                >
                  ✕ Close Camera
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="selected-files">
            <p>{selectedFiles.length} file(s) selected:</p>
            <ul>
              {selectedFiles.map((file, index) => (
                <li key={index}>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  {uploadProgress[index] !== undefined && (
                    <span className="progress"> - {Math.round(uploadProgress[index])}%</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          className="upload-button"
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files-section">
          <h3>Uploaded Files ({uploadedFiles.length})</h3>

          <div className="re-upload-section">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleReUpload}
              disabled={uploading}
              id="re-upload-input"
              style={{ display: 'none' }}
            />
            <label htmlFor="re-upload-input" className="re-upload-button">
              Re-scan / Re-upload All
            </label>
          </div>

          <ul className="uploaded-list">
            {uploadedFiles.map((file, index) => (
              <li key={file.id} className="uploaded-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-meta">
                    {(file.size / 1024).toFixed(1)} KB | {file.source}
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="remove-button"
                  disabled={uploading}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
