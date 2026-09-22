import React, { useContext, useEffect, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../utils/API_BASE';

export default function FlightAssignedPilotSelect({ value, onChange, disabled, isActive = true }) {
  const { getAuthHeader } = useContext(AuthContext);
  const [pilots, setPilots] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isActive || disabled) return;
    let active = true;
    setLoading(true); setError('');
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/flightlogs/pilot-options`, { headers: await getAuthHeader() });
        const result = await response.json();
        if (!response.ok) throw Error(result.message || 'Unable to load pilots.');
        if (active) setPilots(result.data || []);
      } catch (e) { if (active) setError(e.message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [isActive, disabled, getAuthHeader, retry]);
  const options = pilots.map(pilot => ({ label: pilot.name, value: pilot.userId }));
  if (value?.userId && !options.some(option => option.value === value.userId)) options.push({ value: value.userId, label: value.name, disabled: true });
  if (disabled) return <Input aria-label="Assigned Pilot" value={value?.name || ''} placeholder="Not assigned" disabled />;
  return <div style={{ flex: 1 }}>
    <Select aria-label="Assigned Pilot" style={{ width: '100%' }} showSearch optionFilterProp="label" allowClear
      placeholder="Select assigned pilot" value={value?.userId || undefined} options={options} loading={loading}
      notFoundContent={loading ? 'Loading pilots…' : error ? 'Unable to load pilots' : 'No active pilots available'}
      onChange={id => onChange(pilots.find(pilot => pilot.userId === id) || null)} />
    {error && <div role="alert" style={{ color: '#b42318' }}>{error} <Button type="link" onClick={() => setRetry(previous => previous + 1)}>Retry</Button></div>}
  </div>;
}
