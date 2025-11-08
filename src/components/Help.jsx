// src/components/Help.jsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom";

export default function Help({ onClose }) {
  // lock body scroll + close on ESC
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const backdropStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
    padding: 24,
  };

  const panelStyle = {
    width: "min(900px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#111315",
    color: "#EDEDED",
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    padding: 24,
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  };

  const closeBtnStyle = {
    border: "none",
    background: "transparent",
    color: "#bbb",
    fontSize: 20,
    cursor: "pointer",
    padding: 4,
  };

  const chip = (hex) => ({
    width: 88,
    height: 44,
    borderRadius: 10,
    background: hex,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)",
  });

  // Render into <body> so no parent styles interfere
  return ReactDOM.createPortal(
    <div style={backdropStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>Help</h2>
          <button aria-label="Close" style={closeBtnStyle} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Hello + Style Guide in one place */}
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 8px" }}>Hello World</h3>
          <p style={{ margin: 0 }}>
            If you can see this message, Requirement #1 is complete.
          </p>
        </section>

        <section>
          <h3 style={{ margin: "0 0 12px" }}>Style Guide</h3>

          <h4 style={{ margin: "0 0 8px", fontWeight: 600 }}>Colors</h4>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div style={chip("#FF6B9D")} />
            <span>#FF6B9D</span>
            <div style={chip("#FFB3D1")} />
            <span>#FFB3D1</span>
          </div>

          <h4 style={{ margin: "12px 0 8px", fontWeight: 600 }}>Fonts (SF Pro Text)</h4>
          <p style={{ margin: 0, fontWeight: 400 }}>Regular sample (400)</p>
          <p style={{ margin: "6px 0 0", fontWeight: 700 }}>Bold sample (700)</p>

          <h4 style={{ margin: "16px 0 8px", fontWeight: 600 }}>Icons</h4>
          <p style={{ margin: 0, fontSize: 22 }}>🐾 🧳 ✈️</p>
        </section>
      </div>
    </div>,
    document.body
  );
}
