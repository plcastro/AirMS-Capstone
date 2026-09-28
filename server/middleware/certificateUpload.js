const multer = require('multer');
const path = require('node:path');
const policy = require('../config/certificatePolicy');
const { CertificateError } = require('../services/certificates/certificateErrors');

const certificateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: policy.maxFileBytes, files: 1, fields: 0, parts: 2 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (policy.allowedTypes[extension] !== file.mimetype || !policy.allowedTypes[extension]) {
      return callback(new CertificateError(415, 'Only matching JPG, JPEG, PNG, or PDF files are accepted.'));
    }
    callback(null, true);
  },
}).single('file');

module.exports = { certificateUpload };
