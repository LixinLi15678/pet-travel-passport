import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import Auth from './components/Auth';
import DataManager from './components/DataManager';
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

  useEffect(() => {
    // Listen to authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        console.log('User logged in:', currentUser.uid);
      } else {
        console.log('User logged out');
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        <DataManager user={user} />
      ) : (
        <Auth onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

export default App;
