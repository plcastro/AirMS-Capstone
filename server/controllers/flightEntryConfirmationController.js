const Ticket = require('../models/flightInspectionConfirmationModel');
const Parts = require('../models/partsMonitoringModel');
const { catchRequest } = require('./flightWorkflowController');
const { verifyWorkflowSigner } = require('../utils/flightWorkflowSigning');
const { fail } = require('../utils/flightWorkflowRules');
const { checklistKeys, normalizeDiscrepancies } = require('../utils/flightInspectionConfirmation');
const { canCreateFlightLog } = require('../../shared/flightLogCreationAccess');
module.exports = catchRequest(async (req, res) => {
  if (!canCreateFlightLog(req.user)) throw fail('Only mechanics and maintenance managers can create flight logs. Pilots sign acceptance.', 403);
  const rpc = String(req.body.rpc || '').trim().toUpperCase();
  const aircraft = await Parts.findOne({ aircraft: rpc });
  if (!aircraft || !/350|412/.test(aircraft.aircraftType || '')) throw fail('Select an aircraft with a supported Parts Monitoring record.');
  const allGood = req.body.allGood;
  if (typeof allGood !== 'boolean') throw fail('Review the pre-flight checklist before continuing.');
  if (!Array.isArray(req.body.checked)) throw fail('Review every pre-flight checklist item before continuing.');
  // The mechanic reviews the full checklist; nothing is ticked on their behalf.
  const valid = new Set(checklistKeys('pre', aircraft.aircraftType));
  const checked = [...new Set(req.body.checked.map(String))].filter(key => valid.has(key));
  const discrepancies = normalizeDiscrepancies(req.body.discrepancies, 'pre', aircraft.aircraftType);
  const flagged = Object.keys(discrepancies);
  if (allGood && (checked.length !== valid.size || flagged.length)) throw fail('Check every item and clear every flagged discrepancy before signing. Save the checklist as a draft to finish it later.');
  const remarks = String(req.body.remarks || '').trim() || (flagged.length ? '' : 'Checklist incomplete. Saved as a draft.');
  const signer = allGood ? await verifyWorkflowSigner(req, { rpc }, 'pre_confirmed_all') : null;
  const ticket = await Ticket.create({ userId: req.user.id, rpc, aircraftType: aircraft.aircraftType, allGood, remarks, checked, discrepancies, signer, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  res.status(201).json({ success: true, data: { confirmationId: ticket._id, rpc, aircraftType: aircraft.aircraftType, initialInspectionSignature: signer, remarks, allGood, checked, discrepancies } });
});
