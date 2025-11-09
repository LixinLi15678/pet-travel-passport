import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../firebase/config';
import './Auth.css';

/**
 * Authentication Component - Email/Password Login and Registration
 */
const Auth = ({ onAuthSuccess, onOpenHelp }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful:', userCredential.user.uid);
        if (onAuthSuccess) {
          onAuthSuccess(userCredential.user);
        }
      } else {
        // Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Registration successful:', userCredential.user.uid);
        if (onAuthSuccess) {
          onAuthSuccess(userCredential.user);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);

      // Handle Firebase errors
      switch (error.code) {
        case 'auth/configuration-not-found':
          setError('Firebase Authentication is not enabled. Please enable Email/Password authentication in Firebase Console.');
          break;
        case 'auth/email-already-in-use':
          setError('Email is already registered');
          break;
        case 'auth/invalid-email':
          setError('Invalid email format');
          break;
        case 'auth/user-not-found':
          setError('User not found');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/weak-password':
          setError('Password is too weak');
          break;
        case 'auth/too-many-requests':
          setError('Too many requests. Please try again later');
          break;
        default:
          setError('Authentication failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Pet Travel Passport</h1>
        <p className="auth-subtitle">Pet Travel Passport Management System</p>

        <div className="auth-tabs">
          <button
            className={isLogin ? 'tab active' : 'tab'}
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
          >
            Login
          </button>
          <button
            className={!isLogin ? 'tab active' : 'tab'}
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (at least 6 characters)"
              disabled={loading}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter password again"
                disabled={loading}
                required
              />
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="auth-footer">
          <p className="hint">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setConfirmPassword('');
              }}
            >
              {isLogin ? 'Register now' : 'Login now'}
            </button>
          </p>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button
              type="button"
              className="link-button"
              onClick={onOpenHelp}
              aria-label="Open help"
            >
              Need Help?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
