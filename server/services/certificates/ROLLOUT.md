# Certificate screens, assignment integration and validation — Steps 6–8

## User workflow

Web and mobile: **Mechanics > select a mechanic > Certificates & Qualifications**.
The full certificate workflow is embedded in the mechanic profile alongside the
Ongoing and Completed task tabs. There is no separate Certificates menu/module.
Mechanic accounts open their own certificate profile directly from Mechanics;
they do not fetch the manager's mechanic directory or task list. Maintenance
Managers and Superadmins select a mechanic in the existing directory. The certificate
owner is fixed to that profile, and the initial filter is All. The old
web `/dashboard/certificates` address redirects to `/dashboard/mechanics`.

1. Open the mechanic's Certificates & Qualifications tab and select one or more
   PDF, JPG or PNG files. Each file is stored privately as its own pending certificate.
   Limits are 4 MiB and 20 PDF pages per file. Files upload sequentially with progress
   and per-file results; each successful upload is read automatically before the next.
   Saved files survive another file's failure. Multiple uploads return to the list.
   Uploads allow 100 files per account per 15 minutes. Analyses and cached policy
   rechecks have no time-window quota. Upload throttling or OCR resource contention
   stops the queue and reports remaining files as skipped. Leaving the profile
   stops further queued uploads.
2. Clear, complete readings are **Accepted automatically** with no verification dialog.
   Other files show **Needs attention** and **Check details**, with specific reasons.
   OCR may take up to two minutes. A reading error preserves the saved file and provides
   retry; a revision conflict requires reopening the record.
3. The certificate view shows holder, type and qualifications, followed by detected
   aircraft and the exact text behind the match. **Aircraft task approval** links to
   the certificate that qualified the mechanic.
4. When a reading needs attention, compare it with **View original** and correct the
   three fields. An authorized reviewer selects **Confirm details** once. Mechanics
   can **Save details** for an authorized reviewer. There are no expiry fields, rating
   selectors, review checkboxes or preview dialogs in the main workflow.
5. Licence validity is ignored for now. A matching holder and supported aircraft
   approve all tasks for that aircraft. Source notes are retained under history.
   Older pending files are automatically reassessed when the profile opens; no
   duplicate upload is needed. See [AUTOMATION.md](./AUTOMATION.md).
6. Reviewers can reject a pending upload or revoke a verified source with a reason.
   Originals, corrections and history remain available under All certificates.

Original downloads explicitly save a copy using the platform's existing export
mechanism. The upload owner is immutable; if name matching identifies another
mechanic, upload under that mechanic instead of transferring a private document.
List pages contain 25 records. Review history loads additional pages on demand.
The shared client preserves certificate restrictions and sends multipart uploads
without a JSON Content-Type header. No new dependencies are added in Steps 6–8.

## Task qualification enforcement

`GET /api/tasks/qualified-mechanics?aircraft=RP-C...` is restricted to assignment
managers. It returns mechanic names, qualification state and a short explanation;
it does not expose source documents or private certificate fields. Web/mobile task
creation and editing show unavailable mechanics disabled, with their reason.
Changing aircraft invalidates old picker results immediately. Lookup failures
disable assignment and provide Retry. The API rechecks instead of trusting the UI.

The aircraft type comes from `Aircraft.type` and/or `PartsMonitoring.aircraftType`
for the registration, never from the task payload or checklist's model. If both
records exist, their normalized types must agree. Missing, conflicting, ambiguous
or unsupported types block assignment until the aircraft records are corrected.
Current qualification groups are AS350B3 and B412EP. Under the approved AirMS
policy (rule version 1.1.0), AS350B3 certificates also cover AS350B3e. Explicit B3e
labels normalize to the AS350B3 group. Other variants are not inferred.

A verified, valid, unrestricted certificate allows every task category on the
covered aircraft, including custom tasks. New task creation, changed aircraft or
mechanic, active-work updates and transition into completed/turned-in work check
current eligibility. The server sets the new assignment's mechanic name from the
personnel record. Workload confirmation cannot bypass qualification. Mechanics
cannot reassign a task or update another mechanic's task. Managers can review
already completed/turned-in/approved historical work after a certificate expires;
returning work to active status checks current qualification again.

Expiry uses the server's Asia/Manila calendar date, including the expiry date itself.
Revoked/unverified/foreign sources never qualify a mechanic. Multiple certificates
can contribute; a remaining valid source retains eligibility. A current verified
restriction cannot be bypassed by adding an unrestricted source.

There is no automatic grandfathering: before using assignment/progress after this
change, upload and confirm certificates for the mechanics who will perform the work.
Existing records are not deleted, reassigned or retroactively rewritten. Existing
maintenance-priority rules and manual priority overrides are unchanged. Flight Log
crew selection is a separate workflow and is not changed by the task adapter.

## Deployment prerequisites and checks

- Existing private certificate storage configuration is required. Production needs
  `CERTIFICATE_BLOB_READ_WRITE_TOKEN` for a private Blob store.
- MongoDB must support transactions (Atlas/replica set). No live database, migration
  or deployment was performed during this implementation.
- Local validation was requested, but `127.0.0.1:27017` refused the connection.
  No MongoDB service or server executable was found in the usual installation
  locations. Start the local replica set or provide its location/port before
  running live workflow checks. The configured hosted database was not used.
- OCR runtime assets and binaries from Step 4 must be included as already configured.
- Web production build passes. The changed web/mobile/shared files pass syntax and
  undefined-variable checks.
- After embedding the workflow in Mechanics, the web build and checks for all 11
  changed frontend/shared files passed; all 27 client/access/review tests passed.
- All **89 certificate/task-focused tests passed**. The earlier full server run retains
  **4 existing Flight Log failures**. New coverage checks upload clients, review/revocation, aircraft resolution,
  forged eligibility, task creation/reassignment/progress and historical review.
- The supplied photographed course certificate was checked with the local OCR
  reader. It recovers the holder, full course title and 2019-11-15 issue date,
  retaining the partial competing course reading for review. No aircraft rating
  or expiry is inferred. The private image is not included in repository fixtures.
- Android export was attempted offline but stops before compilation because the
  existing checkout lacks the declared `expo-location` package. This step did not
  install packages. Device-level interactions and live MongoDB transactions remain
  unverified; perform these checks before production rollout.

Manual acceptance on web and a device: upload each supported format; analyze a
digital and scanned PDF; correct an OCR typo; verify the right mechanic; confirm;
assign a matching aircraft; try an unmatched/expired/revoked source; revoke and
refresh an already-open task picker; test a stale review from two sessions; verify
another mechanic cannot download the document. Check long names, narrow screens,
large fonts, keyboard scrolling and PDF downloads on the device.

```sh
node --test server/tests/certificateAccess.test.js server/tests/certificateFiles.test.js server/tests/certificateHolderMatching.test.js server/tests/certificateExtraction.test.js server/tests/certificateReview.test.js server/tests/certificateClient.test.js server/tests/qualificationEngine.test.js server/tests/taskQualifications.test.js
cd client-web
npm run build
```
