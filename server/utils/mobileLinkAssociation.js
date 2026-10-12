const APP_ID = 'com.arckexe.airms';
const LINK_PATHS = ['/dashboard/*', '/reset-password*', '/security-setup*', '/forgot-password*'];

const appleAssociation = (teamId = process.env.AIRMS_APPLE_TEAM_ID) => {
  const id = String(teamId || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(id)) return null;
  return { applinks: { apps: [], details: [{ appID: `${id}.${APP_ID}`, paths: LINK_PATHS }] } };
};

const androidAssociation = (fingerprints = process.env.AIRMS_ANDROID_SHA256_FINGERPRINTS) => {
  const values = String(fingerprints || '').split(',').map(value => value.trim().toUpperCase())
    .filter(value => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value));
  if (!values.length) return null;
  return [{ relation: ['delegate_permission/common.handle_all_urls'], target: {
    namespace: 'android_app', package_name: APP_ID, sha256_cert_fingerprints: values,
  } }];
};

module.exports = { appleAssociation, androidAssociation };
