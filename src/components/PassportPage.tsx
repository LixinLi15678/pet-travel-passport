import React from "react";
import "./shared.css";
import "./PassportPage.css";

import { PetProfile, FileInfo } from "../types";
import { QRCodeCanvas } from "qrcode.react";

interface FlightInfo {
  pnr: string;
  flightNumber: string;
  departureDate: string;
}

interface PassportPageProps {
  pet: PetProfile | null;
  files: FileInfo[];
  flightInfo: FlightInfo | null;
  userEmail: string;
  onBack: () => void;
}

const PassportPage: React.FC<PassportPageProps> = ({
  pet,
  flightInfo,
  onBack,
}) => {
  const qrValue = JSON.stringify({
    petId: pet?.id,
    flight: flightInfo?.flightNumber,
    date: flightInfo?.departureDate,
  });

  return (
    <div className="page-background">

      {/* HEADER — matches Review page */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="page-title">Pet Travel Passport</h1>
            <p className="page-subtitle">Ready to fly</p>
          </div>
        </div>

        <div className="header-divider" />

        {/* PROGRESS TRACKER — exact clone */}
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

        {/* GREEN PASSPORT CARD */}
        <div className="passport-card">
          <div className="passport-success-check">✓</div>

          <h2 className="passport-title">Travel Passport Generated!</h2>
          <p className="passport-subtitle">
            Your pet is verified and ready to fly
          </p>

          <div className="passport-flight-box">
            <div className="passport-flight-item">
              <span className="flight-label">Flight</span>
              <span className="flight-value">
                {flightInfo?.flightNumber || "—"}
              </span>
            </div>

            <div className="passport-flight-item">
              <span className="flight-label">Date</span>
              <span className="flight-value">
                {flightInfo?.departureDate || "—"}
              </span>
            </div>

            <div className="passport-flight-item">
              <span className="flight-label">Total</span>
              <span className="flight-value">
                {pet?.weight?.total || "—"} lb
              </span>
            </div>
          </div>

          <div className="passport-qr-box">
            <QRCodeCanvas value={qrValue} size={170} includeMargin />
          </div>

          <p className="passport-pnr">
            PNR: {flightInfo?.pnr || "—"} • Valid for check-in
          </p>
        </div>

        {/* SUMMARY CARD — identical to Review page */}
        <div className="review-section">

          <div className="review-section-header">
            <div className="review-icon-pink">📄</div>
            <div>
              <h3 className="review-title">Verification Summary</h3>
              <p className="review-subtitle">All compliance checks passed</p>
            </div>
          </div>

          <div className="review-divider" />

          <div className="review-inner">
            <h4 className="review-inner-label">Carrier Dimensions</h4>

            <div className="review-dimensions-row">
              <div className="review-dim">{pet?.dimensions?.length || "—"}″</div>
              <div className="review-dim">{pet?.dimensions?.width || "—"}″</div>
              <div className="review-dim">{pet?.dimensions?.height || "—"}″</div>
            </div>

            <h4 className="review-inner-label">Total Weight</h4>

            <div className="review-weight-box">
              <div className="review-weight-main">
                {pet?.weight?.total || "—"} lbs
              </div>
              <p className="review-weight-sub">✓ Within 20 lb limit</p>
            </div>
          </div>

          <button className="review-back-btn" onClick={onBack}>
            ← Back to Vaccine
          </button>
        </div>

      </main>
    </div>
  );
};

export default PassportPage;
