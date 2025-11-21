import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { PetProfile, FileInfo } from '../types';
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
  onDeletePet: (petId: string) => void;
  onUpdatePetType: (petId: string, type: 'cat' | 'dog') => void;
  allFiles: FileInfo[];
  isAdmin?: boolean;
}

const WeightCarrier: React.FC<WeightCarrierProps> = (props) => {
  const { onNext, onBack } = props;

  const [carrierWeight, setCarrierWeight] = useState<string>('');

  const scalesIconSrc = `${process.env.PUBLIC_URL}/assets/icons/scales.svg`;

  const handleChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setCarrierWeight(sanitized);
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

  return (
    <div className="page-background">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="page-title">Pet Passport</h1>
            <p className="page-subtitle">Weigh carrier only</p>
          </div>
        </div>

        <div className="header-divider" />

        <div className="progress-section">
          <div className="step-divider" />

          <div className="progress-step active">
            <div className="step-circle">
              <span className="step-number">1</span>
            </div>
            <div className="step-label">MEASURE</div>
          </div>

          <div className="progress-step active">
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

      <main className="page-main">
        <div className="content-card weight-card">
          <div className="card-header">
            <div className="measure-icon">
              <img src={scalesIconSrc} alt="Scales icon" />
            </div>
            <div className="card-title-section">
              <h2 className="card-title">Carrier Weight</h2>
              <p className="card-subtitle">Weigh the empty carrier</p>
            </div>
          </div>

          <div className="title-divider" />

          <div className="info-banner">
            <p className="info-text">
              Step 1: Put the empty carrier on the scale. Enter the carrier weight in{' '}
              <strong>pounds</strong>.
            </p>
          </div>

          <div className="weight-input-wrapper">
            <label className="weight-label" htmlFor="carrier-weight">
              Carrier weight (lb)
            </label>
            <div className="weight-input-row">
              <input
                id="carrier-weight"
                type="text"
                inputMode="decimal"
                className="weight-input"
                value={carrierWeight}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="5.0"
              />
            </div>
          </div>

          <div className="action-buttons">
            <button
              className="primary-button continue-button"
              onClick={handleContinue}
              disabled={!canContinue()}
            >
              Continue to Pet + Carrier
            </button>
            <button
              className="secondary-button back-button"
              onClick={handleBackClick}
            >
              ← Back to Dimensions
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WeightCarrier;
