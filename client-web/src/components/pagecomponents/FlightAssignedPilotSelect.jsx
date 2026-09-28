import React, { useContext, useEffect, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../utils/API_BASE';

export default function FlightAssignedPilotSelect({ value, onChange, disabled, isActive = true, crewRole = "Pilot" }) {
  const { getAuthHeader } = useContext(AuthContext);
  const isMechanic = crewRole === "Mechanic";
  const label = isMechanic ? "Assigned Mechanic" : "Assigned Pilot";
  const plural = isMechanic ? "mechanics" : "pilots";
  const endpoint = isMechanic ? "crew-options" : "pilot-options";
  const [pilots, setPilots] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isActive || disabled) return;
    let active = true;
    setLoading(true); setError('');
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/flightlogs/${endpoint}`, { headers: await getAuthHeader() });
        const result = await response.json();
        if (!response.ok) throw Error(result.message || `Unable to load ${plural}.`);
        if (active) setPilots((result.data || []).filter(person => !isMechanic || person.role === "Mechanic"));
      } catch (e) { if (active) setError(e.message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [isActive, disabled, getAuthHeader, retry, endpoint, isMechanic, plural]);
  const options = pilots.map(pilot => ({ label: pilot.name, value: pilot.userId }));
  if (value?.userId && !options.some(option => option.value === value.userId)) options.push({ value: value.userId, label: value.name, disabled: true });
  if (disabled) return <Input size="large" aria-label={label} value={value?.name || ''} placeholder="Not assigned" disabled />;
  return <div style={{ flex: 1 }}>
    <Select size="large" aria-label={label} className="fl-rpc-select" style={{ width: '100%' }} showSearch optionFilterProp="label" allowClear
      placeholder={`Select assigned ${crewRole.toLowerCase()}`} value={value?.userId || undefined} options={options} loading={loading}
      notFoundContent={loading ? `Loading ${plural}...` : error ? `Unable to load ${plural}` : `No active ${plural} available`}
      onChange={id => onChange(pilots.find(pilot => pilot.userId === id) || null)} />
    {error && <div role="alert" style={{ color: '#b42318' }}>{error} <Button type="link" onClick={() => setRetry(previous => previous + 1)}>Retry</Button></div>}
  </div>;
}
