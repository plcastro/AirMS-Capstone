// Human-readable workflow information accompanying the original technical-log pages.
export const flightWorkflowExportRows = (record = {}) => {
  const rows = [
    ['Current stage', record.status || ''],
    ['Assigned pilot', record.assignedPilot?.name || 'Unassigned'],
    ['Responsible mechanic', record.assignedMechanic?.name || 'Unassigned'],
    ['Flight purpose', [record.flightPurpose?.replace(/_/g, ' '), record.purposeDetails].filter(Boolean).join(' - ')],
  ];
  for (const [key, label] of [['releasedBy', 'Released'], ['acceptedBy', 'Accepted'], ['submittedBy', 'Flight details submitted'], ['completedBy', 'Record closed']]) {
    const signer = record[key];
    if (signer?.name) rows.push([label, [signer.name, signer.licenseNo, signer.timestamp, signer.authorizationReference].filter(Boolean).join(' | ')]);
  }
  for (const item of record.amendments || []) {
    rows.push([`AMENDMENT: ${item.section || 'Correction'}`, [item.correction, `Reason: ${item.reason || ''}`, item.signer?.name, item.signer?.licenseNo, item.at].filter(Boolean).join('\n')]);
  }
  for (const item of record.workItems || []) {
    if (item.phase !== 'post_flight') continue;
    rows.push(['Post-flight maintenance work', [item.date, item.workDone || item.description,
      item.name || item.performedBy, item.certificateNumber].filter(Boolean).join('\n')]);
  }
  for (const entry of record.workflowHistory || []) {
    rows.push([`v${entry.version} ${(entry.action || 'Update').replace(/_/g, ' ')}`, [entry.at, entry.signer?.name || entry.actorName || entry.actorId, entry.comment, entry.digest ? `Signed snapshot SHA-256: ${entry.digest}` : ''].filter(Boolean).join('\n')]);
  }
  return rows;
};
