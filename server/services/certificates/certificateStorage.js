const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const blobSdk = require('@vercel/blob');
const policy = require('../../config/certificatePolicy');
const { CertificateError } = require('./certificateErrors');

const defaultRoot = path.resolve(__dirname, '../../private/certificates');
const validKey = /^certificates\/[a-f0-9-]{36}\.(?:jpg|png|pdf)$/;

function createCertificateStorage({ env = process.env, root = defaultRoot, blob = blobSdk } = {}) {
  const production = env.NODE_ENV === 'production' || env.VERCEL === '1';
  const token = env.CERTIFICATE_BLOB_READ_WRITE_TOKEN;
  const provider = token ? 'blob' : production ? null : 'local';
  const checkedKey = key => {
    if (typeof key !== 'string' || !validKey.test(key)) throw new CertificateError(400, 'Invalid private file reference.');
    return key;
  };
  const localPath = key => path.join(root, path.basename(checkedKey(key)));
  const ready = () => {
    if (!provider) throw new CertificateError(503, 'Private certificate storage is not configured.');
  };
  const assertProvider = file => {
    ready(); checkedKey(file.key);
    if (file.provider !== provider) throw new CertificateError(503, 'The certificate storage provider is unavailable.');
  };

  async function save(buffer, metadata) {
    ready();
    const extension = metadata.mimeType === 'image/jpeg' ? 'jpg' : metadata.mimeType === 'image/png' ? 'png' : 'pdf';
    const key = `certificates/${crypto.randomUUID()}.${extension}`;
    if (provider === 'blob') {
      await blob.put(key, buffer, { access: 'private', token, contentType: metadata.mimeType, addRandomSuffix: false, allowOverwrite: false });
    } else {
      await fs.promises.mkdir(root, { recursive: true, mode: 0o700 });
      await fs.promises.writeFile(localPath(key), buffer, { flag: 'wx', mode: 0o600 });
    }
    return { provider, key };
  }

  async function read(file) {
    assertProvider(file);
    let stream;
    if (provider === 'blob') {
      const result = await blob.get(file.key, { access: 'private', token, useCache: false });
      if (!result || result.statusCode !== 200 || result.blob.pathname !== file.key) {
        await result?.stream?.cancel();
        throw new CertificateError(404, 'Certificate file not found.');
      }
      if (result.blob.size !== file.size) {
        await result.stream.cancel();
        throw new CertificateError(422, 'Certificate file failed its integrity check.');
      }
      stream = Readable.fromWeb(result.stream);
    } else {
      try {
        const stat = await fs.promises.lstat(localPath(file.key));
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== file.size) throw new CertificateError(422, 'Certificate file failed its integrity check.');
        stream = fs.createReadStream(localPath(file.key));
      } catch (error) {
        if (error.code === 'ENOENT') throw new CertificateError(404, 'Certificate file not found.');
        throw error;
      }
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > policy.maxFileBytes || size > file.size) {
        stream.destroy();
        throw new CertificateError(422, 'Certificate file failed its integrity check.');
      }
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);
    if (data.length !== file.size || crypto.createHash('sha256').update(data).digest('hex') !== file.sha256) {
      throw new CertificateError(422, 'Certificate file failed its integrity check.');
    }
    return data;
  }

  async function remove(file) {
    assertProvider(file);
    if (provider === 'blob') await blob.del(file.key, { token });
    else await fs.promises.unlink(localPath(file.key)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  return { ready, save, read, remove };
}

module.exports = { createCertificateStorage };
