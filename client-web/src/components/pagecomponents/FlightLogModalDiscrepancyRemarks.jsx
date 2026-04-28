import React from "react";
import { Input, Typography } from "antd";

const { TextArea } = Input;
const { Text } = Typography;

export default function FlightLogDiscrepancyRemarks({ formData, updateForm, isEditable = true }) {
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
    </div>
  );
}
