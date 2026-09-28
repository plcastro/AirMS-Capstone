# Certificate sample evaluation, parser 1.2.0

## Dataset and method

The supplied batch contains 58 photographs of 54 distinct documents. Repeated
photos of a document stay together: 42 photos / 38 documents for tuning, and 16
photos / 16 documents from separate holders reserved from parser tuning. The
reserved set includes familiar template families, so this is not a test of wholly
unseen templates. Its results were inspected after the implementation and focused
regression tests were complete; no subsequent extraction changes used its errors.

All photographs were read locally by the existing OCR worker. The baseline and
updated parsers consumed identical cached OCR text, including adaptive readings
when available. This isolates parser improvements from OCR variation. The model
weights and image preprocessing did not change. All 58 reads completed.

Labels were transcribed from the supplied images. Holder scoring ignores case,
diacritics, punctuation and spacing, while retaining letters, digits and word
order. It measures extraction of the printed name, including rank/service labels,
not identity matching against a personnel database. Issue dates are scored only
on the explicitly labelled/given-date subset (26 photos / 23 documents).
Restriction recall measures the 12 photos / 11 documents marked “Engine not
included.” It does not measure recognition of every possible restriction.

A document counts as correct only when **all its photographs** pass the field
check, preventing repeat photos from inflating the document-level results.

## Results

| Field | Tuning baseline | Tuning updated | Reserved baseline | Reserved updated |
| --- | ---: | ---: | ---: | ---: |
| Holder name | 13/38 | 34/38 | 5/16 | 10/16 |
| Explicit issue date subset | 1/18 | 13/18 | 0/5 | 3/5 |
| Engine exclusion recall | 0/8 | 8/8 | 0/3 | 2/3 |

At the photo level, holder extraction improved from 19/58 to 48/58; issue-date
extraction on its labelled subset improved from 1/26 to 19/26; engine-exclusion
recall improved from 0/12 to 11/12. The reserved holder result is 62.5%, so the
combined 82.8% photo result must not be presented as expected production accuracy.

Neither parser invented an expiry date or non-expiring status on these samples.
The updated parser extracted an approved aircraft rating only from the one
explicit licensing table. Generic Bell 412, AS350 series and engine course titles
did not become approved aircraft ratings. Every updated result requires review.
There are no positive expiry examples in this batch; those are covered by
synthetic tests. Course-title, issuer and certificate-number accuracy were not
scored, and OCR spelling errors in those fields remain possible.

## Remaining errors

Older military forms, patterned certificate backgrounds, clipped text, stray
characters attached to names, split headings, missing recipient labels and
reordered date columns still cause missing or unresolved fields. One reserved
document lost its body text in OCR, including its engine exclusion. A missing
extracted restriction therefore does **not** establish unrestricted coverage.
Reviewers must inspect the original, especially dates, model variants, limitations
and crossed-out/checked assessment statements. No certificate was verified,
assigned to a person or granted eligibility during evaluation.

## Reproduction and privacy

Run from `server`, supplying an explicitly selected private manifest:

```text
node scripts/evaluateCertificates.cjs private/certificate-evaluation/manifest.json private/certificate-evaluation/results updated
```

Manifest rows have `id`, document `group`, `split`, local image `path`, and
`expected` fields (`holderName`, `expiryDate`, `doesNotExpire`, optional `issueDate`
and `restriction`). An optional final CLI argument selects a split. The script
rejects groups crossing splits, validates cached image hashes, counts read failures
in denominators, and saves source OCR and parsed evidence separately. Use a new
output directory to re-run OCR rather than reuse its cache. Use the earlier parser
revision to regenerate a baseline; renaming the stage does not switch parsers.

The original images remain in their source location. The manifest, cached OCR,
baseline and final field-level reports are under ignored `server/private/` and
contain personal data. Only this aggregate report, the evaluator, general rules
and synthetic regression tests belong in source control. No remote OCR service,
database import, model training or deployment was performed.

Validation: 104 certificate-related tests passed, including real offline OCR,
layout/date/name regressions, permissions, immutable evidence, human review and
task-qualification enforcement. No dependency additions were needed.
