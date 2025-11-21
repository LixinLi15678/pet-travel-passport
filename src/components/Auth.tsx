import React, { useState, useRef, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { AuthProps } from '../types';
import './Auth.css';

/**
 * Authentication Component - Email/Password Login and Registration
 */
const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetEmailSent, setResetEmailSent] = useState<boolean>(false);
  const firstErrorInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Focus management for errors
  useEffect(() => {
    if (error && firstErrorInputRef.current) {
      firstErrorInputRef.current.focus();
    }
  }, [error]);

  // Reset form when switching tabs
  const handleTabSwitch = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowResetPassword(false);
    setResetEmailSent(false);
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      if (!auth) {
        setError('Authentication service is not available');
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setError('');
    } catch (err) {
      console.error('Password reset error:', err);
      const error = err as { code?: string };
      if (error.code === 'auth/user-not-found') {
        setError('If this email is registered, a reset link has been sent');
      } else {
        setError('Failed to send reset email. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setResetEmailSent(false);

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
      if (!auth) {
        setError('Authentication service is not available');
        return;
      }

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
        setIsLogin(true);
      }
    } catch (err) {
      console.error('Auth error:', err);
      const error = err as { code?: string };

      // Handle Firebase errors - unified messaging for login to prevent email enumeration
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
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          // Unified message to prevent email enumeration
          setError(isLogin ? 'Invalid email or password' : 'Authentication failed');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Use at least 6 characters');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please try again later');
          break;
        default:
          setError('Authentication failed. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const catIllustration = `${process.env.PUBLIC_URL}/assets/icons/cat-weight.svg`;

  // Password reset view
  if (showResetPassword) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-brand-compact">
            <div className="brand-header">
              <div className="brand-icon-compact">
                <img src={catIllustration} alt="Pet Passport" />
              </div>
              <p className="brand-name">Pet Passport</p>
            </div>
            <p className="brand-tagline">Your pet's journey, simplified.</p>
          </div>

          <div className="auth-card">
            <div className="auth-header">
              <h1>Reset Password</h1>
              <p className="auth-subtitle">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="auth-form" aria-busy={loading}>
              <div className="form-group">
                <label htmlFor="reset-email">Email</label>
                <input
                  type="email"
                  id="reset-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  disabled={loading}
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-invalid={error ? 'true' : 'false'}
                />
              </div>

              {error && (
                <div className="error-message" role="alert" aria-live="polite">
                  {error}
                </div>
              )}

              {resetEmailSent && (
                <div className="success-message" role="alert" aria-live="polite">
                  Password reset link sent! Check your email.
                </div>
              )}

              <button
                type="submit"
                className="auth-button primary"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="button-content">
                    <span className="spinner" aria-hidden="true"></span>
                    Sending...
                  </span>
                ) : (
                  'SEND RESET LINK'
                )}
              </button>

              <button
                type="button"
                className="auth-button secondary"
                onClick={() => {
                  setShowResetPassword(false);
                  setError('');
                  setResetEmailSent(false);
                }}
                disabled={loading}
              >
                Back to Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Compact Brand Section */}
        <div className="auth-brand-compact">
          <div className="brand-header">
            <div className="brand-icon-compact">
              <img src={catIllustration} alt="Pet Passport" />
            </div>
            <p className="brand-name">Pet Passport</p>
          </div>
          <p className="brand-tagline">Your pet's journey, simplified.</p>
        </div>

        {/* Main Auth Card */}
        <div className="auth-card">
          {/* Dynamic Title */}
          <div className="auth-header">
            <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
            <p className="auth-subtitle">
              {isLogin
                ? 'Manage your pet\'s travel checklist'
                : 'Start tracking your pet\'s travel documents'}
            </p>
          </div>

          {/* Accessible Tab Navigation */}
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              role="tab"
              aria-selected={isLogin}
              aria-controls="auth-form-panel"
              className={isLogin ? 'tab active' : 'tab'}
              onClick={() => handleTabSwitch(true)}
              type="button"
              tabIndex={isLogin ? 0 : -1}
            >
              Login
            </button>
            <button
              role="tab"
              aria-selected={!isLogin}
              aria-controls="auth-form-panel"
              className={!isLogin ? 'tab active' : 'tab'}
              onClick={() => handleTabSwitch(false)}
              type="button"
              tabIndex={!isLogin ? 0 : -1}
            >
              Register
            </button>
          </div>

          {/* Form with slide animation */}
          <div
            id="auth-form-panel"
            role="tabpanel"
            className={`form-container ${isLogin ? 'slide-in' : 'slide-in'}`}
          >
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="auth-form"
              aria-busy={loading}
              noValidate
            >
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  ref={!email && error ? firstErrorInputRef : null}
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  disabled={loading}
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-invalid={error && !email ? 'true' : 'false'}
                  aria-describedby={error ? 'auth-error' : undefined}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    ref={email && !password && error ? firstErrorInputRef : null}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? 'Enter your password' : 'Minimum 6 characters'}
                    disabled={loading}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                    aria-required="true"
                    aria-invalid={error && !password ? 'true' : 'false'}
                    aria-describedby={error ? 'auth-error' : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="form-group slide-down">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      disabled={loading}
                      autoComplete="new-password"
                      required
                      aria-required="true"
                      aria-invalid={error && confirmPassword !== password ? 'true' : 'false'}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={0}
                    >
                      {showConfirmPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot Password Link */}
              {isLogin && (
                <div className="auth-helper-links">
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setShowResetPassword(true)}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Error Message with aria-live */}
              {error && (
                <div
                  id="auth-error"
                  className="error-message"
                  role="alert"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {error}
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                className="auth-button primary"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="button-content">
                    <span className="spinner" aria-hidden="true"></span>
                    {isLogin ? 'SIGNING IN...' : 'CREATING ACCOUNT...'}
                  </span>
                ) : (
                  isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'
                )}
              </button>
            </form>

            {/* Bottom Switch Link */}
            <div className="auth-footer">
              <p>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => handleTabSwitch(!isLogin)}
                >
                  {isLogin ? 'Sign up here' : 'Sign in here'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
