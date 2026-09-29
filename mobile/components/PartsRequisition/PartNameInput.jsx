import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
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
    if (!focused || !editable || !value?.trim()) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/parts-requisition/part-suggestions?q=${encodeURIComponent(value)}`, {
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
    };
    const timer = setTimeout(fetchSuggestions, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [focused, editable, value]);
  const showSuggestions = focused && editable && options.length > 0;
  return <View style={{
    width: '100%',
    position: 'relative',
    zIndex: showSuggestions ? 1000 : 1
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
      {showSuggestions && <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{
      position: 'absolute',
      top: 42,
      left: 0,
      right: 0,
      maxHeight: 220,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 4,
      backgroundColor: '#fff',
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      zIndex: 1000
    }} contentContainerStyle={{
      flexGrow: 0
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
        </ScrollView>}
    </View>;
}
