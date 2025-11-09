import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import Auth from './components/Auth';
import DataManager from './components/DataManager';
import MainPage from './components/MainPage';
import Help from './components/Help';
import './App.css';

/**
 * Main App Component - Pet Travel Passport Management System
 * Features:
 * 1. User Authentication (Email/Password)
 * 2. Data Management (CRUD operations)
 * 3. File Upload with base64 storage
 * 4. Global "Help" link (always visible)
 */
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('main'); // 'auth' | 'main' | 'data-manager'
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showLoginTip, setShowLoginTip] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // If auth is null (e.g., misconfigured Firebase), skip listening to avoid blank screen
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        const dontShowAgain = localStorage.getItem('dontShowLoginTip');
        if (!dontShowAgain) {
          setShowLoginTip(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setCurrentPage('main');

    const dontShowAgain = localStorage.getItem('dontShowLoginTip');
    if (!dontShowAgain) {
      setShowLoginTip(true);
    }
  };

  const handleBeginSetup = () => {
    setCurrentPage('data-manager');
    setShowDisclaimer(true);
  };

  const handleBackToMainPage = () => {
    setCurrentPage('main');
    setShowDisclaimer(false);
  };

  const handleDismissDisclaimer = () => {
    setShowDisclaimer(false);
  };

  const handleDismissLoginTip = (dontShowAgain) => {
    setShowLoginTip(false);
    if (dontShowAgain) {
      localStorage.setItem('dontShowLoginTip', 'true');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        await signOut(auth);
        setCurrentPage('auth');
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Decide what the main content is (Auth, MainPage, or DataManager),
  // but always render the global Help link/overlay below.
  let pageContent = null;

  if (currentPage === 'auth' || !user) {
    pageContent = <Auth onAuthSuccess={handleAuthSuccess} />;
  } else if (currentPage === 'main') {
    pageContent = (
      <MainPage
        onBeginSetup={handleBeginSetup}
        user={user}
        onLogout={handleLogout}
        showLoginTip={showLoginTip}
        onDismissLoginTip={handleDismissLoginTip}
      />
    );
  } else {
    pageContent = (
      <DataManager
        user={user}
        onBackToMain={handleBackToMainPage}
        showDisclaimer={showDisclaimer}
        onDismissDisclaimer={handleDismissDisclaimer}
      />
    );
  }

  return (
    <div className="App">
      {pageContent}

      {/* Global "Help" link (underline, fixed at bottom-right) */}
      <p
        onClick={() => setShowHelp(true)}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          color: '#FF6B9D',
          textDecoration: 'underline',
          cursor: 'pointer',
          fontSize: 16,
          zIndex: 10000,
          margin: 0,
        }}
      >
        Help
      </p>

      {/* Help overlay */}
      {showHelp && <Help onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default App;
