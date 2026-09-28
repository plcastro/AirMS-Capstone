import React, { useEffect, useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import Modal from '../common/AppModal';
import AppText from '../common/AppText';
import PinVerifiedSignatureModal from '../common/PinVerifiedSignatureModal';
import { API_BASE } from '../../utilities/API_BASE';
import { getAuthHeaders } from '../../utilities/mobileApi';
import { hasOngoingFlightLog } from '../../../shared/flightWorkflow';
const button = { padding: 14, backgroundColor: '#26866f', marginVertical: 8, borderRadius: 6 };
export default function FlightEntryInspectionPrompt({ visible, lockedRpc, flightLogs = [], onClose, onConfirmed }) {
  const [rpc, setRpc] = useState(''), [options, setOptions] = useState([]), [remarks, setRemarks] = useState('');
  const [no, setNo] = useState(false), [signing, setSigning] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const ongoingFlight = hasOngoingFlightLog(flightLogs, rpc);
  const cannotContinue = !rpc.trim() || busy || ongoingFlight;
  useEffect(() => { if (!visible) return; setRpc(lockedRpc || ''); setRemarks(''); setNo(false); setSigning(false); setError('');
    fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`).then(r => r.json()).then(r => setOptions(r.data || [])).catch(() => setOptions([]));
  }, [visible, lockedRpc]);
  const submit = async (allGood, signature, pin) => {
    if (ongoingFlight) {
      const error = new Error('This aircraft has an ongoing flight log. Complete it before creating a new entry.');
      setError(error.message);
      if (allGood) throw error;
      return false;
    }
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
    <AppText style={{ marginTop: 16, marginBottom: 8 }}>Aircraft registration</AppText>
    <AppText style={{ color: '#64766e', marginBottom: 8 }}>Aircraft with ongoing flight logs are unavailable until those logs are completed.</AppText>
    <ScrollView nestedScrollEnabled style={{ maxHeight: 240, marginBottom: 16 }} keyboardShouldPersistTaps="handled">
      {[...new Set([lockedRpc, ...options].filter(Boolean))].map(value => {
        const unavailable = hasOngoingFlightLog(flightLogs, value);
        const disabled = unavailable || busy || (!!lockedRpc && lockedRpc !== value);
        return <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: rpc === value, disabled }} disabled={disabled} onPress={() => !disabled && setRpc(value)} style={{ padding: 14, marginBottom: 6, borderWidth: 1, borderRadius: 8, borderColor: rpc === value ? '#26866f' : '#dce6e1', backgroundColor: unavailable ? '#f1f2f3' : rpc === value ? '#e3f2ec' : '#fff' }}>
          <AppText style={{ color: disabled ? '#888' : '#243f35', fontWeight: rpc === value ? '700' : '500' }}>{value}{unavailable ? ' (ongoing flight log)' : ''}</AppText>
        </TouchableOpacity>;
      })}
    </ScrollView>
    {ongoingFlight && <AppText style={{ color: '#b12626', marginBottom: 12 }}>Complete this aircraft's ongoing flight log before creating a new entry.</AppText>}
    <AppText style={{ fontWeight: '700' }}>Were all pre-flight inspection items satisfactory?</AppText><AppText>Yes checks every checklist item and applies your signature to fuel and oil servicing entries.</AppText>
    <TouchableOpacity style={[button, cannotContinue && { opacity: 0.45 }]} disabled={cannotContinue} onPress={() => !cannotContinue && setSigning(true)}><AppText style={{ color: '#fff' }}>Yes, sign and continue</AppText></TouchableOpacity>
    <TouchableOpacity style={[button, cannotContinue && { opacity: 0.45 }]} disabled={cannotContinue} onPress={() => !cannotContinue && setNo(true)}><AppText style={{ color: '#fff' }}>No, record discrepancies</AppText></TouchableOpacity>

    <TouchableOpacity style={button} disabled={busy} onPress={onClose}><AppText style={{ color: '#fff' }}>Cancel</AppText></TouchableOpacity>
    </ScrollView>
    {no && <View style={{ position: 'absolute', inset: 0, zIndex: 800, backgroundColor: '#0007', justifyContent: 'center', padding: 20 }}><View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20 }}><AppText style={{ fontSize: 18, fontWeight: '700' }}>Pre-Flight Discrepancies / Remarks</AppText><AppText>The inspection stays on hold until resolved.</AppText>{!!error && <AppText style={{ color: '#b12626' }}>{error}</AppText>}<TextInput multiline value={remarks} onChangeText={setRemarks} style={{ minHeight: 100, padding: 12, borderWidth: 1, borderColor: '#ccc' }} /><TouchableOpacity style={button} disabled={!remarks.trim() || cannotContinue} onPress={() => submit(false)}><AppText style={{ color: '#fff' }}>Continue with inspection on hold</AppText></TouchableOpacity><TouchableOpacity style={button} disabled={busy} onPress={() => setNo(false)}><AppText style={{ color: '#fff' }}>Cancel</AppText></TouchableOpacity></View></View>}
    <PinVerifiedSignatureModal useNativeModal={false} visible={signing} title="Confirm Pre-Flight Inspection" description="I confirm every pre-flight checklist item is satisfactory. Apply my signature to this inspection and this flight's servicing entries." onClose={() => setSigning(false)} onSave={(signature, { pin }) => submit(true, signature, pin)} /></View></Modal>;
}
