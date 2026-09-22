import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppInput from '../common/AppInput';
import AppText from '../common/AppText';
import { loadStationSuggestions, stationSuggestions } from '../../../shared/flightStationSuggestions';
export default function FlightStationInput({ value, onChangeText, editable, style, ...props }) {
  const [focused, setFocused] = useState(false);
  const [options, setOptions] = useState([]);
  useEffect(() => {
    if (!focused) return;
    let active = true;
    loadStationSuggestions().then(() => active && setOptions(stationSuggestions(value, 8))).catch(() => active && setOptions([{ value: 'Local' }]));
    return () => { active = false; };
  }, [focused, value]);
  return <View style={{ flex: 1 }}><AppInput {...props} value={value} editable={editable} onChangeText={onChangeText} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={style} />
    {focused && editable && options.map(option => <TouchableOpacity key={option.value} onPressIn={() => { onChangeText(option.value); setFocused(false); }} style={{ padding: 10, backgroundColor: '#eaf4ef', borderBottomWidth: 1, borderColor: '#d6e3dc' }}><AppText style={{ fontSize: 12 }}>{option.value}</AppText></TouchableOpacity>)}
  </View>;
}
