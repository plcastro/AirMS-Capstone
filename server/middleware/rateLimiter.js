const rateLimit = require("express-rate-limit");

const normalizeRateLimitValue = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const getLoginRateLimitKey = (identifier) => {
  const normalizedIdentifier = normalizeRateLimitValue(identifier);
  return normalizedIdentifier ? `login:${normalizedIdentifier}` : "";
};

const getOtpRateLimitKey = (value) => {
  const normalizedValue = normalizeRateLimitValue(value);
  return normalizedValue ? `otp:${normalizedValue}` : "";
};

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    getLoginRateLimitKey(req.body?.identifier) ||
    `login-ip:${rateLimit.ipKeyGenerator(req.ip)}`,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many login attempts. Please try again later.",
    });
  },
});

const otpRequestLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    getOtpRateLimitKey(req.body?.token || req.query?.token || req.body?.email) ||
    `otp-ip:${rateLimit.ipKeyGenerator(req.ip)}`,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many OTP requests, please try again later.",
    });
  },
});

const resetLoginRateLimitForIdentifiers = (identifiers = []) => {
  identifiers
    .map(getLoginRateLimitKey)
    .filter(Boolean)
    .forEach((key) => rateLimiter.resetKey(key));
};

const resetOtpRateLimitForValues = (values = []) => {
  values
    .map(getOtpRateLimitKey)
    .filter(Boolean)
    .forEach((key) => otpRequestLimiter.resetKey(key));
};

module.exports = {
  rateLimiter,
  otpRequestLimiter,
  resetLoginRateLimitForIdentifiers,
  resetOtpRateLimitForValues,
};
