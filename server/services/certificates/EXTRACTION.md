# Certificate reading — Step 4

The approved reading layer builds an unverified draft from the privately stored
original document. Step 5 now connects it to [analysis and confirmation APIs](./REVIEW.md).
Uploads still end in `PENDING_REVIEW` / `UPLOADED`; the reader itself does not change
that record. The review service persists its result separately. Web/mobile screens
now expose the workflow inside Mechanics, in the selected mechanic's
Certificates & Qualifications tab (or the signed-in mechanic's own profile).

## Entry point

```js
const { createCertificateReadingService } = require('./certificateReadingService');
const readCertificate = createCertificateReadingService();
const draft = await readCertificate(authenticatedRequest, certificateId);
```

The service checks certificate access, obtains the original through the authorized
download service (which audits file access), reads and parses it, and calls the
permission-scoped mechanic name matcher. It never reassigns ownership, verifies a
certificate or evaluates task eligibility. The result contains:

- `certificateId`, `personnelId`, `sourceRevision`, `sourceSha256` for the original
  record and later concurrency/provenance checks.
- `status: 'DRAFT'`, `requiresConfirmation: true`.
- `extraction`: page text, physical page number, extraction method, OCR score,
  any sparse embedded text retained for comparison, combined raw text and reader version.
- `certificateData`: holder, issuer, number, type, issue/expiry dates, explicit
  non-expiry indication, aircraft ratings, unknown labels, qualifications,
  task-authorisation text and limitations. Unresolved scalar fields are `null`.
- Original extracted values, page/line evidence, aircraft normalizations, review
  warnings and parser version. Evidence line numbers refer to the returned text,
  not coordinates in the source image. Image bounding boxes are not extracted.
- `holderMatch`: existing name-similarity suggestions, with the original owner
  preserved. An apparent match to a different owner adds a review warning.

The lower-level `readCertificateText(file)` and `parseCertificateFields(extraction)`
functions support tests and future job workers. Do not expose them directly to
unauthenticated callers. The Step 5 endpoint must enforce access, rate limits and
the deployment's request-duration budget, and recheck revision/hash before saving.

## Reading strategy

Each PDF page is inspected independently. Useful embedded text is used first.
Sparse, empty or corrupt-looking text triggers rendering and OCR for that page;
mixed digital/scanned PDFs therefore use both methods. Sparse embedded text is
retained separately so contradictory facts are not silently overwritten by OCR.
JPG, JPEG and PNG always use OCR. Images are oriented using metadata, flattened on
white, resized within bounds and converted to greyscale for recognition. Original
stored bytes are unchanged.

Reader/parser version 1.1.0 retries OCR below the verification threshold using
adaptive thresholding for uneven lighting. Both readings are retained, bounded by
the existing text/time limits, and conflicting scalar facts remain unresolved.
The aggregate confidence includes both readings. This adds no dependencies.
Completion layouts support `Certifies that` and `Conferred on`, including dates
such as `15th day of November, 2019`; engine course titles do not imply aircraft
coverage or non-expiring validity.

English OCR runs locally through pinned `tesseract.js@7.0.0` and
`@tesseract.js-data/eng@1.0.0`. These are two new direct npm dependencies (plus their
transitive dependencies); existing direct package versions were not upgraded.
The reader resolves the packaged English model and disables disk caching. It does
not download language data or send documents to an external OCR/AI service.
This follows Tesseract's [local installation options](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md)
and [worker API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md).

Parsing is deterministic and label-based. Field labels live in
`config/certificateFieldPatterns.js`; aircraft aliases come from the existing
separate qualification engine. Names may also follow “This certifies that…”.
An aircraft mention in a course heading is retained as `aircraftMentions` and
flagged for review; it is not silently promoted to a formal aircraft rating.
Unknown aircraft variants are retained, never fuzzy-corrected.

ISO dates and explicit month-name dates are normalized to `YYYY-MM-DD`. Ambiguous
numeric dates such as `04/05/2027` stay unresolved. Expiry is never inferred from
an issue date; “does not expire” must be explicit. Contradictory holder names,
certificate numbers, dates and other scalar fields stay unresolved with all source
values retained. Restrictions and negative authorization wording stay visible.

The reader returns an unverified draft. The review service can accept it automatically
under the [automatic acceptance policy](./AUTOMATION.md); uncertain or incomplete
readings need user attention. OCR scores are
not the probability that a certificate is genuine, the holder is correctly matched
or the mechanic is qualified. Digital text has `confidence: null`; it is not assigned
a fabricated 100% OCR score. The aggregate OCR score is the minimum OCR page score.
Unreadable or unrelated documents can return review warnings with empty fields.
The parser is not a certificate-authenticity detector.

## Limits and deployment

`config/certificateExtractionPolicy.js` controls one active read per process,
a 120-second deadline, 20,000 characters per page, 120,000 per document, a 2,200-pixel
rendering long edge and a six-million-pixel rendering ceiling. Original uploads
retain the Step 3 limits (4 MiB, 20 PDF pages, 25 million image pixels). The worker
process has a 384 MiB V8 heap limit; native/WASM allocations are additional.
The child and its OCR thread are terminated on completion, timeout or failure.
Timeout/format failures return controlled errors; no partial extraction is saved.

Vercel include-file configuration retains the reader modules, OCR worker, WASM core
and local language data. No deployment was made or tested against a live database.
Step 5 must assess synchronous request time limits versus a job worker for long
documents, and production testing must cover Linux/native rendering and OCR cold starts.
Do not assume the 120-second application timeout overrides hosting limits.

Parser version 1.2.0 also supports bilingual recipient/reference blocks, French
month names in issue dates, completion/practical-exercise layouts, and explicit
airframe rows in licensing tables. It separates provider course-approval expiry
from certificate expiry and birth dates from issue dates. Engine exclusions,
differences training and assessment checkbox wording require review. Punctuation
and case differences in holder names do not create false conflicts; differing
letters or generational suffixes still do. Name matcher 1.1.0 handles printed
military rank/service labels and suffix position, but a missing suffix can only
produce a possible match and conflicting suffixes cannot match.

These are deterministic extraction improvements using the existing pretrained
English OCR model, not training or fine-tuning model weights. No new dependencies
or external document-processing service were added for this revision. The
[sample evaluation](./EVALUATION.md) records results and remaining limitations.

Handwriting, severe blur,
unusual layouts, arbitrary text rotation, other languages and alternative date/name
conventions may require manual entry. These limits must be reflected in the future UI.

## Tests

```text
node --test server/tests/certificateExtraction.test.js server/tests/certificateLayouts.test.js server/tests/certificateAccess.test.js server/tests/certificateFiles.test.js server/tests/certificateHolderMatching.test.js server/tests/qualificationEngine.test.js
```

Tests use generated documents, real PDF extraction/rendering and real English OCR
with HTTP/HTTPS/fetch blocked in the extraction process and its OCR threads. They
cover digital, scanned and mixed PDFs, PNG/JPEG, poor/blank input, conflicting facts,
ambiguous dates, unknown aircraft, limits, timeouts, access and owner preservation.
Synthetic tests do not establish real-world accuracy; the separate private sample
evaluation below measures selected fields from the supplied photographs.
