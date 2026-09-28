import React, { useContext, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Switch, ActivityIndicator, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../Context/AuthContext';
import AppText from './common/AppText';
import Modal from './common/AppModal';
import IosModalSafeAreaView from './common/IosModalSafeAreaView';
import { API_BASE } from '../utilities/API_BASE';
import { getAuthHeaders } from '../utilities/mobileApi';
import { saveExportFile } from '../utilities/saveExportFile';
import { certificateFields, certificateLabel, certificateStatusLabel, certificateReviewReasons, certificateUploadLabel, createCertificateApi, createUseCertificates } from '../../shared/certificateClient';

const api = createCertificateApi(API_BASE, getAuthHeaders);
const useCertificates = createUseCertificates(React);
const card = { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#dde7df' };
const input = { borderWidth: 1, borderColor: '#c8d7ce', borderRadius: 8, padding: 12, marginVertical: 6, color: '#172b21', backgroundColor: '#f8fbf9', minHeight: 46 };
const title = { fontWeight: '700', fontSize: 17, color: '#173f29', marginBottom: 8 };
const date = value => value ? new Date(value).toLocaleString() : '—';
function Action({ children, onPress, disabled, primary }) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ padding: 12, borderRadius: 8, marginVertical: 4, opacity: disabled ? 0.45 : 1, backgroundColor: primary ? '#087b39' : '#eaf3ed', minHeight: 44 }}><AppText style={{ color: primary ? 'white' : '#174c2c', fontWeight: '700', textAlign: 'center' }}>{children}</AppText></TouchableOpacity>;
}
function Decisions({ results = [] }) {
  return results.map(result => <View key={result.aircraft} style={card}><AppText style={title}>{result.aircraft} · {result.qualified ? 'All tasks allowed' : 'Not qualified'}</AppText><AppText>{(result.qualified ? result.matchedRules : result.failedRules).join(' ')}</AppText>{result.validThrough && <AppText>Valid through {result.validThrough}</AppText>}</View>);
}
export default function MechanicCertificates({ personnelId }) {
  const { user } = useContext(AuthContext), state = useCertificates(user, api, personnelId);
  const [showEvidence, setShowEvidence] = useState(false);
  const record = state.selected, editable = record?.status === 'PENDING_REVIEW' && record?.processingStatus === 'ANALYZED';
  const ownerName = state.people.find(person => person.id === state.person)?.name || 'this mechanic';
  const upload = async () => {
    const files = await state.run('Selecting certificates', async current => {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true, multiple: true });
      return current() && !result.canceled ? result.assets : [];
    });
    if (!files?.length) return;
    await state.upload(files, asset => {
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || (/\.pdf$/i.test(asset.name) ? 'application/pdf' : /\.png$/i.test(asset.name) ? 'image/png' : 'image/jpeg') });
      return form;
    });
  };
  const download = () => state.run('Downloading original', async () => {
    const response = await api(`/${record.id}/file`, { file: true });
    await saveExportFile({ fileName: record.file.name, mimeType: record.file.mimeType, bytes: await response.arrayBuffer() });
  });
  const confirm = () => Alert.alert('Confirm reviewed certificate?', 'This records your review and makes eligible aircraft ratings available for task assignment. Expiry and restrictions still apply.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm and save', onPress: state.confirm }]);
  const feedback = <>{state.error ? <AppText accessibilityRole="alert" style={{ color: '#b42318', padding: 12 }}>{state.error}</AppText> : null}{state.notice ? <AppText accessibilityLiveRegion="polite" style={{ color: '#174c2c', padding: 12 }}>{state.notice}</AppText> : null}{state.busy ? <View style={{ padding: 12 }}><ActivityIndicator color="#087b39" /><AppText>{state.busy}</AppText></View> : null}</>;
  return <View style={{ flex: 1, backgroundColor: '#f3f7f4' }}>
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
      <AppText style={{ ...title, fontSize: 22 }}>Certificates & qualifications</AppText>
      <AppText style={{ marginBottom: 14 }}>Upload certificates and we’ll read them for you. Clear, complete readings are accepted automatically. We’ll ask for help when details need attention.</AppText>
      <View style={card}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['all', 'PENDING_REVIEW', 'VERIFIED'].map(value => <Action key={value} primary={state.status === value} disabled={!!state.busy} onPress={() => state.setStatus(value)}>{value === 'all' ? 'All' : certificateStatusLabel({ status: value })}</Action>)}</View>
        <Action primary disabled={!state.person || !!state.busy} onPress={upload}>Upload certificates</Action>
        <AppText>PDF, JPG or PNG · up to 4 MiB · PDF up to 20 pages</AppText>
        <Action disabled={!!state.busy} onPress={state.refresh}>Refresh</Action>
      </View>
      {!record && feedback}
      {!!state.uploadResults.length && <View style={card} accessibilityLiveRegion="polite"><AppText style={title}>{state.uploadResults.filter(item => item.status === 'uploaded').length} of {state.uploadResults.length} certificates uploaded</AppText>{state.uploadResults.map((item, index) => <View key={index} style={{ marginBottom: 8 }}><AppText style={{ color: item.record?.status === 'VERIFIED' ? '#174c2c' : '#9b5600' }}>{certificateUploadLabel(item)}: {item.name}{item.message ? ` — ${item.message}` : ''}</AppText>{item.status === 'uploaded' && item.record?.status !== 'VERIFIED' && <Action disabled={!!state.busy} onPress={() => state.open(item.record)}>Check details</Action>}</View>)}<AppText>Accepted certificates need no further action. Files marked “Needs attention” are saved and ready to check.</AppText></View>}
      {state.qualifications && <><AppText style={title}>Current qualifications</AppText><Decisions results={state.qualifications.results} /></>}
      {!state.busy && !state.listing.data.length && <AppText style={{ padding: 20 }}>{state.person ? 'No certificates match this filter.' : 'Select a mechanic to view their certificates.'}</AppText>}
      {state.listing.data.map(item => <View style={card} key={item.id}><AppText style={title}>{item.normalizedData?.certificateType || item.file?.name || 'Certificate'}</AppText><AppText>{certificateStatusLabel(item)}</AppText><AppText>{item.normalizedData?.aircraftRatings?.join(', ') || 'Aircraft ratings await analysis'}</AppText><AppText>Uploaded {date(item.createdAt)}</AppText><Action disabled={!!state.busy} onPress={() => { setShowEvidence(false); state.open(item); }}>{item.status === 'PENDING_REVIEW' ? 'Review certificate' : 'View certificate'}</Action></View>)}
      {state.person && <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Action disabled={state.page <= 1 || !!state.busy} onPress={() => state.setPage(state.page - 1)}>Previous</Action><AppText>Page {state.page}</AppText><Action disabled={state.page * 25 >= state.listing.pagination.total || !!state.busy} onPress={() => state.setPage(state.page + 1)}>Next</Action></View>}
    </ScrollView>
    <Modal visible={!!record} animationType="slide" onRequestClose={() => { if (!state.busy) state.close(); }}>
      <IosModalSafeAreaView style={{ flex: 1, backgroundColor: '#f3f7f4' }}>
        <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#d8e4dc' }}><AppText style={title}>Certificate review</AppText><AppText>{record?.file?.name}</AppText></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
          {feedback}
          {record && <>
            <View style={card}><AppText style={title}>{certificateStatusLabel(record)}</AppText><AppText>Owner: {ownerName}</AppText><Action onPress={download} disabled={!!state.busy}>Download original</Action></View>
            {record.status === 'PENDING_REVIEW' && record.processingStatus !== 'ANALYZED' && <View style={card}><AppText>{record.processingStatus === 'FAILED' ? 'We couldn’t read this document. Retry reading it, or upload a clearer copy.' : 'This file is saved but has not been read yet.'}</AppText><Action primary disabled={!!state.busy} onPress={state.analyze}>{record.processingStatus === 'FAILED' ? 'Retry reading' : 'Read certificate'}</Action></View>}
            {record.normalizedData && <>
              <View style={card}><AppText style={title}>{editable ? 'A few details need your help' : certificateStatusLabel(record)}</AppText>{editable ? (certificateReviewReasons(record).length ? certificateReviewReasons(record).map(message => <AppText key={message} style={{ marginBottom: 8 }}>{message}</AppText>) : <AppText>Check the extracted details against the original document.</AppText>) : <AppText>{record.status === 'VERIFIED' ? 'No verification step is needed. You can view the saved details below.' : 'The certificate details have been saved.'}</AppText>}
                {record.holderMatch && <><AppText style={{ marginTop: 12 }}>Mechanic match: {certificateLabel(record.holderMatch.status)}</AppText>{record.holderMatch.candidates?.map(candidate => <AppText key={candidate.personnelId}>{candidate.name} · {Math.round(candidate.score * 100)}% name similarity · {candidate.personnelId === state.person ? 'current owner' : 'different owner'}</AppText>)}{record.holderMatch.suggestedPersonnelId && record.holderMatch.suggestedPersonnelId !== state.person && <AppText style={{ color: '#b42318' }}>The suggested mechanic differs from the upload owner. Upload under the correct mechanic if needed.</AppText>}</>}
              </View>
              <View style={card}>{certificateFields.map(([key, label, type]) => <View key={key} style={{ marginBottom: 8 }}><AppText>{label}</AppText><TextInput accessibilityLabel={label} style={[input, type === 'list' && { minHeight: 75, textAlignVertical: 'top' }]} multiline={type === 'list'} editable={editable && !state.busy} maxLength={type === 'list' ? 30000 : key === 'holderName' ? 160 : 1000} placeholder={type === 'date' ? 'YYYY-MM-DD' : ''} value={state.draft[key]} onChangeText={value => { state.setDraft({ ...state.draft, [key]: value }); state.setAcknowledged(false); }} /></View>)}
                <AppText>The document explicitly states that it does not expire</AppText><Switch accessibilityLabel="Certificate does not expire" disabled={!editable || !!state.busy} value={state.draft.doesNotExpire} onValueChange={value => { state.setDraft({ ...state.draft, doesNotExpire: value, ...(value ? { expiryDate: '' } : {}) }); state.setAcknowledged(false); }} />
              </View>
              {editable && <View style={card}><AppText style={title}>Review note</AppText><AppText>Explain corrections and what you checked.</AppText><TextInput accessibilityLabel="Review note" multiline maxLength={2000} style={input} editable={!state.busy} value={state.note} onChangeText={state.setNote} />
                {state.dirty && <AppText style={{ color: '#9b5600' }}>Save corrections before refreshing the preview or confirming.</AppText>}
                <Action disabled={!!state.busy || !state.note.trim()} onPress={state.save}>Save corrections & preview</Action><Action disabled={!!state.busy || state.dirty} onPress={state.previewNow}>Refresh preview</Action>
                {state.reviewer && <><AppText>I checked the original, resolved the warnings and confirm this certificate belongs to {ownerName}.</AppText><Switch accessibilityLabel="Confirm source and mechanic reviewed" value={state.acknowledged} disabled={!!state.busy || state.dirty} onValueChange={state.setAcknowledged} /><Action primary disabled={!!state.busy || state.dirty || !state.acknowledged || !state.note.trim() || !!state.preview?.errors?.length} onPress={confirm}>Confirm certificate</Action></>}
              </View>}
              {state.preview && <><AppText style={title}>Preview after confirmation</AppText><AppText style={{ marginBottom: 12 }}>This preview does not grant qualifications.</AppText>{state.preview.errors?.map(error => <AppText key={error} style={{ color: '#b42318' }}>{error}</AppText>)}<Decisions results={state.preview.results} /></>}
              {record.reviewedAt && <AppText>Confirmed {date(record.reviewedAt)}. Current qualifications reflect today’s validity.</AppText>}
              <Action onPress={() => setShowEvidence(value => !value)}>{showEvidence ? 'Hide extraction' : 'Original extraction & warnings'}</Action>
              {showEvidence && <View style={card}><AppText>{record.analysis?.certificateData?.confidence == null ? "Embedded document text" : `OCR confidence: ${Math.round(record.analysis.certificateData.confidence * 100)}%`}</AppText>{record.analysis?.certificateData?.warnings?.map((warning, index) => <AppText key={index}>{certificateLabel(warning.code)}{warning.page ? ` · page ${warning.page}` : ''}</AppText>)}<AppText selectable>{record.analysis?.extraction?.rawText || 'No readable text'}</AppText></View>}
            </>}
            {state.reviewer && ['PENDING_REVIEW', 'VERIFIED'].includes(record.status) && <View style={card}><AppText style={title}>Reject or withdraw this source</AppText>{!editable && <TextInput accessibilityLabel="Reason for rejection or revocation" placeholder="Explain why this source should not qualify the mechanic" multiline maxLength={2000} style={input} value={state.note} onChangeText={state.setNote} editable={!state.busy} />}<Action disabled={!!state.busy || !state.note.trim()} onPress={() => Alert.alert(record.status === 'VERIFIED' ? 'Revoke certificate?' : 'Reject certificate?', 'This source will not qualify the mechanic. The original and history will be retained.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: () => state.disposition(record.status === 'VERIFIED' ? 'revoke' : 'reject') }])}>{record.status === 'VERIFIED' ? 'Revoke certificate' : 'Reject certificate'}</Action></View>}
            <View style={card}><AppText style={title}>Review history</AppText>{state.history.map(item => <View key={item.id} style={{ marginBottom: 12 }}><AppText style={{ fontWeight: '700' }}>{certificateLabel(item.action)}</AppText><AppText>{date(item.createdAt)}</AppText><AppText>{item.details?.reviewNote || ''}</AppText></View>)}{state.history.length > 0 && state.history.length % 25 === 0 && <Action disabled={!!state.busy} onPress={state.moreHistory}>Load older history</Action>}</View>
          </>}
        </ScrollView>
        <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: '#d8e4dc' }}><Action disabled={!!state.busy} onPress={state.close}>Close</Action></View>
      </IosModalSafeAreaView>
    </Modal>
  </View>;
}
