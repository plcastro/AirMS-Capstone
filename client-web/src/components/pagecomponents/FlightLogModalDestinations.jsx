import React from "react";
import FlightTimeInput from './FlightTimeInput';
import FlightStationInput from './FlightStationInput';
import { FLIGHT_TIME_FIELDS, isTotalTimeField } from '../../../../shared/flightLogTimes';
import { Input, Button, DatePicker } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const getOrdinalSuffix = (n) => {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const REQUIRED_LEG_FIELDS = new Set(["date", "totalTimeOff"]);

export default function FlightLogModalDestinations({
  formData,
  handlers,
  isEditable = true,
  maxLegs,
}) {
  const { updateLeg, addLeg, removeLeg, addStation, removeStation, updateStation } = handlers;
  const legs = formData.legs || [];

  return (
    <div className="fl-section">
      <div className="fl-section-title">DESTINATION/S</div>
      <p>Use 24-hour times (HH:mm), consistently in the same time zone. OFF is departure/takeoff; ON is arrival/landing. Enter total durations in hours and minutes.</p>

      {legs.map((leg, legIdx) => {
        const n = legIdx + 1;
        const stations =
          Array.isArray(leg.stations) && leg.stations.length
            ? leg.stations
            : [{ from: "", to: "" }];
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
                <span className="fl-label">Station: *</span>
                <div style={{ flex: 1 }}>
                  {stations.map((station, stIdx) => (
                    <div key={stIdx} className="fl-station-row">
                      <FlightStationInput
                        value={station?.from || ""}
                        onChange={(value) => updateStation(legIdx, stIdx, "from", value)}
                        placeholder="From"
                        label={`Leg ${n} station ${stIdx + 1} from`}
                        disabled={!isEditable}
                      />
                      <span className="fl-station-sep">-</span>
                      <FlightStationInput
                        value={station?.to || ""}
                        onChange={(value) => updateStation(legIdx, stIdx, "to", value)}
                        placeholder="To"
                        label={`Leg ${n} station ${stIdx + 1} to`}
                        disabled={!isEditable}
                      />
                      {isEditable && stations.length > 1 && (
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
                ["Total Time (BLOCK):", "totalTimeOn"],
                ["Total Time (FLIGHT):", "totalTimeOff"],
                ["Date:", "date"],
                ["Passengers:", "passengers"],
              ].map(([label, key]) => (
                <div className="fl-field-row" key={key}>
                  <span className="fl-label">
                    {label}{REQUIRED_LEG_FIELDS.has(key) ? " *" : ""}
                  </span>
                  {key === "date" ? (
                    <DatePicker
                      className="fl-input"
                      style={{ width: "100%" }}
                      format="MM/DD/YYYY"
                      inputReadOnly
                      placeholder="From Basic Information"
                      value={leg.date ? dayjs(leg.date, "MM/DD/YYYY") : null}
                      onChange={(date) =>
                        updateLeg(
                          legIdx,
                          "date",
                          date && dayjs.isDayjs(date)
                            ? date.format("MM/DD/YYYY")
                            : "",
                        )
                      }
                      disabled
                      required
                      aria-required="true"
                    />
                  ) : FLIGHT_TIME_FIELDS.includes(key) ? (
                    <FlightTimeInput label={label} value={leg[key]} duration={isTotalTimeField(key)} required={key === 'totalTimeOff'}
                      disabled={!isEditable} onChange={value => updateLeg(legIdx, key, value)} />
                  ) : (
                    <Input
                      className="fl-input"
                      value={leg[key] ?? ""}
                      onChange={(e) => updateLeg(legIdx, key, e.target.value)}
                      disabled={!isEditable}
                      required={REQUIRED_LEG_FIELDS.has(key)}
                      aria-required={REQUIRED_LEG_FIELDS.has(key)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {isEditable && (!Number.isFinite(maxLegs) || legs.length < maxLegs) && (
        <Button className="fl-add-btn" icon={<PlusOutlined />} onClick={addLeg} block>
          Add Leg
        </Button>
      )}
    </div>
  );
}
