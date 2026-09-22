import React, { useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import AppText from '../common/AppText';
const button = { padding: 14, marginVertical: 6, borderRadius: 6, backgroundColor: '#26866f' };
export default function InspectionConfirmationPrompt({ kind, record, onCancel, onYes, onNo, busy, error }) {
  const [no, setNo] = useState(false), [remarks, setRemarks] = useState(''), [resolution, setResolution] = useState('');
  const held = record?.confirmation?.allGood === false;
  return <View style={{ position: 'absolute', inset: 0, zIndex: 950, backgroundColor: '#0007', justifyContent: 'center', padding: 16 }}><ScrollView style={{ maxHeight: '85%', backgroundColor: '#fff', borderRadius: 12 }} contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
    <AppText style={{ fontWeight: '700', fontSize: 18 }}>{kind === 'pre' ? 'Pre-Flight' : 'Post-Flight'} Inspection</AppText>
    {!!error && <AppText style={{ color: '#b12626' }}>{error}</AppText>}
    {held && <><AppText>On hold: {record.confirmation.remarks}</AppText><TextInput multiline value={resolution} onChangeText={setResolution} placeholder="Describe how the discrepancies were resolved" style={{ minHeight: 80, padding: 12, borderWidth: 1, borderColor: '#ccc' }} /></>}
    {!no ? <><AppText>Were all {kind === 'pre' ? 'pre-flight' : 'post-flight'} inspection items satisfactory?</AppText><AppText>Yes checks every checklist item and attaches your verified signature.</AppText><TouchableOpacity style={button} disabled={busy || held && !resolution.trim()} onPress={() => onYes(resolution)}><AppText style={{ color: '#fff' }}>Yes, append my signature</AppText></TouchableOpacity><TouchableOpacity style={button} disabled={busy} onPress={() => setNo(true)}><AppText style={{ color: '#fff' }}>No, record discrepancies</AppText></TouchableOpacity></> : <><AppText>Discrepancies / Remarks</AppText><TextInput multiline value={remarks} onChangeText={setRemarks} style={{ minHeight: 100, padding: 12, borderWidth: 1, borderColor: '#ccc' }} /><AppText>The record stays on hold until the discrepancies are resolved.</AppText><TouchableOpacity style={button} disabled={busy || !remarks.trim()} onPress={() => onNo(remarks)}><AppText style={{ color: '#fff' }}>Save discrepancies and hold</AppText></TouchableOpacity><TouchableOpacity style={button} onPress={() => setNo(false)}><AppText style={{ color: '#fff' }}>Back</AppText></TouchableOpacity></>}
    <TouchableOpacity style={button} disabled={busy} onPress={onCancel}><AppText style={{ color: '#fff' }}>Cancel</AppText></TouchableOpacity>
  </ScrollView></View>;
}
