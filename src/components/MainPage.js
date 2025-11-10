import React, { useMemo, useState } from 'react';
import PetsModal from './PetsModal';
import './shared.css';
import './MainPage.css';

/**
 * Main Page - First page of Pet Travel Passport
 */
const MainPage = ({
  user,
  onLogout,
  showLoginTip,
  onDismissLoginTip,
  onBeginSetup,
  petProfiles = [],
  activePetId,
  onPetChange,
  onAddPet,
  onDeletePet,
  allFiles = []
}) => {
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showPetsModal, setShowPetsModal] = useState(false);
  const accountIconSrc = `${process.env.PUBLIC_URL}/assets/icons/cat-login.svg`;
  const welcomeCatSrc = `${process.env.PUBLIC_URL}/assets/icons/icons8-cat-100.png`;

  const activePet = activePetId || petProfiles[0]?.id || null;
  const hasPets = petProfiles.length > 0;

  const currentPetName = useMemo(() => {
    const pet = activePet ? petProfiles.find((p) => p.id === activePet) : null;
    if (!pet || !activePet) {
      return 'Add a pet to continue';
    }
    const filesForPet = allFiles
      .filter((file) => file.petId === activePet)
      .sort((a, b) => {
        const aTime = new Date(a.uploadedAt || 0).getTime();
        const bTime = new Date(b.uploadedAt || 0).getTime();
        return aTime - bTime;
      });

    const referenceDate = filesForPet[0]?.uploadedAt || pet?.createdAt;
    const date = referenceDate ? new Date(referenceDate) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return pet?.name || 'CAT';
    }
    return `${date.toISOString().slice(0, 10)} ${pet?.name || 'CAT'}`;
  }, [activePet, allFiles, petProfiles]);

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
  return (
    <div className="page-background">
      <div className="page-header">
        {/* Header Section */}
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="page-title">Pet Travel Passport</h1>
            <p className="page-subtitle">Verified check-in in 4 steps</p>
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

        {/* Step Indicator - Status Bar */}
        <div className="progress-section">
          <div className="step-divider" />

          <div className="progress-step">
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

      {/* Login Tip Modal */}
      {showLoginTip && (
        <div className="login-tip-overlay">
          <div className="login-tip-modal">
            <h2>Welcome!</h2>
            <p>
              To log out, tap the <span className="highlight-text">cat icon</span> in the top right, then choose logout from the menu.
            </p>
            <div className="tip-checkbox">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              <label htmlFor="dontShowAgain">Do not show again</label>
            </div>
            <button
              onClick={() => onDismissLoginTip(dontShowAgain)}
              className="tip-dismiss-button"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Main Content Section */}
      <main className="page-main">
        <div className="content-card hero-card">
          {/* Cat Icon */}
          <div className="cat-icon">
            <img
              src={welcomeCatSrc}
              alt="Cat"
              className="cat-image"
            />
          </div>

          {/* Greeting */}
          <p className="meow-text">meow~</p>

          {/* Welcome Title */}
          <h2 className="hero-title">Welcome!</h2>

          {/* Description */}
          <p className="hero-description">
            Set up your pet's travel passport<br/>
            Get verified for stress-free airline check-in
          </p>

          {/* Stats Card */}
          <div className="stats-card">
            <div className="stat-item">
              <div className="stat-value">5 min</div>
              <div className="stat-label">Setup time</div>
            </div>

            <div className="stat-divider" />

            <div className="stat-item">
              <div className="stat-value">4</div>
              <div className="stat-label">Simple steps</div>
            </div>

            <div className="stat-divider" />

            <div className="stat-item">
              <div className="stat-value">99%</div>
              <div className="stat-label">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Begin Button */}
        <div className="pet-selector-card">
          <div>
            <p className="pet-selector-label">{hasPets ? 'Current Pet' : 'Add a pet to continue'}</p>
            <h3 className="pet-selector-name">{currentPetName}</h3>
          </div>
          <button className="pet-selector-manage" onClick={handleOpenPetsModal}>
            {hasPets ? 'Manage Pets' : 'Add Pet'}
          </button>
        </div>

        <button
          className="primary-button begin-button"
          onClick={onBeginSetup}
          disabled={!hasPets}
        >
          Begin Setup
        </button>

        {/* Help Link */}
        <button className="help-link">
          Need Help?
        </button>
      </main>

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

export default MainPage;
