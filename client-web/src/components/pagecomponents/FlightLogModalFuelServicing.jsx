import React, { useState } from "react";
import { Input, Button } from "antd";
import PinVerifiedSignatureModal from "../common/PinVerifiedSignatureModal";

const getOrdinalSuffix = (n) => {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

function LegSignaturePad({ value, onChange, disabled }) {
  const [isReplacing, setIsReplacing] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);

  const handleClear = () => {
    if (onChange) onChange("");
    setIsReplacing(false);
  };

  const showSavedSignature = value && (disabled || !isReplacing);

  return (
    <div>
      <div className="fl-sig-box">
        {showSavedSignature ? (
          <img src={value} alt="signature" style={{ width: "100%", height: 60, objectFit: "contain" }} />
        ) : disabled && !value ? (
          <span className="fl-sig-placeholder">No signature</span>
        ) : (
          <Button type="link" onClick={() => setIsSignatureOpen(true)}>
            Tap to sign
          </Button>
        )}
      </div>
      {!disabled && (
        <div style={{ marginTop: 4, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {value && !isReplacing && (
            <Button size="small" onClick={() => setIsReplacing(true)}>
              Replace
            </Button>
          )}
          <Button size="small" danger onClick={handleClear}>
            Clear
          </Button>
        </div>
      )}
      <PinVerifiedSignatureModal
        open={isSignatureOpen}
        title="Fuel Servicing Signature"
        description="Draw the refueler signature below."
        confirmDescription="Enter your 6-digit PIN to save this fuel servicing signature."
        onCancel={() => {
          setIsSignatureOpen(false);
          setIsReplacing(false);
        }}
        onSave={(signature) => {
          onChange?.(signature);
          setIsReplacing(false);
        }}
      />
    </div>
  );
}

export default function FlightLogModalFuelServicing({ formData, updateFuel, isEditable = true }) {
  const legs = formData.legs || [];

  if (legs.length === 0) {
    return (
      <div className="fl-section">
        <div className="fl-section-title">FUEL SERVICING</div>
        <div className="fl-card">
          <div className="fl-card-body" style={{ textAlign: "center", color: "#999", padding: 32 }}>
            No legs available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fl-section">
      <div className="fl-section-title">FUEL SERVICING</div>

      {legs.map((_, legIdx) => {
        const n = legIdx + 1;
        const fuel = formData.fuelServicing?.[legIdx] || {};

        return (
          <div key={legIdx} className="fl-card" style={{ marginBottom: 16 }}>
            <div className="fl-card-header">{n}{getOrdinalSuffix(n)} LEG</div>
            <div className="fl-card-body">
              <div className="fl-field-row">
                <span className="fl-label">Date:</span>
                <Input
                  className="fl-input"
                  value={fuel.date || ""}
                  onChange={(e) => updateFuel(legIdx, "date", e.target.value)}
                  placeholder="MM/DD/YYYY"
                  disabled={!isEditable}
                />
              </div>
              <div className="fl-field-row">
                <span className="fl-label">Cont Check:</span>
                <Input
                  className="fl-input"
                  value={fuel.contCheck || ""}
                  onChange={(e) => updateFuel(legIdx, "contCheck", e.target.value)}
                  disabled={!isEditable}
                />
              </div>
              <div className="fl-field-row">
                <span className="fl-label">Main (REM/G):</span>
                <Input
                  className="fl-input"
                  value={fuel.mainRemG || ""}
                  onChange={(e) => updateFuel(legIdx, "mainRemG", e.target.value)}
                  disabled={!isEditable}
                />
              </div>
              <div className="fl-field-row">
                <span className="fl-label">Main (ADD):</span>
                <Input
                  className="fl-input"
                  value={fuel.mainAdd || ""}
                  onChange={(e) => updateFuel(legIdx, "mainAdd", e.target.value)}
                  disabled={!isEditable}
                />
              </div>
              <div className="fl-field-row">
                <span className="fl-label">Main (TOTAL):</span>
                <Input
                  className="fl-input"
                  value={fuel.mainTotal || ""}
                  onChange={(e) => updateFuel(legIdx, "mainTotal", e.target.value)}
                  disabled={!isEditable}
                />
              </div>
              <div className="fl-field-row">
                <span className="fl-label">Refueler Name/Sign:</span>
                <Input
                  className="fl-input"
                  value={fuel.refuelerName || ""}
                  onChange={(e) => updateFuel(legIdx, "refuelerName", e.target.value)}
                  placeholder="Refueler name"
                  disabled={!isEditable}
                />
              </div>
              <div className="fl-field-row">
                <span className="fl-label">Fuel:</span>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {["drum", "truck"].map((type) => (
                    <label key={type} className="fl-radio-label">
                      <input
                        type="radio"
                        checked={fuel.fuelType === type}
                        onChange={() => isEditable && updateFuel(legIdx, "fuelType", type)}
                        disabled={!isEditable}
                        style={{ accentColor: "#26866F" }}
                      />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="fl-field-row fl-sig-row">
                <span className="fl-label">Signature:</span>
                <div style={{ flex: 1 }}>
                  <LegSignaturePad
                    value={fuel.signature || ""}
                    onChange={(val) => updateFuel(legIdx, "signature", val)}
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
