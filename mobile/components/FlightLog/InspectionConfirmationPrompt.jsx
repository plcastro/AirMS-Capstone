import React, { useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import AppText from '../common/AppText';
import InspectionChecklistPanel from './InspectionChecklistPanel';
const button = { padding: 14, marginVertical: 6, borderRadius: 6, backgroundColor: '#26866f' };

// Shows the whole checklist every time so each item is reviewed in person.
// The mechanic can save a draft (with or without flagged discrepancies) and
// can only sign once every item is checked and no discrepancy is flagged.
export default function InspectionConfirmationPrompt({ kind, record, items, initialChecked, onCancel, onSign, onDraft, busy, error }) {
  const open = record?.discrepancies
    ? Object.fromEntries(Object.entries(record.discrepancies).filter(([, value]) => value && value.resolved !== true).map(([key, value]) => [key, { note: value.note || '' }]))
    : {};
  const [checked, setChecked] = useState(() => Object.fromEntries(initialChecked.map(key => [key, true])));
  const [discrepancies, setDiscrepancies] = useState(open);
  const [resolution, setResolution] = useState('');
  const held = record?.confirmation?.allGood === false && !record.confirmation.draft;
  const flagged = Object.keys(discrepancies);
  const missingNote = flagged.some(key => !discrepancies[key].note.trim());
  const checkedKeys = items.filter(item => checked[item.key]).map(item => item.key);
  const allChecked = checkedKeys.length === items.length;
  const canSign = allChecked && !flagged.length && (!held || !!resolution.trim());
  return <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 950, backgroundColor: '#0007', justifyContent: 'center', padding: 16 }}>
    <ScrollView style={{ maxHeight: '90%', backgroundColor: '#fff', borderRadius: 12 }} contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
      <AppText style={{ fontWeight: '700', fontSize: 18 }}>{kind === 'pre' ? 'Pre-Flight' : 'Post-Flight'} Inspection Checklist</AppText>
      {!!error && <AppText style={{ color: '#b12626' }}>{error}</AppText>}
      {record?.confirmation?.allGood === false && <AppText style={{ marginVertical: 6 }}>{held ? 'On hold' : 'Saved draft'}: {record.confirmation.remarks}</AppText>}
      <AppText style={{ marginVertical: 6 }}>Review every item in person. Check each one, or flag it as a discrepancy. You can save a draft and finish later.</AppText>
      <InspectionChecklistPanel items={items} checked={checked} discrepancies={discrepancies} disabled={busy}
        onChange={next => { setChecked(next.checked); setDiscrepancies(next.discrepancies); }} />
      {held && <TextInput multiline value={resolution} onChangeText={setResolution} placeholder="Describe how the discrepancies were resolved" style={{ minHeight: 80, padding: 12, borderWidth: 1, borderColor: '#ccc', marginTop: 10 }} />}
      {!allChecked && !flagged.length && <AppText style={{ marginTop: 8, color: '#64766e' }}>Check every item to sign. Unchecked items stay in the draft.</AppText>}
      {!!flagged.length && <AppText style={{ marginTop: 8, color: '#b12626' }}>Flagged discrepancies must be resolved before this inspection can be signed or the flight log released.</AppText>}
      <TouchableOpacity style={[button, (busy || missingNote) && { opacity: 0.5 }]} disabled={busy || missingNote} onPress={() => onDraft(checkedKeys, discrepancies)}><AppText style={{ color: '#fff' }}>{flagged.length ? 'Save draft with discrepancies' : 'Save draft'}</AppText></TouchableOpacity>
      <TouchableOpacity style={[button, (busy || !canSign) && { opacity: 0.5 }]} disabled={busy || !canSign} onPress={() => onSign(resolution, checkedKeys)}><AppText style={{ color: '#fff' }}>Sign and confirm</AppText></TouchableOpacity>
      <TouchableOpacity style={button} disabled={busy} onPress={onCancel}><AppText style={{ color: '#fff' }}>Cancel</AppText></TouchableOpacity>
    </ScrollView>
  </View>;
}
