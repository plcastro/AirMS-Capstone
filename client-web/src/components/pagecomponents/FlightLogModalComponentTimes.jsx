import React from "react";
import {
  FLIGHT_HOUR_FIELDS,
  normalizeAdditionalLandings,
} from "../../../../shared/flightLogTimes";
import { Button, DatePicker, Input, Space } from "antd";
import { LockOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { HOUR_FIELDS } from "../../../../shared/flightAutomaticInputs";

const COMPONENT_FIELDS = [
  { label: "A/Frame:", key: "airframe" },
  { label: "Gear Box (MAIN):", key: "gearBoxMain" },
  { label: "Gear Box (TAIL):", key: "gearBoxTail" },
  { label: "Rotor (MAIN):", key: "rotorMain" },
  { label: "Rotor (TAIL):", key: "rotorTail" },
  {
    label: "Aircraft Next Inspection Due At:",
    key: "airframeNextInsp",
    type: "date",
  },
  { label: "Engine:", key: "engine" },
  { label: "Cycle (N1):", key: "cycleN1" },
  { label: "Cycle (N2):", key: "cycleN2" },
  { label: "Usage:", key: "usage" },
  { label: "Landing Cycle", key: "landingCycle" },
  {
    label: "Engine Next Inspection Due At:",
    key: "engineNextInsp",
    type: "date",
  },
];

const SECTIONS = [
  { key: "broughtForwardData", title: "BROUGHT FORWARD" },
  { key: "thisFlightData", title: "THIS FLT" },
  { key: "toDateData", title: "TO DATE" },
];

const parseDatePickerValue = (value) => {
  if (!value) return null;

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null;
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const formatDatePickerValue = (value) =>
  value && dayjs.isDayjs(value) ? value.format("MM/DD/YYYY") : "";

export default function FlightLogModalComponentTimes({
  componentData,
  updateComponent,
  isEditable = true,
  canEditNextInspection = isEditable,
  legCount = 0,
  additionalLandings = 0,
  onAdditionalLandingsChange,
}) {
  return (
    <div className="fl-section">
      <div className="fl-section-title">COMPONENT TIMES</div>

      {SECTIONS.map(({ key, title }) => {
        const sectionLocked = key === "broughtForwardData";
        const isCalculatedSection = key === "toDateData";
        const canEdit = isEditable && !sectionLocked && !isCalculatedSection;

        return (
          <div key={key} className="fl-card" style={{ marginBottom: 16 }}>
            <div
              className="fl-card-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{title}</span>
              {(sectionLocked || isCalculatedSection) && (
                <LockOutlined style={{ color: "white" }} />
              )}
            </div>
            <div className="fl-card-body">
              {COMPONENT_FIELDS.map((field) => {
                const value = componentData?.[key]?.[field.key] ?? "";

                return (
                  <div className="fl-field-row" key={field.key}>
                    <span className="fl-label">{field.label}</span>
                    {key === "thisFlightData" &&
                    field.key === "landingCycle" ? (
                      <div>
                        <Space>
                          <Button
                            aria-label="Decrease landing cycles"
                            disabled={
                              !canEdit ||
                              !onAdditionalLandingsChange ||
                              normalizeAdditionalLandings(
                                additionalLandings,
                              ) === 0
                            }
                            onClick={() =>
                              onAdditionalLandingsChange(
                                normalizeAdditionalLandings(
                                  additionalLandings,
                                ) - 1,
                              )
                            }
                          >
                            −
                          </Button>
                          <span aria-label="This flight landing cycles">
                            {value}
                          </span>
                          <Button
                            aria-label="Increase landing cycles"
                            disabled={!canEdit || !onAdditionalLandingsChange}
                            onClick={() =>
                              onAdditionalLandingsChange(
                                normalizeAdditionalLandings(
                                  additionalLandings,
                                ) + 1,
                              )
                            }
                          >
                            +
                          </Button>
                        </Space>
                        <div
                          style={{ fontSize: 12, color: "#666", marginTop: 4 }}
                        >
                          Minimum: {legCount} (one per leg)
                        </div>
                      </div>
                    ) : field.type === "date" ? (
                      <DatePicker
                        className="fl-input"
                        style={{ width: "100%" }}
                        format="MM/DD/YYYY"
                        inputReadOnly
                        value={parseDatePickerValue(value)}
                        onChange={(date) =>
                          updateComponent(
                            key,
                            field.key,
                            formatDatePickerValue(date),
                          )
                        }
                        disabled={!canEditNextInspection}
                      />
                    ) : (
                      <Input
                        className="fl-input"
                        value={value}
                        onChange={(e) =>
                          updateComponent(key, field.key, e.target.value)
                        }
                        disabled={
                          !canEdit ||
                          (key === "thisFlightData" &&
                            FLIGHT_HOUR_FIELDS.includes(field.key))
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
