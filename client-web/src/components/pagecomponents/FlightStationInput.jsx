import React from 'react';
import { AutoComplete, Input } from 'antd';
import { flightStationSuggestions } from '../../../../shared/flightStationSuggestions';

export default function FlightStationInput({ value, onChange, placeholder, disabled, label }) {
  return (
    <AutoComplete value={value || ''} onChange={onChange} disabled={disabled}
      style={{ flex: 1, minWidth: 0 }} options={flightStationSuggestions(value).map(name => ({ value: name }))}
      filterOption={false} defaultActiveFirstOption={false} backfill={false}>
      <Input className="fl-input" placeholder={placeholder} aria-label={label} required aria-required="true" />
    </AutoComplete>
  );
}
