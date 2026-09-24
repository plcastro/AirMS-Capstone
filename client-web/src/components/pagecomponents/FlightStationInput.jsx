import React, { useEffect, useState } from 'react';
import { AutoComplete, Input } from 'antd';
import { loadStationSuggestions, stationSuggestions } from '../../../../shared/flightStationSuggestions';

export default function FlightStationInput({ value, onChange, placeholder, disabled, label, style, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  const [options, setOptions] = useState(() => stationSuggestions(value));

  useEffect(() => {
    if (!focused) return;
    let active = true;
    loadStationSuggestions()
      .then(() => { if (active) setOptions(stationSuggestions(value)); })
      .catch(() => { if (active) setOptions(stationSuggestions(value)); });
    return () => { active = false; };
  }, [focused, value]);

  return (
    <AutoComplete {...props} value={value || ''} onChange={onChange} disabled={disabled}
      style={{ flex: 1, minWidth: 0, ...style }} options={options}
      filterOption={false} defaultActiveFirstOption={false} backfill={false}
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { setFocused(false); onBlur?.(event); }}>
      <Input className="fl-input" placeholder={placeholder} aria-label={label} required aria-required="true" />
    </AutoComplete>
  );
}
