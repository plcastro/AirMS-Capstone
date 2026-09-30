import React, { useEffect, useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import Modal from '../common/AppModal';
import IosModalSafeAreaProvider from '../common/IosModalSafeAreaProvider';
import AppText from '../common/AppText';
import PinVerifiedSignatureModal from '../common/PinVerifiedSignatureModal';
import { COLORS } from '../../stylesheets/colors';
import { API_BASE } from '../../utilities/API_BASE';
import { getAuthHeaders } from '../../utilities/mobileApi';
import { hasOngoingFlightLog } from '../../../shared/flightWorkflow';

export default function FlightEntryInspectionPrompt({ visible, lockedRpc, flightLogs = [], onClose, onConfirmed }) {
  const [rpc, setRpc] = useState(''), [options, setOptions] = useState([]), [remarks, setRemarks] = useState('');
  const [no, setNo] = useState(false), [signing, setSigning] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const ongoingFlight = hasOngoingFlightLog(flightLogs, rpc);
  const cannotContinue = !rpc.trim() || busy || ongoingFlight;

  useEffect(() => {
    if (!visible) return;
    setRpc(lockedRpc || '');
    setRemarks('');
    setNo(false);
    setSigning(false);
    setError('');
    fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`).then(r => r.json()).then(r => setOptions(r.data || [])).catch(() => setOptions([]));
  }, [visible, lockedRpc]);

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
        body: JSON.stringify({ rpc, allGood, remarks, signature, pin }),
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

              <AppText style={{ fontSize: 12, fontWeight: '700', color: COLORS.black, marginBottom: 12 }}>
                Were all pre-flight inspection items satisfactory?
              </AppText>

              <TouchableOpacity
                disabled={cannotContinue}
                onPress={() => !cannotContinue && setSigning(true)}
                style={{
                  backgroundColor: COLORS.primaryLight,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginBottom: 8,
                  opacity: cannotContinue ? 0.45 : 1,
                }}
              >
                <AppText style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>Yes, sign and continue</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={cannotContinue}
                onPress={() => !cannotContinue && setNo(true)}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.dangerBorder,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: cannotContinue ? 0.45 : 1,
                }}
              >
                <AppText style={{ color: COLORS.dangerBorder, fontSize: 12, fontWeight: '600' }}>No, record discrepancies</AppText>
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

          {no && (
            <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 800, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: COLORS.white, borderRadius: 16, padding: 20 }}>
                <AppText style={{ fontSize: 16, fontWeight: '700', color: COLORS.black, marginBottom: 6 }}>Pre-Flight Discrepancies / Remarks</AppText>
                <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 10 }}>The inspection stays on hold until resolved.</AppText>
                {!!error && <AppText style={{ color: COLORS.dangerBorder, fontSize: 12, marginBottom: 8 }}>{error}</AppText>}
                <TextInput
                  multiline
                  value={remarks}
                  onChangeText={setRemarks}
                  style={{ minHeight: 100, padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, fontSize: 12, marginBottom: 12, textAlignVertical: 'top' }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <TouchableOpacity
                    disabled={busy}
                    onPress={() => setNo(false)}
                    style={{ paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.grayMedium, borderRadius: 8 }}
                  >
                    <AppText style={{ color: COLORS.grayDark, fontSize: 12, fontWeight: '600' }}>Cancel</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!remarks.trim() || cannotContinue}
                    onPress={() => submit(false)}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: COLORS.primaryLight,
                      opacity: (!remarks.trim() || cannotContinue) ? 0.5 : 1,
                    }}
                  >
                    <AppText style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>Continue with inspection on hold</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

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
