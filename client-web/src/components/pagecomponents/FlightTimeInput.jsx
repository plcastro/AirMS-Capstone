import React from 'react';
import { Input } from 'antd';
import { editFlightTimePart, padFlightTimePart, flightTimeDisplay, parseFlightTime, minutesToFlightHours } from '../../../../shared/flightLogTimes';

export default function FlightTimeInput({ value, onChange, disabled, label, duration = false, required = false }) {
  const displayed = flightTimeDisplay(value, duration);
  const parts = String(displayed || ':').split(':');
  const minutes = parseFlightTime(displayed, duration);
  const invalid = displayed && minutes === null;

  return <div className="fl-time-input">
    <div role="group" aria-label={label} className={`fl-time-input-group${disabled ? ' fl-time-input-group--disabled' : ''}`}>
      {[0, 1].map(part => <React.Fragment key={part}>
        {part === 1 && <span aria-hidden="true">:</span>}
        <Input size="large" aria-label={`${label} ${part === 0 ? 'hours' : 'minutes'}`} value={parts[part] || ''}
          placeholder="00" inputMode="numeric" disabled={disabled} variant="borderless" required={required} aria-required={required}
          className="fl-time-part-input"
          onFocus={event => event.target.select()}
          onChange={event => onChange(editFlightTimePart(displayed, part, event.target.value))}
          onBlur={() => { if (!disabled) onChange(padFlightTimePart(displayed, part)); }}
          onPaste={event => {
            const text = event.clipboardData.getData('text').trim();
            if (/^\d{1,2}:\d{1,2}$/.test(text)) { event.preventDefault(); onChange(editFlightTimePart(displayed, part, text)); }
          }} />
      </React.Fragment>)}
    </div>
    <div className={invalid ? 'fl-time-help fl-time-help--error' : 'fl-time-help'}>
      {invalid ? `Use ${duration ? '00-99' : '00-23'} hours and 00-59 minutes.` : duration && minutes !== null ? `${minutesToFlightHours(minutes).toFixed(1)} decimal hours` : 'Hours : minutes'}
    </div>
  </div>;
}
