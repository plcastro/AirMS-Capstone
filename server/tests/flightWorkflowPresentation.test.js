const assert = require('node:assert/strict');
const test = require('node:test');
const { legDuration, legFieldDisplay } = require('../../shared/flightLegTimes');
const { flightWorkflowExportRows } = require('../../shared/flightWorkflowExport');

test('time previews distinguish missing values from zero and handle midnight in decimal hours', () => {
  assert.equal(legDuration({ flightTimeOff: '23:30', flightTimeOn: '01:00' }, 'flight'), '1.50');
  assert.equal(legDuration({ flightTimeOff: '0800', flightTimeOn: '0820' }, 'flight'), '0.33');
  assert.equal(legDuration({ flightTimeOff: '', flightTimeOn: '08:20' }, 'flight'), '');
  assert.equal(legDuration({ flightTimeOff: '25:00', flightTimeOn: '08:20' }, 'flight'), '');
  assert.equal(legFieldDisplay({ passengers: 0 }, 'passengers'), 0);
});

test('PDF workflow appendix includes amendments, reasons and signing evidence without rewriting original values', () => {
  const original = { remarks: 'Original signed remarks', status: 'completed',
    completedBy: { name: 'Assigned Mechanic', licenseNo: 'L-123', timestamp: '2026-09-20T10:00:00Z', authorizationReference: 'AUTH-1' },
    amendments: [{ section: 'discrepancies', correction: 'Corrected description', reason: 'Typo correction', signer: { name: 'Pilot' }, at: '2026-09-21' }],
    workflowHistory: [{ action: 'complete', version: 5, actorName: 'Assigned Mechanic', digest: 'signed-content-hash' }],
  };
  const output = flightWorkflowExportRows(original).flat().join('\n');
  for (const expected of ['Corrected description', 'Typo correction', 'Assigned Mechanic', 'AUTH-1', 'signed-content-hash']) assert.ok(output.includes(expected), expected);
  assert.equal(original.remarks, 'Original signed remarks');
});
