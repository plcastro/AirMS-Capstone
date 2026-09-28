import React, { useContext, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Col, Collapse, Empty, Input, Modal, Pagination, Row, Select, Space, Tag, Typography } from 'antd';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../utils/API_BASE';
import { certificateFields, certificateLabel, certificateStatusLabel, certificateReviewReasons, certificateUploadLabel, createCertificateApi, createUseCertificates } from '../../../../shared/certificateClient';

const useCertificates = createUseCertificates(React);
const { Title, Text } = Typography;
const date = value => value ? new Date(value).toLocaleString() : '—';
function Decisions({ results = [] }) {
  return <Space direction="vertical" style={{ width: '100%' }}>{results.map(result => <Card size="small" key={result.aircraft}>
    <Space wrap><Text strong>{result.aircraft}</Text><Tag color={result.qualified ? 'green' : 'orange'}>{result.qualified ? 'All tasks allowed' : 'Not qualified'}</Tag></Space>
    <div>{(result.qualified ? result.matchedRules : result.failedRules).join(' ')}</div>
    {result.validThrough && <Text type="secondary">Valid through {result.validThrough}</Text>}
  </Card>)}</Space>;
}
export default function MechanicCertificates({ personnelId }) {
  const { user, getAuthHeader } = useContext(AuthContext);
  const api = useMemo(() => createCertificateApi(API_BASE, getAuthHeader), [getAuthHeader]);
  const state = useCertificates(user, api, personnelId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disposition, setDisposition] = useState('');
  const record = state.selected, editable = record?.status === 'PENDING_REVIEW' && record?.processingStatus === 'ANALYZED';
  const upload = async event => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length) return;
    await state.upload(files, file => {
      const form = new FormData(); form.append('file', file); return form;
    });
  };
  const download = () => state.run('Downloading original', async () => {
    const response = await api(`/${record.id}/file`, { file: true });
    const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
    link.href = url; link.download = record.file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
  const feedback = <>{state.error && <Alert type="error" showIcon title={state.error} />}{state.notice && <Alert type="success" showIcon title={state.notice} />}{state.busy && <Alert type="info" showIcon title={state.busy} />}</>;
  return <div style={{ paddingTop: 12 }}>
    <Title level={3}>Certificates & aircraft qualifications</Title>
    <Text type="secondary">Upload certificates and we’ll read them for you. Clear, complete readings are accepted automatically; we’ll ask for help only when details need attention.</Text>
    <Card style={{ marginTop: 20 }}><Space wrap style={{ width: '100%' }}>
      <Select aria-label="Certificate status" value={state.status} onChange={state.setStatus} disabled={!!state.busy} style={{ minWidth: 170 }} options={['all', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REVOKED'].map(value => ({ value, label: value === 'all' ? 'All certificates' : certificateStatusLabel({ status: value }) }))} />
      <Button disabled={!!state.busy} onClick={state.refresh}>Refresh</Button>
      <label style={{ color: !state.person || state.busy ? '#aaa' : '#087b39', cursor: 'pointer', fontWeight: 600 }}>Upload certificates<input aria-label="Upload certificates" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" disabled={!state.person || !!state.busy} onChange={upload} style={{ display: 'block', maxWidth: 270 }} /></label>
    </Space><div><Text type="secondary">PDF, JPG or PNG · up to 4 MiB · PDF up to 20 pages</Text></div></Card>
    {!record && feedback}
    {!!state.uploadResults.length && <Card size="small" title={`${state.uploadResults.filter(item => item.status === 'uploaded').length} of ${state.uploadResults.length} certificates uploaded`} style={{ marginTop: 16 }}>
      <div role="status" style={{ maxHeight: 240, overflowY: 'auto' }}>{state.uploadResults.map((item, index) => <p key={index}><Tag color={item.record?.status === 'VERIFIED' ? 'green' : 'orange'}>{certificateUploadLabel(item)}</Tag><Text>{item.name}</Text>{item.message && <Text type="danger"> — {item.message}</Text>}{item.status === 'uploaded' && item.record?.status !== 'VERIFIED' && <Button size="small" disabled={!!state.busy} onClick={() => state.open(item.record)} style={{ marginLeft: 8 }}>Check details</Button>}</p>)}</div>
      <Text type="secondary">Accepted certificates need no further action. Files marked “Needs attention” are saved and ready to check.</Text>
    </Card>}
    {state.qualifications && <Card title="Current qualifications" style={{ marginTop: 16 }}><Decisions results={state.qualifications.results} /></Card>}
    {!state.person ? <Empty description="Select a mechanic to view their certificates." /> : <>
      {!state.listing.data.length && !state.busy && <Empty description="No certificates match this filter." />}
      <Row gutter={[16, 16]} style={{ marginTop: 4 }}>{state.listing.data.map(item => <Col xs={24} md={12} key={item.id}>
        <Card title={item.normalizedData?.certificateType || item.file?.name || 'Certificate'} extra={<Tag color={item.status === 'VERIFIED' ? 'green' : 'orange'}>{certificateStatusLabel(item)}</Tag>}>
          <p>{item.normalizedData?.aircraftRatings?.join(', ') || 'Aircraft ratings await analysis'}</p>
          <p><Text type="secondary">Uploaded {date(item.createdAt)}</Text></p>
          <Button disabled={!!state.busy} onClick={() => state.open(item)}>{item.status === 'PENDING_REVIEW' ? 'Review certificate' : 'View certificate'}</Button>
        </Card>
      </Col>)}</Row>
      <Pagination current={state.page} pageSize={25} total={state.listing.pagination.total} showSizeChanger={false} onChange={state.setPage} disabled={!!state.busy} style={{ marginTop: 16 }} />
    </>}
    <Modal open={!!record} width={1050} title={record?.file?.name || 'Certificate review'} onCancel={() => { if (!state.busy) { setConfirmOpen(false); setDisposition(''); state.close(); } }} keyboard={!state.busy} maskClosable={!state.busy} closable={!state.busy} destroyOnHidden footer={<Space wrap>
      <Button disabled={!!state.busy} onClick={state.close}>Close</Button>
      {editable && <Button disabled={!!state.busy || !state.note.trim()} onClick={state.save}>Save corrections & preview</Button>}
      {editable && <Button disabled={!!state.busy || state.dirty} onClick={state.previewNow}>Refresh preview</Button>}
      {editable && state.reviewer && <Button type="primary" disabled={!!state.busy || state.dirty || !state.acknowledged || !state.note.trim() || !!state.preview?.errors?.length} onClick={() => setConfirmOpen(true)}>Confirm certificate</Button>}
    </Space>} styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}>
      {record && <Space direction="vertical" size={16} style={{ width: '100%' }}>{feedback}
        <Space wrap><Tag>{certificateStatusLabel(record)}</Tag><Button onClick={download} disabled={!!state.busy}>Download original</Button><Text>Owner: {state.people.find(person => person.id === state.person)?.name}</Text></Space>
        {record.status === 'PENDING_REVIEW' && record.processingStatus !== 'ANALYZED' && <Card><p>{record.processingStatus === 'FAILED' ? 'We couldn’t read this document. Retry reading it, or upload a clearer copy.' : 'This file is saved but has not been read yet.'}</p><Button type="primary" disabled={!!state.busy} onClick={state.analyze}>{record.processingStatus === 'FAILED' ? 'Retry reading' : 'Read certificate'}</Button></Card>}
        {record.normalizedData && <>
          {editable ? <Alert type="warning" showIcon title="A few details need your help" description={<>{certificateReviewReasons(record).length ? certificateReviewReasons(record).map(message => <p key={message}>{message}</p>) : <p>Check the extracted details against the original document.</p>}</>} /> : <Alert type={record.status === 'VERIFIED' ? 'success' : 'warning'} showIcon title={certificateStatusLabel(record)} description={record.status === 'VERIFIED' && record.verificationMethod === 'AUTOMATIC' ? 'No verification step is needed. You can view the saved details below.' : 'The certificate details have been saved.'} />}
          {record.holderMatch && <Card size="small" title={`Mechanic match: ${certificateLabel(record.holderMatch.status)}`}>
            {(record.holderMatch.candidates || []).map(candidate => <p key={candidate.personnelId}>{candidate.name} · {Math.round(candidate.score * 100)}% name similarity{candidate.personnelId === state.person ? ' · current owner' : ' · different owner'}</p>)}
            {record.holderMatch.suggestedPersonnelId && record.holderMatch.suggestedPersonnelId !== state.person && <Alert type="warning" title="The suggested mechanic differs from the upload owner. Upload under the correct mechanic if needed." />}
          </Card>}
          <Row gutter={[16, 12]}>{certificateFields.map(([key, label, type]) => <Col xs={24} md={12} key={key}>
            <label htmlFor={`certificate-${key}`} style={{ display: 'block', marginBottom: 6 }}>{label}</label>
            {type === 'list' ? <Input.TextArea id={`certificate-${key}`} rows={3} disabled={!editable || !!state.busy} value={state.draft[key]} onChange={event => { state.setDraft({ ...state.draft, [key]: event.target.value }); state.setAcknowledged(false); }} /> : <Input id={`certificate-${key}`} maxLength={key === 'holderName' ? 160 : 1000} placeholder={type === 'date' ? 'YYYY-MM-DD' : ''} disabled={!editable || !!state.busy} value={state.draft[key]} onChange={event => { state.setDraft({ ...state.draft, [key]: event.target.value }); state.setAcknowledged(false); }} />}
          </Col>)}</Row>
          <Checkbox disabled={!editable || !!state.busy} checked={state.draft.doesNotExpire} onChange={event => { state.setDraft({ ...state.draft, doesNotExpire: event.target.checked, ...(event.target.checked ? { expiryDate: '' } : {}) }); state.setAcknowledged(false); }}>The document explicitly states that it does not expire</Checkbox>
          {editable && <><label htmlFor="certificate-note">Review note — explain corrections and what you checked</label><Input.TextArea id="certificate-note" maxLength={2000} value={state.note} disabled={!!state.busy} onChange={event => state.setNote(event.target.value)} />
            {state.dirty && <Alert type="warning" title="Save corrections before refreshing the preview or confirming." />}
            {state.reviewer && <Checkbox checked={state.acknowledged} disabled={!!state.busy || state.dirty} onChange={event => state.setAcknowledged(event.target.checked)}>I checked the original, resolved the warnings, and confirm this certificate belongs to {state.people.find(person => person.id === state.person)?.name}.</Checkbox>}
          </>}
          {state.preview && <Card title="Preview after confirmation"><Alert type="info" title="This preview does not grant qualifications." />{state.preview.errors?.map(error => <p key={error} style={{ color: '#b42318' }}>{error}</p>)}<Decisions results={state.preview.results} /></Card>}
          {record.reviewedAt && <Text>Confirmed {date(record.reviewedAt)}. Current qualifications above reflect today’s validity.</Text>}
          <Collapse items={[{ key: 'source', label: 'Original extraction and warnings', children: <><p>{record.analysis?.certificateData?.confidence == null ? 'Embedded document text' : `OCR confidence: ${Math.round(record.analysis.certificateData.confidence * 100)}%`}</p>{record.analysis?.certificateData?.warnings?.map((warning, index) => <p key={index}>{certificateLabel(warning.code)}{warning.page ? ` · page ${warning.page}` : ''}</p>)}<pre style={{ whiteSpace: 'pre-wrap', maxHeight: 250, overflowY: 'auto' }}>{record.analysis?.extraction?.rawText || 'No readable text'}</pre></> }]} />
        </>}
        {state.reviewer && ['PENDING_REVIEW', 'VERIFIED'].includes(record.status) && <Card size="small" title="Reject or withdraw this source">
          {!editable && <Input.TextArea aria-label="Reason for rejection or revocation" placeholder="Explain why this certificate should not qualify the mechanic" maxLength={2000} value={state.note} onChange={event => state.setNote(event.target.value)} disabled={!!state.busy} />}
          {editable && <p>Use the review note above to explain your decision.</p>}
          <Button danger style={{ marginTop: 8 }} disabled={!!state.busy || !state.note.trim()} onClick={() => setDisposition(record.status === 'VERIFIED' ? 'revoke' : 'reject')}>{record.status === 'VERIFIED' ? 'Revoke certificate' : 'Reject certificate'}</Button>
        </Card>}
        <Collapse items={[{ key: 'history', label: 'Review history', children: <>{state.history.map(item => <p key={item.id}><strong>{certificateLabel(item.action)}</strong> · {date(item.createdAt)}<br />{item.details?.reviewNote}</p>)}{state.history.length > 0 && state.history.length % 25 === 0 && <Button onClick={state.moreHistory} disabled={!!state.busy}>Load older history</Button>}</> }]} />
      </Space>}
    </Modal>
    <Modal open={confirmOpen} title="Confirm reviewed certificate?" okText="Confirm and save" confirmLoading={!!state.busy} onCancel={() => setConfirmOpen(false)} onOk={async () => { await state.confirm(); setConfirmOpen(false); }}><p>This records your review and makes eligible aircraft ratings available for task assignment. Expiry and restrictions still apply.</p></Modal>
    <Modal open={!!disposition} title={`${disposition === 'revoke' ? 'Revoke' : 'Reject'} this certificate?`} okText="Confirm" okButtonProps={{ danger: true }} confirmLoading={!!state.busy} onCancel={() => setDisposition('')} onOk={async () => { await state.disposition(disposition); setDisposition(''); }}><p>This certificate will not be used to qualify the mechanic. The original and review history will be retained.</p></Modal>
  </div>;
}
