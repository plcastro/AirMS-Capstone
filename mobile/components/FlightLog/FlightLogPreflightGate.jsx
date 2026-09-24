import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import Modal from '../common/AppModal';
import AppText from '../common/AppText';
import AppInput from '../common/AppInput';
import PinVerifiedSignatureModal from '../common/PinVerifiedSignatureModal';
import { COLORS } from '../../stylesheets/colors';

export default function FlightLogPreflightGate({ visible, aircraftRpc, onClose, onConfirmed }) {
  const [step, setStep] = useState('question');
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const key = aircraftRpc || 'new-aircraft';
  const draft = drafts[key] || { remarks: '', resolution: '', onHold: false };
  const update = changes => setDrafts(previous => ({ ...previous, [key]: { ...draft, ...changes } }));
  useEffect(() => { if (visible) setStep(drafts[key]?.onHold ? 'remarks' : 'question'); }, [visible, key]);
  const close = () => { setError(''); onClose(); };
  const button = (label, onPress, primary = false) => <TouchableOpacity accessibilityRole="button" onPress={onPress}
    style={{ padding: 14, borderRadius: 6, marginTop: 12, backgroundColor: primary ? COLORS.primaryLight : '#eee' }}>
    <AppText style={{ color: primary ? '#fff' : '#333', textAlign: 'center' }}>{label}</AppText>
  </TouchableOpacity>;
  return <>
    <Modal visible={visible && step !== 'signature'} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0008', padding: 20 }}>
        <View style={{ maxHeight: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <AppText style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
              {step === 'remarks' ? 'Pre-flight discrepancy / remarks' : 'Pre-flight inspection'}
            </AppText>
            {!!aircraftRpc && <AppText style={{ fontWeight: '700', marginBottom: 12 }}>{aircraftRpc}</AppText>}
            {step === 'question' ? <>
              <AppText>Has the pre-flight inspection been completed with no discrepancies?</AppText>
              {button('Yes — sign and continue', () => setStep('signature'), true)}
              {button('No — record discrepancies', () => { update({ onHold: true }); setStep('remarks'); })}
            </> : <>
              <AppText>Entry on hold. Resolve the discrepancies before proceeding. These pending notes stay available while this screen remains open; no flight log has been saved yet.</AppText>
              <AppText style={{ marginTop: 16 }}>Discrepancies / remarks</AppText>
              <AppInput accessibilityLabel="Pre-flight discrepancies" multiline value={draft.remarks}
                onChangeText={remarks => update({ remarks })} style={{ minHeight: 100, borderWidth: 1, borderColor: '#ccc', padding: 12, textAlignVertical: 'top' }} />
              <AppText style={{ marginTop: 16 }}>Resolution / corrective action</AppText>
              <AppInput accessibilityLabel="Pre-flight resolution" multiline value={draft.resolution}
                onChangeText={resolution => update({ resolution })} style={{ minHeight: 90, borderWidth: 1, borderColor: '#ccc', padding: 12, textAlignVertical: 'top' }} />
              {!!error && <AppText style={{ color: '#b42318', marginTop: 12 }}>{error}</AppText>}
              {button('Resolved — sign and continue', () => {
                if (!draft.remarks.trim() || !draft.resolution.trim()) { setError('Enter the discrepancies and how they were resolved before signing.'); return; }
                setError(''); setStep('signature');
              }, true)}
            </>}
            {button('Close', close)}
          </ScrollView>
        </View>
      </View>
    </Modal>
    {visible && step === 'signature' && <PinVerifiedSignatureModal visible
      title="Pre-flight inspection confirmation"
      description="Sign to confirm that the pre-flight inspection is complete and all discrepancies, if any, have been resolved."
      confirmDescription="Enter your 6-digit PIN to confirm the pre-flight inspection and open the flight log."
      onClose={close} onSave={async signature => {
        await onConfirmed({ status: 'confirmed', signature, remarks: draft.remarks.trim(), resolution: draft.resolution.trim() });
        setDrafts(previous => { const next = { ...previous }; delete next[key]; return next; });
      }} />}
  </>;
}
