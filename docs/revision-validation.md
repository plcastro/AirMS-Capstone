# Revision validation

## Layout and task review

- Maintenance card fixture uses the actual dashboard JSX and Ant Design styles, with eight aircraft, mixed new/seen entries, and long source text. Headless Chrome at 1360px measured all eight cards at 154px high; card bottoms align in both rows.
- Web build passes after the layout and review shortcut changes.
- Task shortcuts reuse existing review dialogs. Approval still collects signature/PIN; Return retains remarks and checklist choices. Existing web superadmin role handling is preserved.

## Mobile performance

- Messaging owns its polling/socket lifecycle only while focused. Backgrounding aborts refresh work; foreground/reconnect requests catch-up. Disconnected fallback is 30 seconds. Event bursts are combined, including a trailing refresh for events received in flight.
- Deterministic refresh tests: two fallback syncs in 60 seconds disconnected (four thread/conversation requests), zero routine fallback requests connected, zero background requests, zero after cleanup. The prior interval scheduled 60 syncs (120 endpoint requests) per minute with a selected thread, including while mounted offscreen. Initial focus/reconnect requests are separate.
- Actual ChatView rendered through React Native Web with 1,000 messages: initial message bodies reduced from 1,000 to 12. One local SSR run took 788ms before and 9ms after. This is mounting/SSR evidence, not a native frame-rate benchmark.
- Notification tests verify overlapping WS/FCM/poll triggers share work and queue a catch-up, and the public refresh callback remains stable when notification state changes.
- Growing browsing lists converted across Messaging, notifications, Flight Logs, pre/post inspections, maintenance logs, requisitions, user management, and task sections. Flight Workspace history, defects, and linked inspections share a virtualized list. Parent scroll containers were removed where they would defeat virtualization; list refresh/empty states remain available.
- Top-level provider audit: Auth now memoizes its value/functions; Notification already memoized its value but needed a stable public callback; FontScale already memoizes its value. Maintenance cooldown now follows focus/foreground and stops at expiry. Flight Log already followed focus; auth token maintenance already follows app foreground. No additional Animated timing/spring/decay calls require a native-driver change.
- Large picked images are resized before previews/uploads using the already-declared image manipulator. GIF files retain their original animation. Small photos are not upscaled.
- Paginated reports/parts/tracking/activity lists, capped import previews, fixed workflow choices, and record editing controls were left intact.

## Existing failures and remaining validation

- Initial server baseline: 139/143 pass. Four failures predate these changes: unassigned crew access, assigned crew workflow actions, pilot assignment payload filtering, and server-derived flight hours.
- After performance changes: 145/149 pass, with the same four failures. All six added performance regression tests pass.
- Web lint baseline and subsequent runs: 25 errors and 19 warnings. Unrelated lint errors were not refactored.
- Mobile has no configured npm lint/test script. Changed mobile files passed Babel parsing and an undefined-reference lint check.
- Expo Android export is blocked by the checkout's missing installed `expo-location` package, which was already declared before this work. No dependencies were added or installed.
- ADB reports no connected Android device/emulator. Native navigation, long-list scrolling, keyboard/attachment handling, old-message scroll anchoring, and PIN/signature interactions still require device acceptance. The perceptual goal of no visible stalls cannot be certified from static/SSR tests.
- Pagination follow-ups: Flight Log downloads all 500-item pages; maintenance/pre/post inspection and requisition history endpoints return potentially unbounded data. Virtualization reduces mounted views, not payload size. No live dataset measurement justified changing pagination in this pass.
