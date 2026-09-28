const policy = require('../../config/certificateExtractionPolicy');

function usableEmbeddedText(text) {
  const content = String(text || '').trim();
  const letters = content.match(/\p{L}/gu) || [];
  const words = content.match(/\p{L}{2,}/gu) || [];
  return content.length >= policy.minimumEmbeddedCharacters && words.length >= policy.minimumEmbeddedWords &&
    letters.length / content.length >= 0.45 && !/[\uFFFD\u0000]/u.test(content);
}
module.exports = { usableEmbeddedText };
