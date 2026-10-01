import React, { useState } from 'react';
import { Alert, Button, Input, Modal, Space } from 'antd';
import InspectionChecklistPanel from './InspectionChecklistPanel';

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
  const canSign = allChecked && !flagged.length && (!held || resolution.trim());
  const label = kind === 'pre' ? 'Pre-Flight' : 'Post-Flight';
  return <Modal open width={900} title={`${label} Inspection Checklist`} onCancel={onCancel} footer={null} styles={{ body: { maxHeight: '72vh', overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: 8 } }}>
    {error && <Alert type="error" title={error} />}
    {record?.confirmation?.allGood === false && <Alert type="warning" title={held ? 'Inspection on hold' : 'Saved draft'} description={record.confirmation.remarks} />}
    <p>Review every item in person. Check each one, or flag it as a discrepancy. You can save a draft and finish later.</p>
    <InspectionChecklistPanel items={items} checked={checked} discrepancies={discrepancies} disabled={busy}
      onChange={next => { setChecked(next.checked); setDiscrepancies(next.discrepancies); }} />
    {held && <Input.TextArea style={{ marginTop: 12 }} rows={3} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe how the discrepancies were resolved" />}
    {!allChecked && !flagged.length && <p style={{ color: '#64766e' }}>Check every item to sign. Unchecked items stay in the draft.</p>}
    {!!flagged.length && <p style={{ color: '#d93025' }}>Flagged discrepancies must be resolved before this inspection can be signed or the flight log released.</p>}
    <Space style={{ marginTop: 12 }}>
      <Button disabled={busy || missingNote} onClick={() => onDraft(checkedKeys, discrepancies)}>{flagged.length ? 'Save draft with discrepancies' : 'Save draft'}</Button>
      <Button type="primary" disabled={busy || !canSign} onClick={() => onSign(resolution, checkedKeys)}>Sign and confirm</Button>
      <Button disabled={busy} onClick={onCancel}>Cancel</Button>
    </Space>
  </Modal>;
}
