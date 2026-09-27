import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppInput from '../common/AppInput';
import AppText from '../common/AppText';
import { getAuthHeaders } from '../../utilities/mobileApi';
import { API_BASE } from '../../utilities/API_BASE';
export default function PartNameInput({
  value,
  onChangeText,
  onSelectUnit,
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
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/parts-requisition/part-suggestions?q=${encodeURIComponent(value || '')}`, {
          headers: await getAuthHeaders(),
          signal: controller.signal
        });
        if (!response.ok) throw new Error('Suggestions unavailable');
        const values = await response.json();
        setOptions(values.map(option => ({
          value: option.value,
          unit: option.unit
        })));
      } catch {
        if (!controller.signal.aborted) setOptions([]);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [focused, editable, value]);
  return <View style={{
    width: '100%'
  }}>
      <AppInput {...props} value={value || ''} editable={editable} accessibilityLabel={label || props.accessibilityLabel} autoCorrect={false} onChangeText={text => {
      setFocused(true);
      onChangeText(text);
    }} onFocus={event => {
      clearTimeout(blurTimer.current);
      setFocused(true);
      onFocus?.(event);
    }} onBlur={event => {
      blurTimer.current = setTimeout(() => setFocused(false), 180);
      onBlur?.(event);
    }} style={[{
      backgroundColor: editable ? '#F2F2F2' : '#E8E8E8',
      borderRadius: 4,
      height: 38,
      paddingHorizontal: 10,
      fontSize: 12,
      color: '#333'
    }, style]} />
      {focused && editable && options.length > 0 && <View style={{
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 4,
      backgroundColor: '#fff'
    }}>
          {options.map(option => <TouchableOpacity key={option.value} accessibilityRole="button" accessibilityLabel={'Use ' + option.value} onPressIn={() => clearTimeout(blurTimer.current)} onPress={() => {
        clearTimeout(blurTimer.current);
        onChangeText(option.value);
        if (option.unit) onSelectUnit?.(option.unit);
        setFocused(false);
      }} style={{
        paddingHorizontal: 10,
        paddingVertical: 12
      }}>
              <AppText style={{
          color: '#333',
          fontSize: 12
        }}>{option.value}</AppText>
            </TouchableOpacity>)}
        </View>}
    </View>;
}
