import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppInput from '../common/AppInput';
import AppText from '../common/AppText';
import { loadStationSuggestions, stationSuggestions } from '../../../shared/flightStationSuggestions';

export default function FlightStationInput({
  value,
  onChangeText,
  editable = true,
  label,
  style,
  onFocus,
  onBlur,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [options, setOptions] = useState([]);
  const blurTimer = useRef(null);

  useEffect(() => () => clearTimeout(blurTimer.current), []);
  useEffect(() => {
    if (!focused || !editable) return;
    let active = true;
    const updateOptions = () => {
      if (active) setOptions(stationSuggestions(value, 8));
    };
    updateOptions();
    loadStationSuggestions().then(updateOptions).catch(updateOptions);
    return () => { active = false; };
  }, [focused, editable, value]);

  return (
    <View style={{ flex: 1, alignSelf: 'flex-start' }}>
      <AppInput
        {...props}
        value={value || ''}
        editable={editable}
        accessibilityLabel={label || props.accessibilityLabel}
        autoCorrect={false}
        onChangeText={text => { setFocused(true); onChangeText(text); }}
        onFocus={event => {
          clearTimeout(blurTimer.current);
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={event => {
          blurTimer.current = setTimeout(() => setFocused(false), 180);
          onBlur?.(event);
        }}
        style={[{
          backgroundColor: editable ? '#F2F2F2' : '#E8E8E8',
          borderRadius: 4,
          height: 38,
          paddingHorizontal: 10,
          fontSize: 12,
          color: '#333',
        }, style]}
      />
      {focused && editable && options.length > 0 && (
        <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 4, backgroundColor: '#fff' }}>
          {options.map(option => (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={'Use ' + option.value}
              onPressIn={() => clearTimeout(blurTimer.current)}
              onPress={() => {
                clearTimeout(blurTimer.current);
                onChangeText(option.value);
                setFocused(false);
              }}
              style={{ paddingHorizontal: 10, paddingVertical: 12 }}
            >
              <AppText style={{ color: '#333', fontSize: 12 }}>{option.value}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
