import React from 'react';
import { Badge, Button, Space, Table, Tag, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { displayStatus, statusColors, statusLabel, timeSinceUpdate, updatedFirst } from '../../../../shared/partsRequisitionWorkflow';
export function RequisitionStatus({ status }) {
  return <Badge color={statusColors[status] || '#8c8c8c'} text={statusLabel(status)} />;
}
const requestedAt = record => new Date(record.dateRequested || record.createdAt || 0).getTime() || 0;
const totalQuantity = record => (record.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
export default function PRMTable({ records = [], loading, onOpen, oversight, onFollowUp, canFollowUp, busy, dateSort = 'updated' }) {
  const sorted = [...records].sort(dateSort === 'updated' ? updatedFirst : (a, b) => (dateSort === 'oldest' ? 1 : -1) * (requestedAt(a) - requestedAt(b)));
  return <Table size="small" rowKey="_id" loading={loading} dataSource={sorted} scroll={{ x: 1200 }} pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }} columns={[
    { title: 'WRS No.', dataIndex: 'wrsNo', width: 140, sorter: (a, b) => String(a.wrsNo).localeCompare(String(b.wrsNo)), render: (value, record) => <Button type="text" size="small" style={{ fontWeight: 600, paddingInline: 0 }} onClick={() => onOpen(record)}>{value}</Button> },
    { title: 'Aircraft', dataIndex: 'aircraft', width: 120, sorter: (a, b) => String(a.aircraft).localeCompare(String(b.aircraft)) },
    { title: 'Requester', width: 180, render: (_, record) => record.staff?.requisitioner, sorter: (a, b) => String(a.staff?.requisitioner || '').localeCompare(String(b.staff?.requisitioner || '')) },
    { title: 'Date Requested', width: 135, sorter: (a, b) => requestedAt(a) - requestedAt(b), render: (_, record) => requestedAt(record) ? new Date(requestedAt(record)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
    { title: 'Items', width: 70, align: 'right', render: (_, record) => record.items?.length || 0, sorter: (a, b) => (a.items?.length || 0) - (b.items?.length || 0) },
    { title: 'Total Qty', width: 85, align: 'right', render: (_, record) => totalQuantity(record), sorter: (a, b) => totalQuantity(a) - totalQuantity(b) },
    { title: 'Requested Parts', width: 260, render: (_, record) => { const names = (record.items || []).map(item => item.particular || item.codeParticular?.[0]?.particular || '—'); return <Space size={4}><span>{names[0] || '—'}</span>{names.length > 1 && <Tooltip title={names.slice(1).join(', ')}><Tag>+{names.length - 1} more</Tag></Tooltip>}</Space>; } },
    { title: 'Status', width: 145, render: (_, record) => <RequisitionStatus status={displayStatus(record)} /> },
    { title: 'Last updated', width: 110, render: (_, record) => <span title={record.updatedAt ? new Date(record.updatedAt).toLocaleString() : ''}>{timeSinceUpdate(record)}</span> },
    { title: 'Action', width: oversight ? 150 : 65, render: (_, record) => <Space><Tooltip title="View requisition"><Button size="small" icon={<EyeOutlined />} aria-label={`View ${record.wrsNo}`} onClick={() => onOpen(record)} /></Tooltip>{oversight && canFollowUp(record) && <Button size="small" disabled={busy} onClick={() => onFollowUp(record)}>Follow Up</Button>}</Space> }
  ]} />;
}
