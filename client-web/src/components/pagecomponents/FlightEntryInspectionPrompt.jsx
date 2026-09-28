import React, { useContext, useEffect, useState } from 'react';
import { Alert, AutoComplete, Button, Input, Modal, Space } from 'antd';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../utils/API_BASE';
import PinVerifiedSignatureModal from '../common/PinVerifiedSignatureModal';
import { hasOngoingFlightLog } from '../../../../shared/flightWorkflow';

export default function FlightEntryInspectionPrompt({ open, lockedRpc, flightLogs = [], onCancel, onConfirmed }) {
  const { getAuthHeader } = useContext(AuthContext);
  const [rpc, setRpc] = useState(''), [options, setOptions] = useState([]);
  const [remarksOpen, setRemarksOpen] = useState(false), [remarks, setRemarks] = useState('');
  const [signing, setSigning] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const ongoingFlight = hasOngoingFlightLog(flightLogs, rpc);
  const cannotContinue = !rpc.trim() || busy || ongoingFlight;
  const aircraftOptions = options.map(option => {
    const disabled = hasOngoingFlightLog(flightLogs, option.value);
    return { ...option, disabled, label: disabled ? `${option.value} (ongoing flight log)` : option.value };
  });
  useEffect(() => {
    if (!open) return;
    setRpc(lockedRpc || ''); setRemarks(''); setRemarksOpen(false); setSigning(false); setError('');
    fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`).then(r => r.json()).then(r => setOptions((r.data || []).map(value => ({ value })))).catch(() => setOptions([]));
  }, [open, lockedRpc]);
  const submit = async (allGood, signature, pin) => {
    if (ongoingFlight) {
      const error = new Error('This aircraft has an ongoing flight log. Complete it before creating a new entry.');
      setError(error.message);
      if (allGood) throw error;
      return false;
    }
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/flightlogs/preflight-confirmations`, { method: 'POST', headers: { ...(await getAuthHeader()), 'Content-Type': 'application/json', 'x-action-confirmed': 'true' }, body: JSON.stringify({ rpc, allGood, remarks, signature, pin }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || 'Could not record the inspection.');
      setSigning(false); onConfirmed(result.data); return true;
    } catch (e) { setError(e.message); if (allGood) throw e; return false; }
    finally { setBusy(false); }
  };
  return <>
    <Modal open={open} title="Pre-Flight Inspection" onCancel={onCancel} footer={null} destroyOnHidden>
      {error && <Alert type="error" title={error} />}
      <p>Aircraft registration</p><AutoComplete value={rpc} onChange={value => setRpc(value.toUpperCase())} options={aircraftOptions} disabled={!!lockedRpc || busy} filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())} style={{ width: '100%' }} placeholder="RP-C…" />
      <p style={{ color: '#64766e' }}>Aircraft with ongoing flight logs are unavailable until those logs are completed.</p>
      {ongoingFlight && <Alert type="warning" showIcon title="Complete this aircraft's ongoing flight log before creating a new entry." />}
      <p><strong>Were all pre-flight inspection items satisfactory?</strong></p>
      <p>Yes checks every checklist item. Your signature will also populate fuel and oil servicing signatures.</p>
      <Space><Button type="primary" disabled={cannotContinue} onClick={() => !cannotContinue && setSigning(true)}>Yes, sign and continue</Button><Button disabled={cannotContinue} onClick={() => !cannotContinue && setRemarksOpen(true)}>No, record discrepancies</Button></Space>
    </Modal>
    <Modal open={open && remarksOpen} title="Pre-Flight Discrepancies / Remarks" onCancel={() => setRemarksOpen(false)} okText="Continue with inspection on hold" confirmLoading={busy} okButtonProps={{ disabled: !remarks.trim() || cannotContinue }} onOk={() => submit(false)}>
      {error && <Alert type="error" title={error} />}
      <p>The flight record stays on hold until these discrepancies are resolved and the mechanic confirms the inspection.</p><Input.TextArea value={remarks} onChange={e => setRemarks(e.target.value)} rows={4} placeholder="Describe what needs attention" />
    </Modal>
    <PinVerifiedSignatureModal open={open && signing} title="Confirm Pre-Flight Inspection" description="I confirm that every pre-flight inspection item is satisfactory. Apply my signature to this inspection and this flight's servicing entries." onCancel={() => setSigning(false)} onSave={(signature, { pin }) => submit(true, signature, pin)} />
  </>;
}
