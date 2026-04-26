import React, { useRef, useState } from "react";
import { Input, Button, Typography } from "antd";
import SignatureCanvas from "react-signature-canvas";

const { Text } = Typography;

const getOrdinalSuffix = (n) => {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const OIL_GROUPS = [
  { title: "Engine", fields: [["Engine (REM):", "engineRem"], ["Engine (ADD):", "engineAdd"], ["Engine (TOT):", "engineTot"]] },
  { title: "M/R G/Box", fields: [["M/R G/Box (REM):", "mrGboxRem"], ["M/R G/Box (ADD):", "mrGboxAdd"], ["M/R G/Box (TOT):", "mrGboxTot"]] },
  { title: "T/R G/Box", fields: [["T/R G/Box (REM):", "trGboxRem"], ["T/R G/Box (ADD):", "trGboxAdd"], ["T/R G/Box (TOT):", "trGboxTot"]] },
];

function LegSignaturePad({ value, onChange, disabled }) {
  const sigRef = useRef(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const handleEnd = () => {
    if (sigRef.current && onChange) onChange(sigRef.current.toDataURL("image/png"));
  };

  const handleClear = () => {
    if (sigRef.current) sigRef.current.clear();
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
          <SignatureCanvas
            ref={sigRef}
            penColor="#000"
            canvasProps={{ style: { width: "100%", height: 60 } }}
            onEnd={handleEnd}
          />
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
    </div>
  );
}

export default function FlightLogModalOilServicing({ formData, updateOil, isEditable = true }) {
  const legs = formData.legs || [];

  if (legs.length === 0) {
    return (
      <div className="fl-section">
        <div className="fl-section-title">OIL SERVICING</div>
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
      <div className="fl-section-title">OIL SERVICING</div>

      {legs.map((_, legIdx) => {
        const n = legIdx + 1;
        const oil = formData.oilServicing?.[legIdx] || {};

        return (
          <div key={legIdx} className="fl-card" style={{ marginBottom: 16 }}>
            <div className="fl-card-header">{n}{getOrdinalSuffix(n)} LEG</div>
            <div className="fl-card-body">
              <div className="fl-field-row">
                <span className="fl-label">Date:</span>
                <Input
                  className="fl-input"
                  value={oil.date || ""}
                  onChange={(e) => updateOil(legIdx, "date", e.target.value)}
                  placeholder="MM/DD/YYYY"
                  disabled={!isEditable}
                />
              </div>

              {OIL_GROUPS.map(({ fields }) =>
                fields.map(([label, key]) => (
                  <div className="fl-field-row" key={key}>
                    <span className="fl-label">{label}</span>
                    <Input
                      className="fl-input"
                      value={oil[key] || ""}
                      onChange={(e) => updateOil(legIdx, key, e.target.value)}
                      disabled={!isEditable}
                    />
                  </div>
                ))
              )}

              <div className="fl-field-row">
                <span className="fl-label">Remarks (AI-interpreted):</span>
                <div style={{ flex: 1 }}>
                  <Input
                    className="fl-input"
                    value={oil.remarks || ""}
                    onChange={(e) => updateOil(legIdx, "remarks", e.target.value)}
                    placeholder="Enter oil, gearbox, or servicing findings"
                    disabled={!isEditable}
                  />
                  <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
                    Oil-servicing remarks are included in AI maintenance tracking.
                  </Text>
                </div>
              </div>
              <div className="fl-field-row fl-sig-row">
                <span className="fl-label">Sign:</span>
                <div style={{ flex: 1 }}>
                  <LegSignaturePad
                    value={oil.signature || ""}
                    onChange={(val) => updateOil(legIdx, "signature", val)}
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
