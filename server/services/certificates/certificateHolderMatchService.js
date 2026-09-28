const User = require('../../models/userModel');
const { hasPermission } = require('../../middleware/permissions');
const permissions = require('../../config/permissions');
const policy = require('../../config/certificateNameMatching');
const { actorId, assertId } = require('./certificateAccess');
const { CertificateError } = require('./certificateErrors');
const { matchCertificateHolder } = require('./certificateHolderMatcher');

function createCertificateHolderMatchService({ users = User } = {}) {
  return async function matchHolder(req, holderName) {
    const all = hasPermission(req, permissions.CERTIFICATES_READ_ALL);
    if (!all && !hasPermission(req, permissions.CERTIFICATES_READ_OWN)) throw new CertificateError(403, 'Certificate access denied.');
    if (typeof holderName !== 'string' || !holderName.trim() || holderName.length > policy.maxNameLength) {
      throw new CertificateError(400, `Provide a holder name of 1 to ${policy.maxNameLength} characters.`);
    }
    const filter = { jobTitle: 'Mechanic' };
    if (!all) filter._id = assertId(actorId(req));
    const mechanics = await users.find(filter).select('_id firstName lastName').lean();
    return { ...matchCertificateHolder(holderName, mechanics), comparisonScope: all ? 'MECHANIC_DIRECTORY' : 'OWN_PROFILE' };
  };
}

module.exports = { createCertificateHolderMatchService };
