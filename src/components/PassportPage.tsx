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
interface PassportPageProps {
  pet: PetProfile | null;
  allFiles: FileInfo[];
  userEmail: string;
  petProfiles: PetProfile[];
  activePetId: string | null;
  onPetChange: (petId: string) => void;
  onAddPet: (pet: {
    name: string;
    type: "cat" | "dog";
  }) => Promise<string | null>;
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
  /* --- PDF Export --- */
  /* --- PDF Export (Correct Implementation) --- */

  const handleExportPDF = async () => {
    const page1 = document.querySelector(".pdf-page-1") as HTMLElement | null;
    const page2 = document.querySelector(".pdf-page-2") as HTMLElement | null;

    if (!page1 || !page2) return;

    const pdf = new jsPDF("p", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // PAGE 1
    const canvas1 = await html2canvas(page1, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    } as any);

    const imgData1 = canvas1.toDataURL("image/png");
    const canvasRatio1 = canvas1.height / canvas1.width;

    const finalImgWidth1 = pdfWidth;
    const finalImgHeight1 = finalImgWidth1 * canvasRatio1;

    const scaleFactor1 = pdfHeight / finalImgHeight1;

    const width1 = finalImgWidth1 * Math.min(1, scaleFactor1);
    const height1 = finalImgHeight1 * Math.min(1, scaleFactor1);

    const x1 = (pdfWidth - width1) / 2;
    const y1 = 20;

    pdf.addImage(imgData1, "PNG", x1, y1, width1, height1);

    // PAGE 2
    const canvas2 = await html2canvas(page2, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    } as any);

    const imgData2 = canvas2.toDataURL("image/png");
    const canvasRatio2 = canvas2.height / canvas2.width;

    const finalImgWidth2 = pdfWidth;
    const finalImgHeight2 = finalImgWidth2 * canvasRatio2;

    const scaleFactor2 = pdfHeight / finalImgHeight2;

    const width2 = finalImgWidth2 * Math.min(1, scaleFactor2);
    const height2 = finalImgHeight2 * Math.min(1, scaleFactor2);

    const x2 = (pdfWidth - width2) / 2;
    const y2 = 20;

    pdf.addPage();
    pdf.addImage(imgData2, "PNG", x2, y2, width2, height2);

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

  const handleTitleClick = () => {
    onHome?.();
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onHome?.();
    }
  };

  // QR encoded data - use pet's flight info
  const qrValue = JSON.stringify({
    petId: pet?.id,
    flight: pet?.flight?.flightNumber,
    date: pet?.flight?.departureDate,
  });

  /* ----------------------------------
     RENDER
  ----------------------------------- */
  return (
    <div className="page-background passport-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1
              className="page-title clickable"
              role="button"
              tabIndex={0}
              onClick={handleTitleClick}
              onKeyDown={handleTitleKeyDown}
            >
              Pet Passport
            </h1>
            <p className="page-subtitle">Your pet is ready to fly</p>
          </div>
          {userEmail && (
            <div className="login-status">
              <button
                className="account-icon-button"
                onClick={() => setShowAccountPopup(!showAccountPopup)}
              >
                <img
                  src={accountIconSrc}
                  alt="Account"
                  className="account-icon"
                />
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
        <div className="passport-pdf-wrapper">
          {/* GREEN PASSPORT CARD + QR */}
          <div className="pdf-page-1">
            <div className="passport-card">
              <div className="passport-success-check">✓</div>

              <h2 className="passport-title">Travel Passport Generated!</h2>
              <p className="passport-subtitle">Verified & cleared for travel</p>

              <div className="passport-flight-box">
                <div className="passport-flight-item">
                  <span className="flight-label">Flight</span>
                  <span className="flight-value">
                    {pet?.flight?.flightNumber ?? "—"}
                  </span>
                </div>

                <div className="passport-flight-item">
                  <span className="flight-label">Date</span>
                  <span className="flight-value">
                    {pet?.flight?.departureDate ?? "—"}
                  </span>
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
                PNR: {pet?.flight?.pnr ?? "—"} • Valid for check-in
              </p>
            </div>
          </div>

          {/* SUMMARY SECTION (directly under QR now) */}
          <div className="pdf-page-2">
            <div className="review-section">
              <div className="review-section-header">
                <div className="review-summary-icon">
                  <img
                    src={summaryIconSrc}
                    alt="Summary Icon"
                  />
                </div>
                <div>
                  <h3 className="review-title">Verification Summary</h3>
                  <p className="review-subtitle">
                    All compliance checks passed
                  </p>
                </div>
              </div>

              <div className="review-divider" />

              <div className="review-inner">
                <h4 className="review-inner-label">Carrier Dimensions</h4>

                <div className="review-dimensions-row">
                  <div className="review-dim">
                    <span className="review-dim-value">
                      {pet?.dimensions?.length ?? "—"}″
                    </span>
                    <span className="review-dim-label">Length</span>
                  </div>
                  <div className="review-dim">
                    <span className="review-dim-value">
                      {pet?.dimensions?.width ?? "—"}″
                    </span>
                    <span className="review-dim-label">Width</span>
                  </div>
                  <div className="review-dim">
                    <span className="review-dim-value">
                      {pet?.dimensions?.height ?? "—"}″
                    </span>
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
