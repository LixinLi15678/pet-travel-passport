import React, { useState, useEffect, useCallback } from 'react';
import PetsModal from './PetsModal';
import userProgressService from '../services/userProgressService';
import './shared.css';
import './Measure.css';

/**
 * Measure Page - Carrier dimensions input page
 * Features:
 * 1. Input fields for length, width, height (in inches)
 * 2. Auto-save to Firebase on each input change
 * 3. Validation with hints for maximum dimensions
 */
const Measure = ({
  user,
  onNext,
  onBack,
  onLogout,
  petProfiles = [],
  activePetId,
  onPetChange,
  onAddPet,
  onDeletePet,
  allFiles = [],
  onDimensionsUpdate = () => {}
}) => {
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const [showPetsModal, setShowPetsModal] = useState(false);
  const [dimensions, setDimensions] = useState({
    length: '',
    width: '',
    height: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const activePet = activePetId || petProfiles[0]?.id || null;
  const accountIconSrc = `${process.env.PUBLIC_URL}/assets/icons/cat-login.svg`;
  const dimensionIconSrc = `${process.env.PUBLIC_URL}/assets/icons/dimensions.svg`;

  // Maximum dimensions (in inches)
  const MAX_DIMENSIONS = {
    length: 18,
    width: 11,
    height: 11
  };

  // Load saved dimensions on mount
  useEffect(() => {
    if (!user || !activePet) return;

    const loadDimensions = async () => {
      try {
        const progress = await userProgressService.getProgress(user.uid);
        const petData = progress?.pets?.find(p => p.id === activePet);
        if (petData?.dimensions) {
          setDimensions({
            length: petData.dimensions.length || '',
            width: petData.dimensions.width || '',
            height: petData.dimensions.height || ''
          });
        } else {
          setDimensions({ length: '', width: '', height: '' });
        }
      } catch (error) {
        console.error('Failed to load dimensions:', error);
      }
    };

    loadDimensions();
  }, [user, activePet]);

  // Auto-save dimensions when they change
  const saveDimensions = useCallback(async (newDimensions) => {
    if (!user || !activePet) return;

    setIsSaving(true);
    try {
      const progress = await userProgressService.getProgress(user.uid);
      const sourcePets = (progress?.pets?.length ? progress.pets : petProfiles) || [];

      let petFound = false;
      const updatedPets = sourcePets.map((pet) => {
        if (pet.id === activePet) {
          petFound = true;
          return {
            ...pet,
            dimensions: newDimensions
          };
        }
        return pet;
      });

      if (!petFound) {
        const fallbackPet = petProfiles.find((pet) => pet.id === activePet);
        updatedPets.push({
          ...(fallbackPet || {
            id: activePet,
            createdAt: new Date().toISOString()
          }),
          id: activePet,
          dimensions: newDimensions
        });
      }

      await userProgressService.saveProgress(user.uid, {
        pets: updatedPets,
        activePetId: activePet,
        currentStep: 'measure'
      });

      onDimensionsUpdate(activePet, newDimensions);
    } catch (error) {
      console.error('Failed to save dimensions:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, activePet, petProfiles, onDimensionsUpdate]);

  // Handle dimension input changes
  const handleDimensionChange = (field, value) => {
    // Allow only numbers and decimals
    const sanitized = value.replace(/[^0-9.]/g, '');
    const newDimensions = {
      ...dimensions,
      [field]: sanitized
    };
    setDimensions(newDimensions);
    saveDimensions(newDimensions);
  };

  // Check if dimension exceeds maximum
  const isDimensionExceeded = (field) => {
    const value = parseFloat(dimensions[field]);
    return !isNaN(value) && value > MAX_DIMENSIONS[field];
  };

  // Check if dimension is valid
  const isDimensionValid = (field) => {
    const value = parseFloat(dimensions[field]);
    return !isNaN(value) && value > 0 && value <= MAX_DIMENSIONS[field];
  };

  // Check if all dimensions are filled and valid
  const canContinue = () => {
    return (
      dimensions.length &&
      dimensions.width &&
      dimensions.height &&
      isDimensionValid('length') &&
      isDimensionValid('width') &&
      isDimensionValid('height')
    );
  };

  const handleOpenPetsModal = () => {
    setShowPetsModal(true);
    setShowAccountPopup(false);
  };

  const handleClosePetsModal = () => {
    setShowPetsModal(false);
  };

  const handleSelectPet = (petId) => {
    if (onPetChange) {
      onPetChange(petId);
    }
    setShowPetsModal(false);
    setShowAccountPopup(false);
  };

  const handleContinue = () => {
    if (!canContinue()) {
      alert('Please enter valid dimensions for all fields (within maximum limits)');
      return;
    }
    if (onNext) {
      onNext({ dimensions });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="page-background">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="page-title">Pet Travel Passport</h1>
            <p className="page-subtitle">Measure carrier dimensions</p>
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

        {/* Status Bar */}
        <div className="progress-section">
          <div className="step-divider" />

          <div className="progress-step active">
            <div className="step-circle">
              <span className="step-number">1</span>
            </div>
            <div className="step-label">MEASURE</div>
          </div>

          <div className="progress-step">
            <div className="step-circle">
              <span className="step-number">2</span>
            </div>
            <div className="step-label">WEIGH</div>
          </div>

          <div className="progress-step">
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
        <div className="content-card measure-card">
          {/* Card Header */}
          <div className="card-header">
            <div className="measure-icon">
              <img src={dimensionIconSrc} alt="Carrier dimensions icon" />
            </div>
            <div className="card-title-section">
              <h2 className="card-title">Carrier Dimensions</h2>
              <p className="card-subtitle">Measured and verified</p>
            </div>
          </div>

          <div className="title-divider" />

          {/* Info Banner */}
          <div className="info-banner">
            <p className="info-text">
              Enter your pet carrier dimensions in <strong>inches</strong>.
              Each measurement is saved automatically.
            </p>
          </div>

          {/* Dimension Input Fields */}
          <div className="dimension-inputs">
            {/* Length */}
            <div className={`dimension-field ${isDimensionValid('length') ? 'valid' : dimensions.length ? 'invalid' : ''}`}>
              <div className="input-wrapper">
                <input
                  id="dimension-length"
                  type="text"
                  inputMode="decimal"
                  className="dimension-input"
                  value={dimensions.length}
                  onChange={(e) => handleDimensionChange('length', e.target.value)}
                  placeholder="17.0"
                />
                <span className="input-unit">"</span>
                {isDimensionValid('length') && (
                  <span className="check-icon">✓</span>
                )}
              </div>
              <label className="dimension-label" htmlFor="dimension-length">
                <span className="label-text">LENGTH</span>
              </label>
              <p className={`dimension-max ${isDimensionExceeded('length') ? 'error' : ''}`}>
                {isDimensionExceeded('length') ? `Exceeds ` : ''}Max: {MAX_DIMENSIONS.length}"
              </p>
            </div>

            {/* Width */}
            <div className={`dimension-field ${isDimensionValid('width') ? 'valid' : dimensions.width ? 'invalid' : ''}`}>
              <div className="input-wrapper">
                <input
                  id="dimension-width"
                  type="text"
                  inputMode="decimal"
                  className="dimension-input"
                  value={dimensions.width}
                  onChange={(e) => handleDimensionChange('width', e.target.value)}
                  placeholder="11.0"
                />
                <span className="input-unit">"</span>
                {isDimensionValid('width') && (
                  <span className="check-icon">✓</span>
                )}
              </div>
              <label className="dimension-label" htmlFor="dimension-width">
                <span className="label-text">WIDTH</span>
              </label>
              <p className={`dimension-max ${isDimensionExceeded('width') ? 'error' : ''}`}>
                {isDimensionExceeded('width') ? `Exceeds ` : ''}Max: {MAX_DIMENSIONS.width}"
              </p>
            </div>

            {/* Height */}
            <div className={`dimension-field ${isDimensionValid('height') ? 'valid' : dimensions.height ? 'invalid' : ''}`}>
              <div className="input-wrapper">
                <input
                  id="dimension-height"
                  type="text"
                  inputMode="decimal"
                  className="dimension-input"
                  value={dimensions.height}
                  onChange={(e) => handleDimensionChange('height', e.target.value)}
                  placeholder="7.5"
                />
                <span className="input-unit">"</span>
                {isDimensionValid('height') && (
                  <span className="check-icon">✓</span>
                )}
              </div>
              <label className="dimension-label" htmlFor="dimension-height">
                <span className="label-text">HEIGHT</span>
              </label>
              <p className={`dimension-max ${isDimensionExceeded('height') ? 'error' : ''}`}>
                {isDimensionExceeded('height') ? `Exceeds ` : ''}Max: {MAX_DIMENSIONS.height}"
              </p>
            </div>
          </div>

          {/* Saving Indicator */}
          {isSaving && (
            <div className="saving-indicator">
              <span className="saving-dot"></span>
              <span className="saving-text">Saving...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="primary-button continue-button"
              onClick={handleContinue}
              disabled={!canContinue() || isSaving}
            >
              Continue to Weighting
            </button>
            <button
              className="secondary-button back-button"
              onClick={handleBack}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </main>

      {/* Pets Modal */}
      {showPetsModal && (
        <PetsModal
          isOpen={showPetsModal}
          onClose={handleClosePetsModal}
          petProfiles={petProfiles}
          activePetId={activePet}
          onSelectPet={handleSelectPet}
          onAddPet={onAddPet}
          onDeletePet={onDeletePet}
          allFiles={allFiles}
        />
      )}
    </div>
  );
};

export default Measure;
