const mongoose = require('mongoose');
const { Schema } = mongoose;

const certificateRecordSchema = new Schema({
  personnelId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  status: { type: String, enum: ['PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REVOKED'], default: 'PENDING_REVIEW' },
  processingStatus: { type: String, enum: ['UPLOADED', 'PROCESSING', 'ANALYZED', 'FAILED'], default: 'UPLOADED' },
  file: {
    type: new Schema({
      provider: { type: String, enum: ['local', 'blob'], required: true },
      key: { type: String, required: true },
      originalName: { type: String, required: true },
      mimeType: { type: String, enum: ['image/jpeg', 'image/png', 'application/pdf'], required: true },
      size: { type: Number, required: true, min: 1 },
      sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
      pageCount: { type: Number, min: 1 },
      width: { type: Number, min: 1 },
      height: { type: Number, min: 1 },
    }, { _id: false }),
    required: true,
    immutable: true,
    select: false,
  },
  // Analysis is server-produced evidence; corrections never overwrite it.
  analysis: { type: Schema.Types.Mixed, default: null, select: false },
  correctedFields: { type: Schema.Types.Mixed, default: {} },
  normalizedData: { type: Schema.Types.Mixed, default: null },
  holderMatch: { type: Schema.Types.Mixed, default: null },
  reviewNote: { type: String, default: '', maxlength: 2000 },
  qualificationDecision: { type: Schema.Types.Mixed, default: null },
  analyzedAt: { type: Date, default: null },
  verificationMethod: { type: String, enum: ['MANUAL', 'AUTOMATIC', null], default: null },
  verificationDecision: { type: Schema.Types.Mixed, default: null },
  verifiedAt: { type: Date, default: null },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  revision: { type: Number, default: 1, min: 1 },
}, { timestamps: true, strict: 'throw', optimisticConcurrency: true });

certificateRecordSchema.index({ personnelId: 1, createdAt: -1 });
certificateRecordSchema.index({ personnelId: 1, 'file.sha256': 1 });

module.exports = mongoose.model('CertificateRecord', certificateRecordSchema);
