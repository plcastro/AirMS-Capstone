import React, { useContext, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Collapse, Empty, Input, Modal, Pagination, Row, Select, Space, Tag, Typography } from 'antd';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../utils/API_BASE';
import { certificateSummaryFields, aircraftLabel, certificateLabel, certificateStatusLabel, certificateReviewReasons, certificateUploadLabel, createCertificateApi, createUseCertificates } from '../../../../shared/certificateClient';

const useCertificates = createUseCertificates(React);
const { Title, Text } = Typography;
const date = value => value ? new Date(value).toLocaleString() : '';
function Decisions({ results = [], onOpen, busy }) {
  return <Row gutter={[12, 12]}>{results.map(result => <Col xs={24} md={12} key={result.aircraft}><Card size="small">
    <Space wrap><Text strong>{aircraftLabel(result.aircraft)}</Text><Tag color={result.qualified ? 'green' : 'default'}>{result.qualified ? 'Approved for all tasks' : 'Not approved'}</Tag></Space>
    <p>{result.qualified ? 'A certificate linked to this mechanic matches this aircraft.' : 'No accepted certificate currently qualifies this mechanic for this aircraft.'}</p>
    {(result.approvalEvidence || []).map(source => <div key={source.certificateId}>
      <Text strong>{source.certificateType || 'Certificate'}</Text>
      {source.evidence.slice(0, 1).map((item, index) => <p key={index}>Matched “{item.detectedText}” in “{item.qualification}”.</p>)}
      <Button type="link" style={{ padding: 0 }} disabled={busy} onClick={() => onOpen({ id: source.certificateId })}>Why this mechanic was approved</Button>
    </div>)}
    {result.validThrough && <Text type="secondary">Valid through {result.validThrough}</Text>}
  </Card></Col>)}</Row>;
}
function AircraftMatch({ record, results = [] }) {
  const data = record.normalizedData || {}, detected = data.detectedAircraft || [];
  const models = [...new Set(detected.map(item => item.aircraftType).concat(data.aircraftRatings || []))];
  const approved = results.filter(result => result.qualified && result.sourceCertificates.includes(record.id));
  return <Card size="small" title="Detected aircraft">
    <Space wrap>{models.length ? models.map(model => <Tag key={model} color={approved.some(result => result.aircraft === model) ? 'green' : 'blue'}>{aircraftLabel(model)}</Tag>) : <Text type="secondary">No supported aircraft matched the qualification.</Text>}</Space>
    {record.status === 'VERIFIED' && <p><Text strong>{approved.length ? `Approved for all ${approved.map(item => aircraftLabel(item.aircraft)).join(', ')} tasks.` : results.length ? 'Certificate accepted. It does not currently grant task access.' : 'Checking task approval?'}</Text></p>}
    {record.status === 'VERIFIED' && record.verificationDecision?.explanation && <p>{record.verificationDecision.explanation}</p>}
    {detected.filter((item, index) => detected.findIndex(other => other.aircraftType === item.aircraftType) === index).map((item, index) => <p key={index}>Found “{item.detectedText}” in “{item.qualification}”{item.page ? ` on page ${item.page}` : ''}. Matches {aircraftLabel(item.aircraftType)}.</p>)}
    {record.verifiedAt && <Text type="secondary">{record.verificationMethod === 'AUTOMATIC' ? 'Accepted automatically' : 'Confirmed by a reviewer'} · {date(record.verifiedAt)}</Text>}
  </Card>;
}
export default function MechanicCertificates({ personnelId }) {
  const { user, getAuthHeader } = useContext(AuthContext);
  const api = useMemo(() => createCertificateApi(API_BASE, getAuthHeader), [getAuthHeader]);
  const state = useCertificates(user, api, personnelId);
  const [disposition, setDisposition] = useState('');
  const record = state.selected, editable = record?.status === 'PENDING_REVIEW' && record?.processingStatus === 'ANALYZED';
  const upload = async event => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (files.length) await state.upload(files, file => { const form = new FormData(); form.append('file', file); return form; });
  };
  const download = () => state.run('Downloading original', async () => {
    const response = await api(`/${record.id}/file`, { file: true });
    const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
    link.href = url; link.download = record.file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
  const feedback = <>{state.error && <Alert type="error" showIcon title={state.error} />}{state.notice && <Alert type="success" showIcon title={state.notice} />}{state.busy && <Alert type="info" showIcon title={state.busy} />}</>;
  return <div style={{ paddingTop: 12 }}>
    <Title level={3}>Certificates & aircraft approval</Title>
    <Text type="secondary">Upload a certificate. We read the holder, type and qualifications, then approve tasks for a matching aircraft. We ask for help if the reading is unclear.</Text>
    <Card style={{ marginTop: 16 }}><Space wrap>
      <Select aria-label="Certificate status" value={state.status} onChange={state.setStatus} disabled={!!state.busy} style={{ minWidth: 170 }} options={['all', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REVOKED'].map(value => ({ value, label: value === 'all' ? 'All certificates' : certificateStatusLabel({ status: value }) }))} />
      <Button disabled={!!state.busy} onClick={state.refresh}>Refresh</Button>
      <label style={{ fontWeight: 600 }}>Upload certificates<input aria-label="Upload certificates" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" disabled={!state.person || !!state.busy} onChange={upload} style={{ display: 'block', maxWidth: 270 }} /></label>
    </Space><p style={{ marginBottom: 0 }}><Text type="secondary">PDF, JPG or PNG · up to 4 MiB · PDF up to 20 pages</Text></p></Card>
    {!record && <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>{feedback}</Space>}
    {!!state.uploadResults.length && <Card size="small" title="Upload results" style={{ marginTop: 16 }}>
      <div role="status">{state.uploadResults.map((item, index) => <p key={index}><Tag color={item.record?.status === 'VERIFIED' ? 'green' : 'orange'}>{certificateUploadLabel(item)}</Tag>{item.name}{item.message && <Text type="danger"> — {item.message}</Text>}{item.status === 'uploaded' && item.record?.status !== 'VERIFIED' && <Button size="small" disabled={!!state.busy} onClick={() => state.open(item.record)}>Check details</Button>}</p>)}</div>
    </Card>}
    {state.qualifications && <Card title="Aircraft task approval" style={{ marginTop: 16 }}><Decisions results={state.qualifications.results} onOpen={state.open} busy={!!state.busy} /></Card>}
    {!state.person ? <Empty description="Select a mechanic to view certificates." /> : <>
      {!state.listing.data.length && !state.busy && <Empty description="No certificates match this filter." />}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>{state.listing.data.map(item => <Col xs={24} md={12} key={item.id}><Card title={item.normalizedData?.certificateType || 'Certificate'} extra={<Tag color={item.status === 'VERIFIED' ? 'green' : 'orange'}>{certificateStatusLabel(item)}</Tag>}>
        <p><Text strong>Certificate holder</Text><br />{item.normalizedData?.holderName || 'Not read yet'}</p>
        <p><Text strong>Qualifications</Text><br />{item.normalizedData?.qualifications?.join(' · ') || 'Not read yet'}</p>
        <p><Text strong>Detected aircraft</Text><br />{item.normalizedData?.aircraftRatings?.map(aircraftLabel).join(', ') || 'No match yet'}</p>
        <Button disabled={!!state.busy} onClick={() => state.open(item)}>{item.status === 'PENDING_REVIEW' ? 'Check details' : 'View certificate'}</Button>
      </Card></Col>)}</Row>
      <Pagination current={state.page} pageSize={25} total={state.listing.pagination.total} showSizeChanger={false} onChange={state.setPage} disabled={!!state.busy} style={{ marginTop: 16 }} />
    </>}
    <Modal open={!!record} width={760} title="Certificate details" onCancel={() => { if (!state.busy) { setDisposition(''); state.close(); } }} keyboard={!state.busy} maskClosable={!state.busy} closable={!state.busy} destroyOnHidden footer={<Space>
      <Button disabled={!!state.busy} onClick={state.close}>Close</Button>
      {editable && <Button type="primary" disabled={!!state.busy} onClick={state.saveSummary}>{state.reviewer ? 'Confirm details' : 'Save details'}</Button>}
    </Space>} styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}>
      {record && <Space direction="vertical" size={16} style={{ width: '100%' }}>{feedback}
        <Space wrap><Tag>{certificateStatusLabel(record)}</Tag><Button onClick={download} disabled={!!state.busy}>View original</Button></Space>
        {record.status === 'PENDING_REVIEW' && record.processingStatus !== 'ANALYZED' && <Alert type="warning" title="This file still needs to be read" description={<Button disabled={!!state.busy} onClick={state.analyze}>Read certificate</Button>} />}
        {record.normalizedData && <>
          {editable && <Alert type="warning" showIcon title="Check these details" description={<>{(state.preview?.errors?.length ? state.preview.errors : certificateReviewReasons(record)).map(message => <p key={message}>{message}</p>)}</>} />}
          {certificateSummaryFields.map(([key, label, type]) => <div key={key} style={{ width: '100%' }}><label htmlFor={`certificate-${key}`}><Text strong>{label}</Text></label>
            {editable ? (type === 'list' ? <Input.TextArea id={`certificate-${key}`} rows={4} value={state.draft[key]} disabled={!!state.busy} onChange={event => state.setDraft({ ...state.draft, [key]: event.target.value })} /> : <Input id={`certificate-${key}`} maxLength={key === 'holderName' ? 160 : 1000} value={state.draft[key]} disabled={!!state.busy} onChange={event => state.setDraft({ ...state.draft, [key]: event.target.value })} />) : <p style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>{state.draft[key] || 'Not stated'}</p>}
          </div>)}
          <AircraftMatch record={record} results={state.qualifications?.results} />
          {editable && <Text type="secondary">{state.reviewer ? 'Confirming records that you checked these details against the original certificate.' : 'Correct unclear text here. An authorized reviewer can confirm the corrected reading.'}</Text>}
        </>}
        <Collapse style={{ width: '100%' }} items={[{ key: 'history', label: 'Source notes & history', children: <>
          {record.normalizedData?.limitations?.map((note, index) => <p key={index}>Source note: {note}</p>)}
          {state.history.map(item => <p key={item.id}>{certificateLabel(item.action)} · {date(item.createdAt)}<br />{item.details?.reviewNote}</p>)}
          {state.history.length > 0 && state.history.length % 25 === 0 && <Button disabled={!!state.busy} onClick={state.moreHistory}>Older history</Button>}
          {state.reviewer && ['PENDING_REVIEW', 'VERIFIED'].includes(record.status) && <><Input.TextArea aria-label="Reason for rejection or revocation" placeholder="Reason for rejecting or withdrawing this certificate" maxLength={2000} value={state.note} onChange={event => state.setNote(event.target.value)} disabled={!!state.busy} /><Button danger disabled={!!state.busy || !state.note.trim()} onClick={() => setDisposition(record.status === 'VERIFIED' ? 'revoke' : 'reject')}>{record.status === 'VERIFIED' ? 'Withdraw approval' : 'Reject certificate'}</Button></>}
        </> }]} />
      </Space>}
    </Modal>
    <Modal open={!!disposition} title={disposition === 'revoke' ? 'Withdraw certificate approval?' : 'Reject certificate?'} okText="Confirm" okButtonProps={{ danger: true }} confirmLoading={!!state.busy} onCancel={() => setDisposition('')} onOk={async () => { await state.disposition(disposition); setDisposition(''); }}><p>This certificate will no longer grant task access. Its original and history remain saved.</p></Modal>
  </div>;
}
