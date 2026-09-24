const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const Authorization = require('../models/flightCrewAuthorizationModel');
const {
  fail
} = require('./flightWorkflowRules');
const attempts = new Map();
const verifyWorkflowSigner = async (req, record, scope) => {
  const id = String(req.user?.id || '');
  const key = id;
  const recent = attempts.get(key);
  if (recent && Date.now() - recent.since < 5 * 60 * 1000 && recent.count >= 5) throw fail('Too many incorrect signing attempts. Try again in five minutes.', 429);
  const {
    pin,
    signature
  } = req.body || {};
  if (!/^\d{6}$/.test(String(pin || '')) || !/^data:image\/(png|jpeg);base64,/.test(String(signature || '')) || signature.length > 2000000) throw fail('Draw your signature and enter your six-digit PIN.');
  const user = await User.findById(id).select('+pin firstName lastName licenseNo jobTitle status');
  if (!user || user.status !== 'active') throw fail('An active account is required to sign.', 403);
  if (!user.pin || !(await bcrypt.compare(String(pin), user.pin))) {
    const entry = recent && Date.now() - recent.since < 300000 ? recent : {
      since: Date.now(),
      count: 0
    };
    entry.count += 1;
    attempts.set(key, entry);
    throw fail('Incorrect signing PIN.', 403);
  }
  attempts.delete(key);
  const authorization = await Authorization.findOne({
    userId: id,
    active: true
  });
  if (!authorization || !(new Date(authorization.validUntil).getTime() > Date.now()) || !authorization.aircraft.includes(record.rpc.trim().toUpperCase()) || !user.licenseNo || authorization.licenseNo !== user.licenseNo || user.jobTitle !== req.user.jobTitle) {
    throw fail('A current crew authorization matching your account license and this aircraft must be recorded by the maintenance manager before signing.', 403);
  }
  return {
    name: `${user.firstName} ${user.lastName}`.trim(),
    userId: id,
    licenseNo: user.licenseNo,
    title: user.jobTitle,
    signature,
    timestamp: new Date().toISOString(),
    scope,
    authorizationId: String(authorization._id),
    authorizationReference: authorization.reference,
    licenseType: authorization.licenseType
  };
};
module.exports = {
  verifyWorkflowSigner
};
