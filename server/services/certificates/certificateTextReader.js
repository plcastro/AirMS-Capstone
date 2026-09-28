const { fork } = require('node:child_process');
const policy = require('../../config/certificateExtractionPolicy');
const { CertificateError } = require('./certificateErrors');
const { validateEnvelope } = require('./certificateFileValidator');
const workerPath = require('./certificateExtractionWorker');

function createCertificateTextReader({ spawn = fork, timeoutMs = policy.timeoutMs } = {}) {
  let active = 0;
  return async function readCertificateText(file) {
    const metadata = validateEnvelope(file);
    if (active >= policy.maxConcurrent) throw new CertificateError(429, 'Certificate reading is busy. Please retry shortly.');
    active++;
    let child, timer, stopped;
    try {
      return await new Promise((resolve, reject) => {
        child = spawn(workerPath, [], {
          stdio: ['ignore', 'ignore', 'ignore', 'ipc'], serialization: 'advanced',
          execArgv: ['--max-old-space-size=384'], windowsHide: true,
        });
        stopped = new Promise(done => { child.once('exit', done); child.once('error', done); });
        timer = setTimeout(() => reject(new CertificateError(422, 'Certificate reading timed out. Try fewer or clearer pages.')), timeoutMs);
        child.once('message', message => {
          if (message.error) return reject(new CertificateError(message.error === 'OCR_ASSETS_UNAVAILABLE' ? 503 : 422,
            message.error === 'OCR_ASSETS_UNAVAILABLE' ? 'The server OCR assets are unavailable.' : 'The document could not be read or exceeds extraction limits.'));
          resolve(message.result);
        });
        child.once('error', () => reject(new CertificateError(422, 'Certificate reader could not start.')));
        child.once('exit', () => reject(new CertificateError(422, 'Certificate reader stopped before completion.')));
        child.send({ buffer: file.buffer, mimeType: metadata.mimeType }, error => {
          if (error) reject(new CertificateError(422, 'Certificate reader could not receive the document.'));
        });
      });
    } finally {
      clearTimeout(timer);
      if (child) { child.kill(); await stopped; }
      active--;
    }
  };
}

module.exports = { createCertificateTextReader, readCertificateText: createCertificateTextReader() };
