const mongoose = require('mongoose');
const { Schema } = mongoose;

const certificateAuditSchema = new Schema({
  certificateId: { type: Schema.Types.ObjectId, ref: 'CertificateRecord', required: true, immutable: true },
  personnelId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  action: { type: String, enum: ['UPLOADED', 'FILE_ACCESS_GRANTED', 'ANALYZED', 'ANALYSIS_FAILED', 'REVIEW_UPDATED', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED', 'REVOKED'], required: true, immutable: true },
  revision: { type: Number, required: true, min: 1, immutable: true },
  details: { type: Schema.Types.Mixed, default: {}, immutable: true },
}, { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' });

certificateAuditSchema.index({ certificateId: 1, createdAt: -1 });
// Service code may append audit records but cannot overwrite or remove history.
for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
  certificateAuditSchema.pre(operation, function immutableAudit() { throw new Error('Certificate audit history is append-only.'); });
}
certificateAuditSchema.pre('save', function preventAuditRewrite() {
  if (!this.isNew) throw new Error('Certificate audit history is append-only.');
});
certificateAuditSchema.pre('deleteOne', { document: true, query: false }, function preventAuditRemoval() {
  throw new Error('Certificate audit history is append-only.');
});
certificateAuditSchema.pre('bulkWrite', function preventBulkAuditRewrite() {
  throw new Error('Certificate audit history is append-only.');
});

module.exports = mongoose.model('CertificateAudit', certificateAuditSchema);
