# Automatic certificate acceptance and aircraft approval

Web and mobile read uploads immediately. The main screen shows only certificate
holder, certificate type, qualifications, detected aircraft, and approval evidence.
A matching holder and supported aircraft grant all AirMS tasks for that aircraft
without a verification dialog. Unreadable or ambiguous matching facts remain saved
as **Needs attention**.

## Current policy (2.0.0)

- The holder must uniquely match the selected mechanic using the existing name
  matcher (likely-match threshold 0.90). A different or ambiguous owner needs help.
- A supported aircraft name may occur in a qualification, aircraft rating, or other
  certificate text. The decision retains the actual text, page and normalized type.
  AS350B3e matches the configured AS350B3 / AS350B3e group. Unknown variants and
  generic engine families are not silently mapped to a supported aircraft.
- The original must contain readable source evidence for the holder and aircraft.
  A low whole-page OCR score does not veto recognized matching text. Scores remain
  diagnostic metadata, not probabilities of identity or authenticity.
- Certificate type, number, issuer and expiry are not approval prerequisites.
  Course notes such as 'Engine not included' are retained, while the requested
  AirMS aircraft-match rule grants all tasks for the detected aircraft.
  Explicit negative/differences statements with ambiguous aircraft coverage need help.
- Licence validity is ignored for now (`ignoreLicenseValidity` in qualificationRules.json).
  Missing, expired, invalid or future validity dates do not block task qualification.
  Original dates remain stored; missing dates are never rewritten as lifetime validity.
- Rejected/revoked sources, wrong owners and unsupported aircraft still cannot grant
  task access. A positive match on one certificate is sufficient; other course notes
  do not cancel that approval.

## Evidence and corrections

Automatic acceptance saves VERIFIED, verificationMethod AUTOMATIC, verifiedAt and a
versioned decision bound to the certificate, owner and source hash. An AUTO_VERIFIED
history event and the qualification decision are committed in one transaction. The
explanation names the matching aircraft and includes the exact supporting text.
No human reviewer is invented; client inputs cannot supply an automatic decision.

Uncertain readings expose only the three main fields for correction. **Confirm details**
is one explicit action for authorized reviewers; it saves corrections and records
manual confirmation. Mechanics can save corrections for an authorized reviewer.
The source notes and rejection/revocation controls remain under **Source notes & history**.

## Existing uploads

Opening a profile automatically reassesses older pending analyzed records, one at a
time, from their stored OCR evidence. It refreshes the owner match and uses the new
policy without re-uploading or repeating OCR. Original analysis stays unchanged;
new interpretation and decisions are audited. Records with saved corrections, revoked
records and records already evaluated under the current policy are not overwritten.
Revision/source-hash checks and transactional audit still apply. Failed reassessment
can be retried with the saved file; no duplicate upload is needed.

Uploads allow 100 files per account per 15-minute window. Analyses and cached
policy rechecks have no time-window quota; the document reader still bounds OCR
concurrency and processing time. A partial batch preserves successful files and
stops on an access or resource-contention failure.
