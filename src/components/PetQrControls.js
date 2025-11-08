import React, { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./PetQrControls.css";

/**
 * QR controls WITHOUT any Home button.
 * Props:
 *  - pets: array of pet objects from Firestore
 *  - userEmail: (optional) email for metadata
 *  - dbRegion: (optional) e.g. "nam5"
 */
const PetQrControls = ({ pets, userEmail, dbRegion = "nam5" }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrPayload, setQrPayload] = useState("");
  const qrCanvasRef = useRef(null);

  const options = useMemo(
    () =>
      (pets || []).map((p, i) => ({
        label: p?.name ? `${p.name} (${p.species || "pet"})` : `Pet ${i + 1}`,
        value: i,
      })),
    [pets]
  );

  const buildQrPayload = (pet) => {
    const files = Array.isArray(pet.files)
      ? pet.files.map((f) => ({
          id: String(f?.id ?? ""),
          name: String(f?.name ?? ""),
          size: typeof f?.size === "number" ? f.size : Number(f?.size ?? 0),
          source: String(f?.source ?? ""),
          type: String(f?.type ?? ""),
          uploadedAt: String(f?.uploadedAt ?? ""),
          userId: String(f?.userId ?? ""),
        }))
      : [];

    return {
      app: "Pet Travel Passport",
      version: 1,
      exportedBy: userEmail || "",
      db: { provider: "firestore", region: dbRegion },
      pet: {
        name: String(pet?.name ?? ""),
        species: String(pet?.species ?? ""),
        weight: String(pet?.weight ?? ""),
        updatedAt: String(pet?.updatedAt ?? ""),
        files,
      },
    };
  };

  const handleGenerateQr = () => {
    if (selectedIndex === null || !pets?.[selectedIndex]) {
      alert("Please select a pet first.");
      return;
    }
    const payload = buildQrPayload(pets[selectedIndex]);
    setQrPayload(JSON.stringify(payload));
    setShowQR(true);
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `pet-passport-${pets[selectedIndex]?.name || "pet"}.png`;
    a.click();
  };

  return (
    <>
      <div className="petqr-row petqr-row-left">
        <select
          className="petqr-select"
          value={selectedIndex ?? ""}
          onChange={(e) =>
            setSelectedIndex(
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
          aria-label="Choose a pet"
          title="Choose a pet"
        >
          <option value="">Select pet</option>
          {pets?.map((p, i) => (
            <option key={i} value={i}>
              {p?.name ? `${p.name} (${p.species || "pet"})` : `Pet ${i + 1}`}
            </option>
          ))}
        </select>

        <button
          className="petqr-generate"
          onClick={handleGenerateQr}
          disabled={selectedIndex === null}
        >
          Generate QR
        </button>
      </div>

      {showQR && (
        <div className="petqr-overlay" onClick={() => setShowQR(false)}>
          <div
            className="petqr-modal"
            onClick={(e) => e.stopPropagation()}
            ref={qrCanvasRef}
          >
            <h3>Pet QR Code</h3>
            <p className="petqr-sub">
              Scan to import this pet’s info (DB region: {dbRegion}).
            </p>
            <div className="petqr-code">
              <QRCodeCanvas value={qrPayload} size={260} level="M" />
            </div>
            <div className="petqr-actions">
              <button className="petqr-download" onClick={handleDownloadQr}>
                Download PNG
              </button>
              <button className="petqr-close" onClick={() => setShowQR(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PetQrControls;
