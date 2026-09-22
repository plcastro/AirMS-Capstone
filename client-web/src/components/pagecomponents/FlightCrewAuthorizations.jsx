import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Input, Modal, Select, Space } from 'antd';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../utils/API_BASE';
export default function FlightCrewAuthorizations({
  open,
  onClose
}) {
  const {
    getAuthHeader
  } = useContext(AuthContext);
  const [data, setData] = useState({
      records: [],
      crew: []
    }),
    [form, setForm] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/flightlogs/crew-authorizations`, {
      headers: await getAuthHeader()
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.message);
    setData(result.data);
  }, [getAuthHeader]);
  useEffect(() => {
    if (open) load().catch(e => setError(e.message));
  }, [open, load]);
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/flightlogs/crew-authorizations`, {
        method: 'PUT',
        headers: {
          ...(await getAuthHeader()),
          'Content-Type': 'application/json',
          'x-action-confirmed': 'true'
        },
        body: JSON.stringify({
          ...form,
          aircraft: form.aircraftText.split(',').map(s => s.trim()),
          expectedVersion: form.__v || 0
        })
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.message);
      await load();
      setForm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return <Modal open={open} onCancel={onClose} title="Crew Signing Authorizations" footer={null} width={760}>
    <p>Record verified license and aircraft authorization details from the operator’s approved records. Account assignment alone does not grant signing authority.</p>
    {error && <Alert type="error" title={error} />}
    <Select style={{
      width: '100%'
    }} placeholder="Choose pilot or mechanic" value={form?.userId} options={data.crew.map(u => ({
      value: u._id,
      label: `${u.firstName} ${u.lastName} — ${u.jobTitle} — ${u.licenseNo || 'Account license missing'}`
    }))} onChange={userId => {
      const existing = data.records.find(r => r.userId === userId);
      setForm({
        ...existing,
        userId,
        aircraftText: existing?.aircraft.join(', ') || '',
        active: existing?.active !== false
      });
    }} />
    {form && <Card style={{
      marginTop: 12
    }}><Space orientation="vertical" style={{
        width: '100%'
      }}>
      <Input aria-label="License type" placeholder="License type / rating" value={form.licenseType || ''} onChange={e => setForm({
          ...form,
          licenseType: e.target.value
        })} />
      <Input aria-label="Authorized aircraft" placeholder="Authorized aircraft: RP-C1234, RP-C5678" value={form.aircraftText} onChange={e => setForm({
          ...form,
          aircraftText: e.target.value
        })} />
      <label>Authorization / license expiry<Input type="date" value={form.validUntil?.slice(0, 10) || ''} onChange={e => setForm({
            ...form,
            validUntil: `${e.target.value}T23:59:59+08:00`
          })} /></label>
      <Input.TextArea aria-label="Authorization reference" placeholder="Verified license, rating and company authorization reference" value={form.reference || ''} onChange={e => setForm({
          ...form,
          reference: e.target.value
        })} />
      <Checkbox checked={form.active} onChange={e => setForm({
          ...form,
          active: e.target.checked
        })}>Active authorization</Checkbox>
      <Button type="primary" loading={busy} onClick={save}>Save Authorization</Button>
    </Space></Card>}
    {data.records.map(r => <p key={r._id}>{data.crew.find(u => u._id === r.userId)?.firstName || r.userId}: {r.aircraft.join(', ')} · {r.validUntil?.slice(0, 10)} · {r.active ? 'Active' : 'Revoked'}</p>)}
  </Modal>;
}
