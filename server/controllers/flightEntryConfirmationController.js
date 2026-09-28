const Ticket = require('../models/flightInspectionConfirmationModel');
const Parts = require('../models/partsMonitoringModel');
const { catchRequest } = require('./flightWorkflowController');
const { verifyWorkflowSigner } = require('../utils/flightWorkflowSigning');
const { fail } = require('../utils/flightWorkflowRules');
const { getTrustedFlightLogRole } = require('../utils/flightLogPayload');
module.exports = catchRequest(async (req, res) => {
  if (getTrustedFlightLogRole(req) !== 'mechanic') throw fail('Only mechanics create flight logs. Pilots sign acceptance.', 403);
  const rpc = String(req.body.rpc || '').trim().toUpperCase();
  const aircraft = await Parts.findOne({ aircraft: rpc });
  if (!aircraft || !/350|412/.test(aircraft.aircraftType || '')) throw fail('Select an aircraft with a supported Parts Monitoring record.');
  const allGood = req.body.allGood;
  const remarks = String(req.body.remarks || '').trim();
  if (typeof allGood !== 'boolean' || !allGood && !remarks) throw fail('Confirm the inspection or describe its discrepancies.');
  const signer = allGood ? await verifyWorkflowSigner(req, { rpc }, 'pre_confirmed_all') : null;
  const ticket = await Ticket.create({ userId: req.user.id, rpc, aircraftType: aircraft.aircraftType, allGood, remarks, signer, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  res.status(201).json({ success: true, data: { confirmationId: ticket._id, rpc, aircraftType: aircraft.aircraftType, initialInspectionSignature: signer, remarks, allGood } });
});
