// Similarity scores are heuristics, not probabilities of identity.
module.exports = Object.freeze({
  version: '1.1.0', maxNameLength: 160, maxTokens: 16,
  minimumScore: 0.72, likelyScore: 0.90, ambiguityGap: 0.06, maxCandidates: 3,
});
