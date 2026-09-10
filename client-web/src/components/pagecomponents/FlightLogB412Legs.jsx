import React from "react";
import { Input } from "antd";
import { ensureSixB412Legs } from "../../utils/b412FlightLog";

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th"];

function Field({ label, value, onChange, disabled }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "#555", fontSize: 12, marginBottom: 5 }}>
        {label}
      </div>
      <Input
        className="fl-input"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

export default function FlightLogB412Legs({
  legs = [],
  onChange,
  isEditable = true,
}) {
  const normalizedLegs = ensureSixB412Legs(legs);

  const updateLeg = (legIndex, field, value) => {
    const nextLegs = normalizedLegs.map((leg, index) =>
      index === legIndex ? { ...leg, [field]: value } : leg,
    );
    onChange(nextLegs);
  };

  const updateStation = (legIndex, field, value) => {
    const nextLegs = normalizedLegs.map((leg, index) => {
      if (index !== legIndex) return leg;
      return {
        ...leg,
        stations: [
          {
            ...(leg.stations?.[0] || { from: "", to: "" }),
            [field]: value,
          },
        ],
      };
    });
    onChange(nextLegs);
  };

  return (
    <div className="fl-section">
      <div className="fl-section-title">FLIGHT LEGS</div>

      {normalizedLegs.map((leg, legIndex) => (
        <div key={ORDINALS[legIndex]} className="fl-card">
          <div className="fl-card-header">{ORDINALS[legIndex]} LEG</div>
          <div className="fl-card-body">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Field
                label="Station From"
                value={leg.stations?.[0]?.from}
                onChange={(value) =>
                  updateStation(legIndex, "from", value)
                }
                disabled={!isEditable}
              />
              <Field
                label="Station To"
                value={leg.stations?.[0]?.to}
                onChange={(value) => updateStation(legIndex, "to", value)}
                disabled={!isEditable}
              />
            </div>

            {[
              [
                ["Block Time - On", "blockTimeOn"],
                ["Block Time - Off", "blockTimeOff"],
              ],
              [
                ["Flight Time - On", "flightTimeOn"],
                ["Flight Time - Off", "flightTimeOff"],
              ],
              [
                ["Total Time - Block", "totalTimeOn"],
                ["Total Time - Flight", "totalTimeOff"],
              ],
            ].map((row) => (
              <div
                key={row[0][1]}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                {row.map(([label, field]) => (
                  <Field
                    key={field}
                    label={label}
                    value={leg[field]}
                    onChange={(value) => updateLeg(legIndex, field, value)}
                    disabled={!isEditable}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
