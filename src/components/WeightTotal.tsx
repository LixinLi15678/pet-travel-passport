import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { PetProfile, FileInfo } from '../types';
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
  onDeletePet: (petId: string) => void;
  onUpdatePetType: (petId: string, type: 'cat' | 'dog') => void;
  allFiles: FileInfo[];
  isAdmin?: boolean;
  savedTotalWeight?: string;
  onTotalWeightChange: (value: string) => void;
}

const WeightTotal: React.FC<WeightTotalProps> = (props) => {
  const { onNext, onBack, savedTotalWeight = '', onTotalWeightChange } = props;

  const [totalWeight, setTotalWeight] = useState<string>(savedTotalWeight || '');

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
  const petIllustrationSrc = assetPath(
    activePetType === 'dog' ? 'dog-weight.svg' : 'cat-weight.svg'
  );
  const MAX_CABIN_WEIGHT = 20;

  const handleChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setTotalWeight(sanitized);
    onTotalWeightChange(sanitized);
  };

  const canContinue = () => {
    if (!totalWeight) return false;
    const value = parseFloat(totalWeight);
    return !isNaN(value) && value > 0;
  };

  const handleContinue = () => {
    if (!canContinue()) {
      alert('Please enter a valid total weight.');
      return;
    }
    onNext();
  };

  const handleBackClick = () => {
    onBack();
  };

  const parsedWeight = parseFloat(totalWeight);
  const numericWeight = Number.isFinite(parsedWeight) ? parsedWeight : 0;
  const hasWeight = totalWeight.trim().length > 0;
  const isOverLimit = numericWeight > MAX_CABIN_WEIGHT;
  const limitPercentage = Math.min(numericWeight / MAX_CABIN_WEIGHT, 1);
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

  return (
    <div className="page-background">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="page-title">Pet Travel Passport</h1>
            <p className="page-subtitle">Recording weight data</p>
          </div>
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
    </div>
  );
};

export default WeightTotal;
