import React, { useState } from "react";
import "./shared.css";
import "./PassportPage.css";

import { PetProfile, FileInfo } from "../types";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PetsModal from "./PetsModal";
import { openAdminConsole } from "../utils/adminAccess";

/* ----------------------------------
   Types
----------------------------------- */
interface FlightInfo {
  pnr: string;
  flightNumber: string;
  departureDate: string;
}

interface PassportPageProps {
  pet: PetProfile | null;
  allFiles: FileInfo[];
  flightInfo: FlightInfo | null;
  userEmail: string;
  petProfiles: PetProfile[];
  activePetId: string | null;
  onPetChange: (petId: string) => void;
  onAddPet: (pet: { name: string; type: "cat" | "dog" }) => Promise<string | null>;
  onDeletePet: (petId: string) => Promise<void>;
  onUpdatePetType: (petId: string, type: "cat" | "dog") => Promise<void>;
  onLogout: () => void;
  onBack: () => void;
  onHome: () => void;
  isAdmin?: boolean;
}

/* ----------------------------------
   Component
----------------------------------- */
const PassportPage: React.FC<PassportPageProps> = (props) => {
  const {
    pet,
    flightInfo,
    userEmail,
    petProfiles,
    activePetId,
    onPetChange,
    onAddPet,
    onDeletePet,
    onUpdatePetType,
    onLogout,
    onBack,
    onHome,
    allFiles,
    isAdmin,
  } = props;

  const [showAccountPopup, setShowAccountPopup] = useState<boolean>(false);
  const [showPetsModal, setShowPetsModal] = useState<boolean>(false);

  const activePet = activePetId || petProfiles[0]?.id || null;
  const activePetProfile = activePet
    ? petProfiles.find((p) => p.id === activePet)
    : null;
  const activePetType = activePetProfile?.type === "dog" ? "dog" : "cat";
  const accountIconSrc = `${process.env.PUBLIC_URL}/assets/icons/${
    activePetType === "dog" ? "dog-login.svg" : "cat-login.svg"
  }`;
  const summaryIconSrc = `${process.env.PUBLIC_URL}/assets/icons/summary.svg`;

  /* --- PDF Export --- */
  const handleExportPDF = async () => {
    const element = document.querySelector(
      ".pdf-export-wrapper"
    ) as HTMLElement | null;

    if (!element) return;

    await new Promise((r) => setTimeout(r, 150));

    const canvas = await html2canvas(
      element,
      {
        scale: 2,
        useCORS: true,
        windowWidth: element.scrollWidth,
      } as any
    );

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`Pet-Passport-${pet?.name || "Pet"}.pdf`);
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

  // QR encoded data
  const qrValue = JSON.stringify({
    petId: pet?.id,
    flight: flightInfo?.flightNumber,
    date: flightInfo?.departureDate,
  });

  /* ----------------------------------
     RENDER
  ----------------------------------- */
  return (
    <div className="page-background pdf-export-wrapper passport-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="page-title">Pet Passport</h1>
            <p className="page-subtitle">Your pet is ready to fly</p>
          </div>
          {userEmail && (
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
                      <p className="account-email">{userEmail}</p>
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

          <div className="progress-step completed">
            <div className="step-circle">
              <span className="step-icon">✓</span>
            </div>
            <div className="step-label">DONE</div>
          </div>
        </div>

        <div className="statusbar-divider" />
      </div>

      {/* MAIN CONTENT */}
      <main className="page-main">
        {/* GREEN PASSPORT CARD + QR */}
        <div className="passport-card">
          <div className="passport-success-check">✓</div>

          <h2 className="passport-title">Travel Passport Generated!</h2>
          <p className="passport-subtitle">
            Verified & cleared for travel
          </p>

          <div className="passport-flight-box">
            <div className="passport-flight-item">
              <span className="flight-label">Flight</span>
              <span className="flight-value">{flightInfo?.flightNumber ?? "—"}</span>
            </div>

            <div className="passport-flight-item">
              <span className="flight-label">Date</span>
              <span className="flight-value">{flightInfo?.departureDate ?? "—"}</span>
            </div>

            <div className="passport-flight-item">
              <span className="flight-label">Total</span>
              <span className="flight-value">
                {pet?.weight?.total ?? "—"} lb
              </span>
            </div>
          </div>

          <div className="passport-qr-box">
            <QRCodeCanvas value={qrValue} size={170} includeMargin />
          </div>

          <p className="passport-pnr">
            PNR: {flightInfo?.pnr ?? "—"} • Valid for check-in
          </p>
        </div>

        {/* SUMMARY SECTION (directly under QR now) */}
        <div className="review-section">
          <div className="review-section-header">
            <img
              src={summaryIconSrc}
              alt="Summary Icon"
              className="review-icon-pink"
            />
            <div>
              <h3 className="review-title">Verification Summary</h3>
              <p className="review-subtitle">All compliance checks passed</p>
            </div>
          </div>

          <div className="review-divider" />

          <div className="review-inner">
            <h4 className="review-inner-label">Carrier Dimensions</h4>

            <div className="review-dimensions-row">
              <div className="review-dim">
                <span className="review-dim-value">{pet?.dimensions?.length ?? "—"}″</span>
                <span className="review-dim-label">Length</span>
              </div>
              <div className="review-dim">
                <span className="review-dim-value">{pet?.dimensions?.width ?? "—"}″</span>
                <span className="review-dim-label">Width</span>
              </div>
              <div className="review-dim">
                <span className="review-dim-value">{pet?.dimensions?.height ?? "—"}″</span>
                <span className="review-dim-label">Height</span>
              </div>
            </div>

            <h4 className="review-inner-label">Total Weight</h4>

            <div className="review-weight-box">
              <div className="review-weight-main">
                {pet?.weight?.total ?? "—"} lbs
              </div>
              <p className="review-weight-sub">✓ Within 20 lb limit</p>
            </div>
          </div>

          <div className="review-actions">
            <button className="review-save-btn" onClick={handleExportPDF}>
              Save to PDF
            </button>
            <div className="review-back-actions">
              <button className="review-back-btn" onClick={onBack}>
                ← Back to Review
              </button>
              <button className="review-home-btn" onClick={onHome}>
                ← Back to Home
              </button>
            </div>
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

export default PassportPage;
