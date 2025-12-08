import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { PetProfile, FileInfo } from '../types';
import { sanitizeDecimalInput } from '../utils/input';
import PetsModal from './PetsModal';
import { openAdminConsole } from '../utils/adminAccess';
import './shared.css';
import './Weight.css';

export interface WeightCarrierProps {
  user: User;
  onNext: () => void;
  onBack: () => void;
  onLogout: () => void;
  petProfiles: PetProfile[];
  activePetId: string | null;
  onPetChange: (petId: string) => void;
  onAddPet: (pet: { name: string; type: 'cat' | 'dog' }) => Promise<string | null>;
  onDeletePet: (petId: string) => Promise<void>;
  onUpdatePetType: (petId: string, type: 'cat' | 'dog') => Promise<void>;
  allFiles: FileInfo[];
  isAdmin?: boolean;
  savedCarrierWeight?: string;
  onCarrierWeightChange: (value: string) => void;
  onGoHome: () => void;
}

const WeightCarrier: React.FC<WeightCarrierProps> = (props) => {
  const {
    onNext,
    onBack,
    savedCarrierWeight = '',
    onCarrierWeightChange,
    onGoHome,
  } = props;

  const [carrierWeight, setCarrierWeight] = useState<string>(savedCarrierWeight || '');
  const [showAccountPopup, setShowAccountPopup] = useState<boolean>(false);
  const [showPetsModal, setShowPetsModal] = useState<boolean>(false);

  useEffect(() => {
    setCarrierWeight(savedCarrierWeight || '');
  }, [savedCarrierWeight]);

  const assetPath = (filename: string) =>
    `${process.env.PUBLIC_URL}/assets/icons/${encodeURIComponent(filename)}`;
  const scalesIconSrc = assetPath('scales.svg');
  const carrierIllustrationSrc = assetPath('Pet Carrier.svg');
  const activePetKey = props.activePetId || props.petProfiles[0]?.id || null;
  const activePetProfile = activePetKey
    ? props.petProfiles.find((pet) => pet.id === activePetKey)
    : null;
  const activePetType = activePetProfile?.type === 'dog' ? 'dog' : 'cat';
  const accountIconSrc = assetPath(
    activePetType === 'dog' ? 'dog-login.svg' : 'cat-login.svg'
  );

  const handleChange = (value: string) => {
    const sanitized = sanitizeDecimalInput(value, 2);
    setCarrierWeight(sanitized);
    onCarrierWeightChange(sanitized);
  };

  const canContinue = () => {
    if (!carrierWeight) return false;
    const value = parseFloat(carrierWeight);
    return !isNaN(value) && value > 0;
  };

  const handleContinue = () => {
    if (!canContinue()) {
      alert('Please enter a valid carrier weight.');
      return;
    }
    onNext();
  };

  const handleBackClick = () => {
    onBack();
  };

  const handleOpenPetsModal = () => {
    setShowPetsModal(true);
    setShowAccountPopup(false);
  };

  const handleClosePetsModal = () => {
    setShowPetsModal(false);
  };

  const handleSelectPet = (petId: string) => {
    props.onPetChange(petId);
    setShowPetsModal(false);
    setShowAccountPopup(false);
  };

  const handleTitleClick = () => {
    if (onGoHome) onGoHome();
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onGoHome) onGoHome();
    }
  };

  return (
    <div className="page-background">
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
            <p className="page-subtitle">Recording weight data</p>
          </div>
          {props.user && (
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
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                  >
                    <div className="account-popup-header">
                      <p className="account-email">{props.user.email}</p>
                      {props.isAdmin && (
                        <button
                          className="account-admin-tag"
                          onClick={() => {
                            setShowAccountPopup(false);
                            openAdminConsole();
                          }}
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
                        props.onLogout();
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

        <div className="progress-section">
          <div className="progress-step completed">
            <div className="step-circle" aria-label="Measure step complete">
              <span className="step-icon">✓</span>
            </div>
            <div className="step-label">MEASURE</div>
          </div>

          <div className="progress-step active">
            <div className="step-circle" aria-label="Current: Weigh">
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

      <main className="page-main">
        <div className="content-card weight-card">
          <div className="card-header">
            <div className="weight-icon">
              <img src={scalesIconSrc} alt="Scales icon" />
            </div>
            <div className="card-title-section">
              <p className="card-step">Step 1 of 2 · Carrier Weight</p>
              <h2 className="card-title">Carrier Weight</h2>
              <p className="card-subtitle">Record the empty carrier first</p>
            </div>
          </div>

          <div className="title-divider" />

          <div className="weight-info-banner">
            <p className="weight-info-text">
              Set your empty carrier on the scale and enter the weight in{' '}
              <strong>pounds</strong>.
            </p>
          </div>

          <div className="weight-visual-card">
            <div className="weight-visual-top">
              <div className="weight-illustration">
                <img src={carrierIllustrationSrc} alt="Empty carrier illustration" />
              </div>
              <p className="weight-label-main">Empty Carrier Weight</p>
            </div>

            <div className="weight-value-row">
              <input
                id="carrier-weight"
                type="text"
                inputMode="decimal"
                pattern="\\d*(\\.\\d{0,2})?"
                className="weight-input"
                value={carrierWeight}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="2.3"
                aria-label="Carrier weight in pounds"
              />
              <span className="weight-unit" aria-hidden="true">
                lbs
              </span>
            </div>

            <p className="weight-edit-hint">Tap to edit weight</p>
            <p className="weight-footnote">Soft-shell carrier preferred</p>
          </div>

          <div className="weight-action-buttons">
            <button
              className="primary-button weight-primary-button"
              onClick={handleContinue}
              disabled={!canContinue()}
            >
              Next: Weight Pet + Carrier
            </button>
            <button className="secondary-button weight-secondary-button" onClick={handleBackClick}>
              ← Back to Measure
            </button>
          </div>
        </div>
      </main>

      {showPetsModal && (
        <PetsModal
          isOpen={showPetsModal}
          onClose={handleClosePetsModal}
          petProfiles={props.petProfiles}
          activePetId={activePetKey}
          onPetChange={props.onPetChange}
          onSelectPet={handleSelectPet}
          onAddPet={props.onAddPet}
          onDeletePet={props.onDeletePet}
          onUpdatePetType={props.onUpdatePetType}
          allFiles={props.allFiles}
        />
      )}
    </div>
  );
};

export default WeightCarrier;
