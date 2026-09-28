const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    jti: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null, index: true },
    revokedReason: { type: String, default: "" },
    replacedByTokenHash: { type: String, default: null },
    cleanupAt: { type: Date, default: null },
    isPersistent: { type: Boolean, default: false },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

// Refresh-token records are kept briefly after expiry/revocation for investigation,
// then removed automatically by MongoDB's TTL monitor.
refreshTokenSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
