import React from 'react';
import { View } from 'react-native';
import AppInput from '../common/AppInput';
import AppText from '../common/AppText';
import { editFlightTimePart, padFlightTimePart, flightTimeDisplay, parseFlightTime, minutesToFlightHours } from '../../../shared/flightLogTimes';

export default function FlightTimeInput({ value, onChange, disabled, label, duration = false, required = false }) {
  const displayed = flightTimeDisplay(value, duration);
  const parts = String(displayed || ':').split(':');
  const minutes = parseFlightTime(displayed, duration);
  return <View>
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, backgroundColor: disabled ? '#eee' : '#fff' }}>
      {[0, 1].map(part => <React.Fragment key={part}>
        {part === 1 && <AppText>:</AppText>}
        <AppInput accessibilityLabel={`${label} ${part === 0 ? 'hours' : 'minutes'}${required ? ', required' : ''}`} value={parts[part] || ''}
          placeholder="00" keyboardType="number-pad" editable={!disabled} selectTextOnFocus
          style={{ width: 52, height: 42, textAlign: 'center', color: '#222' }}
          onChangeText={text => onChange(editFlightTimePart(displayed, part, text))}
          onBlur={() => { if (!disabled) onChange(padFlightTimePart(displayed, part)); }} />
      </React.Fragment>)}
    </View>
    <AppText style={{ fontSize: 12, marginTop: 4, color: displayed && minutes === null ? '#b42318' : '#666' }}>
      {displayed && minutes === null ? `Use ${duration ? '00–99' : '00–23'} hours and 00–59 minutes.` : duration && minutes !== null ? `${minutesToFlightHours(minutes).toFixed(1)} decimal hours` : 'Hours : minutes'}
    </AppText>
  </View>;
}
