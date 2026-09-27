const User = require('../models/userModel');

// Confirmation is accepted only on creation; generic log edits cannot replace it.
async function resolvePreflightConfirmation(input, actorId, users = User) {
  if (input === undefined) return { value: undefined }; // Existing clients/records remain supported.
  if (!input || input.status !== 'confirmed' || typeof input.signature !== 'string'
      || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(input.signature) || input.signature.length > 2000000) {
    return { error: 'Confirm and sign the pre-flight inspection before proceeding.' };
  }
  const remarks = typeof input.remarks === 'string' ? input.remarks.trim() : '';
  const resolution = typeof input.resolution === 'string' ? input.resolution.trim() : '';
  if (remarks && !resolution) return { error: 'Resolve the pre-flight discrepancies before proceeding.' };
  if (remarks.length > 10000 || resolution.length > 10000) return { error: 'Pre-flight notes must be 10,000 characters or fewer.' };
  if (!actorId) return { error: 'Sign in again before confirming the pre-flight inspection.' };
  const actor = await users.findById(actorId).select('firstName lastName').lean();
  if (!actor) return { error: 'The pre-flight signer account could not be found.' };
  return { value: {
    status: 'confirmed', signature: input.signature, remarks, resolution,
    userId: actorId, name: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(), recordedAt: new Date(),
  } };
}
module.exports = { resolvePreflightConfirmation };
