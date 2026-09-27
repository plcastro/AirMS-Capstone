import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Space } from 'antd';
import PinVerifiedSignatureModal from '../common/PinVerifiedSignatureModal';

export default function FlightLogPreflightGate({ open, aircraftRpc, onClose, onConfirmed }) {
  const [step, setStep] = useState('question');
  const [drafts, setDrafts] = useState({});
  const key = aircraftRpc || 'new-aircraft';
  const draft = drafts[key] || { remarks: '', resolution: '', onHold: false };
  const update = changes => setDrafts(previous => ({ ...previous, [key]: { ...draft, ...changes } }));
  useEffect(() => {
    if (open) setStep(drafts[key]?.onHold ? 'remarks' : 'question');
  }, [open, key]);
  const [error, setError] = useState('');
  const close = () => { setError(''); onClose(); };
  const resolve = () => {
    if (!draft.remarks.trim() || !draft.resolution.trim()) {
      setError('Enter the discrepancies and how they were resolved before signing.');
      return;
    }
    setError(''); setStep('signature');
  };
  return <>
    <Modal open={open && step === 'question'} title="Pre-flight inspection" onCancel={close} centered
      footer={<Space wrap>
        <Button onClick={close}>Cancel</Button>
        <Button onClick={() => { update({ onHold: true }); setStep('remarks'); }}>No — record discrepancies</Button>
        <Button type="primary" onClick={() => setStep('signature')}>Yes — sign and continue</Button>
      </Space>}>
      {aircraftRpc && <p><strong>{aircraftRpc}</strong></p>}
      <p>Has the pre-flight inspection been completed with no discrepancies?</p>
    </Modal>
    <Modal open={open && step === 'remarks'} title="Pre-flight discrepancy / remarks" onCancel={close} centered
      footer={<Space wrap><Button onClick={close}>Close</Button>
        <Button type="primary" onClick={resolve}>Resolved — sign and continue</Button></Space>}>
      <Alert type="warning" showIcon title="Entry on hold" description="Resolve the discrepancies before proceeding. These pending notes stay available while this page remains open; no flight log has been saved yet." />
      <label style={{ display: 'block', marginTop: 16 }}>Discrepancies / remarks</label>
      <Input.TextArea aria-label="Pre-flight discrepancies" rows={4} value={draft.remarks}
        onChange={event => update({ remarks: event.target.value })} />
      <label style={{ display: 'block', marginTop: 16 }}>Resolution / corrective action</label>
      <Input.TextArea aria-label="Pre-flight resolution" rows={3} value={draft.resolution}
        onChange={event => update({ resolution: event.target.value })} />
      {error && <Alert style={{ marginTop: 12 }} type="error" title={error} />}
    </Modal>
    {open && step === 'signature' && <PinVerifiedSignatureModal open
      title="Pre-flight inspection confirmation"
      description="Sign to confirm that the pre-flight inspection is complete and all discrepancies, if any, have been resolved."
      confirmDescription="Enter your 6-digit PIN to confirm the pre-flight inspection and open the flight log."
      onCancel={close} onSave={async signature => {
        await onConfirmed({ status: 'confirmed', signature, remarks: draft.remarks.trim(), resolution: draft.resolution.trim() });
        setDrafts(previous => { const next = { ...previous }; delete next[key]; return next; });
      }} />}
  </>;
}
