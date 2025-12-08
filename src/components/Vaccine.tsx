import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import fileUploadService, { DEFAULT_PET_ID } from '../services/fileUploadService';
import { compressImage, isImageFile } from '../utils/imageCompression';
import PetsModal from './PetsModal';
import { VaccineProps, FileInfo } from '../types';
import { openAdminConsole } from '../utils/adminAccess';
import './shared.css';
import './Vaccine.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface UploadProgress {
  [key: string]: number;
}

const VaccineEnhanced: React.FC<VaccineProps> = ({
  user,
  onNext,
  onBack,
  onLogout,
  initialFiles = [],
  onFilesChange,
  petProfiles = [],
  activePetId,
  onPetChange,
  onAddPet,
  onDeletePet,
  onUpdatePetType,
  allFiles = [],
  onGoHome,
  isAdmin = false
}) => {
  const [vaccineFiles, setVaccineFiles] = useState<FileInfo[]>(initialFiles);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
  const [pdfPageNumber, setPdfPageNumber] = useState<number>(1);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAccountPopup, setShowAccountPopup] = useState<boolean>(false);
  const [pdfPageWidth, setPdfPageWidth] = useState<number>(520);
  const [showPetsModal, setShowPetsModal] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod|Android/i.test(ua);
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoCameraInputRef = useRef<HTMLInputElement>(null);
  const photoLibraryInputRef = useRef<HTMLInputElement>(null);
  const activePet = activePetId || petProfiles[0]?.id || null;
  const activePetProfile = activePet ? petProfiles.find((pet) => pet.id === activePet) : null;
  const activePetType = activePetProfile?.type === 'dog' ? 'dog' : 'cat';
  const accountIconSrc = `${process.env.PUBLIC_URL}/assets/icons/${activePetType === 'dog' ? 'dog-login.svg' : 'cat-login.svg'}`;
  const handleTitleClick = () => {
    if (onGoHome) onGoHome();
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onGoHome) onGoHome();
    }
  };

  const updateFiles = useCallback(
    (updater: FileInfo[] | ((prev: FileInfo[]) => FileInfo[])) => {
      if (!activePet) {
        console.warn('No active pet selected. Unable to update files.');
        return;
      }
      setVaccineFiles((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (onFilesChange) {
          onFilesChange(activePet, next);
        }
        return next;
      });
    },
    [onFilesChange, activePet]
  );

  const isPdfFileType = (file: FileInfo): boolean => {
    const name = file?.name?.toLowerCase() || '';
    return file?.type === 'application/pdf' || name.endsWith('.pdf');
  };

  const formatFileSize = (sizeInBytes?: number): string | null => {
    if (typeof sizeInBytes !== 'number') return null;
    if (sizeInBytes >= 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (sizeInBytes >= 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    }
    return `${sizeInBytes} B`;
  };

  const handleOpenPetsModal = () => {
    setShowPetsModal(true);
    setShowAccountPopup(false);
  };

  const handleClosePetsModal = () => {
    setShowPetsModal(false);
  };

  const handleSelectPetProfile = (petId: string) => {
    if (onPetChange) {
      onPetChange(petId);
    }
    setShowPetsModal(false);
    setShowAccountPopup(false);
  };

  const handleAdminConsoleOpen = () => {
    setShowAccountPopup(false);
    openAdminConsole();
  };

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | null = null;

    const cleanupObjectUrl = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    if (!previewFile || !isPdfFileType(previewFile)) {
      cleanupObjectUrl();
      setPdfPreviewUrl(null);
      setIsPdfLoading(false);
      setPdfLoadError(null);
      setPdfNumPages(null);
      setPdfPageNumber(1);
      return () => {};
    }

    const loadPdfPreview = async () => {
      setIsPdfLoading(true);
      setPdfLoadError(null);
      setPdfNumPages(null);
      setPdfPageNumber(1);
      try {
        const inlineSource = previewFile.data || (previewFile as any).url;

        if ((previewFile as any).url && ((previewFile as any).url.startsWith('http') || (previewFile as any).url.startsWith('blob:'))) {
          setPdfPreviewUrl((previewFile as any).url);
        } else if (inlineSource?.startsWith('data:')) {
          const response = await fetch(inlineSource);
          if (!response.ok) {
            throw new Error('Failed to load PDF preview');
          }
          const blob = await response.blob();
          if (isCancelled) return;
          cleanupObjectUrl();
          objectUrl = URL.createObjectURL(blob);
          setPdfPreviewUrl(objectUrl);
        } else if (inlineSource) {
          setPdfPreviewUrl(inlineSource);
        } else {
          setPdfPreviewUrl(null);
        }
      } catch (error) {
        console.error('PDF preview error:', error);
        if (!isCancelled) {
          setPdfPreviewUrl(null);
          setPdfLoadError('Unable to load PDF preview.');
        }
      } finally {
        if (!isCancelled) {
          setIsPdfLoading(false);
        }
      }
    };

    loadPdfPreview();

    return () => {
      isCancelled = true;
      cleanupObjectUrl();
    };
  }, [previewFile]);

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window === 'undefined') return;
      const maxWidth = Math.min(560, window.innerWidth - 60);
      setPdfPageWidth(Math.max(280, maxWidth));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    setVaccineFiles(initialFiles);
  }, [initialFiles]);

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return;
    }
    const ua = navigator.userAgent || '';
    setIsMobileDevice(/iPhone|iPad|iPod|Android/i.test(ua));
  }, []);

  const uploadsDisabled = isUploading || !activePet;
  const noPetSelected = !activePet;
  const fileAcceptValue = isMobileDevice
    ? 'application/pdf'
    : 'application/pdf,image/jpeg,image/jpg,image/png';
  const fileUploadLabel = isMobileDevice ? 'Upload File (PDF)' : 'Upload File (PDF/JPG)';

  const processFiles = async (files: File[]) => {
    if (!activePet) {
      alert('Please add a pet profile before uploading documents.');
      return;
    }

    if (files.length === 0) return;

    setIsUploading(true);
    const validFiles: File[] = [];
    const errors: string[] = [];

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
          activePet,
          (index: number, progress: number) => {
            setUploadProgress(prev => ({
              ...prev,
              [`temp_${index}`]: progress
            }));
          }
        );
        updateFiles(prev => [...prev, ...results]);
        setUploadProgress({});
        alert(`Successfully uploaded ${results.length} file(s)!`);
      } catch (error) {
        console.error('File upload error:', error);
        alert('File upload failed: ' + (error as Error).message);
      }
    }

    setIsUploading(false);
  };

  // File upload handler with compression
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (event?.target) {
      event.target.value = '';
    }
    await processFiles(files);
  };

  // Photo upload handler with compression
  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (event?.target) {
      event.target.value = '';
    }
    await processFiles(files);
  };

  const handlePhotoCameraClick = () => {
    photoCameraInputRef.current?.click();
  };

  const handlePhotoLibraryClick = async () => {
    const showOpenFilePicker = (window as any).showOpenFilePicker as
      | ((options: any) => Promise<any[]>)
      | undefined;
    if (showOpenFilePicker) {
      try {
        const handles = await showOpenFilePicker({
          multiple: true,
          types: [
            {
              description: 'Images',
              accept: {
                'image/*': ['.png', '.jpg', '.jpeg', '.heic', '.heif', '.webp']
              }
            }
          ],
          excludeAcceptAllOption: true
        });

        const files = await Promise.all(
          handles.map((handle: any) =>
            typeof handle.getFile === 'function' ? handle.getFile() : null
          )
        );
        const validFileEntries = files.filter(Boolean) as File[];
        if (validFileEntries.length > 0) {
          await processFiles(validFileEntries);
        }
        return;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }
        console.error('Image picker error, falling back to input:', error);
      }
    }

    photoLibraryInputRef.current?.click();
  };

  const handleDownloadPdf = () => {
    if (!previewFile) return;
    const source = pdfPreviewUrl || previewFile.data || (previewFile as any).url;
    if (!source) return;
    const link = document.createElement('a');
    link.href = source;
    link.download = previewFile.name || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePdfLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfNumPages(numPages);
    setPdfPageNumber(1);
    setPdfLoadError(null);
  };

  const handlePdfLoadError = (error: Error) => {
    console.error('PDF render error:', error);
    setPdfLoadError('Unable to render PDF preview.');
  };

  const goToPreviousPage = () => {
    setPdfPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    if (!pdfNumPages) return;
    setPdfPageNumber(prev => Math.min(pdfNumPages, prev + 1));
  };


  // Remove file
  const removeFile = async (index: number) => {
    const fileToRemove = vaccineFiles[index];
    if (!fileToRemove) return;

    if (!window.confirm('Remove this file?')) return;

    try {
      await fileUploadService.deleteFiles([fileToRemove], user.uid);
      updateFiles(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Delete file error:', error);
      alert('Failed to remove file: ' + (error as Error).message);
    }
  };

  // Re-upload file
  const reuploadFile = async (index: number) => {
    const fileToReupload = vaccineFiles[index];
    if (!fileToReupload) return;

    // Trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/jpeg,image/jpg,image/png';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = Array.from(target.files || []);
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
        let fileToUpload: File = file;
        if (isImageFile(file)) {
          fileToUpload = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.8
          });
        }

        // Upload new file
        const legacyPetId = fileToReupload.petId && fileToReupload.petId !== DEFAULT_PET_ID
          ? fileToReupload.petId
          : null;
        const petScope = legacyPetId || activePet;
        if (!petScope) {
          alert('Select a pet profile before re-uploading documents.');
          setIsUploading(false);
          return;
        }
        const results = await fileUploadService.uploadFiles(
          [fileToUpload],
          user.uid,
          'vaccine',
          petScope,
          (_: number, progress: number) => {
            setUploadProgress({ [`reupload_${index}`]: progress });
          }
        );

        // Replace in array
        updateFiles(prev => {
          const newFiles = [...prev];
          newFiles[index] = results[0];
          return newFiles;
        });

        setUploadProgress({});
        alert('File replaced successfully!');
      } catch (error) {
        console.error('Reupload error:', error);
        alert('File replacement failed: ' + (error as Error).message);
      }
      setIsUploading(false);
    };

    input.click();
  };

  // Preview file
  const previewFileHandler = (file: FileInfo) => {
    setPreviewFile(file);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  // Drag and drop sorting
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'));

    if (dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newFiles = [...vaccineFiles];
    const [removed] = newFiles.splice(dragIndex, 1);
    newFiles.splice(dropIndex, 0, removed);

    updateFiles(newFiles);
    setDragOverIndex(null);
  };

  const handleContinue = async () => {
    if (!activePet) {
      alert('Please add a pet profile before continuing.');
      return;
    }
    if (vaccineFiles.length === 0) {
      if (!window.confirm('No vaccine documents uploaded. Continue anyway?')) {
        return;
      }
    }

    if (!onNext) return;
    await onNext({ vaccineFiles });
  };

  const vaccineIconSrc = `${process.env.PUBLIC_URL}/assets/icons/vaccination.svg`;
  const uploadProgressValue = Object.values(uploadProgress)[0] || 0;
  const isPdfPreview = previewFile && isPdfFileType(previewFile);
  const isImagePreview = previewFile && !isPdfPreview && (
    previewFile.type?.startsWith('image/') || previewFile.name?.match(/\.(jpg|jpeg|png|gif)$/i)
  );
  const previewFileSizeLabel = formatFileSize(previewFile?.size);
  const canRenderPdf = isPdfPreview && pdfPreviewUrl && !pdfLoadError;
  const pdfDownloadSourceAvailable = Boolean(
    previewFile && (pdfPreviewUrl || previewFile.data || (previewFile as any).url)
  );
  const pdfControlsDisabled = !pdfNumPages || isPdfLoading || !!pdfLoadError;

  return (
    <div className="page-background">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1
              className="page-title clickable"
              role="button"
              tabIndex={0}
              onClick={handleTitleClick}
              onKeyDown={handleTitleKeyDown}
            >
              Pet Passport
            </h1>
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
                    <div className="account-popup-header">
                      <p className="account-email">{user.email}</p>
                      {isAdmin && (
                        <button
                          className="account-admin-tag"
                          onClick={handleAdminConsoleOpen}
                        >
                          Admin Console
                        </button>
                      )}
                    </div>
                    <button
                      className="popup-pets-button"
                      onClick={handleOpenPetsModal}
                    >
                      Pets
                    </button>
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

          {noPetSelected && (
            <div className="no-pet-banner">
              Add a pet profile from the account menu before uploading documents.
            </div>
          )}

          {/* Upload Options */}
          <div className="upload-options">
            {/* File Upload */}
            <div className="upload-option">
              <h3 className="option-title">{fileUploadLabel}</h3>
              <p className="option-description">Official record or vet receipt</p>
              <button
                className="upload-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadsDisabled}
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={fileAcceptValue}
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
              {isMobileDevice ? (
                <div className="photo-actions">
                  <button
                    className="upload-button"
                    onClick={handlePhotoCameraClick}
                    disabled={uploadsDisabled}
                  >
                    Take Photo
                  </button>
                  <button
                    className="upload-button secondary"
                    onClick={handlePhotoLibraryClick}
                    disabled={uploadsDisabled}
                  >
                    Photo Library
                  </button>
                  <input
                    ref={photoCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                    multiple
                  />
                  <input
                    ref={photoLibraryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                    multiple
                  />
                </div>
              ) : (
                <>
                  <button
                    className="upload-button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadsDisabled}
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
                </>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="upload-progress-container">
              <div className="upload-progress-bar">
                <div
                  className="upload-progress-fill"
                  style={{ width: `${uploadProgressValue}%` }}
                />
                <span className="upload-progress-text">
                  {Math.round(uploadProgressValue)}%
                </span>
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
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 3C4.5 3 1.73 5.61 1 9c.73 3.39 3.5 6 7 6s6.27-2.61 7-6c-.73-3.39-3.5-6-7-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" fill="currentColor"/>
                        </svg>
                      </button>
                      <button
                        className="file-action-btn reupload-btn"
                        onClick={() => reuploadFile(index)}
                        disabled={isUploading}
                        title="Replace"
                      >
                        <svg width="10" height="10" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.94 2.06C10.68 0.79 8.93 0 7 0 3.13 0 0.01 3.13 0.01 7s3.12 7 6.99 7c3.27 0 5.99-2.23 6.76-5.25h-1.82c-.72 2.04-2.66 3.5-4.94 3.5-2.9 0-5.25-2.35-5.25-5.25S4.1 1.75 7 1.75c1.45 0 2.75.6 3.69 1.56L7.88 6.13h6.12V0l-2.06 2.06z" fill="currentColor"/>
                        </svg>
                      </button>
                      <button
                        className="file-action-btn remove-btn"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        title="Remove"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 14c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V6H4v8zM14 3h-3.5l-1-1h-3l-1 1H2v2h12V3z" fill="currentColor"/>
                        </svg>
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
              disabled={isUploading || noPetSelected}
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

      {showPetsModal && (
        <PetsModal
          isOpen={showPetsModal}
          onClose={handleClosePetsModal}
          petProfiles={petProfiles}
          activePetId={activePet}
          onPetChange={onPetChange}
          onSelectPet={handleSelectPetProfile}
          onAddPet={onAddPet}
          onDeletePet={onDeletePet}
          onUpdatePetType={onUpdatePetType}
          allFiles={allFiles}
        />
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="preview-modal" onClick={closePreview}>
          <div className="preview-container" onClick={(e) => e.stopPropagation()}>
            <div className="preview-top-actions">
              <button className="preview-close" onClick={closePreview} aria-label="Close preview">
                ✕
              </button>
              {isPdfPreview && (
                <button
                  className="preview-download-btn"
                  onClick={handleDownloadPdf}
                  disabled={!pdfDownloadSourceAvailable || isPdfLoading}
                  aria-label="Download PDF"
                >
                  <svg
                    className="preview-download-icon"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 4v11.17l3.59-3.58L17 13l-5 5-5-5 1.41-1.41L11 15.17V4h1zM5 18h14v2H5z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              )}
            </div>
            {isImagePreview && (
              <img
                src={previewFile.data || (previewFile as any).url}
                alt={previewFile.name}
                className="preview-image"
              />
            )}
            {isPdfPreview && (
              <div className="preview-pdf-wrapper">
                <div className="preview-pdf-header">
                  <div className="preview-pdf-meta">
                    <p className="preview-pdf-title">{previewFile.name || 'PDF Document'}</p>
                    {previewFileSizeLabel && (
                      <p className="preview-pdf-subtitle">{previewFileSizeLabel}</p>
                    )}
                  </div>
                </div>
                <div className="preview-pdf-frame">
                  {isPdfLoading && (
                    <div className="preview-pdf-placeholder">
                      <p>Preparing PDF preview…</p>
                    </div>
                  )}
                  {!isPdfLoading && pdfLoadError && (
                    <div className="preview-pdf-placeholder">
                      <p>{pdfLoadError}</p>
                      <p>Please download the document to view it.</p>
                    </div>
                  )}
                  {canRenderPdf && (
                    <div className="preview-pdf-viewer">
                      <Document
                        file={pdfPreviewUrl}
                        onLoadSuccess={handlePdfLoadSuccess}
                        onLoadError={handlePdfLoadError}
                        loading={<div className="preview-pdf-placeholder"><p>Rendering PDF…</p></div>}
                        error={null}
                      >
                        <Page
                          pageNumber={pdfPageNumber}
                          className="preview-pdf-page"
                          width={pdfPageWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                    </div>
                  )}
                  {!isPdfLoading && !pdfPreviewUrl && !pdfLoadError && (
                    <div className="preview-pdf-placeholder">
                      <p>PDF preview unavailable.</p>
                      <p>Please download the document to view it.</p>
                    </div>
                  )}
                </div>
                {canRenderPdf && (
                  <div className="preview-pdf-pagination">
                    <button
                      className="preview-pdf-page-btn"
                      onClick={goToPreviousPage}
                      disabled={pdfControlsDisabled || pdfPageNumber === 1}
                    >
                      {'<'}
                    </button>
                    <span className="preview-pdf-pagination-label">
                      Page {pdfPageNumber} of {pdfNumPages || '—'}
                    </span>
                    <button
                      className="preview-pdf-page-btn"
                      onClick={goToNextPage}
                      disabled={pdfControlsDisabled || pdfPageNumber === pdfNumPages}
                    >
                      {'>'}
                    </button>
                  </div>
                )}
              </div>
            )}
            {!isImagePreview && !isPdfPreview && (
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
