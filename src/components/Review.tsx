import React, { useState } from "react";
import "./shared.css";
import "./Review.css";

import { User } from "firebase/auth";
import { PetProfile, FileInfo } from "../types";

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
}


const Review: React.FC<ReviewProps> = ({
  flightInfo,
  onUpdateFlightInfo,
  onBack,
  onNext,
}) => {
  const [editing, setEditing] = useState(false);

  const [pnr, setPnr] = useState(flightInfo?.pnr || "");
  const [flightNumber, setFlightNumber] = useState(
    flightInfo?.flightNumber || ""
  );
  const [departureDate, setDepartureDate] = useState(
    flightInfo?.departureDate || ""
  );

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

  return (
    <div className="page-background">
      {/* HEADER */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="page-title">Pet Travel Passport</h1>
            <p className="page-subtitle">Final Review</p>
          </div>
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
            <div className="review-check-item">✓ Dimensions</div>
            <div className="review-check-item">✓ Weight</div>
            <div className="review-check-item">✓ Vaccine</div>
            <div className="review-check-item">✓ Empty Slot</div>
          </div>

          {/* Divider */}
          <div className="review-divider" />

          {/* ✈️ Flight Details Section (replacing uploaded files) */}
          <div className="review-file-section">
            <h3 className="review-file-title">
              Flight Details{" "}
              {!editing && (
                <span
                  onClick={() => setEditing(true)}
                  style={{
                    marginLeft: "6px",
                    color: "#e63e6f",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  ✏️ Edit Details
                </span>
              )}
            </h3>

            {!editing ? (
              <div className="review-flight-box">
                <div className="review-flight-row">
                  <span>PNR</span>
                  <span>{flightInfo?.pnr || "—"}</span>
                </div>
                <div className="review-flight-row">
                  <span>Flight Number</span>
                  <span>{flightInfo?.flightNumber || "—"}</span>
                </div>
                <div className="review-flight-row">
                  <span>Departure Date</span>
                  <span>{flightInfo?.departureDate || "—"}</span>
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
    </div>
  );
};

export default Review;
