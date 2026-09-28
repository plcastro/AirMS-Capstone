import React, { useContext, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../Context/AuthContext';
import AppText from './common/AppText';
import Modal from './common/AppModal';
import IosModalSafeAreaView from './common/IosModalSafeAreaView';
import { API_BASE } from '../utilities/API_BASE';
import { getAuthHeaders } from '../utilities/mobileApi';
import { saveExportFile } from '../utilities/saveExportFile';
import { certificateSummaryFields, aircraftLabel, certificateLabel, certificateStatusLabel, certificateReviewReasons, certificateUploadLabel, createCertificateApi, createUseCertificates } from '../../shared/certificateClient';

const api = createCertificateApi(API_BASE, getAuthHeaders);
const useCertificates = createUseCertificates(React);
const card = { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#dde7df' };
const input = { borderWidth: 1, borderColor: '#c8d7ce', borderRadius: 8, padding: 12, marginVertical: 6, color: '#172b21', backgroundColor: '#f8fbf9', minHeight: 46 };
const title = { fontWeight: '700', fontSize: 17, color: '#173f29', marginBottom: 8 };
const date = value => value ? new Date(value).toLocaleString() : '';
function Action({ children, onPress, disabled, primary }) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ padding: 12, borderRadius: 8, marginVertical: 4, opacity: disabled ? 0.45 : 1, backgroundColor: primary ? '#087b39' : '#eaf3ed', minHeight: 44 }}><AppText style={{ color: primary ? 'white' : '#174c2c', fontWeight: '700', textAlign: 'center' }}>{children}</AppText></TouchableOpacity>;
}
function Decisions({ results = [], open, busy }) {
  return results.map(result => <View key={result.aircraft} style={card}>
    <AppText style={title}>{aircraftLabel(result.aircraft)}</AppText>
    <AppText style={{ fontWeight: '700' }}>{result.qualified ? 'Approved for all tasks' : 'Not approved'}</AppText>
    <AppText>{result.qualified ? 'A certificate linked to this mechanic matches this aircraft.' : 'No accepted certificate currently qualifies this mechanic for this aircraft.'}</AppText>
    {(result.approvalEvidence || []).map(source => <View key={source.certificateId} style={{ marginTop: 8 }}>
      <AppText style={{ fontWeight: '700' }}>{source.certificateType || 'Certificate'}</AppText>
      {source.evidence.slice(0, 1).map((item, index) => <AppText key={index}>Matched “{item.detectedText}” in “{item.qualification}”.</AppText>)}
      <Action disabled={busy} onPress={() => open({ id: source.certificateId })}>Why this mechanic was approved</Action>
    </View>)}
    {result.validThrough && <AppText>Valid through {result.validThrough}</AppText>}
  </View>);
}
function AircraftMatch({ record, results = [] }) {
  const data = record.normalizedData || {}, detected = data.detectedAircraft || [];
  const models = [...new Set(detected.map(item => item.aircraftType).concat(data.aircraftRatings || []))];
  const approved = results.filter(result => result.qualified && result.sourceCertificates.includes(record.id));
  return <View style={card}>
    <AppText style={title}>Detected aircraft</AppText>
    <AppText>{models.length ? models.map(aircraftLabel).join(', ') : 'No supported aircraft matched the qualification.'}</AppText>
    {record.status === 'VERIFIED' && <><AppText style={{ fontWeight: '700', marginTop: 8 }}>{approved.length ? `Approved for all ${approved.map(item => aircraftLabel(item.aircraft)).join(', ')} tasks.` : results.length ? 'Certificate accepted. It does not currently grant task access.' : 'Checking task approval?'}</AppText><AppText>{record.verificationDecision?.explanation}</AppText></>}
    {detected.filter((item, index) => detected.findIndex(other => other.aircraftType === item.aircraftType) === index).map((item, index) => <AppText key={index} style={{ marginTop: 8 }}>Found “{item.detectedText}” in “{item.qualification}”{item.page ? ` on page ${item.page}` : ''}. Matches {aircraftLabel(item.aircraftType)}.</AppText>)}
    {record.verifiedAt && <AppText style={{ marginTop: 8 }}>{record.verificationMethod === 'AUTOMATIC' ? 'Accepted automatically' : 'Confirmed by a reviewer'} · {date(record.verifiedAt)}</AppText>}
  </View>;
}
export default function MechanicCertificates({ personnelId }) {
  const { user } = useContext(AuthContext), state = useCertificates(user, api, personnelId);
  const [showHistory, setShowHistory] = useState(false);
  const record = state.selected, editable = record?.status === 'PENDING_REVIEW' && record?.processingStatus === 'ANALYZED';
  const upload = async () => {
    const files = await state.run('Selecting certificates', async current => {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true, multiple: true });
      return current() && !result.canceled ? result.assets : [];
    });
    if (files?.length) await state.upload(files, asset => {
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || (/\.pdf$/i.test(asset.name) ? 'application/pdf' : /\.png$/i.test(asset.name) ? 'image/png' : 'image/jpeg') });
      return form;
    });
  };
  const download = () => state.run('Downloading original', async () => {
    const response = await api(`/${record.id}/file`, { file: true });
    await saveExportFile({ fileName: record.file.name, mimeType: record.file.mimeType, bytes: await response.arrayBuffer() });
  });
  const feedback = <>{state.error ? <AppText accessibilityRole="alert" style={{ color: '#b42318', padding: 12 }}>{state.error}</AppText> : null}{state.notice ? <AppText accessibilityLiveRegion="polite" style={{ color: '#174c2c', padding: 12 }}>{state.notice}</AppText> : null}{state.busy ? <View style={{ padding: 12 }}><ActivityIndicator color="#087b39" /><AppText>{state.busy}</AppText></View> : null}</>;
  return <View style={{ flex: 1, backgroundColor: '#f3f7f4' }}>
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
      <AppText style={{ ...title, fontSize: 22 }}>Certificates & aircraft approval</AppText>
      <AppText style={{ marginBottom: 14 }}>Upload a certificate. We read the holder, type and qualifications, then approve tasks for a matching aircraft. We ask for help if the reading is unclear.</AppText>
      <View style={card}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['all', 'PENDING_REVIEW', 'VERIFIED'].map(value => <Action key={value} primary={state.status === value} disabled={!!state.busy} onPress={() => state.setStatus(value)}>{value === 'all' ? 'All' : certificateStatusLabel({ status: value })}</Action>)}</View>
        <Action primary disabled={!state.person || !!state.busy} onPress={upload}>Upload certificates</Action>
        <AppText>PDF, JPG or PNG · up to 4 MiB · PDF up to 20 pages</AppText>
        <Action disabled={!!state.busy} onPress={state.refresh}>Refresh</Action>
      </View>
      {!record && feedback}
      {!!state.uploadResults.length && <View style={card}><AppText style={title}>Upload results</AppText>{state.uploadResults.map((item, index) => <View key={index} style={{ marginBottom: 12 }}><AppText style={{ fontWeight: '700' }}>{certificateUploadLabel(item)}</AppText><AppText>{item.name}</AppText>{item.message && <AppText>{item.message}</AppText>}{item.status === 'uploaded' && item.record?.status !== 'VERIFIED' && <Action disabled={!!state.busy} onPress={() => state.open(item.record)}>Check details</Action>}</View>)}</View>}
      {state.qualifications && <><AppText style={title}>Aircraft task approval</AppText><Decisions results={state.qualifications.results} open={state.open} busy={!!state.busy} /></>}
      {!state.listing.data.length && !state.busy && <AppText>No certificates match this filter.</AppText>}
      {state.listing.data.map(item => <View style={card} key={item.id}>
        <AppText style={title}>{item.normalizedData?.certificateType || 'Certificate'}</AppText><AppText>{certificateStatusLabel(item)}</AppText>
        <AppText style={{ fontWeight: '700', marginTop: 8 }}>Certificate holder</AppText><AppText>{item.normalizedData?.holderName || 'Not read yet'}</AppText>
        <AppText style={{ fontWeight: '700', marginTop: 8 }}>Qualifications</AppText><AppText>{item.normalizedData?.qualifications?.join('\n') || 'Not read yet'}</AppText>
        <AppText style={{ fontWeight: '700', marginTop: 8 }}>Detected aircraft</AppText><AppText>{item.normalizedData?.aircraftRatings?.map(aircraftLabel).join(', ') || 'No match yet'}</AppText>
        <Action disabled={!!state.busy} onPress={() => { setShowHistory(false); state.open(item); }}>{item.status === 'PENDING_REVIEW' ? 'Check details' : 'View certificate'}</Action>
      </View>)}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Action disabled={!!state.busy || state.page === 1} onPress={() => state.setPage(state.page - 1)}>Previous</Action><AppText>Page {state.page}</AppText><Action disabled={!!state.busy || state.page * 25 >= state.listing.pagination.total} onPress={() => state.setPage(state.page + 1)}>Next</Action></View>
    </ScrollView>
    <Modal visible={!!record} animationType="slide" onRequestClose={() => { if (!state.busy) state.close(); }}>
      <IosModalSafeAreaView style={{ flex: 1, backgroundColor: '#f3f7f4' }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <AppText style={{ ...title, fontSize: 22 }}>Certificate details</AppText>{feedback}
          {record && <>
            <View style={card}><AppText>{certificateStatusLabel(record)}</AppText><Action disabled={!!state.busy} onPress={download}>View original</Action></View>
            {record.status === 'PENDING_REVIEW' && record.processingStatus !== 'ANALYZED' && <View style={card}><AppText>This file still needs to be read.</AppText><Action primary disabled={!!state.busy} onPress={state.analyze}>Read certificate</Action></View>}
            {record.normalizedData && <>
              {editable && <View style={card}><AppText style={title}>Check these details</AppText>{(state.preview?.errors?.length ? state.preview.errors : certificateReviewReasons(record)).map(message => <AppText key={message} style={{ marginBottom: 8 }}>{message}</AppText>)}</View>}
              <View style={card}>{certificateSummaryFields.map(([key, label, type]) => <View key={key} style={{ marginBottom: 12 }}><AppText style={{ fontWeight: '700' }}>{label}</AppText>{editable ? <TextInput accessibilityLabel={label} style={[input, type === 'list' && { minHeight: 100, textAlignVertical: 'top' }]} multiline={type === 'list'} editable={!state.busy} maxLength={type === 'list' ? 30000 : key === 'holderName' ? 160 : 1000} value={state.draft[key]} onChangeText={value => state.setDraft({ ...state.draft, [key]: value })} /> : <AppText>{state.draft[key] || 'Not stated'}</AppText>}</View>)}</View>
              <AircraftMatch record={record} results={state.qualifications?.results} />
              {editable && <View style={card}><AppText>{state.reviewer ? 'Confirming records that you checked these details against the original certificate.' : 'Correct unclear text here. An authorized reviewer can confirm the corrected reading.'}</AppText><Action primary disabled={!!state.busy} onPress={state.saveSummary}>{state.reviewer ? 'Confirm details' : 'Save details'}</Action></View>}
            </>}
            <Action onPress={() => setShowHistory(value => !value)}>{showHistory ? 'Hide source notes & history' : 'Source notes & history'}</Action>
            {showHistory && <View style={card}>
              {record.normalizedData?.limitations?.map((note, index) => <AppText key={index}>Source note: {note}</AppText>)}
              {state.history.map(item => <View key={item.id} style={{ marginVertical: 8 }}><AppText>{certificateLabel(item.action)} · {date(item.createdAt)}</AppText><AppText>{item.details?.reviewNote || ''}</AppText></View>)}
              {state.history.length > 0 && state.history.length % 25 === 0 && <Action disabled={!!state.busy} onPress={state.moreHistory}>Older history</Action>}
              {state.reviewer && ['PENDING_REVIEW', 'VERIFIED'].includes(record.status) && <><TextInput accessibilityLabel="Reason for rejection or revocation" placeholder="Reason for rejecting or withdrawing this certificate" multiline maxLength={2000} style={input} value={state.note} onChangeText={state.setNote} editable={!state.busy} /><Action disabled={!!state.busy || !state.note.trim()} onPress={() => Alert.alert('Withdraw this certificate?', 'This certificate will no longer grant task access. Its original and history remain saved.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: () => state.disposition(record.status === 'VERIFIED' ? 'revoke' : 'reject') }])}>{record.status === 'VERIFIED' ? 'Withdraw approval' : 'Reject certificate'}</Action></>}
            </View>}
          </>}
        </ScrollView>
        <View style={{ padding: 12 }}><Action disabled={!!state.busy} onPress={state.close}>Close</Action></View>
      </IosModalSafeAreaView>
    </Modal>
  </View>;
}
