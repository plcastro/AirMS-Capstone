export const certificateFields = [
  ['holderName', 'Certificate holder', 'text'], ['certificateType', 'Certificate type', 'text'],
  ['certificateNumber', 'Certificate number', 'text'], ['issuingAuthority', 'Issuing authority', 'text'],
  ['issueDate', 'Issue date (YYYY-MM-DD)', 'date'], ['expiryDate', 'Expiry date (YYYY-MM-DD)', 'date'],
  ['aircraftRatings', 'Aircraft ratings — one per line', 'list'], ['qualifications', 'Qualifications — one per line', 'list'],
  ['taskAuthorizations', 'Authorizations — one per line', 'list'], ['limitations', 'Limitations — one per line', 'list'],
];
export const certificateDraft = data => Object.fromEntries([
  ...certificateFields.map(([key, , type]) => [key, type === 'list' ? (data?.[key] || []).join('\n') : data?.[key] || '']),
  ['doesNotExpire', data?.doesNotExpire === true],
]);
export const certificateCorrections = draft => Object.fromEntries([
  ...certificateFields.map(([key, , type]) => [key, type === 'list' ? String(draft[key] || '').split('\n').map(value => value.trim()).filter(Boolean) : String(draft[key] || '').trim() || null]),
  ['doesNotExpire', draft.doesNotExpire === true],
]);
export const certificateLabel = value => String(value || '').replace(/_/g, ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase());
export const certificateStatusLabel = record => record?.status === 'VERIFIED'
  ? record.verificationMethod === 'AUTOMATIC' ? 'Accepted automatically' : 'Accepted'
  : record?.status === 'PENDING_REVIEW' ? 'Needs attention' : certificateLabel(record?.status);
export const certificateReviewReasons = record => [...new Set(record?.verificationDecision?.reasons?.map(item => item.message) || [])];
export const certificateUploadLabel = item => item.status === 'uploaded'
  ? item.record?.status === 'VERIFIED' ? 'Accepted automatically' : 'Needs attention'
  : certificateLabel(item.status);

// Keep each original as its own reviewed certificate. Send one at a time so a
// large selection does not overwhelm uploads or lose successful partial results.
export async function uploadCertificateFiles({ files, send, analyze, makeForm, onProgress = () => {}, isCurrent = () => true }) {
  const results = [];
  for (let index = 0; index < files.length; index++) {
    if (!isCurrent()) break;
    const file = files[index];
    onProgress(index + 1, files.length, file.name);
    try {
      if (!/\.(pdf|jpe?g|png)$/i.test(file.name || '')) throw Error('Choose a PDF, JPG or PNG certificate.');
      if (file.size > 4 * 1024 * 1024) throw Error('This file exceeds the 4 MiB limit.');
      const response = await send(makeForm(file));
      const result = { name: file.name, status: 'uploaded', record: response.data };
      results.push(result);
      if (analyze && isCurrent()) {
        onProgress(index + 1, files.length, file.name, 'reading');
        try {
          const reading = await analyze(result.record);
          result.record = reading.data.certificate;
        } catch (error) {
          // The original is already saved. Never report this as an upload failure
          // or encourage a duplicate upload just because reading failed.
          result.message = `File saved. ${error.message || 'Could not read the document.'} Open it to retry or check the details.`;
          if ([401, 403, 429].includes(error.status)) {
            results.push(...files.slice(index + 1).map(item => ({ name: item.name, status: 'skipped', message: 'Not uploaded. Please retry later.' })));
            break;
          }
        }
      }
    } catch (error) {
      results.push({ name: file.name, status: 'failed', message: error.message || 'Upload failed.' });
      if ([401, 403, 429].includes(error.status)) {
        results.push(...files.slice(index + 1).map(item => ({ name: item.name, status: 'skipped', message: `Not uploaded: ${error.message}` })));
        break;
      }
    }
  }
  return results;
}

export function createCertificateApi(base, getHeaders) {
  return async (path, { method = 'GET', body, multipart = false, file = false } = {}) => {
    const headers = { ...(await getHeaders()) };
    for (const name of Object.keys(headers)) if (name.toLowerCase() === 'content-type') delete headers[name];
    if (body && !multipart) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') headers['x-action-confirmed'] = 'true';
    const response = await fetch(`${base}/api/certificates${path}`, { method, headers,
      ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}) });
    if (file && response.ok) return response;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(payload.message || 'Certificate request failed. Please retry.'); error.status = response.status; throw error; }
    return payload;
  };
}

export function createUseCertificates(React) {
  return function useCertificates(user, api, personnelId = '') {
    const userId = String(user?.id || user?._id || '');
    const reviewer = ['maintenance manager', 'superadmin'].includes(String(user?.jobTitle || '').toLowerCase()) || String(user?.access || '').toLowerCase() === 'superadmin';
    const scopedPerson = reviewer ? String(personnelId || '') : userId;
    const [people, setPeople] = React.useState([]), [person, setPerson] = React.useState(scopedPerson);
    const [page, setPage] = React.useState(1), [status, setStatus] = React.useState('all');
    const [listing, setListing] = React.useState({ data: [], pagination: { total: 0 } }), [qualifications, setQualifications] = React.useState(null);
    const [selected, setSelected] = React.useState(null), [draft, setDraft] = React.useState(certificateDraft(null));
    const [preview, setPreview] = React.useState(null), [history, setHistory] = React.useState([]), [historyPage, setHistoryPage] = React.useState(1);
    const [note, setNote] = React.useState(''), [acknowledged, setAcknowledged] = React.useState(false);
    const [uploadResults, setUploadResults] = React.useState([]);
    const [notice, setNotice] = React.useState('');
    const [busy, setBusy] = React.useState(''), [loading, setLoading] = React.useState(false), [error, setError] = React.useState(''), [refresh, setRefresh] = React.useState(0);
    const epoch = React.useRef(0);
    const clearDetail = () => { setSelected(null); setPreview(null); setHistory([]); setNote(''); setAcknowledged(false); };
    React.useEffect(() => {
      let active = true;
      epoch.current++; clearDetail(); setNotice(''); setUploadResults([]); setPeople([]); setPerson(scopedPerson); setPage(1); setStatus('all'); setBusy(''); setListing({ data: [], pagination: { total: 0 } }); setQualifications(null);
      api('/directory').then(result => { if (active) setPeople(result.data); }).catch(e => { if (active) setError(e.message); });
      return () => { active = false; epoch.current++; };
    }, [api, userId, reviewer, scopedPerson]);
    React.useEffect(() => {
      let active = true;
      setListing({ data: [], pagination: { total: 0 } }); setQualifications(null);
      if (!person) { setLoading(false); return; }
      setLoading(true); setError('');
      Promise.all([api(`?personnelId=${encodeURIComponent(person)}&page=${page}&status=${status}`), api(`/personnel/${person}/qualifications`)])
        .then(([list, profile]) => { if (active) { setListing(list); setQualifications(profile.data); } })
        .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [api, person, page, status, refresh]);
    const acceptDetail = record => { setSelected(record); setDraft(certificateDraft(record.normalizedData)); setAcknowledged(false); setNote(record.reviewNote || ''); };
    const run = async (label, operation) => {
      const generation = epoch.current; setBusy(label); setError('');
      try { return await operation(() => generation === epoch.current); }
      catch (e) { if (generation === epoch.current) setError(e.status === 409 ? `${e.message} Close this review and open it again to get the latest version.` : e.message); return null; }
      finally { if (generation === epoch.current) setBusy(''); }
    };
    const open = record => run('Opening certificate', async current => {
      const [detail, audit] = await Promise.all([api(`/${record.id}`), api(`/${record.id}/history`)]);
      if (current()) { acceptDetail(detail.data); setHistory(audit.data); setHistoryPage(1); setPreview(null); }
    });
    const upload = (files, makeForm) => run('Uploading certificates', async current => {
      if (!files.length) return;
      setUploadResults([]); setNotice(''); clearDetail();
      const results = await uploadCertificateFiles({ files, makeForm, isCurrent: current,
        send: form => api(`/personnel/${person}`, { method: 'POST', multipart: true, body: form }),
        analyze: record => api(`/${record.id}/analyze`, { method: 'POST', body: { expectedRevision: record.revision } }),
        onProgress: (index, total, name, phase) => setBusy(`${phase === 'reading' ? 'Reading' : 'Uploading'} ${index} of ${total}: ${name}`),
      });
      if (current()) {
        setUploadResults(results);
        const uploaded = results.filter(item => item.status === 'uploaded');
        if (uploaded.length) {
          setStatus('all'); setPage(1); setRefresh(value => value + 1);
          if (files.length === 1 && uploaded[0].record.status !== 'VERIFIED') {
            const detail = await api(`/${uploaded[0].record.id}`);
            if (current()) { acceptDetail(detail.data); setHistory([]); setPreview(null); }
          }
        }
      }
    });
    const mutate = (action, body, method = 'POST') => run(action === 'analyze' ? 'Reading certificate — this may take up to two minutes' : 'Saving review', async current => {
      const result = await api(`/${selected.id}/${action}`, { method, body: { expectedRevision: selected.revision, ...body } });
      if (current()) {
        if (action === 'preview') setPreview(result.data);
        else {
          const updated = result.data.certificate || result.data;
          if (action === 'analyze' && updated.status === 'VERIFIED') {
            clearDetail(); setNotice('Certificate accepted automatically. Your qualifications have been updated.');
          } else { acceptDetail(updated); setPreview(result.data.preview || null); }
          setRefresh(value => value + 1);
          const audit = await api(`/${selected.id}/history`);
          if (current()) { setHistory(audit.data); setHistoryPage(1); }
        }
      }
    });
    const dirty = JSON.stringify(draft) !== JSON.stringify(certificateDraft(selected?.normalizedData));
    return { people, person, page, status, listing, qualifications, selected, draft, setDraft, preview, history, note, setNote, acknowledged, setAcknowledged, reviewer, uploadResults, notice, busy: busy || (loading ? 'Loading certificates' : ''), error, dirty,
      setPerson: value => { epoch.current++; clearDetail(); setPerson(value); setPage(1); },
      setPage, setStatus: value => { setStatus(value); setPage(1); }, close: () => { epoch.current++; clearDetail(); setBusy(''); },
      refresh: () => run('Refreshing certificates', async current => { const result = await api('/directory'); if (current()) { setPeople(result.data); setRefresh(value => value + 1); } }), open, upload, run,
      analyze: () => mutate('analyze', {}), previewNow: () => mutate('preview', {}),
      save: () => mutate('review', { corrections: certificateCorrections(draft), reviewNote: note }, 'PATCH'),
      confirm: () => mutate('confirm', { confirmedPersonnelId: person, sourceReviewed: acknowledged, reviewNote: note }),
      disposition: action => mutate(action, { reviewNote: note }),
      moreHistory: () => run('Loading history', async current => { const result = await api(`/${selected.id}/history?page=${historyPage + 1}`); if (current()) { setHistory(items => [...items, ...result.data]); setHistoryPage(value => value + 1); } }),
    };
  };
}
