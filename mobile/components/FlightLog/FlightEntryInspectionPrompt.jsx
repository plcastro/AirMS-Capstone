import React, { useEffect, useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Modal from '../common/AppModal';
import AppText from '../common/AppText';
import PinVerifiedSignatureModal from '../common/PinVerifiedSignatureModal';
import { API_BASE } from '../../utilities/API_BASE';
import { getAuthHeaders } from '../../utilities/mobileApi';
const button = { padding: 14, backgroundColor: '#26866f', marginVertical: 8, borderRadius: 6 };
export default function FlightEntryInspectionPrompt({ visible, lockedRpc, onClose, onConfirmed }) {
  const [rpc, setRpc] = useState(''), [options, setOptions] = useState([]), [remarks, setRemarks] = useState('');
  const [no, setNo] = useState(false), [signing, setSigning] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (!visible) return; setRpc(lockedRpc || ''); setRemarks(''); setNo(false); setSigning(false); setError('');
    fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`).then(r => r.json()).then(r => setOptions(r.data || [])).catch(() => setOptions([]));
  }, [visible, lockedRpc]);
  const submit = async (allGood, signature, pin) => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/flightlogs/preflight-confirmations`, { method: 'POST', headers: await getAuthHeaders({ 'Content-Type': 'application/json', 'x-action-confirmed': 'true' }), body: JSON.stringify({ rpc, allGood, remarks, signature, pin }) });
      const result = await response.json(); if (!response.ok) throw Error(result.message || 'Could not record the inspection.');
      setSigning(false); onConfirmed(result.data); return true;
    } catch (e) { setError(e.message); if (allGood) throw e; return false; } finally { setBusy(false); }
  };
  return <Modal visible={visible} onRequestClose={onClose} animationType="slide"><View style={{ flex: 1, padding: 24, paddingTop: 50, backgroundColor: '#fff' }}><ScrollView keyboardShouldPersistTaps="handled">
    <AppText style={{ fontSize: 20, fontWeight: '700' }}>Pre-Flight Inspection</AppText>
    {!!error && <AppText style={{ color: '#b12626' }}>{error}</AppText>}
    <AppText>Aircraft registration</AppText><Picker enabled={!lockedRpc && !busy} selectedValue={rpc} onValueChange={setRpc}><Picker.Item label="Select aircraft" value="" />{[...new Set([lockedRpc, ...options].filter(Boolean))].map(value => <Picker.Item key={value} label={value} value={value} />)}</Picker>
    <AppText style={{ fontWeight: '700' }}>Were all pre-flight inspection items satisfactory?</AppText><AppText>Yes checks every checklist item and applies your signature to fuel and oil servicing entries.</AppText>
    <TouchableOpacity style={button} disabled={!rpc || busy} onPress={() => setSigning(true)}><AppText style={{ color: '#fff' }}>Yes, sign and continue</AppText></TouchableOpacity>
    <TouchableOpacity style={button} disabled={!rpc || busy} onPress={() => setNo(true)}><AppText style={{ color: '#fff' }}>No, record discrepancies</AppText></TouchableOpacity>

    <TouchableOpacity style={button} disabled={busy} onPress={onClose}><AppText style={{ color: '#fff' }}>Cancel</AppText></TouchableOpacity>
    </ScrollView>
    {no && <View style={{ position: 'absolute', inset: 0, zIndex: 800, backgroundColor: '#0007', justifyContent: 'center', padding: 20 }}><View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20 }}><AppText style={{ fontSize: 18, fontWeight: '700' }}>Pre-Flight Discrepancies / Remarks</AppText><AppText>The inspection stays on hold until resolved.</AppText>{!!error && <AppText style={{ color: '#b12626' }}>{error}</AppText>}<TextInput multiline value={remarks} onChangeText={setRemarks} style={{ minHeight: 100, padding: 12, borderWidth: 1, borderColor: '#ccc' }} /><TouchableOpacity style={button} disabled={!remarks.trim() || busy} onPress={() => submit(false)}><AppText style={{ color: '#fff' }}>Continue with inspection on hold</AppText></TouchableOpacity><TouchableOpacity style={button} disabled={busy} onPress={() => setNo(false)}><AppText style={{ color: '#fff' }}>Cancel</AppText></TouchableOpacity></View></View>}
    <PinVerifiedSignatureModal useNativeModal={false} visible={signing} title="Confirm Pre-Flight Inspection" description="I confirm every pre-flight checklist item is satisfactory. Apply my signature to this inspection and this flight's servicing entries." onClose={() => setSigning(false)} onSave={(signature, { pin }) => submit(true, signature, pin)} /></View></Modal>;
}
