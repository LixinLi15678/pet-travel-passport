import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import Auth from './components/Auth';
import DataManager from './components/DataManager';
import MainPage from './components/MainPage';
import './App.css';

/**
 * Main App Component - Pet Travel Passport Management System
 * Features:
 * 1. User Authentication (Email/Password)
 * 2. Data Management (CRUD operations)
 * 3. File Upload with base64 storage
 */
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('main'); // 'main' or 'data-manager'
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showLoginTip, setShowLoginTip] = useState(false);

  useEffect(() => {
    // Listen to authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        console.log('User logged in:', currentUser.uid);
        // Check if user wants to see login tip
        const dontShowAgain = localStorage.getItem('dontShowLoginTip');
        if (!dontShowAgain) {
          setShowLoginTip(true);
        }
      } else {
        console.log('User logged out');
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setCurrentPage('main');
    // Check if user wants to see login tip
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

  // Show auth page if currentPage is 'auth' or user is not logged in
  if (currentPage === 'auth' || !user) {
    return (
      <div className="App">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  // Logged in - show main page or data manager
  return (
    <div className="App">
      {currentPage === 'main' ? (
        <MainPage
          onBeginSetup={handleBeginSetup}
          user={user}
          onLogout={handleLogout}
          showLoginTip={showLoginTip}
          onDismissLoginTip={handleDismissLoginTip}
        />
      ) : (
        <DataManager
          user={user}
          onBackToMain={handleBackToMainPage}
          showDisclaimer={showDisclaimer}
          onDismissDisclaimer={handleDismissDisclaimer}
        />
      )}
    </div>
  );
}

export default App;
