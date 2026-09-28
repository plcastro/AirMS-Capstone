module.exports = Object.freeze({
  version: '1.2.0', language: 'eng', timeoutMs: 120_000, maxConcurrent: 1,
  maxTextCharacters: 120_000, maxPageCharacters: 20_000,
  renderLongEdge: 2200, maxRenderPixels: 6_000_000,
  minimumEmbeddedCharacters: 80, minimumEmbeddedWords: 8,
  lowOcrConfidence: 0.70, highOcrConfidence: 0.90,
});
