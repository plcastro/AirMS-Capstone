const RefreshToken = require("../models/refreshTokenModel");

const REFRESH_TOKEN_RECORD_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

let hasInitialized = false;

const getCleanupDate = (date) =>
  new Date(new Date(date).getTime() + REFRESH_TOKEN_RECORD_RETENTION_MS);

const backfillRefreshTokenCleanupDates = async () => {
  if (hasInitialized) return;
  hasInitialized = true;

  const tokens = await RefreshToken.find({
    cleanupAt: null,
    expiresAt: { $type: "date" },
  }).select("_id expiresAt revokedAt");

  if (!tokens.length) return;

  await Promise.all(
    tokens.map((token) => {
      const cleanupAnchor = token.revokedAt || token.expiresAt;
      token.cleanupAt = getCleanupDate(cleanupAnchor);
      return token.save();
    }),
  );

  console.log(
    `Backfilled cleanup dates for ${tokens.length} refresh token record(s)`,
  );
};

const startSessionRetentionJob = () => {
  backfillRefreshTokenCleanupDates().catch((error) => {
    console.error("Session retention initialization failed:", error.message);
  });
};

module.exports = { startSessionRetentionJob };
