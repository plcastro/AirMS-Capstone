import React, { useContext, useEffect, useState } from "react";
import { AutoComplete, Input } from "antd";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";
export default function PartNameInput({ value, onChange, onSelectUnit }) {
  const { getAuthHeader } = useContext(AuthContext);
  const [options, setOptions] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/parts-requisition/part-suggestions?q=${encodeURIComponent(value || "")}`,
          {
            headers: await getAuthHeader(),
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Suggestions unavailable");
        const values = await response.json();
        setOptions(
          values.map((option) => ({
            value: option.value,
            unit: option.unit,
          })),
        );
      } catch {
        if (!controller.signal.aborted) setOptions([]);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, getAuthHeader]);
  return (
    <AutoComplete
      value={value}
      onChange={onChange}
      options={options}
      onSelect={(value, option) => {
        onChange(value);
        if (option.unit) onSelectUnit?.(option.unit);
      }}
      showSearch={{ filterOption: false }}
      defaultActiveFirstOption={false}
      style={{
        width: "100%",
      }}
    >
      <Input
        placeholder="Enter a part name"
        aria-label="Part name"
        size="large"
      />
    </AutoComplete>
  );
}
