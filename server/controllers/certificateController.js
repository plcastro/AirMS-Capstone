const { createCertificateService } = require('../services/certificates/certificateService');
const { CertificateError } = require('../services/certificates/certificateErrors');
const { actorId } = require('../services/certificates/certificateAccess');
const multer = require('multer');
const { createCertificateHolderMatchService } = require('../services/certificates/certificateHolderMatchService');
const { createCertificateReviewService } = require('../services/certificates/certificateReviewService');

function createCertificateController(service = createCertificateService(), matchHolder = createCertificateHolderMatchService(), review = createCertificateReviewService()) {
  const pageNumber = req => {
    if (req.query.page === undefined) return 1;
    if (!/^\d+$/.test(String(req.query.page)) || !Number.isSafeInteger(Number(req.query.page)) || Number(req.query.page) < 1 || Number(req.query.page) > 10000) {
      throw new CertificateError(400, 'Invalid page number.');
    }
    return Number(req.query.page);
  };
  return {
    directory: async (req, res) => res.json({ data: await review.directory(req) }),
    reject: async (req, res) => res.json({ data: await review.disposition(req, req.params.id, req.body, 'REJECTED') }),
    revoke: async (req, res) => res.json({ data: await review.disposition(req, req.params.id, req.body, 'REVOKED') }),
    analyze: async (req, res) => res.json({ data: await review.analyze(req, req.params.id, req.body) }),
    correct: async (req, res) => res.json({ data: await review.correct(req, req.params.id, req.body) }),
    preview: async (req, res) => res.json({ data: await review.preview(req, req.params.id, req.body) }),
    confirm: async (req, res) => res.json({ data: await review.confirm(req, req.params.id, req.body) }),
    qualifications: async (req, res) => res.json({ data: await review.qualifications(req, req.params.personnelId) }),
    matchHolder: async (req, res) => res.json({ data: await matchHolder(req, req.body?.holderName) }),
    authorizeUpload: async (req, res, next) => { await service.authorizeUpload(req, req.params.personnelId); next(); },
    upload: async (req, res) => res.status(201).json({ data: await service.upload(req, req.params.personnelId, req.file) }),
    list: async (req, res) => res.json(await service.list(req, req.query.personnelId || actorId(req), pageNumber(req), req.query.status || 'all')),
    get: async (req, res) => res.json({ data: await service.get(req, req.params.id) }),
    history: async (req, res) => res.json({ data: await service.history(req, req.params.id, pageNumber(req)) }),
    download: async (req, res) => {
      const file = await service.download(req, req.params.id);
      res.set('Content-Type', file.mimeType);
      res.set('Content-Disposition', `attachment; filename="${file.filename.replace(/[^a-zA-Z0-9._ ()-]/g, '_')}"`);
      res.set('Content-Security-Policy', "sandbox; default-src 'none'");
      return res.send(file.data);
    },
  };
}

function certificateErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
    return res.status(error.type === 'entity.too.large' ? 413 : 400).json({ message: 'Provide a valid, size-limited JSON request.' });
  }
  if (error instanceof multer.MulterError) {
    return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Certificate exceeds the 4 MiB file limit.' : 'Upload exactly one file using the file field, without extra form fields.' });
  }
  if (error instanceof CertificateError) return res.status(error.status).json({ message: error.message });
  console.error('Certificate operation failed:', error.name);
  return res.status(500).json({ message: 'Certificate operation failed. Please retry or contact an administrator.' });
}

module.exports = { createCertificateController, certificateErrorHandler };
