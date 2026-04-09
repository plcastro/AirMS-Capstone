import React from "react";
import { Input } from "antd";

const { TextArea } = Input;

export default function FlightLogDiscrepancyRemarks({ formData, updateForm, isEditable = true }) {
  return (
    <div className="fl-section">
      <div className="fl-section-title">DISCREPANCY/REMARKS</div>

      <div className="fl-card">
        <div className="fl-card-body">
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="fl-label" style={{ marginBottom: 6 }}>Discrepancy/Remarks:</div>
              <TextArea
                rows={6}
                value={formData.remarks || ""}
                onChange={(e) => updateForm("remarks", e.target.value)}
                placeholder="Enter any discrepancies or remarks"
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
    </div>
  );
}