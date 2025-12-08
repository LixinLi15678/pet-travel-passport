import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { PetProfile, FileInfo } from '../types';
import { sanitizeDecimalInput } from '../utils/input';
import PetsModal from './PetsModal';
import { openAdminConsole } from '../utils/adminAccess';
import './shared.css';
import './Weight.css';

export interface WeightTotalProps {
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
  savedTotalWeight?: string;
  onTotalWeightChange: (value: string) => void;
  carrierWeight?: string;
}

const WeightTotal: React.FC<WeightTotalProps> = (props) => {
  const {
    onNext,
    onBack,
    savedTotalWeight = '',
    onTotalWeightChange,
    carrierWeight = '',
  } = props;

  const [totalWeight, setTotalWeight] = useState<string>(savedTotalWeight || '');
  const [showAccountPopup, setShowAccountPopup] = useState<boolean>(false);
  const [showPetsModal, setShowPetsModal] = useState<boolean>(false);

  useEffect(() => {
    setTotalWeight(savedTotalWeight || '');
  }, [savedTotalWeight]);

  const assetPath = (filename: string) =>
    `${process.env.PUBLIC_URL}/assets/icons/${encodeURIComponent(filename)}`;
  const scalesIconSrc = assetPath('scales.svg');

  const activePetKey = props.activePetId || props.petProfiles[0]?.id || null;
  const activePetProfile = activePetKey
    ? props.petProfiles.find((pet) => pet.id === activePetKey)
    : null;
  const activePetType = activePetProfile?.type === 'dog' ? 'dog' : 'cat';
  const accountIconSrc = assetPath(
    activePetType === 'dog' ? 'dog-login.svg' : 'cat-login.svg'
  );
  const petIllustrationSrc = assetPath(
    activePetType === 'dog' ? 'dog-weight.svg' : 'cat-weight.svg'
  );
  const MAX_CABIN_WEIGHT = 20;

  const parsedTotalWeight = parseFloat(totalWeight);
  const parsedCarrierWeight = parseFloat(carrierWeight);
  const hasCarrierWeight = carrierWeight.trim().length > 0;
  const carrierWeightValue =
    hasCarrierWeight && !isNaN(parsedCarrierWeight) ? parsedCarrierWeight : null;
  const hasTotalWeight = totalWeight.trim().length > 0;
  const totalWeightValue =
    hasTotalWeight && !isNaN(parsedTotalWeight) ? parsedTotalWeight : null;

  const handleChange = (value: string) => {
    const sanitized = sanitizeDecimalInput(value, 2);
    setTotalWeight(sanitized);
    onTotalWeightChange(sanitized);
  };

  const canContinue = () => {
    if (!hasCarrierWeight || carrierWeightValue === null) return false;
    if (totalWeightValue === null || totalWeightValue <= 0) return false;
    if (totalWeightValue <= carrierWeightValue) return false;
    return true;
  };

  const handleContinue = () => {
    if (!hasCarrierWeight) {
      alert('Please enter your carrier weight before adding the total weight.');
      return;
    }
    if (carrierWeightValue === null) {
      alert('Please re-enter the carrier weight before continuing.');
      return;
    }
    if (totalWeightValue === null || totalWeightValue <= 0) {
      alert('Please enter a valid total weight.');
      return;
    }
    if (totalWeightValue <= carrierWeightValue) {
      alert('Total weight must be greater than the carrier weight.');
      return;
    }
    onNext();
  };

  const handleBackClick = () => {
    onBack();
  };

  const numericWeight = totalWeightValue ?? 0;
  const hasWeight = hasTotalWeight;
  const isOverLimit = numericWeight > MAX_CABIN_WEIGHT;
  const limitPercentage = Math.min(
    totalWeightValue ? totalWeightValue / MAX_CABIN_WEIGHT : 0,
    1
  );
  const limitFillWidth = `${limitPercentage * 100}%`;
  const limitStatusClass = hasWeight
    ? isOverLimit
      ? 'weight-limit-status over'
      : 'weight-limit-status ok'
    : 'weight-limit-status neutral';
  const limitStatusText = hasWeight
    ? isOverLimit
      ? 'Over cabin limit'
      : 'Within cabin limit'
    : 'Enter weight to check limit';

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

  return (
    <div className="page-background">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="page-title">Pet Passport</h1>
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
              <p className="card-step">Step 2 of 2 · Total Weight</p>
              <h2 className="card-title">Combined Weight</h2>
              <p className="card-subtitle">Pet inside carrier on the scale</p>
            </div>
          </div>

          <div className="title-divider" />

          <div className="weight-info-banner">
            <p className="weight-info-text">
              Place your pet inside the carrier and weigh them together. Enter the
              combined weight in <strong>pounds</strong>.
            </p>
          </div>

          <div className="weight-visual-card weight-visual-card--combined">
            <div className="weight-visual-top">
              <div className="weight-illustration">
                <img src={petIllustrationSrc} alt="Pet and carrier illustration" />
              </div>
              <p className="weight-label-main">Pet + Carrier Weight</p>
            </div>

            <div className="weight-value-row">
              <input
                id="total-weight"
                type="text"
                inputMode="decimal"
                pattern="\\d*(\\.\\d{0,2})?"
                className="weight-input"
                value={totalWeight}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="17.8"
                aria-label="Pet and carrier weight in pounds"
              />
              <span className="weight-unit" aria-hidden="true">
                lbs
              </span>
            </div>

            <p className="weight-edit-hint">Tap to edit weight</p>
          </div>

          <div className="weight-limit-section" aria-live="polite">
            <div className="weight-limit-labels">
              <span>{hasWeight ? `${totalWeight} lbs` : '0 lbs'}</span>
              <span>of {MAX_CABIN_WEIGHT} lbs max</span>
            </div>
            <div className="weight-limit-bar">
              <div
                className={`weight-limit-fill${isOverLimit ? ' over-limit' : ''}`}
                style={{ width: limitFillWidth }}
              />
            </div>
            <div className={limitStatusClass}>{limitStatusText}</div>
          </div>

          <div className="weight-action-buttons">
            <button
              className="primary-button weight-primary-button"
              onClick={handleContinue}
              disabled={!canContinue()}
            >
              Continue to Vaccine
            </button>
            <button className="secondary-button weight-secondary-button" onClick={handleBackClick}>
              ← Back to Carrier
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

export default WeightTotal;
