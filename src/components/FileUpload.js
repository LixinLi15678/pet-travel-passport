import React, {
  useState,
  useEffect,
  useRef,
  useId
} from 'react';
import fileUploadService from '../services/fileUploadService';
import './FileUpload.css';

const isImageFile = (file) => {
  const type = file?.type;
  if (type && type.startsWith('image/')) {
    return true;
  }

  const name = typeof file?.name === 'string'
    ? file.name.toLowerCase()
    : '';

  return /\.(png|jpe?g|gif|webp|heic|heif)$/.test(name);
};

const createPendingPhotoEntry = (file) => ({
  id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  file,
  previewUrl: URL.createObjectURL(file)
});

const createPendingDocumentEntry = (file) => ({
  id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  file
});

const reorderArray = (list, from, to) => {
  if (from === to) {
    return list;
  }

  const result = [...list];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
};

const FileUpload = ({ userId, category = 'general', onUploadComplete, existingFiles = [] }) => {
  const [photoFiles, setPhotoFiles] = useState(() => existingFiles.filter(isImageFile));
  const [documentFiles, setDocumentFiles] = useState(() => existingFiles.filter(file => !isImageFile(file)));
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState({});
  const [documentUploadProgress, setDocumentUploadProgress] = useState({});
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPreview, setCameraPreview] = useState(null);
  const [dragState, setDragState] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const photoFilesRef = useRef(photoFiles);
  const documentFilesRef = useRef(documentFiles);
  const pendingPhotosRef = useRef(pendingPhotos);
  const cameraPreviewRef = useRef(cameraPreview);

  const imageInputId = useId();
  const documentInputId = useId();

  useEffect(() => {
    setPhotoFiles(existingFiles.filter(isImageFile));
    setDocumentFiles(existingFiles.filter(file => !isImageFile(file)));
  }, [existingFiles]);

  useEffect(() => {
    photoFilesRef.current = photoFiles;
  }, [photoFiles]);

  useEffect(() => {
    documentFilesRef.current = documentFiles;
  }, [documentFiles]);

  useEffect(() => {
    pendingPhotosRef.current = pendingPhotos;
  }, [pendingPhotos]);

  useEffect(() => {
    cameraPreviewRef.current = cameraPreview;
  }, [cameraPreview]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!showCamera || !video || !stream) {
      return undefined;
    }

    video.srcObject = stream;
    video.muted = true;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore autoplay rejections; user interaction already triggered camera start
      });
    }

    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [showCamera]);

  useEffect(() => () => {
    pendingPhotosRef.current.forEach(entry => {
      if (entry.previewUrl) {
        URL.revokeObjectURL(entry.previewUrl);
      }
    });

    const preview = cameraPreviewRef.current;
    if (preview?.previewUrl) {
      URL.revokeObjectURL(preview.previewUrl);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const notifyChange = (nextPhotos, nextDocs) => {
    if (onUploadComplete) {
      onUploadComplete([...nextPhotos, ...nextDocs]);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      streamRef.current = stream;
      setCameraPreview(prev => {
        if (prev?.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return null;
      });
      setShowCamera(true);
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

    setCameraPreview(prev => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });

    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert('Camera is still initializing. Please try again in a moment.');
      return;
    }

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

        setCameraPreview(prev => {
          if (prev?.previewUrl) {
            URL.revokeObjectURL(prev.previewUrl);
          }
          return {
            file,
            previewUrl: URL.createObjectURL(file)
          };
        });
      }
    }, 'image/jpeg', 0.9);
  };

  const handleRetakePhoto = () => {
    setCameraPreview(prev => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  };

  const addPendingPhoto = (file) => {
    const entry = createPendingPhotoEntry(file);
    setPendingPhotos(prev => [...prev, entry]);
  };

  const handleSaveCapturedPhoto = (closeAfter = false) => {
    const preview = cameraPreviewRef.current;

    if (preview?.file) {
      addPendingPhoto(preview.file);
      setCameraPreview(current => {
        if (current?.previewUrl) {
          URL.revokeObjectURL(current.previewUrl);
        }
        return null;
      });
    }

    if (closeAfter) {
      closeCamera();
    }
  };

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    // Filter only images
    const imageFiles = files.filter(file => file.type && file.type.startsWith('image/'));

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

    const entries = validFiles.map(createPendingPhotoEntry);
    if (entries.length > 0) {
      setPendingPhotos(prev => [...prev, ...entries]);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

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

    if (validFiles.length > 0) {
      const entries = validFiles.map(createPendingDocumentEntry);
      setPendingDocuments(prev => [...prev, ...entries]);
    }
  };

  const removePendingPhoto = (id) => {
    setPendingPhotos(prev => {
      const next = prev.filter(photo => photo.id !== id);
      const removed = prev.find(photo => photo.id === id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  };

  const removePendingDocument = (id) => {
    setPendingDocuments(prev => prev.filter(file => file.id !== id));
  };

  const uploadPendingPhotos = async () => {
    if (pendingPhotos.length === 0) {
      alert('Please select or capture photos first.');
      return;
    }

    setPhotoUploading(true);
    setPhotoUploadProgress({});

    const entries = pendingPhotos;

    try {
      const results = await fileUploadService.uploadFiles(
        entries.map(entry => entry.file),
        userId,
        category,
        (index, progress) => {
          const entryId = entries[index]?.id;
          if (!entryId) return;
          setPhotoUploadProgress(prev => ({
            ...prev,
            [entryId]: progress
          }));
        }
      );

      const nextPhotos = [...photoFilesRef.current, ...results];
      setPhotoFiles(nextPhotos);
      notifyChange(nextPhotos, documentFilesRef.current);

      entries.forEach(entry => {
        if (entry.previewUrl) {
          URL.revokeObjectURL(entry.previewUrl);
        }
      });

      setPendingPhotos([]);
      setPhotoUploadProgress({});

      alert(`Successfully uploaded ${results.length} photo(s)!`);
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Photo upload failed: ' + error.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const uploadPendingDocuments = async () => {
    if (pendingDocuments.length === 0) {
      alert('Please add files first.');
      return;
    }

    setDocumentUploading(true);
    setDocumentUploadProgress({});

    const entries = pendingDocuments;

    try {
      const results = await fileUploadService.uploadFiles(
        entries.map(entry => entry.file),
        userId,
        category,
        (index, progress) => {
          const entryId = entries[index]?.id;
          if (!entryId) return;
          setDocumentUploadProgress(prev => ({
            ...prev,
            [entryId]: progress
          }));
        }
      );

      const nextDocs = [...documentFilesRef.current, ...results];
      setDocumentFiles(nextDocs);
      notifyChange(photoFilesRef.current, nextDocs);

      setPendingDocuments([]);
      setDocumentUploadProgress({});

      alert(`Successfully uploaded ${results.length} file(s)!`);
    } catch (error) {
      console.error('File upload error:', error);
      alert('File upload failed: ' + error.message);
    } finally {
      setDocumentUploading(false);
    }
  };

  const removeUploadedPhoto = async (index) => {
    const target = photoFilesRef.current[index];
    if (!target) return;

    if (!window.confirm('Remove this photo?')) {
      return;
    }

    try {
      await fileUploadService.deleteFiles([target], userId);
    } catch (error) {
      console.error('Delete photo error:', error);
      alert('Failed to remove photo: ' + error.message);
      return;
    }

    const nextPhotos = photoFilesRef.current.filter((_, i) => i !== index);
    setPhotoFiles(nextPhotos);
    notifyChange(nextPhotos, documentFilesRef.current);
  };

  const removeUploadedDocument = async (index) => {
    const target = documentFilesRef.current[index];
    if (!target) return;

    if (!window.confirm('Remove this file?')) {
      return;
    }

    try {
      await fileUploadService.deleteFiles([target], userId);
    } catch (error) {
      console.error('Delete file error:', error);
      alert('Failed to remove file: ' + error.message);
      return;
    }

    const nextDocs = documentFilesRef.current.filter((_, i) => i !== index);
    setDocumentFiles(nextDocs);
    notifyChange(photoFilesRef.current, nextDocs);
  };

  const handleDragStart = (event, section, index) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    setDragState({ section, index });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event, section, targetIndex) => {
    event.preventDefault();

    if (!dragState || dragState.section !== section) {
      return;
    }

    const { index: fromIndex } = dragState;

    if (fromIndex === targetIndex) {
      setDragState(null);
      return;
    }

    if (section === 'pending') {
      setPendingPhotos(prev => reorderArray(prev, fromIndex, targetIndex));
    } else if (section === 'uploaded') {
      const nextPhotos = reorderArray(photoFilesRef.current, fromIndex, targetIndex);
      setPhotoFiles(nextPhotos);
      notifyChange(nextPhotos, documentFilesRef.current);
    }

    setDragState(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
  };

  return (
    <div className="file-upload-container">
      <div className="upload-layout">
        <section className="upload-section photo-section">
          <div className="section-header">
            <h3>Photos</h3>
            <p className="section-subtitle">
              Capture on the spot or pick from your library. Drag thumbnails to reorder them.
            </p>
          </div>

          <div className="upload-buttons-row">
            <button
              onClick={startCamera}
              disabled={photoUploading || showCamera}
              className="action-button camera-button"
              type="button"
            >
              📷 Take Photos
            </button>

            <div className="file-input-wrapper">
              <input
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                disabled={photoUploading}
                id={imageInputId}
              />
              <label htmlFor={imageInputId} className="action-button image-button">
                🖼️ Upload Images
              </label>
            </div>
          </div>

          {pendingPhotos.length > 0 ? (
            <>
              <div className="photo-grid">
                {pendingPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className={`photo-card ${dragState?.section === 'pending' && dragState.index === index ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(event) => handleDragStart(event, 'pending', index)}
                    onDragOver={handleDragOver}
                    onDrop={(event) => handleDrop(event, 'pending', index)}
                    onDragEnd={handleDragEnd}
                  >
                    <img
                      src={photo.previewUrl}
                      alt={`Selected ${index + 1}`}
                      className="photo-thumb"
                    />
                    <div className="photo-card-actions">
                      <span className="photo-progress">
                        {photoUploadProgress[photo.id] !== undefined
                          ? `${Math.round(photoUploadProgress[photo.id])}%`
                          : `#${index + 1}`}
                      </span>
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => removePendingPhoto(photo.id)}
                        disabled={photoUploading}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="reorder-hint">Drag thumbnails to set the order before uploading.</p>
              <div className="photo-pending-actions">
                <button
                  onClick={uploadPendingPhotos}
                  disabled={photoUploading}
                  className="upload-button photo-upload-button"
                  type="button"
                >
                  {photoUploading
                    ? 'Uploading...'
                    : `Upload ${pendingPhotos.length} Photo${pendingPhotos.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          ) : (
            <div className="pending-empty">
              Tap “Take Photos” or “Upload Images” to start building your photo set.
            </div>
          )}

          <div className="uploaded-photos-section">
            <h4 className="section-subtitle">
              Current Photos ({photoFiles.length})
            </h4>
            {photoFiles.length === 0 ? (
              <div className="section-empty">
                No photos yet. Upload or capture to see them here.
              </div>
            ) : (
              <>
                <div className="photo-grid">
                  {photoFiles.map((file, index) => {
                    const photoSrc = file.data || file.previewUrl || '';
                    return (
                    <div
                      key={file.id || `${file.name}-${index}`}
                      className={`photo-card ${dragState?.section === 'uploaded' && dragState.index === index ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(event) => handleDragStart(event, 'uploaded', index)}
                      onDragOver={handleDragOver}
                      onDrop={(event) => handleDrop(event, 'uploaded', index)}
                      onDragEnd={handleDragEnd}
                    >
                      <img
                        src={photoSrc}
                        alt={file.name || `Upload ${index + 1}`}
                        className="photo-thumb"
                      />
                      <div className="photo-card-actions">
                        <span className="photo-order-label">#{index + 1}</span>
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => removeUploadedPhoto(index)}
                          disabled={photoUploading || documentUploading}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
                <p className="reorder-hint">Drag to change the display order.</p>
              </>
            )}
          </div>
        </section>

        <section className="upload-section document-section">
          <div className="section-header">
            <h3>Files</h3>
            <p className="section-subtitle">
              Upload PDFs or other travel paperwork from the Files app.
            </p>
          </div>

          <div className="upload-buttons-row">
            <div className="file-input-wrapper">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileSelect}
                disabled={documentUploading}
                id={documentInputId}
              />
              <label htmlFor={documentInputId} className="action-button file-button">
                📄 Upload Files
              </label>
            </div>
          </div>

          {pendingDocuments.length > 0 ? (
            <>
              <ul className="document-pending-list">
                {pendingDocuments.map(entry => (
                  <li key={entry.id} className="document-pending-item">
                    <div className="document-title">{entry.file.name}</div>
                    <div className="document-meta">
                      <span>{(entry.file.size / 1024).toFixed(1)} KB</span>
                      {documentUploadProgress[entry.id] !== undefined && (
                        <span className="document-progress">
                          {Math.round(documentUploadProgress[entry.id])}%
                        </span>
                      )}
                    </div>
                    <div className="document-actions">
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => removePendingDocument(entry.id)}
                        disabled={documentUploading}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="upload-footer">
                <button
                  onClick={uploadPendingDocuments}
                  disabled={documentUploading}
                  className="upload-button document-upload-button"
                  type="button"
                >
                  {documentUploading
                    ? 'Uploading...'
                    : `Upload ${pendingDocuments.length} File${pendingDocuments.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          ) : (
            <div className="pending-empty">
              Choose files to see them here before uploading.
            </div>
          )}

          <div className="uploaded-files-section">
            <h4 className="section-subtitle">
              Current Files ({documentFiles.length})
            </h4>
            {documentFiles.length === 0 ? (
              <div className="section-empty">
                No files yet. Upload travel paperwork to keep everything together.
              </div>
            ) : (
              <ul className="uploaded-list">
                {documentFiles.map((file, index) => (
                  <li key={file.id || `${file.name}-${index}`} className="uploaded-item">
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-meta">
                        {(file.size / 1024).toFixed(1)} KB | {file.source || 'local'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => removeUploadedDocument(index)}
                      disabled={photoUploading || documentUploading}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {showCamera && (
        <div className="camera-modal">
          <div className="camera-container">
            {cameraPreview ? (
              <img
                src={cameraPreview.previewUrl}
                alt="Captured"
                className="camera-preview-image"
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
                  <button
                    onClick={handleRetakePhoto}
                    className="camera-retake-button"
                    type="button"
                  >
                    ↺ Retake
                  </button>
                  <button
                    onClick={() => handleSaveCapturedPhoto(false)}
                    className="camera-next-button"
                    type="button"
                  >
                    ➕ Next Photo
                  </button>
                  <button
                    onClick={() => handleSaveCapturedPhoto(true)}
                    className="camera-done-button"
                    type="button"
                  >
                    ✅ Done
                  </button>
                  <button
                    onClick={closeCamera}
                    className="close-camera-button"
                    type="button"
                  >
                    ✕ Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={capturePhoto}
                    className="capture-button"
                    type="button"
                  >
                    📸 Capture
                  </button>
                  <button
                    onClick={closeCamera}
                    className="close-camera-button"
                    type="button"
                  >
                    ✕ Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
