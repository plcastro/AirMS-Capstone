import FlightEntryInspectionPrompt from '../../../components/pagecomponents/FlightEntryInspectionPrompt';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Input, Select, Space, Tag, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { API_BASE } from '../../../utils/API_BASE';
import AircraftLogGroups from '../../../components/common/AircraftLogGroups';
import FLogTable from '../../../components/tables/FLogTable';
import FlightLogEntry from '../../../components/pagecomponents/FlightLogEntry';
import FlightWorkspace from '../../../components/pagecomponents/FlightWorkspace';
import { exportFlightLogToPDF } from '../../../components/common/ExportFile';
import ResultPopup from '../../../components/common/ResultPopup';
import { matchesSearch } from '../../../utils/search';
import { getLogAircraftRegistration, sortLogsByLatestActivity } from '../../../../../shared/aircraftLogGroups';
import { FLIGHT_STAGES, flightStage, nextFlightStep, needsMyFlightAction } from '../../../../../shared/flightWorkflow';
import { canExportModule } from '../../../../../shared/exportAccess';
import './flightlog.css';
export default function FlightLog() {
  const {
      user,
      getAuthHeader
    } = useContext(AuthContext),
    location = useLocation(),
    navigate = useNavigate();
  const [logs, setLogs] = useState([]),
    [aircraft, setAircraft] = useState(''),
    [aircraftQuery, setAircraftQuery] = useState(''),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('all'),
    [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [createOpen, setCreateOpen] = useState(false),
    [selected, setSelected] = useState(null),
    [popup, setPopup] = useState({
      open: false
    });
  const [entryPrompt, setEntryPrompt] = useState(false), [entryConfirmation, setEntryConfirmation] = useState(null);
  const role = String(user?.jobTitle || '').toLowerCase();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const fetchPage = async page => {
        const response = await fetch(API_BASE + '/api/flightlogs?limit=500&page=' + page, {
          headers
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.message);
        return data;
      };
      const first = await fetchPage(1),
        rest = await Promise.all(Array.from({
          length: Math.max(0, (first.pagination?.pages || 1) - 1)
        }, (_, i) => fetchPage(i + 2)));
      setLogs(sortLogsByLatestActivity([first, ...rest].flatMap(page => page.data || [])));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) load();
    };
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('focus', refresh);
      clearInterval(timer);
    };
  }, [load]);
  useEffect(() => {
    const target = new URLSearchParams(location.search).get('targetFlightLogId');
    if (target) setSelected(target);
  }, [location.search]);
  const openRecord = record => {
    setAircraft(getLogAircraftRegistration(record));
    setSelected(record._id);
  };
  const close = () => {
    setSelected(null);
    if (location.search.includes('targetFlightLogId')) navigate(location.pathname, {
      replace: true
    });
  };
  const filtered = sortLogsByLatestActivity(logs.filter(log => getLogAircraftRegistration(log) === aircraft && matchesSearch(query, log) && (status === 'all' || flightStage(log) === status) && (!mine || needsMyFlightAction(user, log))));
  const saveNew = async payload => {
    try {
      const response = await fetch(API_BASE + '/api/flightlogs', {
        method: 'POST',
        headers: {
          ...(await getAuthHeader()),
          'Content-Type': 'application/json',
          'x-action-confirmed': 'true'
        },
        body: JSON.stringify({ ...payload, confirmationId: entryConfirmation?.confirmationId })
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.message);
      await load();
      setCreateOpen(false);
      openRecord(result.data);
      return true;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };
  const actions = record => <Space><Button type="primary" onClick={() => openRecord(record)}>{needsMyFlightAction(user, record) ? 'Continue' : 'Open Workspace'}</Button>{canExportModule(role, 'flightLogs') && <Button onClick={() => exportFlightLogToPDF(record, {
      setPopup
    })}>Export</Button>}</Space>;
  const columns = [{
    title: 'Control',
    dataIndex: 'controlNo',
    key: 'controlNo'
  }, {
    title: 'Flight Date',
    dataIndex: 'date',
    key: 'date',
    sorter: (a, b) => new Date(a.date) - new Date(b.date)
  }, {
    title: 'Last Updated',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    render: value => value ? new Date(value).toLocaleString() : '?'
  }, {
    title: 'Stage',
    key: 'stage',
    render: (_, record) => <Tag>{nextFlightStep(record).label}</Tag>
  }, {
    title: 'Next Person',
    key: 'next',
    render: (_, record) => record[nextFlightStep(record).crew]?.name || '?'
  }, {
    title: 'Action',
    key: 'action',
    render: (_, record) => actions(record)
  }];
  return <div className="fl-page">
    <Space wrap style={{
      marginBottom: 16,
      width: '100%',
      justifyContent: 'space-between'
    }}><Typography.Title level={4} style={{
        margin: 0
      }}>{aircraft ? aircraft + ' - Flight Logs' : 'Flight Logs'}</Typography.Title><Space>{role === 'mechanic' && <Button type="primary" onClick={() => setEntryPrompt(true)}>New Entry</Button>}</Space></Space>
    {error && <Alert type="error" title={error} closable onClose={() => setError('')} style={{
      marginBottom: 12
    }} />}
    {!aircraft ? <AircraftLogGroups records={logs} loading={loading} query={aircraftQuery} onQueryChange={setAircraftQuery} onSelect={rpc => {
      setAircraft(rpc);
      setQuery('');
      setStatus('all');
    }} sortBy="latestActivity" /> : <>
      <Button onClick={() => setAircraft('')} style={{
        marginBottom: 12
      }}>Back to Aircraft</Button>
      <Card size="small" style={{
        marginBottom: 12
      }}><Space wrap><Input placeholder="Search this aircraft?s logs" value={query} onChange={e => setQuery(e.target.value)} allowClear /><Select style={{
            minWidth: 210
          }} value={status} onChange={setStatus} options={[{
            value: 'all',
            label: 'All stages'
          }, ...Object.entries(FLIGHT_STAGES).map(([value, step]) => ({
            value,
            label: step.label
          }))]} /><Checkbox checked={mine} onChange={e => setMine(e.target.checked)}>Needs My Action</Checkbox></Space></Card>
      <FLogTable key={aircraft} columns={columns} dataSource={filtered} loading={loading} rowKey="_id" renderCard={record => <Card key={record._id} title={record.controlNo} style={{
        marginBottom: 12
      }}><p>{nextFlightStep(record).label} - {record[nextFlightStep(record).crew]?.name || 'Closed'}</p><p>Updated: {new Date(record.updatedAt || record.createdAt).toLocaleString()}</p>{actions(record)}</Card>} />
    </>}
    <FlightEntryInspectionPrompt open={entryPrompt} lockedRpc={aircraft === 'Unassigned aircraft' ? '' : aircraft} onCancel={() => setEntryPrompt(false)} onConfirmed={data => { setEntryConfirmation(data); setEntryPrompt(false); setCreateOpen(true); }} />
    <FlightLogEntry key={entryConfirmation?.confirmationId || 'new'} entryConfirmation={entryConfirmation} visible={createOpen} onClose={() => setCreateOpen(false)} onSave={saveNew} userRole={role} lockedRpc={entryConfirmation?.rpc || ''} />
    <FlightWorkspace id={selected} initialSection={new URLSearchParams(location.search).get("targetSection") || "flight"} open={!!selected} onClose={close} onChanged={load} />
    <ResultPopup {...popup} onClose={() => setPopup({
      open: false
    })} />
  </div>;
}
