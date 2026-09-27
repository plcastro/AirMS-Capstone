import InspectionConfirmationPrompt from './InspectionConfirmationPrompt';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Input, Modal, Select, Space, Spin, Table, Tabs, Tag, Typography } from 'antd';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../utils/API_BASE';
import FlightLogEntry from './FlightLogEntry';
import PinVerifiedSignatureModal from '../common/PinVerifiedSignatureModal';
import { isAssignedFlightCrew, getAssignedCrewField } from '../../../../shared/flightCrewAccess';
import { FLIGHT_PURPOSES, preflightSignatureForRelease, pilotAcceptance, flightStage, nextFlightStep, needsMyFlightAction, flightEditPermissions, flightDraftBaseChanged } from '../../../../shared/flightWorkflow';
import AS from '../../../../shared/as350InspectionChecklist.json';
import BP from '../../../../shared/b412PreInspectionChecklist.json';
import BO from '../../../../shared/b412PostInspectionChecklist.json';
const labelTime = value => value ? new Date(value).toLocaleString() : '';
const localDateTime = value => {
  if (!value) return '';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const isB412 = record => /412/.test(record.aircraftType || '');
export default function FlightWorkspace({
  id,
  open,
  onClose,
  onChanged,
  initialSection = "flight"
}) {
  const {
    user,
    getAuthHeader
  } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null),
    [source, setSource] = useState(null),
    [draft, setDraft] = useState(null);
  const [tab, setTab] = useState('flight'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [signedAction, setSignedAction] = useState(null),
    [review, setReview] = useState(null);
  const [comment, setComment] = useState(''),
    [returnOpen, setReturnOpen] = useState(false);
  const [reconciliationReason, setReconciliationReason] = useState('');
  const [recovery, setRecovery] = useState(null),
    [saveState, setSaveState] = useState('Saved on server');
  const [defectForm, setDefectForm] = useState(null),
    [amendment, setAmendment] = useState(null);
  const [inspectionPrompt, setInspectionPrompt] = useState(null);
  const storageKey = `flight-draft:${user?.id || user?._id}:${id}`;
  const api = useCallback(async (path, body, method = 'PUT') => {
    const response = await fetch(`${API_BASE}/api/flightlogs/${path}`, {
      method: body === undefined ? 'GET' : method,
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeader()),
        'x-action-confirmed': 'true'
      },
      ...(body === undefined ? {} : {
        body: JSON.stringify({
          ...body,
          confirmAction: true
        })
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to save. Your local draft is retained.');
    return result.data;
  }, [getAuthHeader]);
  const reload = useCallback(async (preserve = false) => {
    const data = await api(`${id}/workspace`);
    const changed = preserve && draft && flightDraftBaseChanged(workspace?.flightLog, data.flightLog);
    if (changed) setRecovery({ draft, version: workspace?.flightLog?.__v, savedAt: new Date().toISOString() });
    setWorkspace(data);
    if (!preserve || changed) {
      setSource(data.flightLog);
      setDraft(data.flightLog);
    }
    return data;
  }, [api, id, draft, workspace]);
  useEffect(() => {
    if (!open || !id) return;
    let active = true;
    setBusy(true);
    setError('');
    setWorkspace(null);
    setTab(initialSection);
    setSignedAction(null);
    setReview(null);
    setDefectForm(null);
    setAmendment(null);
    api(`${id}/workspace`).then(data => {
      if (!active) return;
      setWorkspace(data);
      setSource(data.flightLog);
      setDraft(data.flightLog);
      try {
        setRecovery(JSON.parse(sessionStorage.getItem(storageKey) || 'null'));
      } catch {
        setRecovery(null);
      }
      setSaveState('Saved on server');
    }).catch(e => active && setError(e.message)).finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [open, id, api, storageKey, initialSection]);
  useEffect(() => {
    if (!open || !draft || !workspace || recovery || getAssignedCrewField(user) !== 'assignedMechanic' || !isAssignedFlightCrew(user, workspace.flightLog) || workspace.flightLog.status === 'completed') return;
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({
          draft,
          version: workspace.flightLog.__v,
          savedAt: new Date().toISOString()
        }));
        setSaveState('Draft kept on this device — Save Draft to sync');
      } catch {
        setSaveState('Local draft storage unavailable — save to the server before closing');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [draft, open, workspace, storageKey, user, recovery]);
  const log = workspace?.flightLog;
  const permissions = flightEditPermissions(user, log || {});
  const step = nextFlightStep(log || {});
  const acceptance = pilotAcceptance(user, log || {}, workspace?.preInspections || []);
  const assigned = isAssignedFlightCrew(user, log);
  const mechanic = getAssignedCrewField(user) === 'assignedMechanic';
  const finish = async (preserve = false) => {
    if (!preserve) {
      sessionStorage.removeItem(storageKey);
      setRecovery(null);
      setSaveState('Saved on server');
    }
    await reload(preserve);
    onChanged?.();
  };
  const execute = async (path, body, method = 'PUT', preserve = false, rethrow = false) => {
    setBusy(true);
    setError('');
    try {
      await api(path, body, method);
      await finish(preserve);
      return true;
    } catch (e) {
      setError(e.message);
      if (rethrow) throw e;
      return false;
    } finally {
      setBusy(false);
    }
  };
  const prepareAction = async action => {
    if (action === 'complete') {
      setBusy(true);
      setError('');
      try {
        setReconciliationReason('');
        setReview(await api(`${id}/review`, {
          changes: draft,
          expectedVersion: log.__v || 0
        }, 'POST'));
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    const releaseSignature = action === 'release' ? preflightSignatureForRelease(log, workspace.preInspections) : '';
    if (action === 'release' && !releaseSignature) {
      setTab('pre');
      setError('Complete and sign the linked Pre-Flight inspection before releasing the flight log.');
      return;
    }
    setSignedAction({
      initialSignature: releaseSignature,
      reusePreflight: action === 'release',
      path: `${id}/${action}`,
      body: {
        ...(mechanic ? { changes: draft } : {}),
        expectedVersion: log.__v || 0
      },
      title: step.button
    });
  };
  const confirmInspection = async (allGood, remarks = '', resolution = '') => {
    const { kind, record, complete, values } = inspectionPrompt;
    if (!record) { setError('The linked inspection is missing. Add it before continuing.'); return; }
    const task = complete && allGood ? {
      path: `${id}/complete`, body: { changes: draft, expectedVersion: log.__v || 0, postFlightConfirmation: { allGood: true, appendSignature: true, resolution } }, title: 'Confirm Post-Flight & Close Flight Record', appendSignature: true
    } : {
      path: `${id}/inspections/${kind}/${record._id}`,
      body: { changes: values || {}, expectedVersion: record.__v || 0, flightExpectedVersion: log.__v || 0, flightChanges: draft, confirmation: { allGood, remarks, resolution } },
      title: `Confirm ${kind === 'pre' ? 'Pre-Flight' : 'Post-Flight'} Inspection`, preserve: true, appendSignature: true
    };
    if (allGood) { setSignedAction(task); setInspectionPrompt(null); }
    else if (await execute(task.path, task.body, 'PUT', true)) setInspectionPrompt(null);
  };
  const saveInspection = (kind, record, values, status) => {
    const action = {
      path: `${id}/inspections/${kind}/${record._id}`,
      body: {
        ...(mechanic ? { changes: values } : {}),
        status,
        expectedVersion: record.__v || 0
      },
      title: kind === 'pre' ? status === 'completed' ? 'Accept Pre-Flight' : 'Release Pre-Flight' : 'Complete Post-Flight',
      preserve: true
    };
    if (status === record.status) return execute(action.path, action.body, 'PUT', true);
    setSignedAction(action);
  };
  const submitDefect = () => {
    const action = {
      path: `${id}/defects${defectForm._id ? `/${defectForm._id}` : ''}`,
      body: {
        ...defectForm,
        expectedVersion: log.__v || 0,
        defectVersion: defectForm.__v || 0
      },
      method: defectForm._id ? 'PUT' : 'POST',
      preserve: true,
      title: 'Certify Defect Disposition'
    };
    if (defectForm.status === 'open') execute(action.path, action.body, action.method, true).then(ok => ok && setDefectForm(null));else setSignedAction(action);
  };
  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob),
      anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${log.rpc}-${log.controlNo}-audit.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <Modal open={open} onCancel={onClose} footer={null} width={1220} title={log ? `${log.rpc} · ${log.controlNo} · Flight Workspace` : 'Flight Workspace'} destroyOnHidden styles={{
    body: {
      maxHeight: '84vh',
      overflowY: 'auto'
    }
  }}>
    {error && <Alert type="error" showIcon title={error} style={{
      whiteSpace: 'pre-line',
      marginBottom: 12
    }} action={<Button onClick={async () => {
      const local = draft ? {
        draft,
        version: log?.__v,
        savedAt: new Date().toISOString()
      } : null;
      try {
        await reload();
        setRecovery(local);
      } catch (e) {
        setError(e.message);
      }
    }}>Reload latest record</Button>} />}
    <Spin spinning={busy}>
    {log && <>
      <Card size="small" style={{
          marginBottom: 12
        }}>
        <Space wrap><Tag color={log.status === 'completed' ? 'green' : 'blue'}>{step.label}</Tag><Typography.Text strong>{step.next}{step.crew ? ` — ${log[step.crew]?.name || 'Unassigned'}` : ''}</Typography.Text><Tag>{workspace.readiness.aircraftStatus}</Tag></Space>
        <p>Pilot: {log.assignedPilot?.name || 'Unassigned'} · Mechanic: {log.assignedMechanic?.name || 'Unassigned'} · Last update: {labelTime(log.updatedAt)}</p>
        <Typography.Text type="secondary">{assigned && log.status !== "completed" ? saveState : "Saved on server"}</Typography.Text>
        {log.releasedBy?.name && <p>Released by {log.releasedBy.name} at {labelTime(log.releasedBy.timestamp)}</p>}
        {log.acceptedBy?.name && <p>Accepted by {log.acceptedBy.name} at {labelTime(log.acceptedBy.timestamp)}</p>}
        {!!workspace.history.filter(e => e.action === 'return').length && <Alert type="warning" title={`Correction requested: ${workspace.history.filter(e => e.action === 'return').at(-1).comment}`} />}
      </Card>
      {acceptance && <Card size="small" title="Pilot acceptance" style={{ marginBottom: 12 }}>
        <p>{acceptance.message}</p>
        <Space wrap>
          <Button type="primary" disabled={busy || !acceptance.preInspection} onClick={() => saveInspection('pre', acceptance.preInspection, {}, 'completed')}>Accept Pre-Flight</Button>
          <Button type="primary" disabled={busy || !acceptance.canAcceptFlight} onClick={() => prepareAction('accept')}>Accept Flight Log</Button>
        </Space>
      </Card>}
      {recovery && mechanic && <Alert type="info" title={`A local draft from ${labelTime(recovery.savedAt)} is available${recovery.version !== log.__v ? '; the server record has since changed. Review restored fields before saving.' : '.'}`} action={<Space><Button onClick={() => {
            setSource({
              ...log,
              ...recovery.draft,
              initialInspectionSignature: log.initialInspectionSignature,
              status: log.status,
              __v: log.__v
            });
            setRecovery(null);
          }}>Restore draft</Button><Button onClick={() => {
            sessionStorage.removeItem(storageKey);
            setRecovery(null);
          }}>Discard</Button></Space>} />}
      <Tabs activeKey={tab} onChange={setTab} items={[{
          key: 'flight',
          label: 'Flight Record',
          children: <>
          <Space wrap style={{
              marginBottom: 12
            }}>
            <Select aria-label="Flight purpose" placeholder="Flight purpose (optional)" style={{
                width: 210
              }} value={draft?.flightPurpose || undefined} disabled={!permissions.preparation} options={FLIGHT_PURPOSES.map(([value, label]) => ({
                value,
                label
              }))} onChange={value => setSource({
                ...draft,
                flightPurpose: value
              })} />
            <Input aria-label="Mission details" placeholder="Mission / line / job reference" style={{
                width: 320
              }} value={draft?.purposeDetails || ''} disabled={!permissions.preparation} onChange={e => setSource({
                ...draft,
                purposeDetails: e.target.value
              })} />
            <Checkbox checked={draft?.noDefectsReported === true} disabled={!permissions.flight} onChange={e => setSource({
                ...draft,
                noDefectsReported: e.target.checked
              })}>No defects reported</Checkbox>
          </Space>
          <FlightLogEntry embedded visible={open} editMode initialData={source} initialComponentData={source?.componentData} userRole={user?.jobTitle?.toLowerCase()} readOnly={!assigned || !mechanic || log.status === 'completed'} permissions={permissions} initialTab={step.tab} onDraftChange={setDraft} onClose={onClose} />
        </>
        }, ...['pre', 'post'].map(kind => ({
          key: kind,
          label: kind === 'pre' ? 'Pre-Flight' : 'Post-Flight',
          children: <>
          {assigned && mechanic && permissions.preparation && <Button onClick={() => execute(`${id}/inspections`, {
              expectedVersion: log.__v || 0
            }, 'POST', true)}>Add Linked Inspection Pair</Button>}
          {(kind === 'pre' ? workspace.preInspections : workspace.postInspections).map(record => <InspectionEditor key={`${record._id}:${record.__v}`} kind={kind} record={record} editable={assigned && log.status !== 'completed'} mechanic={mechanic} onConfirm={(kind, record, values) => setInspectionPrompt({ kind, record, values })} flightStatus={flightStage(log)} onSave={saveInspection} onReturn={async () => {
              const reason = window.prompt('Explain the inspection correction:');
              if (reason?.trim()) await execute(`${id}/inspections/${kind}/${record._id}`, {
                action: 'return',
                comment: reason,
                expectedVersion: record.__v || 0
              }, 'PUT', true);
            }} />)}
          {!(kind === 'pre' ? workspace.preInspections : workspace.postInspections).length && <p>No linked inspection yet. The assigned mechanic can add a pair during preparation.</p>}
        </>
        })), {
          key: 'defects',
          label: `Aircraft Defects (${workspace.defects.filter(d => d.status !== 'rectified').length})`,
          children: <>
          {assigned && mechanic && log.status !== 'completed' && <Button onClick={() => setDefectForm({
              description: '',
              status: 'open',
              resolution: '',
              evidence: ''
            })}>Report Defect</Button>}
          {workspace.defects.map(d => <Card key={d._id} size="small" style={{
              marginTop: 10
            }} title={<Space><Tag>{d.status}</Tag>{d.description}</Space>}>
            <p>{d.resolution}</p>{d.deferralReference && <p>Deferral basis: {d.deferralReference} · Due: {labelTime(d.dueDate)}</p>}{d.evidence && <a href={d.evidence} target="_blank" rel="noreferrer">Evidence</a>}
            {d.signedBy && <p>Certified by {d.signedBy.name} · {labelTime(d.signedBy.timestamp)}</p>}
            {assigned && mechanic && log.status !== 'completed' && <Button onClick={() => setDefectForm(d)}>Record Disposition</Button>}
          </Card>)}
        </>
        }, {
          key: 'history',
          label: 'History & Amendments',
          children: <>
          <Space><Button onClick={exportHistory}>Download Record & Audit History</Button>{permissions.canAmend && <Button onClick={() => setAmendment({
                field: mechanic ? 'maintenance_work' : 'flight_details',
                after: '',
                comment: ''
              })}>Add Signed Amendment</Button>}</Space>
          {workspace.amendments.map((item, i) => <Alert key={i} type="info" title={`${item.section}: ${item.correction}`} description={`${item.reason} · ${item.signer?.name} · ${labelTime(item.at)}`} style={{
              marginTop: 10
            }} />)}
          {[...workspace.history].reverse().map((entry, i) => <Card key={i} size="small" style={{
              marginTop: 8
            }} title={`${entry.action.replace(/_/g, ' ')} · ${labelTime(entry.at)}`}><p>{entry.signer?.name || entry.actorName || entry.actorId} · Version {entry.version}</p>{entry.comment && <p>{entry.comment}</p>}<details><summary>View changed fields and signed record</summary><pre style={{
                  maxHeight: 300,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>{JSON.stringify(entry, null, 2)}</pre></details></Card>)}
        </>
        }]} />
      <Card size="small" style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 2
        }}>
        {(workspace.readiness.missing.length > 0 || workspace.readiness.warnings.length > 0) && permissions.preparation && <details><summary>Preparation checks</summary><ul>{[...workspace.readiness.missing, ...workspace.readiness.warnings].map((message, i) => <li key={i}>{message}</li>)}</ul></details>}
        {!!workspace.readiness.maintenanceDue?.length && <Alert type="warning" showIcon title={`${workspace.readiness.maintenanceDue.length} maintenance warnings — release is allowed`} description={<details><summary>View overdue items from Parts Lifespan Monitoring</summary><ul>{workspace.readiness.maintenanceDue.map((item, i) => <li key={i}>{item}</li>)}</ul></details>} />}
        <Space wrap>
          {mechanic && needsMyFlightAction(user, log) && <Button type="primary" loading={busy} onClick={() => prepareAction(step.action)}>{step.button}</Button>}
          {permissions.canSave && <Button disabled={busy} onClick={() => execute(id, {
              changes: draft,
              expectedVersion: log.__v || 0
            })}>Save Draft</Button>}
          {permissions.canReturn && <Button onClick={() => {
              setComment('');
              setReturnOpen(true);
            }}>Return for Correction</Button>}
          <Button onClick={onClose}>Close Workspace</Button>
        </Space>
      </Card>
    </>}
    </Spin>
    {inspectionPrompt && <InspectionConfirmationPrompt {...inspectionPrompt} error={error} busy={busy} onCancel={() => setInspectionPrompt(null)} onYes={resolution => confirmInspection(true, '', resolution)} onNo={remarks => confirmInspection(false, remarks)} />}
    <Modal open={returnOpen} title="Return for Correction" onCancel={() => setReturnOpen(false)} onOk={async () => {
      if (await execute(`${id}/return`, {
        comment,
        changes: draft,
        expectedVersion: log.__v || 0
      })) setReturnOpen(false);
    }} okText="Return"><Input.TextArea value={comment} onChange={e => setComment(e.target.value)} placeholder="What needs correcting?" /></Modal>
    <Modal open={!!review} title="Review Before Closure" onCancel={() => setReview(null)} okText="Continue to Post-Flight" okButtonProps={{
      disabled: !!review?.missing.length || review?.monitoringReconciliation?.required
    }} onOk={() => {
      setReview(null);
      setInspectionPrompt({ kind: 'post', record: workspace.postInspections[0], complete: true });
    }}>
      {!!review?.missing.length && <Alert type="error" title="Complete these items first" description={<ul>{review.missing.map((item, i) => <li key={i}>{item}</li>)}</ul>} />}
      {review?.monitoringReconciliation?.required && <Alert type="warning" title="Parts Monitoring changed since release" description={<>
          <p>Check the current maintenance ledger before applying this flight's usage. Explain why the current values are correct.</p>
          <Table size="small" pagination={false} rowKey="item" dataSource={Object.keys(review.monitoringReconciliation.current).map(item => ({
          item,
          previous: review.monitoringReconciliation.previous[item],
          current: review.monitoringReconciliation.current[item]
        }))} columns={[{
          title: 'Item',
          dataIndex: 'item'
        }, {
          title: 'At release',
          dataIndex: 'previous',
          render: value => value ?? 'Missing'
        }, {
          title: 'Current ledger',
          dataIndex: 'current',
          render: value => value ?? 'Missing'
        }]} />
          <Input.TextArea aria-label="Monitoring reconciliation reason" placeholder="Explain the ledger reconciliation" value={reconciliationReason} onChange={e => setReconciliationReason(e.target.value)} />
          <Button disabled={!reconciliationReason.trim()} onClick={() => setSignedAction({
          path: `${id}/reconcile`,
          body: {
            expectedVersion: log.__v || 0,
            comment: reconciliationReason
          },
          title: 'Sign Monitoring Reconciliation',
          preserve: true,
          reconcile: true
        })}>Sign Reconciliation</Button>
        </>} />}
      <Table size="small" pagination={false} rowKey="path" dataSource={review?.totals || []} columns={['item', 'broughtForward', 'thisFlight', 'toDate'].map((key, i) => ({
        key,
        dataIndex: key,
        title: ['Item', 'Brought Forward', 'This Flight', 'To Date'][i],
        render: value => value ?? 'Missing'
      }))} />
    </Modal>
    <Modal open={!!defectForm} title="Aircraft Defect" onCancel={() => setDefectForm(null)} onOk={submitDefect} okText={defectForm?.status === 'open' ? 'Save Defect' : 'Sign Disposition'}>
      {defectForm && <Space orientation="vertical" style={{
        width: '100%'
      }}><Input.TextArea placeholder="Description" value={defectForm.description} disabled={!!defectForm._id} onChange={e => setDefectForm({
          ...defectForm,
          description: e.target.value
        })} /><Input placeholder="Evidence link (HTTPS)" value={defectForm.evidence} disabled={!!defectForm._id} onChange={e => setDefectForm({
          ...defectForm,
          evidence: e.target.value
        })} />
      <Select style={{
          width: '100%'
        }} value={defectForm.status} disabled={!mechanic} options={['open', 'rectified', 'deferred'].map(value => ({
          value,
          label: value
        }))} onChange={status => setDefectForm({
          ...defectForm,
          status
        })} />
      <Input.TextArea placeholder="Corrective work / deferral limitations" value={defectForm.resolution} onChange={e => setDefectForm({
          ...defectForm,
          resolution: e.target.value
        })} />
      {defectForm.status === 'deferred' && <><Input placeholder="Approved deferral reference" value={defectForm.deferralReference} onChange={e => setDefectForm({
            ...defectForm,
            deferralReference: e.target.value
          })} /><Input type="datetime-local" aria-label="Deferral deadline" value={localDateTime(defectForm.dueDate)} onChange={e => setDefectForm({
            ...defectForm,
            dueDate: e.target.value ? new Date(e.target.value).toISOString() : ''
          })} /></>}
      </Space>}
    </Modal>
    <Modal open={!!amendment} title="Add Signed Amendment" onCancel={() => setAmendment(null)} okText="Review & Sign" onOk={() => setSignedAction({
      path: `${id}/amend`,
      body: {
        correction: {
          field: amendment.field,
          after: amendment.after
        },
        comment: amendment.comment,
        expectedVersion: log.__v || 0
      },
      title: 'Sign Amendment'
    })}>
      {amendment && <Space orientation="vertical" style={{
        width: '100%'
      }}><p>The original signed record stays intact. Describe the correction and its reason. Usage totals need maintenance-ledger reconciliation.</p><Select style={{
          width: '100%'
        }} value={amendment.field} options={(mechanic ? ['flight_details', 'maintenance_work', 'servicing', 'discrepancies'] : ['flight_details', 'discrepancies']).map(value => ({
          value,
          label: value.replace(/_/g, ' ')
        }))} onChange={field => setAmendment({
          ...amendment,
          field
        })} /><Input.TextArea placeholder="Corrected information" value={amendment.after} onChange={e => setAmendment({
          ...amendment,
          after: e.target.value
        })} /><Input.TextArea placeholder="Reason" value={amendment.comment} onChange={e => setAmendment({
          ...amendment,
          comment: e.target.value
        })} /></Space>}
    </Modal>
    <PinVerifiedSignatureModal pinOnly={signedAction?.reusePreflight === true} confirmDescription={signedAction?.reusePreflight ? 'Your Pre-Flight signature will be appended. Enter your six-digit PIN to release the flight log.' : undefined} initialSignature={signedAction?.initialSignature || (signedAction?.appendSignature ? log?.initialInspectionSignature?.signature : '')} open={!!signedAction} title={signedAction?.title || 'Sign'} description="Review the information being submitted, then confirm your signature with your six-digit PIN." onCancel={() => setSignedAction(null)} onSave={async (signature, {
      pin
    }) => {
      const ok = await execute(signedAction.path, {
        ...signedAction.body,
        signature,
        pin
      }, signedAction.method || 'PUT', signedAction.preserve, true);
      if (ok) {
        setDefectForm(null);
        setAmendment(null);
        if (signedAction.reconcile) setReview(null);
      }
      return ok;
    }} />
  </Modal>;
}
function InspectionEditor({
  kind,
  record,
  editable,
  mechanic,
  flightStatus,
  onSave,
  onReturn,
  onConfirm
}) {
  const [values, setValues] = useState(record);
  const b412 = isB412(record),
    checks = b412 ? (kind === 'pre' ? BP : BO).sections.flatMap(s => s.items) : AS[kind];
  const preparing = ['pending_release', 'returned_to_mechanic'].includes(flightStatus);
  const postFlight = ['accepted', 'submitted', 'returned_to_pilot'].includes(flightStatus);
  const writable = editable && mechanic && record.status === 'pending' && (kind === 'pre' ? preparing : postFlight);
  const canReturn = editable && mechanic && record.status !== 'pending' && (kind === 'pre' ? preparing : postFlight && mechanic);
  return <Card style={{
    marginTop: 12
  }} title={`${kind === 'pre' ? 'Pre-Flight' : 'Post-Flight'} · ${record.date} · ${record.status}`}>
    {kind === 'pre' && record.acceptedBy?.name && <p>Accepted by {record.acceptedBy.name} - {labelTime(record.acceptedBy.timestamp)}</p>}
    {record.releasedBy?.name && <p>Certified by {record.releasedBy.name} · {labelTime(record.releasedBy.timestamp)}</p>}
    {kind === 'pre' && !mechanic && <p>Fuel on board: {values.fob ?? 'Not recorded'}</p>}
    {kind === 'pre' && mechanic && <Input placeholder="Fuel on board" aria-label="Fuel on board" disabled={!writable} value={values.fob} onChange={e => setValues({
      ...values,
      fob: e.target.value
    })} />}
    {kind === 'post' && <Input.TextArea placeholder="Inspection notes" disabled={!writable} value={values.notes} onChange={e => setValues({
      ...values,
      notes: e.target.value
    })} />}
    <div style={{
      maxHeight: 400,
      overflowY: 'auto',
      margin: '12px 0'
    }}>{checks.map(item => <div key={item.key} style={{
        marginBottom: 10
      }}><Checkbox disabled={!writable} checked={b412 ? values.b412Data?.checks?.[item.key] === true : values[item.key] === true} onChange={e => setValues(b412 ? {
          ...values,
          b412Data: {
            ...values.b412Data,
            checks: {
              ...values.b412Data?.checks,
              [item.key]: e.target.checked
            }
          }
        } : {
          ...values,
          [item.key]: e.target.checked
        })}>{item.title} — {item.description}</Checkbox></div>)}</div>
    {record.confirmation?.allGood === false && <Alert type="warning" title="Inspection on hold" description={record.confirmation.remarks} />}
    <Space wrap>{writable && <Button onClick={() => onConfirm(kind, record, values)}>Confirm Inspection</Button>}
    {editable && !mechanic && kind === 'pre' && record.status === 'released' && flightStatus === 'pending_acceptance' && <Button type="primary" onClick={() => onSave(kind, record, values, 'completed')}>Accept Pre-Flight</Button>}
    {canReturn && <Button onClick={onReturn}>Return Inspection for Correction</Button>}</Space>
  </Card>;
}
