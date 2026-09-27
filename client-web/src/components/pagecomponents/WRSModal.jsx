import React from 'react';
import { Alert, Button, Descriptions, Modal, Radio, Space, Table, Timeline, Typography } from 'antd';
import { buildTimeline, readyToDeliver, canAct, displayStatus, followUpTarget, isOpen, normalizeItemStatus } from '../../../../shared/partsRequisitionWorkflow';
import { RequisitionStatus } from '../tables/PRMTable';
export default function WRSModal({
  record,
  user,
  open,
  onClose,
  onAction,
  busy
}) {
  if (!record) return null;
  const status = displayStatus(record);
  const stock = canAct(user, record, 'stock') && isOpen(record);
  return <Modal title={`Requisition ${record.wrsNo}`} open={open} onCancel={onClose} footer={null} width={950}>
    <Space direction="vertical" size="large" style={{
      width: '100%'
    }}>
      <Descriptions column={2} items={[{
        key: 'aircraft',
        label: 'Aircraft',
        children: record.aircraft
      }, {
        key: 'requester',
        label: 'Requester',
        children: record.staff?.requisitioner
      }, {
        key: 'status',
        label: 'Status',
        children: <RequisitionStatus status={status} />
      }]} />
      {status === 'Delivered' && <Alert type="warning" showIcon message="Awaiting requester confirmation of receipt" />}
      <Table pagination={false} rowKey={item => item._id || item.itemNo} dataSource={record.items || []} scroll={{
        x: 650
      }} columns={[{
        title: 'Part',
        render: (_, item) => item.particular || item.codeParticular?.[0]?.particular || '—'
      }, {
        title: 'Quantity',
        render: (_, item) => `${item.quantity} ${item.unitOfMeasure}`
      }, {
        title: 'Purpose',
        dataIndex: 'purpose'
      }, {
        title: 'Stock status',
        render: (_, item) => <Space direction="vertical"><RequisitionStatus status={normalizeItemStatus(item.stockStatus)} />{stock && <Radio.Group size="small" value={normalizeItemStatus(item.stockStatus)} disabled={busy} onChange={event => onAction(record, 'stock', {
            itemId: item._id,
            stockStatus: event.target.value
          })} options={['In Stock', 'Out of Stock']} optionType="button" />}</Space>
      }]} />
      <Space wrap>
        {canAct(user, record, 'deliver') && isOpen(record) && <Button type="primary" disabled={busy || !readyToDeliver(record)} onClick={() => onAction(record, 'deliver')}>Deliver</Button>}
        {canAct(user, record, 'confirm') && status === 'Delivered' && <Button type="primary" disabled={busy} onClick={() => onAction(record, 'confirm')}>Confirm receipt</Button>}
        {canAct(user, record, 'cancel') && isOpen(record) && <Button danger disabled={busy} onClick={() => onAction(record, 'cancel')}>Cancel requisition</Button>}
        {canAct(user, record, 'follow-up') && followUpTarget(record) && <Button disabled={busy} onClick={() => onAction(record, 'follow-up')}>Follow Up</Button>}
      </Space>
      <Typography.Title level={5}>History</Typography.Title>
      <Timeline items={buildTimeline(record).map((entry, index) => ({
        key: index,
        content: <><strong>{entry.label}</strong> — {new Date(entry.at).toLocaleString()}<div>{entry.actorName}{entry.details ? ` · ${entry.details}` : ''}</div></>
      }))} />
    </Space>
  </Modal>;
}
