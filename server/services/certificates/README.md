# Certificate records, private uploads and review

The reader, parser and name matcher are documented in [EXTRACTION.md](./EXTRACTION.md).
Step 5's analysis, correction, preview and confirmation APIs are documented in
[REVIEW.md](./REVIEW.md).

This layer stores original certificate documents, metadata and append-only audit
events. Every upload starts as `PENDING_REVIEW` / `UPLOADED`. Uploads cannot change
qualifications or supply review fields. Automatic analysis acceptance or authorized confirmation makes a reviewed
certificate available to the separate qualification engine. Web/mobile screens,
reviewer rejection/revocation and task assignment checks are implemented; see
[ROLLOUT.md](./ROLLOUT.md) for operation and validation details.
The existing maintenance AI is unaffected.

## Access

| Role | Upload, list, metadata, history and download |
| --- | --- |
| Mechanic | Own certificates only |
| Maintenance Manager | Any mechanic's certificates |
| Superadmin | Any mechanic's certificates |
| Other roles | Denied |

All routes use the existing authenticated session middleware and current role
permissions. The target of an upload must be an existing mechanic. Access is checked
before multipart parsing and again in the service. Certificate IDs alone do not
authorize access. Storage keys, provider names and Blob URLs are not API fields.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/certificates/personnel/:personnelId` | Upload one document |
| POST | `/api/certificates/match-holder` | Suggest a mechanic from a holder name; read-only |
| GET | `/api/certificates?personnelId=...&page=1` | List a mechanic's records; defaults to caller |
| GET | `/api/certificates/:id` | Read record metadata |
| GET | `/api/certificates/:id/history?page=1` | Read certificate audit events |
| GET | `/api/certificates/:id/file` | Download original bytes through authorized API |

Upload uses multipart field `file` and header `x-action-confirmed: true` (the existing
action-confirmation mechanism). Additional form fields are rejected. This header
confirms the upload action; it does **not** verify the certificate. Metadata/upload
responses use `{ data: ... }`; list also returns `{ pagination: { page, pageSize,
total } }`. Lists and history are newest first, 25 records per page. Page values
must be integers from 1 to 10000. A manager supplies the target `personnelId` when
listing another user's certificates.

All certificate responses have `Cache-Control: private, no-store` and `nosniff`.
Downloads are attachments with a restrictive CSP. File access is recorded before
bytes are returned; failed audit persistence prevents delivery. `FILE_ACCESS_GRANTED`
means authorized access was granted, not that the browser completed the download.
The existing request audit middleware also records certificate route attempts.

## Holder name suggestions

`POST /api/certificates/match-holder` accepts JSON such as
`{ "holderName": "Juan P. Dela Crzu" }`. It returns a `data` object containing
`status`, `suggestedPersonnelId`, `candidates`, `comparisonScope` and
`requiresConfirmation: true`. It never creates or modifies a certificate,
ownership or qualification. This endpoint accepts a supplied holder name; the
Step 4 reading service also invokes the matcher after extraction. Review UI remains
a later stage.

Managers and Superadmins compare against the mechanic directory. A mechanic can
compare only against their own profile; that result makes no claim of uniqueness
across the directory. Only IDs and names are queried, never emails or license data.
The endpoint permits 20 comparisons per minute per account per server instance.

Matching ignores case, accents, spacing and common punctuation, handles surname-first
order and up to two extra middle-name/initial tokens, and scores small spelling
differences including adjacent transpositions. Compound first names and surnames
remain part of the comparison. Initial-only given names cannot yield a strong
suggestion. Duplicate or similarly scored names require a reviewer to choose.

`certificateNameMatching.js` centralizes the initial heuristic thresholds: candidate
score 0.72+, likely match 0.90+, and ambiguity when the top two scores differ by less
than 0.06. Scores are **name similarity, not probabilities of identity**; these
thresholds have not been calibrated against real certificate samples. Return states
are `LIKELY_MATCH`, `POSSIBLE_MATCH`, `AMBIGUOUS` and `NO_MATCH`. Only a unique likely
match supplies `suggestedPersonnelId`; this suggestion alone cannot confirm a source.
The separate [automatic acceptance policy](./AUTOMATION.md) checks the complete evidence.
Names must contain enough information to compare given name and surname; nicknames,
arbitrary OCR corruption and unknown name conventions are not guessed.

## Storage and deployment

- Local development without a dedicated token uses `server/private/certificates/`,
  outside `/uploads` and ignored by Git. Do not expose this folder with static
  hosting. Original bytes are retained without resizing or re-encoding.
- Production (`NODE_ENV=production` or `VERCEL=1`) requires
  `CERTIFICATE_BLOB_READ_WRITE_TOKEN` from a **private Vercel Blob store**. Set it in
  the server environment. Existing public upload tokens are deliberately ignored.
  The Blob SDK is called with `access: 'private'`; no public-storage fallback exists.
- Setting the dedicated token in development uses that same private Blob adapter.
  Changing providers does not migrate existing files; local development uploads
  remain local. Keep the configured provider and original documents together.
- Certificate creation and its `UPLOADED` audit event use one MongoDB transaction.
  Use a transaction-capable replica set (including Atlas) or sharded cluster; a
  standalone MongoDB instance is insufficient. No live database migration or
  deployment is performed by this change.
- Failed transactions remove the new file. An unknown commit outcome retains it
  and logs its opaque key for reconciliation, to avoid deleting a committed
  original. A process crash or ambiguous storage write can also require orphan-file
  reconciliation; there is no scheduled deletion job in this stage.
- Validation uses a short-lived Node child process, without a shell, isolating
  native PDF/image parser failures from the API. The child module is statically
  referenced for deployment tracing. Deploy with the installed `pdf-parse` and
  `sharp` runtime dependencies and platform-native binaries. Deployment smoke tests
  must exercise both an image and PDF upload plus authorized download.

Production credentials and a live transaction-capable MongoDB were not used during
local tests. Blob operations and database transactions are tested with injected
adapters; file decoding, local storage and HTTP multipart handling use real code.

## Validation and limits

`server/config/certificatePolicy.js` centralizes limits:

- JPG/JPEG, PNG and PDF only; matching extension, declared MIME and magic bytes.
- Maximum original size: 4 MiB (multipart overhead is additional).
- Maximum PDF pages: 20. Parse all page structures; reject unreadable, damaged or
  password-protected PDFs. Selectable text is not required.
- Maximum decoded image size: 25 million pixels; single image only, fully decoded
  for validation. Truncated or unsupported images are rejected.
- Up to two active validations per API process, with a 12-second timeout and a
  128 MiB V8 heap limit per validator. Native allocations are separate from this
  heap limit. The child is terminated after success, failure or timeout.
- Ten upload attempts per authenticated account per 15 minutes per server instance.
  The in-memory limiter is not a distributed quota across serverless instances.
- Generated UUID storage names; sanitized display names; SHA-256 and length checks
  when reading back the document.

Validation establishes a readable supported document, not certificate authenticity
or OCR accuracy. It is not antivirus scanning. Automatic acceptance or human review
makes a source available to the separate deterministic qualification engine.

## Records

`CertificateRecord` stores owner/uploader, immutable original-file metadata,
pending/review status, processing status, review timestamps and revision, plus the
original extraction, corrected fields, normalized facts and confirmation decision.
Expiry remains an evaluation-time decision rather than a scheduled status update.
Full extraction evidence is returned by record detail and review operations;
list responses omit it. Policy-approved analysis and human confirmation can set `VERIFIED`.

`CertificateAudit` stores actor, certificate, owner, action, revision, timestamp
and action details. Normal Mongoose mutation operations are blocked; this does not
claim protection against a database administrator using the underlying collection.

## Checks

From the repository root:

```text
node --test server/tests/certificateAccess.test.js server/tests/certificateFiles.test.js server/tests/certificateHolderMatching.test.js server/tests/qualificationEngine.test.js
```

No package additions or npm installs were required for Step 3.
