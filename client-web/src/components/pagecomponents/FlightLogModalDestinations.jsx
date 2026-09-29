import React from "react";
import FlightTimeInput from "./FlightTimeInput";
import FlightStationInput from "./FlightStationInput";
import { isTotalTimeField } from "../../../../shared/flightLogTimes";
import { defaultPassengerCount } from "../../../../shared/flightLegTimes";
import { Input, Button, DatePicker } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const getOrdinalSuffix = (n) => {
  const j = n % 10,
    k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const REQUIRED_LEG_FIELDS = new Set(["date", "totalTimeOff"]);

const fieldCellStyle = {
  paddingLeft: 8,
  paddingRight: 8,
  boxSizing: "border-box",
};

export default function FlightLogModalDestinations({
  formData,
  handlers,
  isEditable = true,
  maxLegs,
}) {
  const {
    updateLeg,
    addLeg,
    removeLeg,
    addStation,
    removeStation,
    updateStation,
  } = handlers;
  const legs = formData.legs || [];

  return (
    <div className="fl-section">
      <div className="fl-section-title">DESTINATION/S</div>
      <p>
        Flight and block ON/OFF times are optional. Use 24-hour times (HH:mm) if
        entered. Total Time (FLIGHT) can be left blank in drafts and is required before release to the pilot. Passengers
        default to 0.
      </p>

      {legs.map((leg, legIdx) => {
        const n = legIdx + 1;
        const stations =
          Array.isArray(leg.stations) && leg.stations.length
            ? leg.stations
            : [{ from: "", to: "" }];
        const renderDateField = () => (
          <DatePicker
            size="large"
            style={{ width: "100%" }}
            format="MM/DD/YYYY"
            inputReadOnly
            placeholder="From Basic Information"
            value={leg.date ? dayjs(leg.date, "MM/DD/YYYY") : null}
            onChange={(date) =>
              updateLeg(
                legIdx,
                "date",
                date && dayjs.isDayjs(date) ? date.format("MM/DD/YYYY") : "",
              )
            }
            disabled
            required
            aria-required="true"
          />
        );
        const renderPassengersField = () => (
          <Input
            size="large"
            value={defaultPassengerCount(leg.passengers)}
            onChange={(e) => updateLeg(legIdx, "passengers", e.target.value)}
            disabled={!isEditable}
          />
        );
        const renderTimeField = (label, key) => (
          <div className="fl-time-field" key={key}>
            <span className="fl-time-label">
              {label}
              {REQUIRED_LEG_FIELDS.has(key) ? " *" : ""}
            </span>
            <FlightTimeInput
              label={label}
              value={leg[key]}
              duration={isTotalTimeField(key)}
              required={key === "totalTimeOff"}
              disabled={!isEditable}
              onChange={(value) => updateLeg(legIdx, key, value)}
            />
          </div>
        );
        return (
          <div key={legIdx} className="fl-card">
            <div
              className="fl-card-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                {n}
                {getOrdinalSuffix(n)} LEG
              </span>
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
              <div className="fl-field-row" style={fieldCellStyle}>
                <span className="fl-label">Station: *</span>
                <div style={{ flex: 1 }}>
                  {stations.map((station, stIdx) => (
                    <div key={stIdx} className="fl-station-row">
                      <FlightStationInput
                        value={station?.from || ""}
                        onChange={(value) =>
                          updateStation(legIdx, stIdx, "from", value)
                        }
                        placeholder="From"
                        label={`Leg ${n} station ${stIdx + 1} from`}
                        disabled={!isEditable}
                      />
                      <span className="fl-station-sep">-</span>
                      <FlightStationInput
                        value={station?.to || ""}
                        onChange={(value) =>
                          updateStation(legIdx, stIdx, "to", value)
                        }
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
                      style={{ width: "100%" }}
                    >
                      Add Station
                    </Button>
                  )}
                </div>
              </div>

              <div className="fl-time-summary">
                <div className="fl-time-summary-header">
                  <span>Time Summary</span>
                  <span>Use 24-hour time for ON/OFF entries</span>
                </div>
                <div className="fl-time-grid">
                  <div className="fl-time-group">
                    <div className="fl-time-group-title">Block Time</div>
                    {renderTimeField("ON", "blockTimeOn")}
                    {renderTimeField("OFF", "blockTimeOff")}
                  </div>
                  <div className="fl-time-group">
                    <div className="fl-time-group-title">Flight Time</div>
                    {renderTimeField("ON", "flightTimeOn")}
                    {renderTimeField("OFF", "flightTimeOff")}
                  </div>
                  <div className="fl-time-group fl-time-group-total">
                    <div className="fl-time-group-title">Total Time</div>
                    {renderTimeField("BLOCK", "totalTimeOn")}
                    {renderTimeField("FLIGHT", "totalTimeOff")}
                  </div>
                </div>
              </div>

              <div className="fl-leg-meta-grid">
                <div className="fl-field-stack" style={fieldCellStyle}>
                  <span className="fl-label">Date: *</span>
                  {renderDateField()}
                </div>
                <div className="fl-field-stack" style={fieldCellStyle}>
                  <span className="fl-label">Passengers:</span>
                  {renderPassengersField()}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {isEditable && (!Number.isFinite(maxLegs) || legs.length < maxLegs) && (
        <Button
          className="fl-add-btn"
          icon={<PlusOutlined />}
          onClick={addLeg}
          block
        >
          Add Leg
        </Button>
      )}
    </div>
  );
}
