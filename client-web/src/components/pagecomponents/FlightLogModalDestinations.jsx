import React from "react";
import { Input, Button } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const getOrdinalSuffix = (n) => {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

export default function FlightLogModalDestinations({ formData, handlers, isEditable = true }) {
  const { updateLeg, addLeg, removeLeg, addStation, removeStation, updateStation } = handlers;
  const legs = formData.legs || [];

  return (
    <div className="fl-section">
      <div className="fl-section-title">DESTINATION/S</div>

      {legs.map((leg, legIdx) => {
        const n = legIdx + 1;
        return (
          <div key={legIdx} className="fl-card" style={{ marginBottom: 16 }}>
            <div className="fl-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{n}{getOrdinalSuffix(n)} LEG</span>
              {isEditable && legs.length > 1 && (
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeLeg(legIdx)}
                  style={{ color: "#ff4d4f" }}
                />
              )}
            </div>
            <div className="fl-card-body">
              <div className="fl-field-row">
                <span className="fl-label">Station:</span>
                <div style={{ flex: 1 }}>
                  {leg.stations.map((station, stIdx) => (
                    <div key={stIdx} className="fl-station-row">
                      <Input
                        className="fl-input"
                        value={station.from}
                        onChange={(e) => updateStation(legIdx, stIdx, "from", e.target.value)}
                        placeholder="From"
                        disabled={!isEditable}
                        style={{ flex: 1 }}
                      />
                      <span className="fl-station-sep">-</span>
                      <Input
                        className="fl-input"
                        value={station.to}
                        onChange={(e) => updateStation(legIdx, stIdx, "to", e.target.value)}
                        placeholder="To"
                        disabled={!isEditable}
                        style={{ flex: 1 }}
                      />
                      {isEditable && leg.stations.length > 1 && (
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeStation(legIdx, stIdx)}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </div>
                  ))}
                  {isEditable && (
                    <Button
                      className="fl-add-btn"
                      icon={<PlusOutlined />}
                      onClick={() => addStation(legIdx)}
                      style={{ marginTop: 6, width: "100%" }}
                    >
                      Add Station
                    </Button>
                  )}
                </div>
              </div>

              {[
                ["Block Time (ON):", "blockTimeOn"],
                ["Block Time (OFF):", "blockTimeOff"],
                ["Flight Time (ON):", "flightTimeOn"],
                ["Flight Time (OFF):", "flightTimeOff"],
                ["Total Time (ON):", "totalTimeOn"],
                ["Total Time (OFF):", "totalTimeOff"],
                ["Date:", "date"],
                ["Passengers:", "passengers"],
              ].map(([label, key]) => (
                <div className="fl-field-row" key={key}>
                  <span className="fl-label">{label}</span>
                  <Input
                    className="fl-input"
                    value={leg[key] || ""}
                    onChange={(e) => updateLeg(legIdx, key, e.target.value)}
                    placeholder={key === "date" ? "MM/DD/YYYY" : ""}
                    disabled={!isEditable}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {isEditable && (
        <Button className="fl-add-btn" icon={<PlusOutlined />} onClick={addLeg} block>
          Add Leg
        </Button>
      )}
    </div>
  );
}