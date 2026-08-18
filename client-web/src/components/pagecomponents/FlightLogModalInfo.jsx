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
  const [ongoingAircraftRpcs, setOngoingAircraftRpcs] = useState([]);

  const normalizeRpc = (value = "") =>
    String(value || "")
      .trim()
      .toUpperCase();

  const normalizeAircraftOptions = (payload) => {
    const source = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

    return [
      ...new Set(
        source
          .map((item) =>
            typeof item === "string"
              ? item
              : item?.tailNum || item?.aircraft || item?.rpc || "",
          )
          .map(normalizeRpc)
          .filter(Boolean),
      ),
    ].sort();
  };

  useEffect(() => {
    const fetchAircraftOptions = async () => {
      try {
        const [partsResult, aircraftResult, aircraftWithBasesResult] =
          await Promise.allSettled([
            fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`).then(
              (response) => response.json(),
            ),
            fetch(`${API_BASE}/api/aircraft/aircraft-tail-numbers`).then(
              (response) => response.json(),
            ),
            fetch(`${API_BASE}/api/aircraft/aircraft-with-bases`).then(
              (response) => response.json(),
            ),
          ]);
        const partsData =
          partsResult.status === "fulfilled" ? partsResult.value : null;
        const aircraftData =
          aircraftResult.status === "fulfilled" ? aircraftResult.value : null;
        const aircraftWithBasesData =
          aircraftWithBasesResult.status === "fulfilled"
            ? aircraftWithBasesResult.value
            : null;
        const options = [
          ...normalizeAircraftOptions(partsData),
          ...normalizeAircraftOptions(aircraftData),
          ...normalizeAircraftOptions(aircraftWithBasesData),
        ];

        setAircraftOptions([...new Set(options)].sort());
      } catch (error) {
        console.error("Error fetching aircraft options:", error);
        setAircraftOptions([]);
      }
    };

    fetchAircraftOptions();
  }, []);

  useEffect(() => {
    const fetchOngoingAircraftRpcs = async () => {
      try {
        const statuses = ["pending_release", "pending_acceptance", "accepted"];
        const responses = await Promise.all(
          statuses.map((status) =>
            fetch(
              `${API_BASE}/api/flightlogs?page=1&limit=300&status=${status}`,
            ),
          ),
        );
        const payloads = await Promise.all(
          responses.map((response) => response.json()),
        );

        const nextOngoingAircraft = payloads.flatMap((payload, index) =>
          responses[index].ok && Array.isArray(payload.data)
            ? payload.data.map((log) => normalizeRpc(log.rpc)).filter(Boolean)
            : [],
        );

        setOngoingAircraftRpcs([...new Set(nextOngoingAircraft)]);
      } catch (error) {
        console.error("Error fetching ongoing aircraft options:", error);
      }
    };

    fetchOngoingAircraftRpcs();
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

  const aircraftSelectOptions = useMemo(() => {
    const ongoingSet = new Set(ongoingAircraftRpcs);
    const currentRpc = normalizeRpc(formData.rpc);

    return aircraftOptions.map((rpc) => {
      const normalizedRpc = normalizeRpc(rpc);
      const disabled =
        ongoingSet.has(normalizedRpc) && normalizedRpc !== currentRpc;

      return {
        disabled,
        label: disabled ? `${rpc} (ongoing flight log)` : rpc,
        value: rpc,
      };
    });
  }, [aircraftOptions, formData.rpc, ongoingAircraftRpcs]);

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
        <div className="fl-card-header">
          Rotary Winged Aircraft - Single Engine
        </div>
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
                aria-required="true"
                showSearch
                optionFilterProp="label"
                popupMatchSelectWidth
                getPopupContainer={() => document.body}
                options={aircraftSelectOptions}
              />
            </div>
          </div>

          <div className="fl-field-row">
            <span className="fl-label">Aircraft Type:</span>
            <Input className="fl-input" value={aircraftTypeLabel} disabled />
          </div>

          <div className="fl-field-row">
            <span className="fl-label">Date: *</span>
            <DatePicker
              className="fl-input"
              style={{ width: "100%" }}
              format="MM/DD/YYYY"
              inputReadOnly
              value={parseDatePickerValue(formData.date)}
              onChange={(date) =>
                updateForm(
                  "date",
                  date && dayjs.isDayjs(date) ? date.format("MM/DD/YYYY") : "",
                )
              }
              disabled={!isEditable}
              required
              aria-required="true"
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
