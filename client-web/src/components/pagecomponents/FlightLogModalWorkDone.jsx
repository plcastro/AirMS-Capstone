import React, { useState } from "react";
import { Input, Button } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import PinVerifiedSignatureModal from "../common/PinVerifiedSignatureModal";

const { TextArea } = Input;

const WORK_TYPES = ["Discrepancy Correction", "SB/AD Compliance", "Inspection", "Others"];

const emptyWorkItem = () => ({
  id: Date.now().toString() + Math.random(),
  selectedWorkTypes: [],
  date: "", aircraft: "", workDone: "", name: "", certificateNumber: "", signature: "",
});

function WorkItemSignaturePad({ value, onChange, disabled }) {
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);

  const handleClear = () => {
    if (onChange) onChange("");
  };

  return (
    <div>
      <div className="fl-sig-box">
        {value && disabled ? (
          <img src={value} alt="signature" style={{ width: "100%", height: 60, objectFit: "contain" }} />
        ) : disabled && !value ? (
          <span className="fl-sig-placeholder">No signature</span>
        ) : value ? (
          <img src={value} alt="signature" style={{ width: "100%", height: 60, objectFit: "contain" }} />
        ) : (
          <Button type="link" onClick={() => setIsSignatureOpen(true)}>
            Tap to sign
          </Button>
        )}
      </div>
      {!disabled && (
        <div style={{ marginTop: 4, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {value && (
            <Button size="small" onClick={() => setIsSignatureOpen(true)}>
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
        title="Work Done Signature"
        description="Draw the work-done signature below."
        confirmDescription="Enter your 6-digit PIN to save this work-done signature."
        onCancel={() => setIsSignatureOpen(false)}
        onSave={(signature) => onChange?.(signature)}
      />
    </div>
  );
}

export default function FlightLogModalWorkDone({ formData, updateForm, isEditable = true }) {
  const workItems = formData.workItems || [];

  const addWorkItem = () => {
    updateForm("workItems", [...workItems, emptyWorkItem()]);
  };

  const removeWorkItem = (id) => {
    updateForm("workItems", workItems.filter((w) => w.id !== id));
  };

  const updateWorkItem = (id, field, value) => {
    updateForm("workItems", workItems.map((w) => w.id === id ? { ...w, [field]: value } : w));
  };

  const toggleWorkType = (id, type) => {
    updateForm("workItems", workItems.map((w) => {
      if (w.id !== id) return w;
      const types = w.selectedWorkTypes || [];
      return {
        ...w,
        selectedWorkTypes: types.includes(type)
          ? types.filter((t) => t !== type)
          : [...types, type],
      };
    }));
  };

  return (
    <div className="fl-section">
      <div className="fl-section-title">WORK DONE</div>

      {workItems.length === 0 && (
        <div className="fl-card">
          <div className="fl-card-body" style={{ textAlign: "center", color: "#999", padding: 24 }}>
            No work items yet. Click "Add Work Done" to begin.
          </div>
        </div>
      )}

      {workItems.map((item, idx) => (
        <div key={item.id} className="fl-card" style={{ marginBottom: 16 }}>
          <div className="fl-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>WORK DONE {workItems.length > 1 ? `#${idx + 1}` : ""}</span>
            {isEditable && workItems.length > 1 && (
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeWorkItem(item.id)}
                style={{ color: "#ff4d4f" }}
              />
            )}
          </div>
          <div className="fl-card-body">
            {/* Checkboxes row */}
            <div className="fl-work-types-row">
              {WORK_TYPES.map((type) => (
                <label key={type} className="fl-checkbox-label">
                  <input
                    type="checkbox"
                    checked={(item.selectedWorkTypes || []).includes(type)}
                    onChange={() => isEditable && toggleWorkType(item.id, type)}
                    disabled={!isEditable}
                    style={{ accentColor: "#26866F" }}
                  />
                  {type}
                </label>
              ))}
            </div>

            <div className="fl-field-row">
              <span className="fl-label">Date:</span>
              <Input
                className="fl-input"
                value={item.date || ""}
                onChange={(e) => updateWorkItem(item.id, "date", e.target.value)}
                placeholder="MM/DD/YYYY"
                disabled={!isEditable}
              />
            </div>
            <div className="fl-field-row">
              <span className="fl-label">Aircraft/T/:</span>
              <Input
                className="fl-input"
                value={item.aircraft || ""}
                onChange={(e) => updateWorkItem(item.id, "aircraft", e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div className="fl-field-row">
              <span className="fl-label">Work Done:</span>
              <TextArea
                rows={3}
                value={item.workDone || ""}
                onChange={(e) => updateWorkItem(item.id, "workDone", e.target.value)}
                placeholder="Describe work done"
                disabled={!isEditable}
                style={{ resize: "none", flex: 1, backgroundColor: isEditable ? "#fff" : "#f5f5f5" }}
              />
            </div>
            <div className="fl-field-row">
              <span className="fl-label">Name:</span>
              <Input
                className="fl-input"
                value={item.name || ""}
                onChange={(e) => updateWorkItem(item.id, "name", e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div className="fl-field-row">
              <span className="fl-label">Certificate Number:</span>
              <Input
                className="fl-input"
                value={item.certificateNumber || ""}
                onChange={(e) => updateWorkItem(item.id, "certificateNumber", e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div className="fl-field-row fl-sig-row">
              <span className="fl-label">Signature:</span>
              <div style={{ flex: 1 }}>
                <WorkItemSignaturePad
                  value={item.signature || ""}
                  onChange={(val) => updateWorkItem(item.id, "signature", val)}
                  disabled={!isEditable}
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {isEditable && (
        <div style={{ textAlign: "right", marginTop: 8 }}>
          <Button className="fl-action-btn" icon={<PlusOutlined />} onClick={addWorkItem}>
            Add Work Done
          </Button>
        </div>
      )}
    </div>
  );
}
