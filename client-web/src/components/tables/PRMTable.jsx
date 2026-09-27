import React from 'react';
import { Badge, Button, Space, Table } from 'antd';
import { displayStatus, statusColors, statusLabel, timeSinceUpdate, updatedFirst } from '../../../../shared/partsRequisitionWorkflow';
export function RequisitionStatus({
  status
}) {
  return <Badge color={statusColors[status] || '#8c8c8c'} text={statusLabel(status)} />;
}
export default function PRMTable({
  records = [],
  loading,
  onOpen,
  oversight,
  onFollowUp,
  canFollowUp,
  busy
}) {
  return <Table rowKey="_id" loading={loading} dataSource={[...records].sort(updatedFirst)} scroll={{
    x: 850
  }} columns={[{
    title: 'WRS No.',
    dataIndex: 'wrsNo',
    render: (value, record) => <Button type="link" onClick={() => onOpen(record)}>{value}</Button>
  }, {
    title: 'Aircraft',
    dataIndex: 'aircraft'
  }, {
    title: 'Requester',
    render: (_, record) => record.staff?.requisitioner
  }, {
    title: 'Items',
    render: (_, record) => record.items?.length || 0
  }, {
    title: 'Status',
    render: (_, record) => <RequisitionStatus status={displayStatus(record)} />
  }, {
    title: 'Last updated',
    render: (_, record) => <span title={record.updatedAt ? new Date(record.updatedAt).toLocaleString() : ''}>{timeSinceUpdate(record)}</span>
  }, {
    title: 'Actions',
    render: (_, record) => <Space><Button onClick={() => onOpen(record)}>Details</Button>{oversight && canFollowUp(record) && <Button disabled={busy} onClick={() => onFollowUp(record)}>Follow Up</Button>}</Space>
  }]} />;
}
