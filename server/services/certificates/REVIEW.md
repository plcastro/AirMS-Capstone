# Certificate analysis and confirmation — Step 5

This backend connects the private upload, OCR/parser, holder matcher and deterministic
qualification engine. The later approved integration adds [web/mobile screens and task
assignment checks](./ROLLOUT.md). No additional dependency installation is needed.

## Workflow and API

All paths below start with `/api/certificates`. Authenticate with the existing
session. Analyze, correct and confirm requests also require `x-action-confirmed: true`
or `confirmAction: true`. JSON review requests are limited to 64 KiB, including when
the main application has already parsed the body. Responses use `{ data: ... }`.

| Operation | Route | Required body |
| --- | --- | --- |
| Upload | `POST /personnel/:personnelId` | Existing multipart `file` upload |
| Analyze stored original | `POST /:id/analyze` | `{ "expectedRevision": 1 }` |
| Save corrections | `PATCH /:id/review` | `expectedRevision`, `corrections`, `reviewNote` |
| Recalculate provisional preview | `POST /:id/preview` | `expectedRevision` |
| Confirm reviewed source | `POST /:id/confirm` | `expectedRevision`, `confirmedPersonnelId`, `sourceReviewed: true`, `reviewNote` |
| Current official qualifications | `GET /personnel/:personnelId/qualifications` | None |
| Original evidence and saved review | `GET /:id` | None |
| Audit history | `GET /:id/history?page=1` | None |
| Mechanic names available to caller | `GET /directory` | None |
| Reject pending source | `POST /:id/reject` | `expectedRevision`, `reviewNote` |
| Revoke verified source | `POST /:id/revoke` | `expectedRevision`, `reviewNote` |

Mechanics may analyze/correct their own uploads, preview and read their own records.
Maintenance Managers and Superadmins may do this for any mechanic and have the new
`certificates.review.all` permission to confirm. Other roles cannot use these APIs.

Analysis returns `{ certificate, preview }`, saving `ANALYZED` processing status.
Clear, complete readings that pass the [automatic acceptance policy](./AUTOMATION.md)
become `VERIFIED` with `verificationMethod: AUTOMATIC` and no preview or user confirmation.
Other readings remain `PENDING_REVIEW` with specific reasons for needing attention.
Original text, page evidence, extracted
fields, confidence, warnings and original holder suggestions remain in `analysis`.
Reanalysis of an already analyzed record is blocked to preserve the original evidence;
correct the fields or upload a better original instead. Failed reading records
`FAILED` plus an audit event and can be retried using the new revision. Busy-reader
responses do not change the revision. Analyze permits ten attempts per account per
15 minutes per server instance; existing reader concurrency and time limits still apply.

Correction example:

```json
{
  "expectedRevision": 2,
  "corrections": {
    "holderName": "Juan Dela Cruz",
    "aircraftRatings": ["Bell 412 EP", "Eurocopter AS350 B3"],
    "expiryDate": "2027-05-20",
    "doesNotExpire": false
  },
  "reviewNote": "Corrected OCR spelling and ratings against the original."
}
```

Correction fields are restricted to `certificateType`, `holderName`,
`certificateNumber`, `issuingAuthority`, `issueDate`, `expiryDate`, `doesNotExpire`,
`aircraftRatings`, `qualifications`, `taskAuthorizations` and `limitations`.
Dates are calendar-valid `YYYY-MM-DD` or null. Arrays have at most 50 non-empty text
values. Holder names have a 160-character limit; other text fields/items allow 1000.
Review notes require 1–2000 characters. Unknown fields, eligibility flags, reviewer
IDs and client-supplied evaluation dates are rejected. Corrections merge with earlier
corrections and preserve the untouched extraction; changing ratings explicitly
replaces the OCR rating list, including unknown variants. Normalization uses the
central aircraft aliases. Correcting the holder's name refreshes the suggestion.

## Preview versus confirmation

Previews have `provisional: true` and `grantsQualifications: false`. Their `results`
show the potential portfolio outcome **if this revision is confirmed**, including
other verified certificates. `errors` lists missing or inconsistent review facts.
They never create official qualifications. Correction responses also include a fresh
preview. Reading the official qualifications endpoint excludes pending records.

Confirmation requires explicit acknowledgment of the original source and its owner:

```json
{
  "expectedRevision": 3,
  "confirmedPersonnelId": "111111111111111111111111",
  "sourceReviewed": true,
  "reviewNote": "Checked the original, resolved OCR warnings and confirmed the mechanic."
}
```

The reviewer must check the source, warnings and any corrections, including removed
limitations. Low OCR confidence alone does not block a human-confirmed source;
automatic acceptance requires all evidence checks, not confidence or a name match alone. Missing
holder name, missing certificate type/number, missing/unknown ratings or ambiguous
validity information must be corrected first. A non-expiring certificate needs
`doesNotExpire: true` and `expiryDate: null` explicitly established from the document.

The confirmed mechanic must match the upload's immutable owner. If the suggested or
selected mechanic differs, upload under the correct mechanic; fuzzy matching cannot
silently move a private document between personnel accounts.

Confirmation stores `VERIFIED`, the authenticated reviewer, server timestamp and
the qualification decision. Verification means the facts were reviewed; it is not
itself an eligibility grant. Expired, future-dated or restricted evidence can be
recorded as verified but cannot grant all tasks. Valid, unrestricted, verified
certificates covering B412EP or AS350B3 grant `ALL_TASKS` on the covered aircraft.
There are no task-specific certificate rules in this approved version.

The official qualifications endpoint recomputes using the server's current
Asia/Manila calendar date. Expiry is inclusive through that date and is reevaluated
on each request. Multiple verified sources are combined; an expired source does
not erase another valid source. Existing role and workflow permissions still apply.
`qualificationDecision` stored on the certificate is a historical confirmation
snapshot, not a substitute for the current qualifications endpoint.

## Consistency and audit

Every mutation requires the current integer `expectedRevision`. A conditional update
and its audit event run in one MongoDB transaction; failure to persist history rolls
back the change. A stale review returns 409. After a successful response, use the new
`certificate.revision` (or `revision` for confirmation). Reload after a conflict or
lost response. Verified records cannot be edited or confirmed again through these
pending-review endpoints. Reviewers may reject pending records or revoke verified
sources with a reason, confirmation header and current revision. These transitions
also use an atomic audit transaction; revoked sources stop contributing to current
qualifications. Reassignment of document ownership is not exposed.

Audit events include `ANALYZED`, `ANALYSIS_FAILED`, `REVIEW_UPDATED`, `VERIFIED`, `REJECTED` and `REVOKED`,
with source hashes, original fields, normalization, before/after corrections, notes,
preview rules and final decision evidence. Private source downloads retain their
existing access audit. Data is never copied into the existing maintenance AI.

Tests use mocked repositories with transaction rollback plus actual Mongoose schema
validation and local HTTP routes. OCR tests additionally run the real reader offline.
No live MongoDB transaction or deployment is performed by this step.

```sh
node --test server/tests/certificateReview.test.js server/tests/certificateAccess.test.js server/tests/certificateFiles.test.js server/tests/certificateHolderMatching.test.js server/tests/certificateExtraction.test.js server/tests/qualificationEngine.test.js
```
