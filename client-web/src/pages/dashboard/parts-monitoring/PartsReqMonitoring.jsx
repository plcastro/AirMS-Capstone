import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Grid, Input, InputNumber, Modal, Select, Space, Tabs, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { API_BASE } from '../../../utils/API_BASE';
import { confirmAction } from '../../../utils/confirmAction';
import PRMTable from '../../../components/tables/PRMTable';
import PRMCardView from '../../../components/tables/PRMCardView';
import WRSModal from '../../../components/pagecomponents/WRSModal';
import PartNameInput from '../../../components/pagecomponents/PartNameInput';
import { canCreate, displayStatus, followUpTarget, isOversight, isRequisitionOwner, roleOf } from '../../../../../shared/partsRequisitionWorkflow';
const emptyItem = () => ({
  particular: '',
  quantity: 1,
  unitOfMeasure: 'PC',
  purpose: ''
});
export default function PartsReqMonitoring() {
  const {
    user,
    getAuthHeader
  } = useContext(AuthContext);
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const RequisitionList = screens.md ? PRMTable : PRMCardView;
  const oversight = isOversight(user);
  const [records, setRecords] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null),
    [tab, setTab] = useState('active'),
    [search, setSearch] = useState('');
  const [entry, setEntry] = useState(false),
    [busy, setBusy] = useState(false),
    [items, setItems] = useState([emptyItem()]),
    [aircraft, setAircraft] = useState([]);
  const [form] = Form.useForm();
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/parts-requisition/get-all-requisition`, {
        headers: await getAuthHeader()
      });
      if (!response.ok) throw new Error('Could not load requisitions');
      setRecords(await response.json());
      setError('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);
  useEffect(() => {
    // Fetching on mount and polling synchronize the page with server changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    getAuthHeader().then(headers => fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`, {
      headers
    })).then(response => response.json()).then(data => setAircraft((data.data || []).map(value => ({
      value,
      label: value
    })))).catch(() => {});
  }, [getAuthHeader]);
  useEffect(() => {
    const id = location.state?.requisitionId || location.state?.targetRequestId || new URLSearchParams(location.search).get('targetRequestId') || new URLSearchParams(location.search).get('requisitionId');
    // A notification can navigate to a different record while this page stays mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) setSelectedId(id);
  }, [location]);
  const action = async (record, action, extra = {}) => {
    if (action !== 'stock' && !(await confirmAction({
      title: {
        deliver: 'Confirm delivery',
        confirm: 'Confirm receipt',
        cancel: 'Cancel requisition',
        'follow-up': 'Send follow-up reminder'
      }[action],
      content: action === 'deliver' ? 'Confirm that all requested parts have been delivered.' : action === 'confirm' ? 'Confirm that you received all requested parts. This closes the requisition.' : `Continue for ${record.wrsNo}?`
    }))) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/parts-requisition/update-requisition/${record._id}`, {
        method: 'POST',
        headers: {
          ...(await getAuthHeader()),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          ...extra,
          confirmAction: true
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Update failed');
      setRecords(records => records.map(record => record._id === data._id ? data : record));
      message.success(action === 'follow-up' ? 'Follow-up sent' : 'Requisition updated');
    } catch (error) {
      message.error(error.message);
      await load();
    } finally {
      setBusy(false);
    }
  };
  const create = async values => {
    if (!items.length || items.some(item => !item.particular.trim() || !item.quantity || item.quantity <= 0)) return message.error('Enter a part name and positive quantity for every item.');
    if (!(await confirmAction({
      title: 'Submit requisition',
      content: 'Send these parts to warehouse for a stock check?'
    }))) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/parts-requisition/create-requisition`, {
        method: 'POST',
        headers: {
          ...(await getAuthHeader()),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aircraft: values.aircraft,
          items,
          confirmAction: true
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Create failed');
      setRecords(records => [data, ...records]);
      setEntry(false);
      form.resetFields();
      setItems([emptyItem()]);
      message.success('Requisition submitted');
    } catch (error) {
      message.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const filtered = useMemo(() => records.filter(record => {
    const closed = ['Closed', 'Cancelled'].includes(displayStatus(record));
    const own = isRequisitionOwner(user, record);
    return (tab === 'history' ? closed : !closed) && (oversight || roleOf(user) === 'warehouse personnel' || own) && `${record.wrsNo} ${record.aircraft} ${record.staff?.requisitioner} ${displayStatus(record)} ${(record.items || []).map(item => item.particular).join(' ')}`.toLowerCase().includes(search.toLowerCase());
  }), [records, tab, user, oversight, search]);
  if (!['superadmin', 'officer-in-charge', 'warehouse personnel', 'maintenance manager', 'mechanic'].includes(roleOf(user))) return <Alert type="error" message="Parts requisition access denied" />;
  return <div style={{
    padding: 24
  }}>
    <Space style={{
      width: '100%',
      justifyContent: 'space-between'
    }} wrap><Typography.Title level={3}>Parts Requisition</Typography.Title>{canCreate(user) && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEntry(true)}>New requisition</Button>}</Space>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={load}>Retry</Button>} />}
    <Input.Search placeholder="Search requisitions" value={search} onChange={event => setSearch(event.target.value)} style={{
      maxWidth: 420,
      marginBottom: 16
    }} />
    <Tabs activeKey={tab} onChange={setTab} items={[{
      key: 'active',
      label: oversight ? 'Oversight · Active requisitions' : 'Active requisitions'
    }, {
      key: 'history',
      label: 'History · Closed / Cancelled'
    }]} />
    <RequisitionList records={filtered} loading={loading} onOpen={record => setSelectedId(record._id)} oversight={oversight} canFollowUp={followUpTarget} onFollowUp={record => action(record, 'follow-up')} busy={busy} />
    <WRSModal record={records.find(record => record._id === selectedId)} user={user} open={!!selectedId} onClose={() => setSelectedId(null)} onAction={action} busy={busy} />
    <Modal title="New parts requisition" open={entry} onCancel={() => !busy && setEntry(false)} footer={null} width={850}>
      <Form form={form} layout="vertical" onFinish={create}>
        <Form.Item label="Aircraft" name="aircraft" rules={[{
          required: true
        }]}><Select showSearch options={aircraft} placeholder="Select aircraft" /></Form.Item>
        {items.map((item, index) => <div key={index} style={{
          border: '1px solid #f0f0f0',
          padding: 16,
          marginBottom: 12,
          borderRadius: 8
        }}>
          <Space style={{
            width: '100%',
            justifyContent: 'space-between'
          }}><Typography.Text strong>Item {index + 1}</Typography.Text><Button aria-label={`Remove item ${index + 1}`} icon={<DeleteOutlined />} disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== index))} /></Space>
          <Form.Item label="Part name" required><PartNameInput value={item.particular} onChange={value => setItems(items.map((item, i) => i === index ? {
              ...item,
              particular: value
            } : item))} /></Form.Item>
          <Space wrap><InputNumber aria-label="Quantity" min={1} value={item.quantity} onChange={value => setItems(items.map((item, i) => i === index ? {
              ...item,
              quantity: value
            } : item))} /><Select aria-label="Unit" value={item.unitOfMeasure} options={['PC', 'SET', 'ST', 'UNT'].map(value => ({
              value
            }))} onChange={value => setItems(items.map((item, i) => i === index ? {
              ...item,
              unitOfMeasure: value
            } : item))} /><Input placeholder="Purpose" value={item.purpose} onChange={event => setItems(items.map((item, i) => i === index ? {
              ...item,
              purpose: event.target.value
            } : item))} /></Space>
        </div>)}
        <Space><Button onClick={() => setItems([...items, emptyItem()])}>Add item</Button><Button type="primary" htmlType="submit" loading={busy}>Submit requisition</Button></Space>
      </Form>
    </Modal>
  </div>;
}
