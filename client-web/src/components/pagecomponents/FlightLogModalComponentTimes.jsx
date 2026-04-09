import React from "react";
import { Input } from "antd";
import { LockOutlined } from "@ant-design/icons";

const COMPONENT_FIELDS = [
  { label: "A/Frame:", key: "airframe" },
  { label: "Gear Box (MAIN):", key: "gearBoxMain" },
  { label: "Gear Box (TAIL):", key: "gearBoxTail" },
  { label: "Rotor (MAIN):", key: "rotorMain" },
  { label: "Rotor (TAIL):", key: "rotorTail" },
  { label: "Airframe Next Inspection Due At:", key: "airframeNextInsp" },
  { label: "Engine:", key: "engine" },
  { label: "Cycle (N1):", key: "cycleN1" },
  { label: "Cycle (N2):", key: "cycleN2" },
  { label: "Usage:", key: "usage" },
  { label: "Landing Cycle", key: "landingCycle" },
  { label: "Engine Next Inspection Due At:", key: "engineNextInsp" },
];

const SECTIONS = [
  { key: "broughtForwardData", title: "BROUGHT FORWARD" },
  { key: "thisFlightData", title: "THIS FLT" },
  { key: "toDateData", title: "TO DATE" },
];

export default function FlightLogModalComponentTimes({ componentData, updateComponent, isEditable = true, isLocked = false }) {
  return (
    <div className="fl-section">
      <div className="fl-section-title">COMPONENT TIMES</div>

      {SECTIONS.map(({ key, title }) => {
        const sectionLocked = isLocked && key === "broughtForwardData";
        const canEdit = isEditable && !sectionLocked;

        return (
          <div key={key} className="fl-card" style={{ marginBottom: 16 }}>
            <div className="fl-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{title}</span>
              {sectionLocked && <LockOutlined style={{ color: "white" }} />}
            </div>
            <div className="fl-card-body">
              {COMPONENT_FIELDS.map((field) => (
                <div className="fl-field-row" key={field.key}>
                  <span className="fl-label">{field.label}</span>
                  <Input
                    className="fl-input"
                    value={componentData?.[key]?.[field.key] || ""}
                    onChange={(e) => updateComponent(key, field.key, e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}