const AS = require('../../shared/as350InspectionChecklist.json');
const BP = require('../../shared/b412PreInspectionChecklist.json');
const BO = require('../../shared/b412PostInspectionChecklist.json');
const { fail, eventFor } = require('./flightWorkflowRules');
const checklistValues = (kind, aircraftType, checked) => /412/.test(aircraftType || '')
  ? { b412Data: { checks: Object.fromEntries((kind === 'pre' ? BP : BO).sections.flatMap(s => s.items).map(item => [item.key, checked])) } }
  : Object.fromEntries(AS[kind].map(item => [item.key, checked]));
const confirmInspection = (record, kind, allGood, remarks, signer, user) => {
  if (typeof allGood !== 'boolean') throw fail('Answer the inspection confirmation.');
  if (!allGood && !String(remarks || '').trim()) throw fail('Describe the inspection discrepancies.');
  if (allGood && !signer?.signature) throw fail('A verified mechanic signature is required.');
  Object.assign(record, checklistValues(kind, record.aircraftType, allGood));
  record.confirmation = { allGood, remarks: String(remarks || '').trim(), at: new Date().toISOString(), actorId: String(user.id), signer: allGood ? signer : null };
  record.status = allGood ? kind === 'pre' ? 'released' : 'completed' : 'pending';
  record.releasedBy = allGood ? signer : {};
  record.acceptedBy = {};
  record.workflowHistory ||= [];
  record.workflowHistory.push(eventFor(record, `${kind}_${allGood ? 'confirmed_all' : 'discrepancy_hold'}`, user, { confirmation: record.confirmation }, remarks || '', allGood ? signer : null));
  return record;
};
module.exports = { checklistValues, confirmInspection };
