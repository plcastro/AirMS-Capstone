# Flight workspace

Flight Logs, linked Pre-Flight and Post-Flight inspections, aircraft defects, and
record history are handled from the same workspace. Aircraft cards and records
remain ordered by their latest saved activity. Filters operate inside the
selected aircraft, including **Needs My Action**.

## Before using the new workflow

- Deploy the server and updated clients together. Old clients cannot certify an
  inspection or change a flight stage using client-supplied signatures alone.
- Use MongoDB Atlas or a replica set. Closing a flight record, changing a linked
  inspection, and recording a defect use transactions. A standalone MongoDB
  instance receives an explicit error; there is no partial-save fallback.
- A maintenance manager or Superadmin opens **Flight Logs → Crew Authorizations**
  on the web. Record the verified license type, account license number, approved
  aircraft registrations, expiry, and supporting authorization reference for
  each pilot and mechanic. Assignment determines responsibility; the current
  authorization and account PIN determine whether that person can certify.
- Set up the aircraft's Parts Monitoring record and its actual brought-forward
  values. Missing values are not interpreted as zero.
- Existing records and their history are retained. Records without an assigned
  crew, and legacy inspections without a linked flight, remain read-only. They
  are not automatically assigned or retrospectively signed.

## Normal flight cycle

1. **Mechanic starts New Entry.** Select the aircraft (already locked when opened
   inside an aircraft card). Answer **Were all pre-flight inspection items
   satisfactory?** A Yes requires the mechanic's signature and PIN before the
   flight form opens. Every item in the matching aircraft's Pre-Flight checklist
   is checked. A No opens Discrepancies / Remarks and requires a description.
2. **Mechanic completes the draft.** Choose the assigned pilot and enter the
   basic information, purpose, destinations, servicing and maintenance work.
   Saving creates the flight record and its linked Pre-/Post-Flight pair in one
   transaction. A No confirmation creates a Pre-Flight hold. Resolve it from the
   Pre-Flight tab with a resolution comment and a verified confirmation before
   release. The initial confirmation is bound to its mechanic and aircraft and
   can only create one flight log; an unused confirmation expires after 24 hours.
3. **Release and pilot acceptance.** The mechanic uses **Save & Release to Pilot**.
   The assigned pilot reviews and signs **Accept Pre-Flight**, then **Accept
   Aircraft** for the flight log. Pilots have no data-entry, creation, defect,
   correction or amendment permissions in this flight workflow.
4. **Mechanic enters flight results.** Enter routes, times, passenger counts,
   discrepancies and applicable work. The mechanic can save incomplete drafts.
   Hour-based This Flight values calculate from the sum of airborne minutes;
   B412 includes both engines. Engine cycles, sling usage and other non-hour
   counters remain manual. Missing leg times leave calculated hours blank.
   Times use 24-hour HH:mm: OFF means departure/takeoff and ON means
   arrival/landing; an ON time earlier than OFF means the following day.
5. **Review and confirm Post-Flight.** **Complete Flight Log** opens the totals
   review, followed by **Were all post-flight inspection items satisfactory?**
   **Yes, append my signature** checks every Post-Flight checklist item and
   reuses the mechanic's initial signature with fresh PIN confirmation. Legacy
   records without an initial signature require drawing one. A No opens remarks,
   saves the flight changes and inspection hold together, and leaves the log
   open. A later Yes requires a resolution comment for the saved discrepancies.
6. **Close once.** One server transaction certifies Post-Flight, recalculates
   totals, updates Parts Monitoring and closes the flight record. Retrying
   returns the saved receipt without posting usage again. The original signed
   snapshots and inspection discrepancy history remain available.

Landing cycles start at the number of leg rows. The **+ / ?** controls adjust
additional landings; the count cannot fall below the number of legs. The server
recalculates hours and landing totals rather than trusting submitted totals.

Fuel and oil servicing dates follow the Basic Information date. Their signatures
come from the initial verified inspection signature, including newly added legs.
Oil **Remaining** and **Total** fields offer **MIN / MAX**; Added stays editable.
New confirmation-flow logs allow the mechanic to finish servicing entries after
acceptance, with earlier release snapshots retained in history.

Station From/To fields accept free text, with offline suggestions for regions,
provinces, cities, municipalities, barangays, selected major islands and **Local**.
The bundled name snapshots come from the community [PSGC API](https://psgc.gitlab.io/api/)
and [PSGC Cloud](https://psgc.cloud/api-docs). They are suggestions rather than
an exhaustive or continuously updated island directory. The web downloads the
suggestion bundle when a station field is focused.

The whole record remains viewable. The current stage selects the starting tab,
shows the next responsible crew member and supports **Needs My Action**. Only
assigned crew receive update notifications, excluding the person making the update.

## Exceptions and record history

- **Incomplete information:** Save Draft does not advance or sign the record.
  Web drafts are kept in the current browser session; mobile drafts use local
  device storage. Local drafts require an explicit save or handoff to sync.
  Restoration shows when the server has changed since the draft was saved.
  Final certification always requires a server connection.
- **Another user saved first:** an outdated version receives a conflict. Review
  the current record and retained draft before trying again. A stale form cannot
  silently replace a newer saved version.
- **Parts Monitoring changed after release:** closure stops and shows the old
  and current baseline. The assigned mechanic must review the ledger, provide
  a reason, and sign the reconciliation before attempting closure. Confirm that
  this flight's usage has not already been entered manually; reconciliation is
  not a way to post the same flight twice.
- **Defects:** the assigned mechanic can report aircraft defects with an optional HTTPS evidence
  link. A mechanic's signed disposition records rectification or a deferral
  reference, limitations, and deadline. Open or overdue defects block a later
  release. Closing the flight record does not itself clear an aircraft defect
  or constitute a separate return-to-service authorization.
- **Closed record correction:** the assigned mechanic can append a signed
  amendment with corrected information and a reason. The original signed
  record is retained. Narrative amendments do not automatically revise usage
  already posted to Parts Monitoring. A correction affecting usage requires a
  reviewed ledger reconciliation; it must not be described as an automatic
  recalculation of subsequent records.
- **Notifications:** updates are addressed only to the currently assigned crew,
  excluding the actor. Workflow notifications are queued with the saved record
  and retried after a delivery failure. In-app notification IDs prevent duplicate
  entries. Device push alerts remain best effort. Links open the affected flight
  workspace section. Delayed messages are not delivered to a removed assignee.
- **Exports:** Flight Log PDFs append workflow sign-off details, post-flight
  work, amendment text and reasons, and history. The workspace audit export also
  contains the saved snapshots and linked inspection/defect information.

## Operational validation

This implementation supplies workflow and recordkeeping controls. It does not
establish NGCP's regulatory operation category or certify regulatory compliance.
The operator must validate its applicable authorization, approved manuals,
aircraft checklist revisions and applicability, signing privileges, deferral
rules, time conventions, and electronic-record acceptance before operational
use. Existing aircraft-specific checklists were reused; their technical content
was not newly approved by this software change.

No automatic deletion or retention expiry was added to flight history. Backup,
restore, retention periods, user account control, and access to exported records
remain deployment responsibilities. Stored SHA-256 snapshot digests support
comparison with the saved content; they are not external trusted timestamps or
cryptographic signatures from an independent certificate authority.

## Acceptance checks in a test environment

Use test aircraft and accounts, never operational records:

1. Configure a licensed pilot/mechanic pair and a valid aircraft authorization;
   confirm an unassigned user and an expired authorization cannot sign.
2. Create an incomplete mechanic draft through each Pre-Flight answer; verify
   all-checked vs discrepancy-hold behavior, RP-C locking and pilot assignment.
   Verify a pilot cannot create or edit a log.
3. Complete the preparation → Pre-Flight release → flight release → Pre-Flight
   acceptance → flight acceptance → flight submission → Post-Flight completion
   → totals review → closure cycle for both AS350 and B412 layouts.
4. Exercise Pre-Flight and Post-Flight discrepancy holds and their resolution;
   confirm old signed snapshots remain visible and Yes checks every box.
5. Open the same record twice, save one, then confirm the stale copy conflicts.
6. Interrupt a closure, retry, and verify one receipt and one usage increment.
7. Change the monitoring baseline in another session; verify closure requires
   signed reconciliation and never silently overwrites the changed baseline.
8. Verify defect holds, future deferrals, expiry handling, and signed amendments.
9. Restore an unsynced local draft, follow crew notification links, and inspect
   PDF and audit exports. Test signing on physical mobile devices as well as web.
