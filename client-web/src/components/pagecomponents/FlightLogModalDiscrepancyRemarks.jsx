import React from "react";
import { Input, Typography } from "antd";

const { TextArea } = Input;
const { Text } = Typography;

export default function FlightLogDiscrepancyRemarks({ formData, updateForm, isEditable = true }) {
  const renderSignatureBlock = (label, person, subtitle) => (
    <div style={{ flex: 1, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
      <div className="fl-label" style={{ marginBottom: 8 }}>{label}</div>
      <div
        style={{
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #edf0f2",
          borderRadius: 6,
          background: "#fafafa",
          marginBottom: 8,
        }}
      >
        {person?.signature ? (
          <img
            src={person.signature}
            alt={`${label} signature`}
            style={{ maxWidth: "100%", maxHeight: 64, objectFit: "contain" }}
          />
        ) : (
          <Text type="secondary">No signature</Text>
        )}
      </div>
      <div style={{ fontWeight: 600, minHeight: 22 }}>{person?.name || "Not signed"}</div>
      <Text type="secondary">{subtitle}</Text>
    </div>
  );

  return (
    <div className="fl-section">
      <div className="fl-section-title">DISCREPANCY/REMARKS</div>

      <div className="fl-card">
        <div className="fl-card-body">
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="fl-label" style={{ marginBottom: 6 }}>
                Discrepancy/Remarks (AI-interpreted):
              </div>
              <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                The AI maintenance tracker reads these remarks for discrepancy and component signals.
              </Text>
              <TextArea
                rows={6}
                value={formData.remarks || ""}
                onChange={(e) => updateForm("remarks", e.target.value)}
                placeholder="Enter discrepancies, symptoms, components affected, or remarks"
                disabled={!isEditable}
                style={{ resize: "none", backgroundColor: isEditable ? "#fff" : "#f5f5f5" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="fl-label" style={{ marginBottom: 6 }}>Sling:</div>
              <TextArea
                rows={6}
                value={formData.sling || ""}
                onChange={(e) => updateForm("sling", e.target.value)}
                placeholder="Enter sling information"
                disabled={!isEditable}
                style={{ resize: "none", backgroundColor: isEditable ? "#fff" : "#f5f5f5" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fl-card" style={{ marginTop: 16 }}>
        <div className="fl-card-body">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {renderSignatureBlock(
              "Released By",
              formData.releasedBy,
              "Engineer / Certificate",
            )}
            {renderSignatureBlock(
              "Accepted By",
              formData.acceptedBy,
              "Pilot-in-Command / Certificate",
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
