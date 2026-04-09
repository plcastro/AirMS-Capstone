import React, { useState } from "react";
import { Input, Select, Button } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";

// Mock data for dropdowns (matching mobile's flightLogsMockData)
const MOCK_AIRCRAFT_TYPES = ["AS350B3", "R44", "Bell 206", "Robinson R22"];
const MOCK_RPC_OPTIONS = ["RP-C1234", "RP-C5678", "RP-C9012", "RP-C3456"];

export default function FlightLogModalInfo({ formData, updateForm, isEditable = true }) {
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [showRPCDropdown, setShowRPCDropdown] = useState(false);

  const formatDate = (date) => {
    if (!date) return "";
    if (date instanceof Date) return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    return date;
  };

  return (
    <div className="fl-section">
      <div className="fl-section-title">BASIC INFORMATION</div>

      <div className="fl-card">
        <div className="fl-card-header">Rotary Winged Aircraft – Single Engine</div>
        <div className="fl-card-body">
          {/* Aircraft Type Dropdown */}
          <div className="fl-field-row">
            <span className="fl-label">Aircraft Type:</span>
            <div className="fl-dropdown-container">
              <div
                className={`fl-custom-select ${!isEditable ? "fl-custom-select-disabled" : ""}`}
                onClick={() => isEditable && setShowAircraftDropdown(!showAircraftDropdown)}
              >
                <span className={formData.aircraftType ? "fl-select-value" : "fl-select-placeholder"}>
                  {formData.aircraftType || "Select Aircraft Type"}
                </span>
                {isEditable && (
                  <span className="fl-select-arrow">
                    {showAircraftDropdown ? <UpOutlined /> : <DownOutlined />}
                  </span>
                )}
              </div>
              {showAircraftDropdown && isEditable && (
                <div className="fl-select-dropdown">
                  {MOCK_AIRCRAFT_TYPES.map((type, index) => (
                    <div
                      key={index}
                      className={`fl-select-option ${formData.aircraftType === type ? "fl-select-option-selected" : ""}`}
                      onClick={() => {
                        updateForm("aircraftType", type);
                        setShowAircraftDropdown(false);
                      }}
                    >
                      {type}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RP/C Dropdown */}
          <div className="fl-field-row">
            <span className="fl-label">RP-C:</span>
            <div className="fl-dropdown-container">
              <div
                className={`fl-custom-select ${!isEditable ? "fl-custom-select-disabled" : ""}`}
                onClick={() => isEditable && setShowRPCDropdown(!showRPCDropdown)}
              >
                <span className={formData.rpc ? "fl-select-value" : "fl-select-placeholder"}>
                  {formData.rpc || "Select RP/C"}
                </span>
                {isEditable && (
                  <span className="fl-select-arrow">
                    {showRPCDropdown ? <UpOutlined /> : <DownOutlined />}
                  </span>
                )}
              </div>
              {showRPCDropdown && isEditable && (
                <div className="fl-select-dropdown">
                  {MOCK_RPC_OPTIONS.map((rpc, index) => (
                    <div
                      key={index}
                      className={`fl-select-option ${formData.rpc === rpc ? "fl-select-option-selected" : ""}`}
                      onClick={() => {
                        updateForm("rpc", rpc);
                        setShowRPCDropdown(false);
                      }}
                    >
                      {rpc}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date Field (disabled) */}
          <div className="fl-field-row">
            <span className="fl-label">Date:</span>
            <Input
              className="fl-input"
              value={formatDate(formData.date)}
              disabled
            />
          </div>

          {/* Control Number */}
          <div className="fl-field-row">
            <span className="fl-label">Control No.:</span>
            <Input
              className="fl-input"
              value={formData.controlNo || ""}
              onChange={(e) => updateForm("controlNo", e.target.value)}
              placeholder="Enter control number"
              disabled={!isEditable}
            />
          </div>
        </div>
      </div>
    </div>
  );
}