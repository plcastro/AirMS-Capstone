import React, { useEffect, useMemo, useState } from "react";
import { DatePicker, Input, Select } from "antd";
import dayjs from "dayjs";
import { API_BASE } from "../../utils/API_BASE";

export default function FlightLogModalInfo({
  formData,
  updateForm,
  isEditable = true,
  isRPCEditable = true,
  onAircraftDataLoaded,
}) {
  const [aircraftOptions, setAircraftOptions] = useState([]);

  useEffect(() => {
    const fetchAircraftOptions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`);
        const data = await response.json();

        if (response.ok && Array.isArray(data.data)) {
          setAircraftOptions(data.data);
        }
      } catch (error) {
        console.error("Error fetching aircraft options:", error);
      }
    };

    fetchAircraftOptions();
  }, []);

  const parseDatePickerValue = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
      const parsedFromDate = dayjs(value);
      return parsedFromDate.isValid() ? parsedFromDate : null;
    }

    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  };

  const aircraftTypeLabel = useMemo(
    () => formData.aircraftType || "Aircraft type will load automatically",
    [formData.aircraftType],
  );

  const handleRPCSelect = async (rpc) => {
    updateForm("rpc", rpc);

    try {
      const response = await fetch(`${API_BASE}/api/parts-monitoring/${rpc}`);
      const data = await response.json();

      if (response.ok && data?.data) {
        updateForm("aircraftType", data.data.aircraftType || "");
        onAircraftDataLoaded?.(data.data);
      } else {
        updateForm("aircraftType", "");
        onAircraftDataLoaded?.(null);
      }
    } catch (error) {
      console.error("Error fetching aircraft type:", error);
      updateForm("aircraftType", "");
      onAircraftDataLoaded?.(null);
    }
  };

  return (
    <div className="fl-section">
      <div className="fl-section-title">BASIC INFORMATION</div>

      <div className="fl-card">
        <div className="fl-card-header">Rotary Winged Aircraft - Single Engine</div>
        <div className="fl-card-body">
          <div className="fl-field-row">
            <span className="fl-label">RP-C: *</span>
            <div className="fl-dropdown-container">
              <Select
                className="fl-rpc-select"
                value={formData.rpc || undefined}
                placeholder="Select RP/C"
                onChange={handleRPCSelect}
                disabled={!isEditable || !isRPCEditable}
                showSearch
                optionFilterProp="label"
                popupMatchSelectWidth
                getPopupContainer={() => document.body}
                options={aircraftOptions.map((rpc) => ({
                  value: rpc,
                  label: rpc,
                }))}
              />
            </div>
          </div>

          <div className="fl-field-row">
            <span className="fl-label">Aircraft Type:</span>
            <Input className="fl-input" value={aircraftTypeLabel} disabled />
          </div>

          <div className="fl-field-row">
            <span className="fl-label">Date:</span>
            <DatePicker
              className="fl-input"
              style={{ width: "100%" }}
              format="MM/DD/YYYY"
              value={parseDatePickerValue(formData.date)}
              onChange={(date) =>
                updateForm(
                  "date",
                  date && dayjs.isDayjs(date) ? date.format("MM/DD/YYYY") : "",
                )
              }
              disabled={!isEditable}
            />
          </div>

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
