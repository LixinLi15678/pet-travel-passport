import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import Auth from './components/Auth';
import MainPage from './components/MainPage';
import Vaccine from './components/Vaccine';
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
  const [showLoginTip, setShowLoginTip] = useState(false);
  const [currentPage, setCurrentPage] = useState('main'); // 'main' or 'vaccine'

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
    // Check if user wants to see login tip
    const dontShowAgain = localStorage.getItem('dontShowLoginTip');
    if (!dontShowAgain) {
      setShowLoginTip(true);
    }
  };

  const handleDismissLoginTip = (dontShowAgain) => {
    setShowLoginTip(false);
    if (dontShowAgain) {
      localStorage.setItem('dontShowLoginTip', 'true');
    }
  };

  const handleBeginSetup = () => {
    setCurrentPage('vaccine');
  };

  const handleBackToMain = () => {
    setCurrentPage('main');
  };

  const handleVaccineNext = (data) => {
    console.log('Vaccine data:', data);
    // TODO: Navigate to next page (DONE/Review)
    alert('Vaccine upload complete! Next page coming soon...');
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        await signOut(auth);
        setCurrentPage('main');
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

  // Show auth page if user is not logged in
  if (!user) {
    return (
      <div className="App">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  // Logged in - show appropriate page
  return (
    <div className="App">
      {currentPage === 'main' ? (
        <MainPage
          user={user}
          onLogout={handleLogout}
          showLoginTip={showLoginTip}
          onDismissLoginTip={handleDismissLoginTip}
          onBeginSetup={handleBeginSetup}
        />
      ) : (
        <Vaccine
          user={user}
          onNext={handleVaccineNext}
          onBack={handleBackToMain}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
