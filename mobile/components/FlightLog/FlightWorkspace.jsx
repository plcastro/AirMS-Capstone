import InspectionConfirmationPrompt from './InspectionConfirmationPrompt';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from '../common/AppModal';
import AppText from '../common/AppText';
import PinVerifiedSignatureModal from '../common/PinVerifiedSignatureModal';
import FlightLogEditEntry from './FlightLogEditEntry';
import { AuthContext } from '../../Context/AuthContext';
import { getAuthHeaders } from '../../utilities/mobileApi';
import { API_BASE } from '../../utilities/API_BASE';
import { isAssignedFlightCrew, getAssignedCrewField } from '../../../shared/flightCrewAccess';
import { FLIGHT_PURPOSES, preflightSignatureForRelease, pilotAcceptance, nextFlightStep, needsMyFlightAction, flightEditPermissions, flightDraftBaseChanged } from '../../../shared/flightWorkflow';
import AS from '../../../shared/as350InspectionChecklist.json';
import BP from '../../../shared/b412PreInspectionChecklist.json';
import BO from '../../../shared/b412PostInspectionChecklist.json';
const panel = {
  padding: 12,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#dce6e1',
  borderRadius: 10,
  backgroundColor: '#fff'
};
const input = {
  borderWidth: 1,
  borderColor: '#c7d4ce',
  padding: 10,
  borderRadius: 6,
  marginVertical: 5,
  color: '#172b23'
};
const when = value => value ? new Date(value).toLocaleString() : '';
function Action({
  children,
  onPress,
  disabled
}) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={{
    padding: 12,
    backgroundColor: disabled ? '#aabbb4' : '#26866f',
    borderRadius: 6,
    marginVertical: 5
  }}><AppText style={{
      color: '#fff',
      fontWeight: '600'
    }}>{children}</AppText></TouchableOpacity>;
}
function Choice({
  values,
  value,
  onChange,
  disabled
}) {
  return <ScrollView horizontal>{values.map(([key, label]) => <TouchableOpacity key={key} disabled={disabled} onPress={() => onChange(key)} style={{
      padding: 10,
      borderWidth: 1,
      borderColor: value === key ? '#26866f' : '#ddd',
      backgroundColor: value === key ? '#e3f2ec' : '#fff',
      margin: 3,
      borderRadius: 6
    }}><AppText>{label}</AppText></TouchableOpacity>)}</ScrollView>;
}
export default function FlightWorkspace({
  id,
  visible,
  onClose,
  onChanged,
  initialSection = "flight"
}) {
  const {
    user
  } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null),
    [source, setSource] = useState(null),
    [draft, setDraft] = useState(null),
    [tab, setTab] = useState('flight');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [sign, setSign] = useState(null),
    [review, setReview] = useState(null),
    [comment, setComment] = useState(''),
    [returning, setReturning] = useState(false);
  const [defect, setDefect] = useState(null),
    [amendment, setAmendment] = useState(null),
    [recovery, setRecovery] = useState(null),
    [saveState, setSaveState] = useState('Saved on server');
  const [inspectionPrompt, setInspectionPrompt] = useState(null);
  const [showMaintenanceDue, setShowMaintenanceDue] = useState(false);
  const storageKey = `flight-draft:${user?.id || user?._id}:${id}`;
  const api = useCallback(async (path, body, method = 'PUT') => {
    const response = await fetch(`${API_BASE}/api/flightlogs/${path}`, {
      method: body === undefined ? 'GET' : method,
      headers: await getAuthHeaders({
        'Content-Type': 'application/json',
        'x-action-confirmed': 'true'
      }),
      ...(body === undefined ? {} : {
        body: JSON.stringify({
          ...body,
          confirmAction: true
        })
      })
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.message || 'Could not save. Your local draft is retained.');
    return data.data;
  }, []);
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
    if (!visible || !id) return;
    let active = true;
    setWorkspace(null);
    setShowMaintenanceDue(false);
    setBusy(true);
    setError('');
    setTab(['flight', 'pre', 'post', 'defects', 'history'].includes(initialSection) ? initialSection : 'flight');
    Promise.all([api(`${id}/workspace`), AsyncStorage.getItem(storageKey)]).then(([data, cached]) => {
      if (!active) return;
      setWorkspace(data);
      setSource(data.flightLog);
      setDraft(data.flightLog);
      try {
        setRecovery(cached ? JSON.parse(cached) : null);
      } catch {
        setRecovery(null);
      }
      setSaveState('Saved on server');
    }).catch(e => active && setError(e.message)).finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [id, visible, api, storageKey, initialSection]);
  useEffect(() => {
    if (!visible || !draft || !workspace || recovery || getAssignedCrewField(user) !== 'assignedMechanic' || !isAssignedFlightCrew(user, workspace.flightLog) || workspace.flightLog.status === 'completed') return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify({
        draft,
        version: workspace.flightLog.__v,
        savedAt: new Date().toISOString()
      })).then(() => setSaveState('Draft kept on this device — Save Draft to sync')).catch(() => setSaveState('Local storage unavailable — save to server before closing'));
    }, 800);
    return () => clearTimeout(timer);
  }, [visible, draft, workspace, storageKey, user, recovery]);
  const log = workspace?.flightLog,
    permissions = flightEditPermissions(user, log || {}),
    step = nextFlightStep(log || {}),
    assigned = isAssignedFlightCrew(user, log),
    mechanic = getAssignedCrewField(user) === 'assignedMechanic';
  const execute = async (path, body, method = 'PUT', preserve = false, throwOnError = false) => {
    setBusy(true);
    setError('');
    try {
      await api(path, body, method);
      if (!preserve) {
        await AsyncStorage.removeItem(storageKey);
        setRecovery(null);
        setSaveState('Saved on server');
      }
      await reload(preserve);
      onChanged?.();
      return true;
    } catch (e) {
      setError(e.message);
      if (throwOnError) throw e;
      return false;
    } finally {
      setBusy(false);
    }
  };
  const acceptance = pilotAcceptance(user, log || {}, workspace?.preInspections || []);
  const advance = async () => {
    if (step.action === 'complete') {
      setBusy(true);
      try {
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
    const releaseSignature = step.action === 'release' ? preflightSignatureForRelease(log, workspace.preInspections) : '';
    if (step.action === 'release' && !releaseSignature) {
      setTab('pre');
      setError('Complete and sign the linked Pre-Flight inspection before releasing the flight log.');
      return;
    }
    setSign({
      initialSignature: releaseSignature,
      reusePreflight: step.action === 'release',
      path: `${id}/${step.action}`,
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
    if (allGood) { setSign(task); setInspectionPrompt(null); }
    else if (await execute(task.path, task.body, 'PUT', true)) setInspectionPrompt(null);
  };
  const saveInspection = (kind, record, values, status) => {
    const task = {
      path: `${id}/inspections/${kind}/${record._id}`,
      body: {
        ...(mechanic ? { changes: values } : {}),
        status,
        expectedVersion: record.__v || 0
      },
      title: kind === 'pre' ? status === 'completed' ? 'Accept Pre-Flight' : 'Release Pre-Flight' : 'Complete Post-Flight',
      preserve: true
    };
    if (status === record.status) return execute(task.path, task.body, 'PUT', true);
    setSign(task);
  };
  const saveDefect = () => {
    const task = {
      path: `${id}/defects${defect._id ? `/${defect._id}` : ''}`,
      body: {
        ...defect,
        expectedVersion: log.__v || 0,
        defectVersion: defect.__v || 0
      },
      method: defect._id ? 'PUT' : 'POST',
      preserve: true,
      title: 'Certify Defect Disposition'
    };
    if (defect.status === 'open') execute(task.path, task.body, task.method, true).then(ok => ok && setDefect(null));else setSign(task);
  };
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={{
      flex: 1,
      backgroundColor: '#f7faf8'
    }}>
    <View style={{
        padding: 12
      }}><AppText style={{
          fontSize: 18,
          fontWeight: '700'
        }}>{log ? `${log.rpc} · ${log.controlNo}` : 'Flight Workspace'}</AppText><Action onPress={onClose}>Close Workspace</Action>{busy && <ActivityIndicator />}</View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
        padding: 12
      }}>
      {!!error && <View style={panel}><AppText accessibilityRole="alert" style={{
            color: '#b12626'
          }}>{error}</AppText><Action onPress={async () => {
            const local = draft ? { draft, version: log?.__v, savedAt: new Date().toISOString() } : null;
            try { await reload(); setRecovery(local); setError(''); }
            catch (e) { setError(e.message); }
          }}>Refresh Record</Action></View>}
      {log && <>
        <View style={panel}><AppText style={{
              fontWeight: '700'
            }}>{step.next}{step.crew ? ` — ${log[step.crew]?.name || 'Unassigned'}` : ''}</AppText><AppText>Pilot: {log.assignedPilot?.name || 'Unassigned'}{'\n'}Mechanic: {log.assignedMechanic?.name || 'Unassigned'}</AppText><AppText>{workspace.readiness.aircraftStatus}</AppText><AppText>{saveState}</AppText>
          {workspace.history.filter(e => e.action === 'return').slice(-1).map((e, i) => <AppText key={i}>Correction requested: {e.comment}</AppText>)}
        </View>
        {acceptance && <View style={panel}>
          <AppText style={{ fontWeight: '700' }}>Pilot acceptance</AppText>
          <AppText>{acceptance.message}</AppText>
          <Action disabled={busy || !acceptance.preInspection} onPress={() => saveInspection('pre', acceptance.preInspection, {}, 'completed')}>Accept Pre-Flight</Action>
          <Action disabled={busy || !acceptance.canAcceptFlight} onPress={advance}>Accept Flight Log</Action>
        </View>}
        {recovery && mechanic && <View style={panel}><AppText>Local draft from {when(recovery.savedAt)}. {recovery.version !== log.__v ? 'The server record has changed; review restored fields before saving.' : ''}</AppText><Action onPress={() => {
              setSource({
                ...log,
                ...recovery.draft,
              initialInspectionSignature: log.initialInspectionSignature,
              status: log.status,
                __v: log.__v
              });
              setRecovery(null);
            }}>Restore Draft</Action><Action onPress={() => {
              AsyncStorage.removeItem(storageKey);
              setRecovery(null);
            }}>Discard Local Draft</Action></View>}
        <Choice values={[['flight', 'Flight Record'], ['pre', 'Pre-Flight'], ['post', 'Post-Flight'], ['defects', 'Aircraft Defects'], ['history', 'History']]} value={tab} onChange={setTab} />
        {tab === 'flight' && <>
          <AppText>Flight purpose (optional)</AppText><Choice disabled={!permissions.preparation} values={FLIGHT_PURPOSES} value={draft?.flightPurpose} onChange={value => setSource({
              ...draft,
              flightPurpose: value
            })} />
          <TextInput style={input} placeholder="Mission / line / job reference" editable={permissions.preparation} value={draft?.purposeDetails || ''} onChangeText={value => setSource({
              ...draft,
              purposeDetails: value
            })} />
          <Action disabled={!permissions.flight} onPress={() => setSource({
              ...draft,
              noDefectsReported: !draft?.noDefectsReported
            })}>{draft?.noDefectsReported ? '☑' : '☐'} No defects reported</Action>
          <View style={{
              height: 640
            }}><FlightLogEditEntry embedded visible={visible} logData={source} userRole={user?.jobTitle?.toLowerCase()} currentUser={user} permissions={permissions} initialTab={step.tab} readOnly={!assigned || !mechanic || log.status === 'completed'} onDraftChange={setDraft} onClose={onClose} /></View>
        </>}
        {['pre', 'post'].includes(tab) && <>
          {assigned && mechanic && permissions.preparation && <Action onPress={() => execute(`${id}/inspections`, {
              expectedVersion: log.__v || 0
            }, 'POST', true)}>Add Linked Inspection Pair</Action>}
          {(tab === 'pre' ? workspace.preInspections : workspace.postInspections).map(record => <Inspection flightStage={log.status} key={`${record._id}:${record.__v}`} record={record} kind={tab} editable={assigned && log.status !== 'completed'} mechanic={mechanic} onConfirm={(kind, record, values) => setInspectionPrompt({ kind, record, values })} onSave={saveInspection} onReturn={reason => execute(`${id}/inspections/${tab}/${record._id}`, {
              action: 'return',
              comment: reason,
              expectedVersion: record.__v || 0
            }, 'PUT', true)} />)}
          {!(tab === 'pre' ? workspace.preInspections : workspace.postInspections).length && <AppText>The assigned mechanic can add an inspection pair during preparation.</AppText>}
        </>}
        {tab === 'defects' && <>
          {assigned && mechanic && log.status !== 'completed' && <Action onPress={() => setDefect({
              description: '',
              status: 'open',
              resolution: '',
              evidence: ''
            })}>Report Defect</Action>}
          {workspace.defects.map(d => <View key={d._id} style={panel}><AppText style={{
                fontWeight: '700'
              }}>{d.status}: {d.description}</AppText><AppText>{d.resolution}</AppText>{!!d.deferralReference && <AppText>Deferral basis: {d.deferralReference} · Due: {when(d.dueDate)}</AppText>}{d.signedBy && <AppText>{d.signedBy.name} · {when(d.signedBy.timestamp)}</AppText>}{assigned && mechanic && log.status !== 'completed' && <Action onPress={() => setDefect(d)}>Record Disposition</Action>}</View>)}
        </>}
        {tab === 'history' && <>
          <Action onPress={() => Share.share({
              message: JSON.stringify(workspace, null, 2)
            })}>Share Record & Audit History</Action>
          {permissions.canAmend && <Action onPress={() => setAmendment({
              field: mechanic ? 'maintenance_work' : 'flight_details',
              after: '',
              comment: ''
            })}>Add Signed Amendment</Action>}
          {workspace.amendments.map((a, i) => <View key={i} style={panel}><AppText>{a.section}: {a.correction}{'\n'}{a.reason}{'\n'}{a.signer?.name} · {when(a.at)}</AppText></View>)}
          {[...workspace.history].reverse().map((e, i) => <View key={i} style={panel}><AppText style={{
                fontWeight: '700'
              }}>{e.action.replace(/_/g, ' ')} · {when(e.at)}</AppText><AppText>{e.signer?.name || e.actorName || e.actorId} · Version {e.version}</AppText><AppText>{e.comment}</AppText><AppText selectable>{JSON.stringify(e.changes, null, 2)}</AppText></View>)}
        </>}
        {permissions.preparation && [...workspace.readiness.missing, ...workspace.readiness.warnings].map((message, i) => <AppText key={i} style={{
            marginVertical: 4
          }}>• {message}</AppText>)}
        {!!workspace.readiness.maintenanceDue?.length && <View style={panel}>
          <AppText>{workspace.readiness.maintenanceDue.length} maintenance warnings — release is allowed</AppText>
          <Action onPress={() => setShowMaintenanceDue(value => !value)}>{showMaintenanceDue ? 'Hide overdue items' : 'View overdue items from Parts Lifespan Monitoring'}</Action>
          {showMaintenanceDue && workspace.readiness.maintenanceDue.map((item, i) => <AppText key={i} style={{ marginVertical: 4 }}>{item}</AppText>)}
        </View>}
        {mechanic && needsMyFlightAction(user, log) && <Action disabled={busy} onPress={advance}>{step.button}</Action>}
        {permissions.canSave && <Action disabled={busy} onPress={() => execute(id, {
            changes: draft,
            expectedVersion: log.__v || 0
          })}>Save Draft</Action>}
        {permissions.canReturn && <Action onPress={() => {
            setComment('');
            setReturning(true);
          }}>Return for Correction</Action>}
      </>}
    </ScrollView>
    {!sign && (returning || !!review || !!defect || !!amendment) && <View style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 900,
        backgroundColor: '#0007',
        justifyContent: 'center',
        padding: 16
      }}><ScrollView style={{
          maxHeight: '85%',
          backgroundColor: '#fff',
          borderRadius: 12
        }} contentContainerStyle={{
          padding: 18
        }} keyboardShouldPersistTaps="handled">
      {returning && <><AppText>Explain what needs correcting.</AppText><TextInput style={input} multiline value={comment} onChangeText={setComment} /><Action onPress={async () => {
              if (await execute(`${id}/return`, {
                changes: draft,
                comment,
                expectedVersion: log.__v || 0
              })) setReturning(false);
            }}>Return</Action></>}
      {review && <><AppText style={{
              fontWeight: '700'
            }}>Review Before Closure</AppText>{review.missing.map((m, i) => <AppText key={i} style={{
              color: '#b12626'
            }}>• {m}</AppText>)}{review.totals.map(row => <View key={row.path} style={panel}><AppText>{row.item}</AppText><AppText>Brought forward: {row.broughtForward ?? 'Missing'} · This flight: {row.thisFlight ?? 'Missing'} · To date: {row.toDate ?? 'Missing'}</AppText></View>)}{review.monitoringReconciliation?.required && <View style={panel}><AppText style={{
                fontWeight: '700'
              }}>Parts Monitoring changed after release</AppText><AppText>Compare the baseline before signing reconciliation. Confirm this flight has not already been added.</AppText><AppText selectable>At release: {JSON.stringify(review.monitoringReconciliation.previous, null, 2)}</AppText><AppText selectable>Current: {JSON.stringify(review.monitoringReconciliation.current, null, 2)}</AppText><TextInput style={input} multiline placeholder="Reason for using the current monitoring baseline" value={comment} onChangeText={setComment} /><Action disabled={!comment.trim()} onPress={() => {
                setReview(null);
                setSign({
                  path: `${id}/reconcile`,
                  body: {
                    expectedVersion: log.__v || 0,
                    comment
                  },
                  preserve: true,
                  title: 'Sign Monitoring Reconciliation'
                });
              }}>Sign Reconciliation</Action></View>}<Action disabled={!!review.missing.length || review.monitoringReconciliation?.required} onPress={() => {
              setReview(null);
              setInspectionPrompt({ kind: 'post', record: workspace.postInspections[0], complete: true });
            }}>Continue to Post-Flight</Action></>}
      {defect && <><AppText>Aircraft Defect</AppText><TextInput style={input} placeholder="Description" multiline editable={!defect._id} value={defect.description} onChangeText={value => setDefect({
              ...defect,
              description: value
            })} /><TextInput style={input} placeholder="Evidence link (HTTPS)" editable={!defect._id} value={defect.evidence} onChangeText={value => setDefect({
              ...defect,
              evidence: value
            })} /><Choice disabled={!mechanic} values={['open', 'rectified', 'deferred'].map(value => [value, value])} value={defect.status} onChange={value => setDefect({
              ...defect,
              status: value
            })} /><TextInput style={input} multiline placeholder="Work performed / deferral limitations" value={defect.resolution} onChangeText={value => setDefect({
              ...defect,
              resolution: value
            })} />{defect.status === 'deferred' && <><TextInput style={input} placeholder="Approved deferral reference" value={defect.deferralReference} onChangeText={value => setDefect({
                ...defect,
                deferralReference: value
              })} /><TextInput style={input} placeholder="Deadline: YYYY-MM-DDTHH:mm+08:00" value={defect.dueDate || ''} onChangeText={value => setDefect({
                ...defect,
                dueDate: value
              })} /></>}<Action onPress={saveDefect}>Save{defect.status === 'open' ? '' : ' & Sign Disposition'}</Action></>}
      {amendment && <><AppText>The original record remains intact. Usage corrections require maintenance-ledger reconciliation.</AppText><Choice values={(mechanic ? ['flight_details', 'maintenance_work', 'servicing', 'discrepancies'] : ['flight_details', 'discrepancies']).map(value => [value, value.replace(/_/g, ' ')])} value={amendment.field} onChange={field => setAmendment({
              ...amendment,
              field
            })} /><TextInput style={input} multiline placeholder="Corrected information" value={amendment.after} onChangeText={after => setAmendment({
              ...amendment,
              after
            })} /><TextInput style={input} multiline placeholder="Reason" value={amendment.comment} onChangeText={comment => setAmendment({
              ...amendment,
              comment
            })} /><Action onPress={() => setSign({
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
            })}>Review & Sign</Action></>}
      {!!error && <AppText style={{
            color: '#b12626'
          }}>{error}</AppText>}
      <Action onPress={() => {
            setReturning(false);
            setReview(null);
            setDefect(null);
            setAmendment(null);
          }}>Cancel</Action>
    </ScrollView></View>}
    {inspectionPrompt && <InspectionConfirmationPrompt {...inspectionPrompt} error={error} busy={busy} onCancel={() => setInspectionPrompt(null)} onYes={resolution => confirmInspection(true, '', resolution)} onNo={remarks => confirmInspection(false, remarks)} />}
    <PinVerifiedSignatureModal pinOnly={sign?.reusePreflight === true} confirmDescription={sign?.reusePreflight ? 'Your Pre-Flight signature will be appended. Enter your six-digit PIN to release the flight log.' : undefined} initialSignature={sign?.initialSignature || (sign?.appendSignature ? log?.initialInspectionSignature?.signature : '')} useNativeModal={false} visible={!!sign} title={sign?.title || 'Sign'} description="Review the submitted information, then confirm your signature with your six-digit PIN." onClose={() => setSign(null)} onSave={async (signature, {
        pin
      }) => {
        const ok = await execute(sign.path, {
          ...sign.body,
          signature,
          pin
        }, sign.method || 'PUT', sign.preserve, true);
        if (ok) {
          setDefect(null);
          setAmendment(null);
        }
        return ok;
      }} />
  </SafeAreaView></Modal>;
}
function Inspection({
  kind,
  record,
  editable,
  mechanic,
  onSave,
  onReturn,
  onConfirm,
  flightStage
}) {
  const [values, setValues] = useState(record),
    [reason, setReason] = useState('');
  const b412 = /412/.test(record.aircraftType || ''),
    checks = b412 ? (kind === 'pre' ? BP : BO).sections.flatMap(s => s.items) : AS[kind],
    writable = editable && mechanic && record.status === 'pending' && (kind === 'pre' ? ['pending_release', 'returned_to_mechanic'].includes(flightStage) : ['accepted', 'returned_to_pilot', 'submitted'].includes(flightStage));
  return <View style={panel}><AppText style={{
      fontWeight: '700'
    }}>{kind === 'pre' ? 'Pre-Flight' : 'Post-Flight'} · {record.date} · {record.status}</AppText>
    {record.releasedBy?.name && <AppText>Certified by {record.releasedBy.name} · {when(record.releasedBy.timestamp)}</AppText>}
    {!mechanic && <AppText>{kind === 'pre' ? 'Fuel on board' : 'Notes'}: {(kind === 'pre' ? values.fob : values.notes) ?? 'Not recorded'}</AppText>}
    {mechanic && <TextInput style={input} editable={writable} placeholder={kind === 'pre' ? 'Fuel on board' : 'Notes'} value={String((kind === 'pre' ? values.fob : values.notes) || '')} onChangeText={value => setValues({
      ...values,
      [kind === 'pre' ? 'fob' : 'notes']: value
    })} />}
    {checks.map(item => {
      const checked = b412 ? values.b412Data?.checks?.[item.key] === true : values[item.key] === true;
      return <TouchableOpacity key={item.key} accessibilityRole="checkbox" accessibilityState={{
        checked,
        disabled: !writable
      }} disabled={!writable} style={{
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: '#eee'
      }} onPress={() => setValues(b412 ? {
        ...values,
        b412Data: {
          checks: {
            ...values.b412Data?.checks,
            [item.key]: !checked
          }
        }
      } : {
        ...values,
        [item.key]: !checked
      })}><AppText>{checked ? '☑' : '☐'} {item.title} — {item.description}</AppText></TouchableOpacity>;
    })}
    {record.confirmation?.allGood === false && <AppText>Inspection on hold: {record.confirmation.remarks}</AppText>}
    {writable && <Action onPress={() => onConfirm(kind, record, values)}>Confirm Inspection</Action>}
    {editable && !mechanic && kind === 'pre' && record.status === 'released' && flightStage === 'pending_acceptance' && <Action onPress={() => onSave(kind, record, values, 'completed')}>Accept Pre-Flight</Action>}
    {editable && mechanic && record.status !== 'pending' && (kind === 'post' ? mechanic : ['pending_release', 'returned_to_mechanic'].includes(flightStage)) && <><TextInput style={input} placeholder="Correction reason" value={reason} onChangeText={setReason} /><Action onPress={() => onReturn(reason)}>Return Inspection for Correction</Action></>}
  </View>;
}
