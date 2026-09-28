import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AppText from '../common/AppText';
import AppInput from '../common/AppInput';
import { getAuthHeaders } from '../../utilities/mobileApi';
import { API_BASE } from '../../utilities/API_BASE';

export default function FlightAssignedPilotSelect({ value, onChange, disabled, isActive = true }) {
  const [pilots, setPilots] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isActive || disabled) return;
    let active = true;
    setLoading(true); setError('');
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/flightlogs/pilot-options`, { headers: await getAuthHeaders() });
        const result = await response.json();
        if (!response.ok) throw Error(result.message || 'Unable to load pilots.');
        if (active) setPilots(result.data || []);
      } catch (e) { if (active) setError(e.message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [isActive, disabled, retry]);
  if (disabled) return <AppInput accessibilityLabel="Assigned Pilot" value={value?.name || ''} placeholder="Not assigned" editable={false} style={{ padding: 12, backgroundColor: '#eee', color: '#333' }} />;
  return <View>
    <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6 }}>
      <Picker accessibilityLabel="Assigned Pilot" selectedValue={value?.userId || ''} enabled={!loading}
        onValueChange={id => { if (id !== value?.userId) onChange(pilots.find(pilot => pilot.userId === id) || null); }}>
        <Picker.Item label={loading ? 'Loading pilots…' : 'Select assigned pilot'} value="" />
        {value?.userId && !pilots.some(pilot => pilot.userId === value.userId) && <Picker.Item label={value.name} value={value.userId} />}
        {pilots.map(pilot => <Picker.Item key={pilot.userId} label={pilot.name} value={pilot.userId} />)}
      </Picker>
    </View>
    {!loading && !error && !pilots.length && <AppText>No active pilots available.</AppText>}
    {!!error && <View><AppText style={{ color: '#b42318' }}>{error}</AppText><TouchableOpacity accessibilityRole="button" onPress={() => setRetry(previous => previous + 1)} style={{ paddingVertical: 10 }}><AppText>Retry</AppText></TouchableOpacity></View>}
  </View>;
}
