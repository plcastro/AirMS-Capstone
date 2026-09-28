const path = require('node:path');
const crypto = require('node:crypto');
const { fork } = require('node:child_process');
const policy = require('../../config/certificatePolicy');
const { CertificateError } = require('./certificateErrors');
// Static import lets deployment tracing discover the child and its parser dependencies.
const validationProcessPath = require('./certificateValidationWorker');
let active = 0;

function validateEnvelope(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) throw new CertificateError(400, 'Choose a certificate file.');
  if (file.buffer.length > policy.maxFileBytes) throw new CertificateError(413, 'Certificate exceeds the 4 MiB file limit.');
  const name = String(file.originalname || '').replace(/\\/g, '/').split('/').at(-1);
  const extension = path.extname(name).toLowerCase();
  const mimeType = policy.allowedTypes[extension];
  if (!mimeType || file.mimetype !== mimeType) throw new CertificateError(415, 'File extension and MIME type must match JPG, JPEG, PNG, or PDF.');
  const data = file.buffer;
  const signatureMatches = mimeType === 'image/png'
    ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : mimeType === 'image/jpeg'
      ? data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
      : /^%PDF-1\.[0-7]|^%PDF-2\.0/.test(data.subarray(0, 8).toString('ascii')) && /%%EOF\s*$/.test(data.subarray(-1024).toString('latin1'));
  if (!signatureMatches) throw new CertificateError(415, 'File contents do not match the declared document type.');
  const originalName = name.replace(/[^a-zA-Z0-9._ ()-]/g, '_').slice(0, 160) || `certificate${extension}`;
  return { originalName, mimeType, size: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') };
}

async function validateCertificateFile(file) {
  const envelope = validateEnvelope(file);
  if (active >= policy.maxConcurrentValidations) throw new CertificateError(429, 'Certificate validation is busy. Please retry shortly.');
  active++;
  let worker;
  let timer;
  let stopped;
  try {
    const details = await new Promise((resolve, reject) => {
      // Native PDF/image libraries run in a separate process so parser failures
      // cannot terminate the API process. Never invoke a shell for this work.
      worker = fork(validationProcessPath, [], {
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'], serialization: 'advanced',
        execArgv: ['--max-old-space-size=128'], windowsHide: true,
      });
      stopped = new Promise(done => {
        worker.once('exit', done);
        worker.once('error', done);
      });
      timer = setTimeout(() => reject(new CertificateError(422, 'Document validation timed out. Try a smaller document.')), policy.validationTimeoutMs);
      worker.once('message', result => result.error ? reject(new CertificateError(422, result.error)) : resolve(result.details));
      worker.once('error', () => reject(new CertificateError(422, 'Document could not be validated.')));
      worker.once('exit', () => reject(new CertificateError(422, 'Document validation stopped before completion.')));
      worker.send({ buffer: file.buffer, mimeType: envelope.mimeType }, error => {
        if (error) reject(new CertificateError(422, 'Document could not be validated.'));
      });
    });
    return { ...envelope, ...details };
  } finally {
    clearTimeout(timer);
    if (worker) {
      worker.kill();
      await stopped;
    }
    active--;
  }
}

module.exports = { validateEnvelope, validateCertificateFile };
