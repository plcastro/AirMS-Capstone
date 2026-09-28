// Preloaded in extraction test children (and their OCR worker threads).
// Any attempt to download language data or send document contents must fail.
const deny = () => { throw new Error('Network access is forbidden in certificate extraction tests.'); };
for (const moduleName of ['node:http', 'node:https']) {
  const network = require(moduleName);
  network.request = deny; network.get = deny;
}
globalThis.fetch = deny;
