// Contextual layout rules supplement explicit field labels. No holder names,
// certificate identifiers or aircraft equivalences are learned from the samples.
const heading = /certificate\s*,?\s*of\s+(training|completion|recognition|achievement|competenc[ey]|qualification)\b/i;
const courseWords = /\b(?:course|maintenance|qualification|training|airframe)\b/i;
const courseStop = /^(?:conducted|training course by|at\b|from\b|in (?:the time|recognition|fort)|the course was|course (?:dates|duration)|(?:issue\s+)?date\b|certificate\b|instructor|manager|signed|and the related|has passed|by\b|FAA\b|expiration|provides for|title \d|\d+\s+hours of|is hereby|na itin|\(?conducted|for:)/i;
const completion = /^(?:(?:who|has|had)\s+(?:(?:satisfactorily|successfully)\s+)?completed\b|for having satisfactorily completed\b|is recognized in the successful completion of\b|in recognition of successful completion of\b)/i;
const courseBelow = /^(?:of the approved engine type training course stated below|the engine type training only,? named below)\b/i;
const month = '(?:jan(?:uary|vier)?|feb(?:ruary)?|fevrier|mar(?:ch|s)?|apr(?:il)?|avril|may|mai|jun(?:e)?|juin|jul(?:y)?|juillet|aug(?:ust)?|aout|sep(?:t(?:ember)?)?|septembre|oct(?:ober|obre)?|nov(?:ember|embre)?|dec(?:ember|embre)?)';
const dateText = `(?:\\d{1,2}(?:st|nd|rd|th)?(?:\\s+day\\s*of)?[\\s-]+${month}[\\s,.-]+\\d{4}|${month}[\\s-]+\\d{1,2}(?:st|nd|rd|th)?[\\s,.-]+\\d{4}|\\d{4}-\\d{2}-\\d{2})`;
const folded = value => value.normalize('NFKD').replace(/\p{M}/gu, '');
const extractDate = value => new RegExp(`\\b${dateText}\\b`, 'i').exec(folded(value)
  .replace(/(\d)\s+(st|nd|rd|th)\b/gi, '$1$2').replace(/[-\s]+day[-\s]*of[-\s]+/gi, ' day of '))?.[0];
const clean = value => value.replace(/^\((.*)\)$/, '$1').replace(/^[^\p{L}\p{N}]+/u, '').trim();

function plausibleName(value) {
  const words = value.split(/\s+/);
  return words.length >= 2 && words.length <= 12 && /\p{L}/u.test(value)
    && !/\b(?:certificate|course|training|instructor|manager|director|president|maintenance|aircraft|airframe|engine|completed|birth|date|recognition|issued|award|certif(?:y|ies)|signature|authority|helicopter|hours|academy|license|powerplant|type)\b/i.test(value)
    && !/[/:=]/.test(value)
    && (!/\d/.test(value) || /^(?:A[12]C|SGT|SSGT|TSGT|MSGT)\b.+\s\d+\sPAF$/i.test(value));
}

function readLayout(lines) {
  const entries = [], handled = new Set(), warnings = [];
  const hasBilingualFooter = lines.some(text => /^certificate N[°ºo]\/N[°ºo]/i.test(text));
  const emit = (field, value, index, context = lines[index]) => {
    if (value) entries.push({ field, value, index, text: context });
  };
  const next = index => {
    for (let i = index + 1; i < Math.min(lines.length, index + 7); i++) if (lines[i]) return i;
    return -1;
  };
  const takeCourse = (index, inline = '') => {
    let count = 0, started = false;
    const candidates = inline ? [{ text: inline, index }] : [];
    for (let i = index + 1; i < Math.min(lines.length, index + 12); i++) {
      if (lines[i]) candidates.push({ text: lines[i], index: i });
    }
    for (const candidate of candidates) {
      const text = clean(candidate.text);
      if (courseStop.test(text) || completion.test(text) || /\b\d{4}\b/.test(text)) break;
      if (!started && !courseWords.test(text)) {
        // A title can be just a model, but never guess a name or a signature.
        if (!/^(?:T[12]\s+ARRIEL|AS\d|EC\d|BK\d|ARRIEL|PT6|UH-|Bell\s*\d|KING AIR\s*\d)/i.test(text)) continue;
      }
      if (!/[\p{L}]{2}/u.test(text)) continue;
      if (started && !courseWords.test(text) && !/^(?:on\b|in the\b|approved B[12]|B[12]\/B[12]|(?:AS|EC|BK|PT6)\d|\d+ hours\b)/i.test(text)) break;
      emit('qualifications', text, candidate.index, `${lines[index]}\n${candidate.text}`);
      handled.add(candidate.index); started = true;
      if (++count >= 4) break;
    }
  };
  for (let index = 0; index < lines.length; index++) {
    const line = clean(lines[index]);
    if (!line) continue;
    const title = heading.exec(line);
    // A clipped English prefix may still leave the complete bilingual recipient
    // instruction. Require both languages before using the following name.
    if (/\b(?:recognition|completion) is issued to\b.*\/\s*Ce certificat\b/i.test(line)) {
      const following = next(index);
      if (following >= 0 && plausibleName(lines[following])) {
        emit('holderName', lines[following], following, `${lines[index]}\n${lines[following]}`);
        handled.add(index);
      }
    }
    // In extracted licensing tables, column labels sometimes precede the value
    // column. Only use a name inside the short block before the rating heading.
    if (/^NAME\s*:?$/i.test(line) && lines.slice(index, index + 16).some(text => /LICENSE TYPE AND AIRCRAFT RATING/i.test(text))) {
      for (let i = index + 1; i < Math.min(lines.length, index + 12); i++) {
        if (/LICENSE TYPE AND AIRCRAFT RATING/i.test(lines[i])) break;
        if (plausibleName(lines[i])) { emit('holderName', lines[i], i, `${lines[index]}\n${lines[i]}`); handled.add(index); break; }
      }
    }
    if (/^Airframe\b/i.test(line) && lines.slice(Math.max(0, index - 12), index).some(text => /LICENSE TYPE AND AIRCRAFT RATING/i.test(text))) {
      const inline = line.replace(/^Airframe\s*[:=]*\s*/i, '').replace(/^[\s:=]+/, '').replace(/[\s=]+$/, '');
      if (inline) emit('aircraftRatings', inline, index);
      for (let i = index + 1; i < Math.min(lines.length, index + 8); i++) {
        if (!lines[i]) continue;
        if (/powerplant|privileges|^type\b/i.test(lines[i])) break;
        const value = lines[i].replace(/^[\s:=]+/, '').replace(/[\s=>]+$/, '');
        if (!/\d/.test(value)) break;
        emit('aircraftRatings', value, i, `${lines[index]}\n${lines[i]}`); handled.add(i);
      }
      handled.add(index);
    }
    if (title && !/^(?:this|is hereby)\b/i.test(line)) {
      emit('certificateType', `Certificate of ${title[1].toLowerCase()}`, index);
      if (!/awarded to/i.test(line)) handled.add(index);
    }
    if (/^certification of practical exercises\b/i.test(line)) {
      emit('certificateType', 'Certification of practical exercises', index);
      takeCourse(index); handled.add(index);
    }
    // Ignore approval expiry, which belongs to the provider's course approval.
    if (/expir(?:ation|y)\s+date\s+of\s+(?:the\s+)?course\s+approval/i.test(line)) {
      handled.add(index); warnings.push({ code: 'COURSE_APPROVAL_EXPIRY_NOT_CERTIFICATE_EXPIRY', field: 'expiryDate' });
    }
    if (courseBelow.test(line)) { takeCourse(index); handled.add(index); }
    if (completion.test(line)) {
      let previous = index - 1;
      while (previous >= 0 && !lines[previous]) previous--;
      if (previous >= 0 && index - previous <= 4 && plausibleName(lines[previous])
        && lines.slice(0, index).some(text => heading.test(text) || /^certification of practical/i.test(text))) {
        emit('holderName', lines[previous], previous, `${lines[previous]}\n${lines[index]}`);
      }
      // Bilingual theory/exam checkboxes are not course titles or proof of passing.
      if (/theor(?:y|etical)|practical (?:course|training)|above mentioned/i.test(line)) continue;
      const inline = line.replace(completion, '').trim().replace(/^(?:the prescribed? course of instruction on|a course of(?: instruction on)?|the training on|the|a)\b\s*/i, '').replace(/^[:\s]+/, '');
      if (/^(?:\d+ course hours on|\d+ hours)/i.test(inline)) {
        const after = next(index);
        if (after >= 0 && /entitled\s*:/i.test(lines[after])) takeCourse(after);
      } else takeCourse(index, inline);
      handled.add(index);
    }
    if (/^by\s*\/\s*par\b/i.test(line)) {
      const issuer = line.replace(/^by\s*\/\s*par\s*:?\s*/i, '').split(/,\s*(?:avenue|an organisation|a maintenance)/i)[0];
      emit('issuingAuthority', issuer, index); handled.add(index);
    }
    if (/^conferred on\s*:?$/i.test(line)) {
      let previous = index - 1;
      while (previous >= 0 && !lines[previous]) previous--;
      if (previous >= 0 && index - previous <= 3) {
        const date = extractDate(lines[previous]);
        if (date && folded(lines[previous]).trim() === date) {
          emit('issueDate', date, previous, `${lines[previous]}\n${lines[index]}`); handled.add(index);
        }
      }
    }
    // A footer row can be reordered far from its header by OCR. Only recover a
    // number and date together when the bilingual certificate footer exists.
    if (hasBilingualFooter) {
      const footer = /^(\d+-\d+)\s+(le\s+\d+\s+[\p{L}]+\s+\d{4})\b/iu.exec(line);
      if (footer) {
        emit('certificateNumber', footer[1], index);
        emit('issueDate', footer[2], index);
      }
    }
    // Dates and certificate IDs printed in adjacent footer columns. Header must
    // be present; DOB, course intervals and organisation approval IDs are excluded.
    if (/^certificate\s+(?:reference|N[°ºo]\/N[°ºo])/i.test(line)) {
      handled.add(index);
      for (let i = index + 1; i < Math.min(lines.length, index + 9); i++) {
        const row = lines[i];
        if (/^(?:from|at\b|this\b|by\b|certificate\b)/i.test(row)) break;
        const id = /^\s*((?=[\w-]*\d)[A-Z\d]+(?:[_-][A-Z\d]+)+)\b/i.exec(row);
        if (id) emit('certificateNumber', id[1], i, `${lines[index]}\n${row}`);
        if (/\bDate\b/i.test(line) && !/birth|naissance|\bfrom\b|\bto\b/i.test(row)) {
          const date = extractDate(row);
          if (date) emit('issueDate', date, i, `${lines[index]}\n${row}`);
        }
        if (id) break;
      }
    }
    if (/^(?:(?:issue date|date(?:\s*\/\s*date)?)(?=\s*[:;]|\s*$|\s+Instructor\b|\s+\d|\s+le\b)|given this\b|on this the\b)/i.test(line)
      && !/birth|naissance|course|approval/i.test(line)) {
      const inline = extractDate(line);
      const following = next(index);
      const followingDate = !inline && following >= 0 && !/from|birth|naissance|certificate/i.test(lines[following]) ? extractDate(lines[following]) : null;
      if (inline || followingDate) {
        emit('issueDate', inline || followingDate, inline ? index : following,
          inline ? lines[index] : `${lines[index]}\n${lines[following]}`);
        handled.add(index);
      }
    }
    if (/\btheory\s*&\s*practical|\bhas passed the exam for/i.test(line)) {
      warnings.push({ code: 'ASSESSMENT_MARKINGS_REQUIRE_VISUAL_REVIEW', field: 'qualifications' });
    }
  }
  return { entries, handled, warnings };
}

module.exports = { readLayout, plausibleName };
