const { hasPermission } = require('../../middleware/permissions');
const permissions = require('../../config/permissions');
const { CertificateError } = require('./certificateErrors');

const actorId = req => String(req.user?.id || req.user?._id || '');
function canAccessPersonnel(req, personnelId, action = 'read') {
  if (!req.user) return false;
  const all = action === 'upload' ? permissions.CERTIFICATES_UPLOAD_ALL : permissions.CERTIFICATES_READ_ALL;
  const own = action === 'upload' ? permissions.CERTIFICATES_UPLOAD_OWN : permissions.CERTIFICATES_READ_OWN;
  return hasPermission(req, all) || (String(personnelId) === actorId(req) && hasPermission(req, own));
}
function assertAccess(req, personnelId, action) {
  if (!canAccessPersonnel(req, personnelId, action)) throw new CertificateError(403, 'Certificate access denied.');
}
function assertId(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) throw new CertificateError(400, 'Invalid record ID.');
  return value;
}
module.exports = { actorId, canAccessPersonnel, assertAccess, assertId };
