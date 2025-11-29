import React from "react";
import "./shared.css";
import "./PassportPage.css";

import { PetProfile, FileInfo } from "../types";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  files: FileInfo[];
  flightInfo: FlightInfo | null;
  userEmail: string;
  onBack: () => void;
}

/* ----------------------------------
   Component
----------------------------------- */
const PassportPage: React.FC<PassportPageProps> = ({
  pet,
  flightInfo,
  onBack,
}) => {

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
    <div className="page-background pdf-export-wrapper">

      {/* TOP HEADER (only one, clean) */}
      <div className="single-header">
        <h1 className="page-title">Pet Travel Passport</h1>
        <p className="page-subtitle">Your pet is ready to fly</p>
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
              src="/assets/icons/summary.svg"
              alt="Summary Icon"
              className="review-icon-pink"
            />
            <div>
              <h3 className="review-title">Verification Summary</h3>
              <p className="review-subtitle">All compliance checks passed</p>
            </div>

            <button className="export-pdf-btn" onClick={handleExportPDF}>
              Export PDF
            </button>
          </div>

          <div className="review-divider" />

          <div className="review-inner">
            <h4 className="review-inner-label">Carrier Dimensions</h4>

            <div className="review-dimensions-row">
              <div className="review-dim">
                {pet?.dimensions?.length ?? "—"}″
              </div>
              <div className="review-dim">
                {pet?.dimensions?.width ?? "—"}″
              </div>
              <div className="review-dim">
                {pet?.dimensions?.height ?? "—"}″
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

          <button className="review-back-btn" onClick={onBack}>
            ← Back to Vaccine
          </button>
        </div>

      </main>
    </div>
  );
};

export default PassportPage;
