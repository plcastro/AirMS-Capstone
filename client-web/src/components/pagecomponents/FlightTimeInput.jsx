import React from 'react';
import { Input } from 'antd';
import { editFlightTimePart, padFlightTimePart, flightTimeDisplay, parseFlightTime, minutesToFlightHours } from '../../../../shared/flightLogTimes';

export default function FlightTimeInput({ value, onChange, disabled, label, duration = false, required = false }) {
  const displayed = flightTimeDisplay(value, duration);
  const parts = String(displayed || ':').split(':');
  const minutes = parseFlightTime(displayed, duration);
  return <div style={{ flex: 1 }}>
    <div role="group" aria-label={label} style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #d9d9d9', borderRadius: 6, background: disabled ? '#f5f5f5' : '#fff' }}>
      {[0, 1].map(part => <React.Fragment key={part}>
        {part === 1 && <span aria-hidden="true">:</span>}
        <Input aria-label={`${label} ${part === 0 ? 'hours' : 'minutes'}`} value={parts[part] || ''}
          placeholder="00" inputMode="numeric" disabled={disabled} variant="borderless" required={required} aria-required={required}
          style={{ width: 48, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
          onFocus={event => event.target.select()}
          onChange={event => onChange(editFlightTimePart(displayed, part, event.target.value))}
          onBlur={() => { if (!disabled) onChange(padFlightTimePart(displayed, part)); }}
          onPaste={event => {
            const text = event.clipboardData.getData('text').trim();
            if (/^\d{1,2}:\d{1,2}$/.test(text)) { event.preventDefault(); onChange(editFlightTimePart(displayed, part, text)); }
          }} />
      </React.Fragment>)}
    </div>
    <div style={{ fontSize: 12, marginTop: 4, color: displayed && minutes === null ? '#b42318' : '#666' }}>
      {displayed && minutes === null ? `Use ${duration ? '00–99' : '00–23'} hours and 00–59 minutes.` : duration && minutes !== null ? `${minutesToFlightHours(minutes).toFixed(1)} decimal hours` : 'Hours : minutes'}
    </div>
  </div>;
}
