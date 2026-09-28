const express = require('express');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('../middleware/authMiddleware');
const { touchSessionActivity } = require('../middleware/sessionActivity');
const { requireActionConfirmation } = require('../middleware/actionConfirmation');
const { certificateUpload } = require('../middleware/certificateUpload');
const { createCertificateController, certificateErrorHandler } = require('../controllers/certificateController');
const { requirePermission } = require('../middleware/permissions');
const permissions = require('../config/permissions');

function createCertificateRouter({ authenticate = verifyToken, controller = createCertificateController() } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  router.use(authenticate);
  router.get('/directory', controller.directory);
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
    keyGenerator: req => String(req.user.id),
    message: { message: 'Too many certificate uploads. Please try again later.' },
  });
  const matchingLimiter = rateLimit({
    windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
    keyGenerator: req => String(req.user.id),
    message: { message: 'Too many name comparisons. Please retry shortly.' },
  });
  // Read-only suggestion. Confirmation and certificate ownership are separate operations.
  router.post('/match-holder', matchingLimiter, express.json({ limit: '2kb' }), controller.matchHolder);
  router.post('/personnel/:personnelId', uploadLimiter, requireActionConfirmation, controller.authorizeUpload, certificateUpload, touchSessionActivity, controller.upload);
  const analysisLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
    keyGenerator: req => String(req.user.id),
    message: { message: 'Too many certificate analyses. Please try again later.' },
  });
  const reviewJson = express.json({ limit: '64kb' });
  // The app may already have parsed JSON with a larger global limit. Enforce our
  // smaller limit on parsed bodies too, including corrections and review notes.
  const reviewSize = (req, res, next) => {
    if (Buffer.byteLength(JSON.stringify(req.body || {})) > 64 * 1024) return res.status(413).json({ message: 'Certificate review request exceeds 64 KiB.' });
    next();
  };
  router.get('/personnel/:personnelId/qualifications', controller.qualifications);
  router.post('/:id/analyze', analysisLimiter, reviewJson, reviewSize, requireActionConfirmation, touchSessionActivity, controller.analyze);
  router.patch('/:id/review', reviewJson, reviewSize, requireActionConfirmation, touchSessionActivity, controller.correct);
  router.post('/:id/preview', reviewJson, reviewSize, controller.preview);
  router.post('/:id/confirm', requirePermission(permissions.CERTIFICATES_REVIEW_ALL), reviewJson, reviewSize, requireActionConfirmation, touchSessionActivity, controller.confirm);
  router.post('/:id/reject', requirePermission(permissions.CERTIFICATES_REVIEW_ALL), reviewJson, reviewSize, requireActionConfirmation, touchSessionActivity, controller.reject);
  router.post('/:id/revoke', requirePermission(permissions.CERTIFICATES_REVIEW_ALL), reviewJson, reviewSize, requireActionConfirmation, touchSessionActivity, controller.revoke);
  router.get('/', controller.list);
  router.get('/:id/file', controller.download);
  router.get('/:id/history', controller.history);
  router.get('/:id', controller.get);
  router.use(certificateErrorHandler);
  return router;
}

module.exports = createCertificateRouter();
module.exports.createCertificateRouter = createCertificateRouter;
