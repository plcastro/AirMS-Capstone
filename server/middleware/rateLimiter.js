const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests, please try again in 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const otpRequestLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: "Too many OTP requests, please try again in 5 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

module.exports = { rateLimiter, otpRequestLimiter };
