import React, { useEffect, useState } from 'react';
import { AutoComplete } from 'antd';
import { loadStationSuggestions, stationSuggestions } from '../../../../shared/flightStationSuggestions';
export default function FlightStationInput({ value, ...props }) {
  const [focused, setFocused] = useState(false), [options, setOptions] = useState([]);
  useEffect(() => {
    if (!focused) return;
    let active = true;
    loadStationSuggestions().then(() => active && setOptions(stationSuggestions(value))).catch(() => active && setOptions([{ value: 'Local' }]));
    return () => { active = false; };
  }, [focused, value]);
  return <AutoComplete {...props} value={value} options={options} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />;
}
