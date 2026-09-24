import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppInput from '../common/AppInput';
import AppText from '../common/AppText';
import { flightStationSuggestions } from '../../../shared/flightStationSuggestions';

export default function FlightStationInput({ value, onChangeText, editable, placeholder, label }) {
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef(null);
  useEffect(() => () => clearTimeout(blurTimer.current), []);
  const suggestions = focused && editable ? flightStationSuggestions(value, 8) : [];
  return (
    <View style={{ flex: 1, alignSelf: 'flex-start' }}>
      <AppInput value={value || ''} onChangeText={text => { setFocused(true); onChangeText(text); }} editable={editable}
        placeholder={placeholder} accessibilityLabel={label} autoCorrect={false}
        onFocus={() => { clearTimeout(blurTimer.current); setFocused(true); }}
        onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 180); }}
        style={{ backgroundColor: editable ? '#F2F2F2' : '#E8E8E8', borderRadius: 4,
          height: 38, paddingHorizontal: 10, fontSize: 12, color: '#333' }} />
      {suggestions.length > 0 && <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 4, backgroundColor: '#fff' }}>
        {suggestions.map(name => <TouchableOpacity key={name} accessibilityRole="button"
          accessibilityLabel={`Use ${name}`} onPress={() => {
            clearTimeout(blurTimer.current);
            onChangeText(name);
            setFocused(false);
          }} style={{ paddingHorizontal: 10, paddingVertical: 12 }}>
          <AppText style={{ color: '#333', fontSize: 12 }}>{name}</AppText>
        </TouchableOpacity>)}
      </View>}
    </View>
  );
}
