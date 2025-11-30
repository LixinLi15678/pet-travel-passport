import React, { useState } from "react";
import "./shared.css";
import "./Review.css";

import { User } from "firebase/auth";
import { PetProfile, FileInfo } from "../types";
import PetsModal from "./PetsModal";
import { openAdminConsole } from "../utils/adminAccess";

interface FlightInfo {
  pnr: string;
  flightNumber: string;
  departureDate: string;
}

interface ReviewProps {
  user: User;
  petProfiles: PetProfile[];
  activePetId: string | null;
  allFiles: FileInfo[];
  flightInfo: FlightInfo | null; // ← ADDED
  onUpdateFlightInfo: (flightInfo: FlightInfo) => Promise<void>; // ← ADDED (writes to Firebase)
  onBack: () => void;
  onLogout: () => void;
  onNext: () => void;
  onPetChange: (petId: string) => void;
  onAddPet: (pet: { name: string; type: "cat" | "dog" }) => Promise<string | null>;
  onDeletePet: (petId: string) => Promise<void>;
  onUpdatePetType: (petId: string, type: "cat" | "dog") => Promise<void>;
  isAdmin?: boolean;
}


const Review: React.FC<ReviewProps> = (props) => {
  const {
    flightInfo,
    onUpdateFlightInfo,
    onBack,
    onNext,
    petProfiles,
    activePetId,
    allFiles,
    user,
    onLogout,
    onPetChange,
    onAddPet,
    onDeletePet,
    onUpdatePetType,
    isAdmin,
  } = props;
  const [editing, setEditing] = useState(false);

  const [pnr, setPnr] = useState(flightInfo?.pnr || "");
  const [flightNumber, setFlightNumber] = useState(
    flightInfo?.flightNumber || ""
  );
  const [departureDate, setDepartureDate] = useState(
    flightInfo?.departureDate || ""
  );
  const [showAccountPopup, setShowAccountPopup] = useState<boolean>(false);
  const [showPetsModal, setShowPetsModal] = useState<boolean>(false);

  const activePet = activePetId || petProfiles[0]?.id || null;
  const activePetProfile = activePet
    ? petProfiles.find((pet) => pet.id === activePet)
    : null;
  const activePetType = activePetProfile?.type === "dog" ? "dog" : "cat";
  const accountIconSrc = `${process.env.PUBLIC_URL}/assets/icons/${
    activePetType === "dog" ? "dog-login.svg" : "cat-login.svg"
  }`;

  const saveFlightDetails = async () => {
    if (!pnr || !flightNumber || !departureDate) {
      alert("Please fill in all fields.");
      return;
    }

    await onUpdateFlightInfo({
      pnr,
      flightNumber,
      departureDate,
    });

    setEditing(false);
  };

  const handleOpenPetsModal = () => {
    setShowPetsModal(true);
    setShowAccountPopup(false);
  };

  const handleClosePetsModal = () => {
    setShowPetsModal(false);
  };

  const handleSelectPet = (petId: string) => {
    onPetChange(petId);
    setShowPetsModal(false);
    setShowAccountPopup(false);
  };

  return (
    <div className="page-background">
      {/* HEADER */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="page-title">Pet Passport</h1>
            <p className="page-subtitle">Final Review</p>
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
                    <div className="account-popup-header">
                      <p className="account-email">{user.email}</p>
                      {isAdmin && (
                        <button
                          className="account-admin-tag"
                          onClick={() => {
                            setShowAccountPopup(false);
                            openAdminConsole();
                          }}
                        >
                          Admin Console
                        </button>
                      )}
                    </div>
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
                        onLogout();
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

        {/* PROGRESS BAR */}
        <div className="progress-section">
          <div className="step-divider" />

          <div className="progress-step completed">
            <div className="step-circle">
              <span className="step-icon">✓</span>
            </div>
            <div className="step-label">MEASURE</div>
          </div>

          <div className="progress-step completed">
            <div className="step-circle">
              <span className="step-icon">✓</span>
            </div>
            <div className="step-label">WEIGH</div>
          </div>

          <div className="progress-step completed">
            <div className="step-circle">
              <span className="step-icon">✓</span>
            </div>
            <div className="step-label">VACCINE</div>
          </div>

          <div className="progress-step active">
            <div className="step-circle">
              <span className="step-number">4</span>
            </div>
            <div className="step-label">DONE</div>
          </div>
        </div>

        <div className="statusbar-divider" />
      </div>

      {/* MAIN CONTENT */}
      <main className="page-main">
        <div className="content-card review-card">
          {/* Title */}
          <div className="section-header">
            <h2 className="section-title">Compliance Check</h2>
            <p className="section-subtitle">All requirements verified</p>
          </div>

          <div className="review-check-grid">
            <div className="review-check-item">
              <span className="review-check-icon">✓</span>
              <span className="review-check-label">Dimensions</span>
            </div>
            <div className="review-check-item">
              <span className="review-check-icon">✓</span>
              <span className="review-check-label">Weight</span>
            </div>
            <div className="review-check-item">
              <span className="review-check-icon">✓</span>
              <span className="review-check-label">Vaccine</span>
            </div>
            <div className="review-check-item">
              <span className="review-check-icon">✓</span>
              <span className="review-check-label">Empty Slot</span>
            </div>
          </div>

          {/* Divider */}
          <div className="review-divider" />

          {/* ✈️ Flight Details Section (replacing uploaded files) */}
          <div className="review-file-section">
            <div className="review-file-title-row">
              <h3 className="review-file-title">Flight Details</h3>
              {!editing && (
                <span
                  className="review-edit-details"
                  onClick={() => setEditing(true)}
                >
                  ✏️ Edit Details
                </span>
              )}
            </div>

            {!editing ? (
              <div className="review-flight-box">
                <div className="review-flight-row">
                  <span className="review-flight-label">PNR</span>
                  <span className="review-flight-value">{flightInfo?.pnr || "—"}</span>
                </div>
                <div className="review-flight-row">
                  <span className="review-flight-label">Flight Number</span>
                  <span className="review-flight-value">{flightInfo?.flightNumber || "—"}</span>
                </div>
                <div className="review-flight-row">
                  <span className="review-flight-label">Departure Date</span>
                  <span className="review-flight-value">{flightInfo?.departureDate || "—"}</span>
                </div>
              </div>
            ) : (
              <>
                <input
                  className="review-input"
                  placeholder="Enter PNR"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                />
                <input
                  className="review-input"
                  placeholder="Enter Flight Number"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                />
                <input
                  className="review-input"
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                />

                <button
                  className="review-generate-btn"
                  style={{ marginTop: "16px" }}
                  onClick={saveFlightDetails}
                >
                  Save Flight Information
                </button>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="review-actions">
            <button className="review-generate-btn" onClick={() => onNext?.()}>
              Generate Travel Passport
            </button>

            <button className="review-back-btn" onClick={onBack}>
              ← Back to Vaccine
            </button>
          </div>
        </div>
      </main>

      {showPetsModal && (
        <PetsModal
          isOpen={showPetsModal}
          onClose={handleClosePetsModal}
          petProfiles={petProfiles}
          activePetId={activePet}
          onPetChange={onPetChange}
          onSelectPet={handleSelectPet}
          onAddPet={onAddPet}
          onDeletePet={onDeletePet}
          onUpdatePetType={onUpdatePetType}
          allFiles={allFiles}
        />
      )}
    </div>
  );
};

export default Review;
