# Automatic certificate acceptance

Web and mobile read each document immediately after upload. Clear, complete readings
are accepted without a verification dialog. Uncertain readings remain saved and show
**Needs attention**, the unresolved details, and a way to check them. Reading failures
can be retried without uploading the same file again.

The server assesses the original extraction using `certificateAutomationPolicy.js`:

- Every page must contain readable text. Every OCR reading must score at least 0.95,
  including an alternate reading when present. Embedded PDF text does not receive
  an artificial OCR score.
- The holder must uniquely match the selected mechanic, with name similarity at
  least 0.98. A different or ambiguous owner needs attention.
- Required facts and their source evidence must be present: holder, certificate
  type or number, recognized aircraft ratings, and expiry information (or an explicit
  statement that the certificate does not expire). Missing expiry is not assumed
  to mean lifetime validity.
- Conflicting fields, uncertain assessment markings, unresolved parser warnings
  and restrictions need attention. Confidence in individual words cannot resolve
  an unclear qualification or restriction.

These thresholds are conservative heuristics, not calibrated probabilities of
authenticity or identity. Original extraction evidence remains an immutable draft;
the separate acceptance decision records how it was accepted. Corrections use the
existing human review path and cannot manufacture automatic acceptance.

Successful automatic acceptance saves `VERIFIED`, `verificationMethod: AUTOMATIC`,
`verifiedAt`, and the versioned decision bound to the certificate, owner and source
hash. It records an `AUTO_VERIFIED` audit event in the same transaction. It does not
invent a human reviewer. Client requests cannot supply acceptance evidence. Revision
and source hash checks prevent accepting stale evidence; failed auditing rolls back
the change.

The qualification engine checks this evidence independently and still applies expiry,
issue dates, revocation, aircraft coverage and restrictions. Accepting a readable
certificate does not guarantee current qualification. Existing records are not
automatically reprocessed. Each account may upload and analyze up to ten files per
15-minute window; reaching a limit stops the remaining queue and preserves saved files.
