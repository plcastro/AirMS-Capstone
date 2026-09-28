import React, { useState } from 'react';
import { Alert, Button, Input, Modal, Space } from 'antd';
export default function InspectionConfirmationPrompt({ kind, record, onCancel, onYes, onNo, busy, error }) {
  const [no, setNo] = useState(false), [remarks, setRemarks] = useState(''), [resolution, setResolution] = useState('');
  const held = record?.confirmation?.allGood === false;
  return <Modal open title={`${kind === 'pre' ? 'Pre-Flight' : 'Post-Flight'} Inspection`} onCancel={onCancel} footer={null}>
    {error && <Alert type="error" title={error} />}
    {held && <><Alert type="warning" title="Inspection on hold" description={record.confirmation.remarks} /><Input.TextArea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe how the discrepancies were resolved" /></>}
    {!no ? <><p><strong>Were all {kind === 'pre' ? 'pre-flight' : 'post-flight'} inspection items satisfactory?</strong></p><p>Yes checks every checklist item and attaches your verified signature.</p><Space><Button type="primary" disabled={busy || held && !resolution.trim()} onClick={() => onYes(resolution)}>Yes, append my signature</Button><Button disabled={busy} onClick={() => setNo(true)}>No, record discrepancies</Button></Space></> : <><p>Discrepancies / Remarks</p><Input.TextArea rows={4} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Describe the inspection findings" /><p>The record stays on hold until the discrepancies are resolved.</p><Space><Button type="primary" loading={busy} disabled={!remarks.trim()} onClick={() => onNo(remarks)}>Save discrepancies and hold</Button><Button onClick={() => setNo(false)}>Back</Button></Space></>}
  </Modal>;
}
