import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/.well-known/', import.meta.url));
await mkdir(root, { recursive: true });

const appleFile = fileURLToPath(new URL('../public/.well-known/apple-app-site-association', import.meta.url));
const androidFile = fileURLToPath(new URL('../public/.well-known/assetlinks.json', import.meta.url));
await Promise.all([rm(appleFile, { force: true }), rm(androidFile, { force: true })]);

const teamId = String(process.env.AIRMS_APPLE_TEAM_ID || '').trim().toUpperCase();
if (/^[A-Z0-9]{10}$/.test(teamId)) {
  await writeFile(appleFile, JSON.stringify({ applinks: { apps: [], details: [{
    appID: `${teamId}.com.arckexe.airms`,
    paths: ['/dashboard/*', '/reset-password*', '/security-setup*', '/forgot-password*'],
  }] } }));
}

const fingerprints = String(process.env.AIRMS_ANDROID_SHA256_FINGERPRINTS || '')
  .split(',').map(value => value.trim().toUpperCase())
  .filter(value => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value));
if (fingerprints.length) {
  await writeFile(androidFile, JSON.stringify([{ relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: 'com.arckexe.airms',
      sha256_cert_fingerprints: fingerprints } }]));
}
