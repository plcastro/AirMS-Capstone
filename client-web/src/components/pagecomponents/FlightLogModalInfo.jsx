import React, { useEffect, useMemo, useRef, useState } from "react";
import { DatePicker, Input, Select } from "antd";
import dayjs from "dayjs";
import { API_BASE } from "../../utils/API_BASE";
import { isB412Aircraft } from "../../utils/b412FlightLog";

export default function FlightLogModalInfo({
  formData,
  updateForm,
  isEditable = true,
  isRPCEditable = true,
  onAircraftDataLoaded,
  serialNumber = "",
  onUpdateSerialNumber,
}) {
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [ongoingAircraftRpcs, setOngoingAircraftRpcs] = useState([]);
  const rpcRequestId = useRef(0);
  const autoResolveRpc = useRef("");
  const callbacksRef = useRef({ updateForm, onAircraftDataLoaded });

  useEffect(() => {
    callbacksRef.current = { updateForm, onAircraftDataLoaded };
  }, [updateForm, onAircraftDataLoaded]);

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
  const isB412 = isB412Aircraft(formData.aircraftType);
  const aircraftClassLabel = !formData.aircraftType
    ? "Rotary Winged Aircraft"
    : isB412
      ? "Rotary Winged Aircraft - Twin Engine"
      : "Rotary Winged Aircraft - Single Engine";

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
    const requestId = rpcRequestId.current + 1;
    rpcRequestId.current = requestId;
    autoResolveRpc.current = normalizeRpc(rpc);
    updateForm("rpc", rpc);
    updateForm("aircraftType", "");
    onAircraftDataLoaded?.(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/${encodeURIComponent(rpc)}`,
      );
      const data = await response.json();

      if (requestId !== rpcRequestId.current) return;

      if (response.ok && data?.data) {
        updateForm("aircraftType", data.data.aircraftType || "");
        onAircraftDataLoaded?.(data.data);
      } else {
        updateForm("aircraftType", "");
        onAircraftDataLoaded?.(null);
      }
    } catch (error) {
      if (requestId !== rpcRequestId.current) return;
      console.error("Error fetching aircraft type:", error);
      updateForm("aircraftType", "");
      onAircraftDataLoaded?.(null);
    }
  };

  // Older records can predate the aircraftType field. Resolve their existing
  // RP-C when the edit modal opens so the correct aircraft-specific tabs can
  // still be generated.
  useEffect(() => {
    const rpc = String(formData.rpc || "")
      .trim()
      .toUpperCase();
    if (!rpc || formData.aircraftType || autoResolveRpc.current === rpc) {
      return;
    }

    autoResolveRpc.current = rpc;
    const requestId = rpcRequestId.current + 1;
    rpcRequestId.current = requestId;
    let isActive = true;

    const resolveExistingAircraft = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/parts-monitoring/${encodeURIComponent(rpc)}`,
        );
        const payload = await response.json();

        if (!isActive || requestId !== rpcRequestId.current) return;

        const callbacks = callbacksRef.current;
        if (response.ok && payload?.data) {
          callbacks.updateForm("aircraftType", payload.data.aircraftType || "");
          callbacks.onAircraftDataLoaded?.(payload.data);
        } else {
          callbacks.updateForm("aircraftType", "");
          callbacks.onAircraftDataLoaded?.(null);
        }
      } catch (error) {
        if (!isActive || requestId !== rpcRequestId.current) return;
        console.error("Error resolving existing aircraft type:", error);
        const callbacks = callbacksRef.current;
        callbacks.updateForm("aircraftType", "");
        callbacks.onAircraftDataLoaded?.(null);
      }
    };

    resolveExistingAircraft();

    return () => {
      isActive = false;
      if (autoResolveRpc.current === rpc) {
        autoResolveRpc.current = "";
      }
    };
  }, [formData.rpc, formData.aircraftType]);

  return (
    <div className="fl-section">
      <div className="fl-section-title">BASIC INFORMATION</div>

      <div className="fl-card">
        <div className="fl-card-header">{aircraftClassLabel}</div>
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

          {isB412 && (
            <div className="fl-field-row">
              <span className="fl-label">Serial Number:</span>
              <Input
                className="fl-input"
                value={serialNumber}
                onChange={(event) =>
                  onUpdateSerialNumber?.(event.target.value)
                }
                placeholder="Enter aircraft serial number"
                disabled={!isEditable}
              />
            </div>
          )}

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
