> Current policy (2.0.0): matched holder and supported aircraft evidence approve all
> tasks. Licence validity is ignored for now, so printed/missing/expired dates do
> not block an accepted source. New aircraft-match decisions preserve course notes
> without treating them as task restrictions. See [automatic approval](../certificates/AUTOMATION.md).
> The strict validity examples below describe the legacy policy when validity
> enforcement is enabled; they are not the current default.

# Aircraft qualification engine — Step 2

This standalone, deterministic CommonJS module implements the approved rule:
**a mechanic with a verified, valid certificate covering an aircraft model is
eligible for all AirMS task categories on that model.**

The pure evaluator has no database, upload, OCR, network, UI, or existing maintenance-AI
dependency. The separate `taskQualificationService.js` adapter resolves aircraft
registrations and verifies current sources for task assignment and active work.

## Public API

```js
const {
  evaluateQualification,
  buildQualificationProfile,
  normalizeAircraft,
} = require('./services/qualificationEngine');

const personnelData = { id: 'mechanic-1', jobTitle: 'Mechanic' };
const certificates = [{
  id: 'certificate-1',
  personnelId: 'mechanic-1',
  status: 'VERIFIED',
  reviewedBy: 'reviewer-1',
  reviewedAt: '2026-09-20T10:00:00Z',
  aircraftRatings: ['Bell 412 EP'],
  issueDate: '2026-01-01',
  expiryDate: '2027-05-20',
  limitations: [],
}];

const result = evaluateQualification({
  personnelData,
  certificates,
  aircraftType: 'B412EP',
  task: 'Engine Maintenance', // Optional context; no per-task qualification rules.
  asOf: '2026-09-28',
});
// result.decision === 'QUALIFIED'
// result.allTasksAllowed === true
// result.permittedTaskScope === 'ALL_TASKS'
// result.sourceCertificates === ['certificate-1']
```

`buildQualificationProfile({ personnelData, certificates, asOf })` returns
verified, valid, unrestricted certificate sources, their normalized ratings,
and assessments of every supplied record (including excluded sources).
The profile is an evidence snapshot, **not permission to assign work**. Call
`evaluateQualification` for an aircraft: another current verified certificate
may contain a conflicting restriction that prevents an all-task grant.

## Input and trust contract

- Supply authoritative server-side personnel identity and certificate records.
  A future controller must never trust client-supplied `VERIFIED`, reviewer IDs,
  or eligibility booleans. This pure module cannot authenticate a reviewer or
  prove document authenticity.
- Certificate `id`/`_id` must identify one source revision. Duplicate source IDs
  are excluded pending reconciliation, rather than merging contradictory facts.
- `personnelId` must match the evaluated person's `id`/`_id`. Names and OCR
  confidence cannot establish identity. String IDs and Mongo ObjectIds are
  supported.
- A qualifying certificate has `status: 'VERIFIED'` and either a human `reviewedBy`
  with an ISO UTC `reviewedAt`, or server-recorded automatic acceptance evidence
  (policy version, certificate/owner binding, source hash, no unresolved reasons,
  and `verifiedAt`). Pending, rejected, expired, and revoked records cannot
  contribute. A populated `revokedAt` also excludes a source.
- `aircraftRatings` is an array of aircraft model labels extracted from explicit
  certificate coverage, not arbitrary aircraft mentions in raw text.
- `limitations` is an array. Any unresolved entry blocks this certificate from
  granting all tasks. `requiresManualReview: true` also excludes the source.
- The caller supplies the reviewed factual fields directly. The engine never
  chooses between raw extraction and corrected fields or marks data verified.
- `confidence`, `rawText`, certificate numbers, and issuer names do not create
  eligibility. A low-confidence extraction may become usable after human
  verification; a high-confidence unverified extraction never does.

## Validity and deterministic time

`asOf` is a required, valid `YYYY-MM-DD` business date. No implicit system clock
is used. The future API must derive it from its configured business timezone
(AirMS currently operates in Asia/Manila), not accept it from an untrusted client
for current authorization. Re-evaluate from the source records when checking
eligibility; do not keep using a historical profile after expiry or revocation.

Issue and expiry dates use the same strict date-only format. An omitted issue
date is allowed; a supplied one must be valid and not in the future. Expiry is
inclusive: a certificate expiring on September 28 is valid on September 28 and
expired on September 29. A missing expiry requires review unless the verified
record explicitly states `doesNotExpire: true`. Supplying both that flag and an
expiry date is contradictory and requires review. The review timestamp's UTC
calendar date must not fall after `asOf`.

`validThrough` is the latest expiry among usable sources for the aircraft, or
`null` when an eligible source explicitly does not expire. This describes the
current evidence, not a promise against later revocation. When not qualified,
`validThrough` is also `null`; always inspect `qualified` first.

## Decisions and evidence

- `QUALIFIED`: every required person/aircraft check passes and at least one
  eligible source covers the aircraft. Any task category is covered.
- `NOT_QUALIFIED`: no usable source, expired/revoked/rejected evidence, or the
  person is not a mechanic.
- `NEEDS_REVIEW`: an unknown aircraft, uncertain relevant evidence, missing
  review/validity details, or a current verified restriction prevents a decision
  granting all tasks. This always means `qualified: false`.

Every result includes rule version, evaluation date, matched/failed reasons,
individual certificate checks, normalization evidence, and supporting source IDs.
The full assessments explain exclusions even for documents that could not be
mapped to the requested aircraft. Keep those assessments behind personnel access
controls when API endpoints are added.

Multiple certificates can support different aircraft, and a second valid source
can retain eligibility after another expires. An expired, rejected, or revoked
certificate does not override a valid replacement. A **current verified
restriction for the same aircraft** requires review even if another source is
unrestricted. Restrictions on a different aircraft do not block this aircraft.

## Configuration

- `aircraftAliases.json`: central full-label aliases. Case, whitespace, and
  hyphens are normalized. No fuzzy matching: `B412`, `AS350`, `B412 EF`, and
  unapproved variants remain unknown. Under the user-approved AirMS policy,
  AS350B3 and AS350B3e share the AS350B3 qualification group; this is an application
  policy, not a determination of regulatory certificate equivalence.
- `qualificationRules.json`: approved policy version, supported models, mechanic
  role, task scope, expiry boundary, and certificate requirements.

Adding an approved aircraft requires updating both configuration files and tests.
Policy changes must increment the rule version. Do not add maintenance-risk
rules or LLM decisions from `services/aiAssessment` here.

## Verification

From the repository root:

```sh
node --test server/tests/qualificationEngine.test.js
```

The existing `server/tests/run.js` also discovers this test file automatically.
Document/image quality, OCR, protected storage and review APIs are implemented
and tested in the separate [certificate layer](../certificates/README.md).
Task assignment enforcement is covered in `server/tests/taskQualifications.test.js`.
