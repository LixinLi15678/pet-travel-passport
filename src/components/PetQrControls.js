import React, { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./PetQrControls.css";

/**
 * Generates a compact QR payload for a single pet.
 * Format: ptp://v=1&uid=...&pid=...&n=...&sp=...&w=...
 * (No long document blob, no email.)
 */
const PetQrControls = ({ pets, /* userEmail (unused now) */ dbRegion = "nam5" }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrPayload, setQrPayload] = useState("");
  const qrCanvasRef = useRef(null);

  const options = useMemo(
    () =>
      (pets || []).map((p, i) => ({
        label: p?.name ? `${p.name} (${p?.species || "pet"})` : `Pet ${i + 1}`,
        value: i,
      })),
    [pets]
  );

  // Build a SHORT, unique string (querystring-like) instead of a big JSON blob.
  const buildCompactPayload = (pet) => {
    const uid = String(pet?.userId ?? "");
    const pid = String(pet?.id ?? pet?.docId ?? ""); // support different id field names
    const n   = String(pet?.name ?? "");
    const sp  = String(pet?.species ?? "");
    const w   = String(pet?.weight ?? "");

    // prefix with a custom scheme so scanners just show text/URL-like params, not an email
    const pairs = [
      ["v", "1"],
      ["uid", uid],
      ["pid", pid],
      ["n", n],
      ["sp", sp],
      ["w", w],
      ["r", dbRegion], // optional: db region for importers
    ]
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    return `ptp://?${pairs}`;
  };

  const handleGenerateQr = () => {
    if (selectedIndex === null || !pets?.[selectedIndex]) {
      alert("Please select a pet first.");
      return;
    }
    const payload = buildCompactPayload(pets[selectedIndex]);
    setQrPayload(payload);
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
            setSelectedIndex(e.target.value === "" ? null : Number(e.target.value))
          }
          aria-label="Choose a pet"
          title="Choose a pet"
        >
          <option value="">Select pet</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
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
              Scan to import this pet’s info (compact payload; region {dbRegion}).
            </p>
            <div className="petqr-code">
              <QRCodeCanvas value={qrPayload} size={260} level="M" />
            </div>
            <code style={{ wordBreak: "break-all", fontSize: 12 }}>{qrPayload}</code>
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
