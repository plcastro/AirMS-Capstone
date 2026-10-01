import React, { useEffect, useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import Modal from '../common/AppModal';
import IosModalSafeAreaProvider from '../common/IosModalSafeAreaProvider';
import AppText from '../common/AppText';
import PinVerifiedSignatureModal from '../common/PinVerifiedSignatureModal';
import { COLORS } from '../../stylesheets/colors';
import { API_BASE } from '../../utilities/API_BASE';
import { getAuthHeaders } from '../../utilities/mobileApi';
import InspectionChecklistPanel from './InspectionChecklistPanel';
import { hasOngoingFlightLog } from '../../../shared/flightWorkflow';
import AS from '../../../shared/as350InspectionChecklist.json';
import BP from '../../../shared/b412PreInspectionChecklist.json';

const checklistFor = aircraftType => /412/.test(aircraftType || '') ? BP.sections.flatMap(section => section.items) : /350/.test(aircraftType || '') ? AS.pre : [];

export default function FlightEntryInspectionPrompt({ visible, lockedRpc, flightLogs = [], onClose, onConfirmed }) {
  const [rpc, setRpc] = useState(''), [options, setOptions] = useState([]), [aircraftType, setAircraftType] = useState('');
  const [checked, setChecked] = useState({}), [discrepancies, setDiscrepancies] = useState({});
  const [signing, setSigning] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const ongoingFlight = hasOngoingFlightLog(flightLogs, rpc);
  const items = checklistFor(aircraftType);
  const checkedKeys = items.filter(item => checked[item.key]).map(item => item.key);
  const flagged = Object.keys(discrepancies);
  const missingNote = flagged.some(key => !discrepancies[key].note.trim());
  const canContinue = !!rpc.trim() && !busy && !ongoingFlight && items.length > 0;
  const canSign = canContinue && checkedKeys.length === items.length && !flagged.length;

  useEffect(() => {
    if (!visible) return;
    setRpc(lockedRpc || '');
    setSigning(false);
    setError('');
    setChecked({});
    setDiscrepancies({});
    fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`).then(r => r.json()).then(r => setOptions(r.data || [])).catch(() => setOptions([]));
  }, [visible, lockedRpc]);

  // The checklist depends on the aircraft type, so load it once a registration is chosen.
  useEffect(() => {
    setAircraftType('');
    setChecked({});
    setDiscrepancies({});
    const value = rpc.trim();
    if (!visible || !value) return undefined;
    let cancelled = false;
    fetch(`${API_BASE}/api/parts-monitoring/${encodeURIComponent(value)}`).then(r => (r.ok ? r.json() : null))
      .then(r => { if (!cancelled) setAircraftType(r?.data?.aircraftType || ''); }).catch(() => {});
    return () => { cancelled = true; };
  }, [visible, rpc]);

  const submit = async (allGood, signature, pin) => {
    if (ongoingFlight) {
      const error = new Error('This aircraft has an ongoing flight log. Complete it before creating a new entry.');
      setError(error.message);
      if (allGood) throw error;
      return false;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/flightlogs/preflight-confirmations`, {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json', 'x-action-confirmed': 'true' }),
        body: JSON.stringify({ rpc, allGood, checked: checkedKeys, discrepancies, signature, pin }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || 'Could not record the inspection.');
      setSigning(false);
      onConfirmed(result.data);
      return true;
    } catch (e) {
      setError(e.message);
      if (allGood) throw e;
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="fade" transparent>
      <IosModalSafeAreaProvider>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          justifyContent: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}>
          <View style={{
            backgroundColor: COLORS.white,
            borderRadius: 20,
            overflow: 'hidden',
            maxHeight: '92%',
          }}>
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#E8E8E8',
            }}>
              <AppText style={{ fontSize: 16, fontWeight: '700', color: COLORS.black }}>Pre-Flight Inspection</AppText>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16 }}>
              {!!error && <AppText style={{ color: COLORS.dangerBorder, marginBottom: 10, fontSize: 12 }}>{error}</AppText>}

              <AppText style={{ fontSize: 12, fontWeight: '600', color: COLORS.black, marginBottom: 8 }}>Aircraft registration</AppText>
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 220, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}
              >
                {[...new Set([lockedRpc, ...options].filter(Boolean))].map((value, index, list) => {
                  const unavailable = hasOngoingFlightLog(flightLogs, value);
                  const disabled = unavailable || busy || (!!lockedRpc && lockedRpc !== value);
                  const selected = rpc === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled }}
                      disabled={disabled}
                      onPress={() => !disabled && setRpc(value)}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderBottomWidth: index < list.length - 1 ? 1 : 0,
                        borderBottomColor: COLORS.border,
                        backgroundColor: selected ? `${COLORS.primaryLight}12` : COLORS.white,
                      }}
                    >
                      <AppText style={{ fontSize: 12, color: disabled ? COLORS.grayDark : COLORS.black, fontWeight: selected ? '700' : '500' }}>
                        {value}{unavailable ? ' (ongoing flight log)' : ''}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {ongoingFlight && (
                <AppText style={{ color: COLORS.dangerBorder, fontSize: 12, marginBottom: 12 }}>
                  Complete this aircraft's ongoing flight log before creating a new entry.
                </AppText>
              )}

              {canContinue && (
                <View style={{ marginBottom: 12 }}>
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: COLORS.black, marginBottom: 6 }}>
                    Review every pre-flight item in person.
                  </AppText>
                  <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 10 }}>
                    Check each item, or flag it as a discrepancy. You can save a draft and finish later; the flight log cannot be released until the checklist is complete and any discrepancy is resolved.
                  </AppText>
                  <InspectionChecklistPanel
                    items={items}
                    checked={checked}
                    discrepancies={discrepancies}
                    disabled={busy}
                    onChange={next => { setChecked(next.checked); setDiscrepancies(next.discrepancies); }}
                  />
                </View>
              )}
              {!!rpc.trim() && !ongoingFlight && !items.length && (
                <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 12 }}>Loading the checklist for this aircraft…</AppText>
              )}

              <TouchableOpacity
                disabled={!canSign}
                onPress={() => canSign && setSigning(true)}
                style={{
                  backgroundColor: COLORS.primaryLight,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginBottom: 8,
                  opacity: canSign ? 1 : 0.45,
                }}
              >
                <AppText style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>Sign and continue</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!canContinue || missingNote}
                onPress={() => canContinue && !missingNote && submit(false)}
                style={{
                  borderWidth: 1,
                  borderColor: flagged.length ? COLORS.dangerBorder : COLORS.primaryLight,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: !canContinue || missingNote ? 0.45 : 1,
                }}
              >
                <AppText style={{ color: flagged.length ? COLORS.dangerBorder : COLORS.primaryLight, fontSize: 12, fontWeight: '600' }}>
                  {flagged.length ? 'Save draft with discrepancies' : 'Save draft and continue'}
                </AppText>
              </TouchableOpacity>
            </ScrollView>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: '#E8E8E8',
            }}>
              <TouchableOpacity
                disabled={busy}
                onPress={onClose}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: COLORS.grayMedium,
                  borderRadius: 8,
                }}
              >
                <AppText style={{ color: COLORS.grayDark, fontSize: 12, fontWeight: '600' }}>Cancel</AppText>
              </TouchableOpacity>
            </View>
          </View>

          <PinVerifiedSignatureModal
            useNativeModal={false}
            visible={signing}
            title="Confirm Pre-Flight Inspection"
            description="I confirm every pre-flight checklist item is satisfactory. Apply my signature to this inspection and this flight's servicing entries."
            onClose={() => setSigning(false)}
            onSave={(signature, { pin }) => submit(true, signature, pin)}
          />
        </View>
      </IosModalSafeAreaProvider>
    </Modal>
  );
}
