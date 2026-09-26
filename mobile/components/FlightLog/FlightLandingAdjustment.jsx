import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppText from '../common/AppText';
export default function FlightLandingAdjustment({ legs = [], extra = 0, onChange, disabled }) {
  const count = Math.max(0, Number(extra) || 0);
  return <View style={{ padding: 12 }}><AppText>Landing cycles: {legs.length + count} ({legs.length} legs + {count} additional)</AppText><View style={{ flexDirection: 'row' }}>{[-1, 1].map(delta => <TouchableOpacity key={delta} accessibilityRole="button" accessibilityLabel={delta < 0 ? 'Decrease landing cycles' : 'Increase landing cycles'} disabled={disabled || delta < 0 && count === 0} onPress={() => onChange(Math.max(0, count + delta))} style={{ padding: 14, margin: 4, backgroundColor: '#e3f2ec' }}><AppText>{delta < 0 ? '−' : '+'}</AppText></TouchableOpacity>)}</View></View>;
}
