import React, { useState } from 'react';
import './shared.css';
import './MainPage.css';

/**
 * Main Page - First page of Pet Travel Passport
 */
const MainPage = ({ user, onLogout, showLoginTip, onDismissLoginTip, onBeginSetup }) => {
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const accountIconSrc = `${process.env.PUBLIC_URL}/assets/icons/cat-login.svg`;
  const welcomeCatSrc = `${process.env.PUBLIC_URL}/assets/icons/icons8-cat-100.png`;
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
        <button className="primary-button begin-button" onClick={onBeginSetup}>
          Begin Setup
        </button>

        {/* Help Link */}
        <button className="help-link">
          Need Help?
        </button>
      </main>
    </div>
  );
};

export default MainPage;
