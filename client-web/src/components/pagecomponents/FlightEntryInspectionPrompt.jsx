import React, { useContext, useEffect, useState } from 'react';
import { Alert, AutoComplete, Button, Modal, Space } from 'antd';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../utils/API_BASE';
import PinVerifiedSignatureModal from '../common/PinVerifiedSignatureModal';
import InspectionChecklistPanel from './InspectionChecklistPanel';
import { hasOngoingFlightLog } from '../../../../shared/flightWorkflow';
import AS from '../../../../shared/as350InspectionChecklist.json';
import BP from '../../../../shared/b412PreInspectionChecklist.json';

const checklistFor = aircraftType => /412/.test(aircraftType || '') ? BP.sections.flatMap(section => section.items) : /350/.test(aircraftType || '') ? AS.pre : [];

export default function FlightEntryInspectionPrompt({ open, lockedRpc, flightLogs = [], onCancel, onConfirmed }) {
  const { getAuthHeader } = useContext(AuthContext);
  const [rpc, setRpc] = useState(''), [options, setOptions] = useState([]), [aircraftType, setAircraftType] = useState('');
  const [checked, setChecked] = useState({}), [discrepancies, setDiscrepancies] = useState({});
  const [signing, setSigning] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const ongoingFlight = hasOngoingFlightLog(flightLogs, rpc);
  const items = checklistFor(aircraftType);
  const checkedKeys = items.filter(item => checked[item.key]).map(item => item.key);
  const flagged = Object.keys(discrepancies);
  const missingNote = flagged.some(key => !discrepancies[key].note.trim());
  const canContinue = !!rpc.trim() && !busy && !ongoingFlight && items.length > 0;
  const canSign = canContinue && checkedKeys.length === items.length && !flagged.length;
  const aircraftOptions = options.map(option => {
    const disabled = hasOngoingFlightLog(flightLogs, option.value);
    return { ...option, disabled, label: disabled ? `${option.value} (ongoing flight log)` : option.value };
  });
  useEffect(() => {
    if (!open) return;
    setRpc(lockedRpc || ''); setSigning(false); setError(''); setChecked({}); setDiscrepancies({});
    fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`).then(r => r.json()).then(r => setOptions((r.data || []).map(value => ({ value })))).catch(() => setOptions([]));
  }, [open, lockedRpc]);
  // The checklist depends on the aircraft type, so load it once a registration is chosen.
  useEffect(() => {
    setAircraftType(''); setChecked({}); setDiscrepancies({});
    const value = rpc.trim();
    if (!open || !value) return undefined;
    let cancelled = false;
    fetch(`${API_BASE}/api/parts-monitoring/${encodeURIComponent(value)}`).then(r => r.ok ? r.json() : null)
      .then(r => { if (!cancelled) setAircraftType(r?.data?.aircraftType || ''); }).catch(() => {});
    return () => { cancelled = true; };
  }, [open, rpc]);
  const submit = async (allGood, signature, pin) => {
    if (ongoingFlight) {
      const error = new Error('This aircraft has an ongoing flight log. Complete it before creating a new entry.');
      setError(error.message);
      if (allGood) throw error;
      return false;
    }
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/flightlogs/preflight-confirmations`, { method: 'POST', headers: { ...(await getAuthHeader()), 'Content-Type': 'application/json', 'x-action-confirmed': 'true' }, body: JSON.stringify({ rpc, allGood, checked: checkedKeys, discrepancies, signature, pin }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || 'Could not record the inspection.');
      setSigning(false); onConfirmed(result.data); return true;
    } catch (e) { setError(e.message); if (allGood) throw e; return false; }
    finally { setBusy(false); }
  };
  return <>
    <Modal open={open} width={720} title="Pre-Flight Inspection" onCancel={onCancel} footer={null} destroyOnHidden>
      {error && <Alert type="error" title={error} />}
      <p>Aircraft registration</p><AutoComplete value={rpc} onChange={value => setRpc(value.toUpperCase())} options={aircraftOptions} disabled={!!lockedRpc || busy} filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())} style={{ width: '100%' }} placeholder="RP-C…" />
      <p style={{ color: '#64766e' }}>Aircraft with ongoing flight logs are unavailable until those logs are completed.</p>
      {ongoingFlight && <Alert type="warning" showIcon title="Complete this aircraft's ongoing flight log before creating a new entry." />}
      {canContinue && <>
        <p><strong>Review every pre-flight item in person.</strong> Check each one, or flag it as a discrepancy. Signing populates fuel and oil servicing signatures. You can save a draft and finish the checklist later; the flight log cannot be released until it is complete and any discrepancy is resolved.</p>
        <InspectionChecklistPanel items={items} checked={checked} discrepancies={discrepancies} disabled={busy}
          onChange={next => { setChecked(next.checked); setDiscrepancies(next.discrepancies); }} />
      </>}
      {!!rpc.trim() && !ongoingFlight && !items.length && <Alert type="info" title="Loading the checklist for this aircraft…" />}
      <Space style={{ marginTop: 12 }}>
        <Button type="primary" disabled={!canSign} onClick={() => setSigning(true)}>Sign and continue</Button>
        <Button disabled={!canContinue || missingNote} onClick={() => submit(false)}>{flagged.length ? 'Save draft with discrepancies' : 'Save draft and continue'}</Button>
      </Space>
    </Modal>
    <PinVerifiedSignatureModal open={open && signing} title="Confirm Pre-Flight Inspection" description="I confirm that every pre-flight inspection item is satisfactory. Apply my signature to this inspection and this flight's servicing entries." onCancel={() => setSigning(false)} onSave={(signature, { pin }) => submit(true, signature, pin)} />
  </>;
}
