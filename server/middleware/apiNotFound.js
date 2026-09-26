// Express defaults to an HTML 404 page, but API clients expect JSON even when
// an endpoint is missing or the client and server versions do not match.
module.exports = (_req, res) => res.status(404).json({
  success: false,
  message: "API endpoint not found.",
});
