const AS = require('../../shared/as350InspectionChecklist.json');
const BP = require('../../shared/b412PreInspectionChecklist.json');
const BO = require('../../shared/b412PostInspectionChecklist.json');
const { fail, eventFor } = require('./flightWorkflowRules');
const isB412 = aircraftType => /412/.test(aircraftType || '');
const checklistKeys = (kind, aircraftType) => isB412(aircraftType)
  ? (kind === 'pre' ? BP : BO).sections.flatMap(s => s.items).map(item => item.key)
  : AS[kind].map(item => item.key);
const checklistValues = (kind, aircraftType, checked) => isB412(aircraftType)
  ? { b412Data: { checks: Object.fromEntries(checklistKeys(kind, aircraftType).map(key => [key, checked])) } }
  : Object.fromEntries(checklistKeys(kind, aircraftType).map(key => [key, checked]));
const plainObject = value => value && typeof value.toObject === 'function' ? value.toObject() : value || {};
const checkedKeys = (record, kind) => {
  const keys = checklistKeys(kind, record.aircraftType);
  if (!isB412(record.aircraftType)) return keys.filter(key => record[key] === true);
  const checks = plainObject(plainObject(record.b412Data).checks);
  return keys.filter(key => checks[key] === true);
};
const uncheckedKeys = (record, kind) => {
  const done = new Set(checkedKeys(record, kind));
  return checklistKeys(kind, record.aircraftType).filter(key => !done.has(key));
};
// The client sends the exact list of items the mechanic ticked. Nothing is
// ticked on the mechanic's behalf, so an item that was never reviewed stays open.
const applyChecked = (record, kind, checked) => {
  const ticked = new Set(checked);
  const values = Object.fromEntries(checklistKeys(kind, record.aircraftType).map(key => [key, ticked.has(key)]));
  if (isB412(record.aircraftType)) Object.assign(record, { b412Data: { ...plainObject(record.b412Data), checks: values } });
  else Object.assign(record, values);
};
// Discrepancies are flagged per checklist item: { [itemKey]: { note, resolved, resolution } }.
const normalizeDiscrepancies = (input, kind, aircraftType) => {
  const valid = new Set(checklistKeys(kind, aircraftType));
  const result = {};
  for (const [key, value] of Object.entries(plainObject(input))) {
    if (!valid.has(key)) continue;
    const note = String(value?.note ?? '').trim();
    if (!note) continue;
    result[key] = { note, resolved: value?.resolved === true, resolution: String(value?.resolution ?? '').trim() };
  }
  return result;
};
const openDiscrepancyKeys = record => Object.entries(plainObject(record.discrepancies)).filter(([, value]) => value && value.resolved !== true).map(([key]) => key);
const discrepancySummary = (record, kind) => {
  const titles = new Map((isB412(record.aircraftType) ? (kind === 'pre' ? BP : BO).sections.flatMap(s => s.items) : AS[kind]).map(item => [item.key, item.title]));
  const discrepancies = plainObject(record.discrepancies);
  return openDiscrepancyKeys(record).map(key => `${titles.get(key) || key}: ${discrepancies[key].note}`).join('; ');
};
const confirmInspection = (record, kind, allGood, remarks, signer, user, options = {}) => {
  if (typeof allGood !== 'boolean') throw fail('Answer the inspection confirmation.');
  if (allGood && !signer?.signature) throw fail('A verified mechanic signature is required.');
  if (Array.isArray(options.checked)) applyChecked(record, kind, options.checked);
  if (options.discrepancies !== undefined) record.discrepancies = normalizeDiscrepancies(options.discrepancies, kind, record.aircraftType);
  const text = String(remarks || '').trim();
  let recorded = text;
  if (allGood) {
    // Signing needs every item reviewed and every flagged discrepancy resolved.
    const open = openDiscrepancyKeys(record);
    if (open.length) {
      if (!text) throw fail('Describe how the flagged discrepancies were resolved.');
      const discrepancies = plainObject(record.discrepancies);
      record.discrepancies = Object.fromEntries(Object.entries(discrepancies).map(([key, value]) => [key, open.includes(key) ? { ...value, resolved: true, resolution: text } : value]));
    }
    const missing = uncheckedKeys(record, kind);
    if (missing.length) throw fail(`Check every ${kind === 'pre' ? 'pre-flight' : 'post-flight'} item, or flag it as a discrepancy, before signing. ${missing.length} item(s) are not checked.`, 400, { missing });
  } else {
    recorded = text || discrepancySummary(record, kind) || (options.draft ? 'Checklist incomplete. Saved as a draft.' : '');
    if (!recorded) throw fail('Describe the inspection discrepancies.');
  }
  // A draft or discrepancy hold records progress without signing; it never
  // discards ticks the mechanic already made.
  // A draft is an incomplete checklist with nothing flagged; it needs no resolution text to sign later.
  record.confirmation = { allGood, draft: !allGood && !openDiscrepancyKeys(record).length, remarks: recorded, at: new Date().toISOString(), actorId: String(user.id), signer: allGood ? signer : null };
  record.status = allGood ? kind === 'pre' ? 'released' : 'completed' : 'pending';
  record.releasedBy = allGood ? signer : {};
  record.acceptedBy = {};
  record.workflowHistory ||= [];
  record.workflowHistory.push(eventFor(record, `${kind}_${allGood ? 'confirmed_all' : 'discrepancy_hold'}`, user, { confirmation: record.confirmation }, recorded, allGood ? signer : null));
  return record;
};
module.exports = { checklistKeys, checklistValues, checkedKeys, uncheckedKeys, normalizeDiscrepancies, openDiscrepancyKeys, discrepancySummary, confirmInspection };
