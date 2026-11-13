The ordinary entry now removes the P085 previous-card splash and its extra preparation request. D13 preserves existing device tickets and normal GAS startup.

The backend build `bbd943038bebb293ffc8ea2d672e55594d2d349bf9081e63390827d3a8262b34` is deployed. Health, exact-origin CORS, and unauthenticated bootstrap rejection were verified on 2026-11-13. General rollout remains off (`nativeP086: false`). `nativeP086OptIn: true` exposes a device-only choice in connection diagnostics: the invited user can enable the new startup on their existing home-screen app. Without that explicit choice, the entry performs no native SDK or backend work. The local choice only selects transport; all server permissions and the initial one-user restriction remain in force. Old D11 bundles see the false general flag and keep normal startup.

When enabled, the current device ticket enrolls a separate native Firebase session once. Subsequent launches authorize against current person/device/global/native generations and receive the private full application from the new function. The same existing form source is used. Talk token creation and private Admin/attendance UI code delivery no longer require a GAS request. Other operations still go through the unchanged GAS permission/audit/confirmation core; no save is acknowledged before its result. The latest own card is fetched normally, with no previous-card splash.

`operationReadyP086` separately reports `screenReadyMs`, `latestCardMs`, `talkReadyMs` and `gasCalls`. Screen readiness does not mean current card data or daily form choices are ready. No device timing claim has been made.

The paid project is unchanged. The backend package is private; no GAS source, credentials, private HTML, identity, or ledger data is committed here. Source transformations and backend tests are in the user's P086 package. For rollback, set both `nativeP086` and `nativeP086OptIn` to false. A device can also turn its choice off through connection diagnostics; this does not clear its identity ticket or reload unsaved forms.

Validation: `node scripts/build-entry.cjs --check`; the new `tests/native-*.cjs` checks use Node's test runner and jsdom 26.1.0. Install jsdom in a temporary directory or use the backend package's node_modules through NODE_PATH when running them. Existing entry regression scripts use Node alone.


D13 adds a current-launch diagnostic copy button. It projects numeric startup/card/talk timings, fixed error codes and current gate booleans only, so a history export cut off at 10,000 characters cannot hide the newest result. No extra network requests, stored history, arguments, user identity, token or URL are included. Runtime and permissions are unchanged. The backend P086-FIX-1 was independently verified by its published build ID; full authenticated talk readiness and current-card end-to-end timings still require the current device result.

D14 / P086-FIX-2 overlaps one authorized current own-card request with private HTML bootstrap after server capability is learned. On the first supported launch it starts after bootstrap, before mounting the real UI. Only the exact initial self-card call may consume it once within three seconds; a different operation, late tab opening, changed user or navigation discards it. Ordinary reads and saves retain existing dispatch and at-most-once behavior. Talk/inbox entry does not start an unused card read. A rollback clears the capability hint and uses the ordinary read. The hint contains no authority or card data.

The GAS startup-card scope reuses P074 daily-choice deferral; report choices are read on open with existing source/version checks. Card source logic, calendar rules, attendance writes and Firestore rules do not change. GAS still computes the source-derived row. This is an incremental scheduling/processing optimization, not a card-computation migration or latency guarantee. `leadMs` is the request head start, not measured time saved. `upstreamMs` includes transport, upstream waiting and GAS execution; do not sum it with `gasDispatchMs`.

The startup-card response rechecks live access after GAS completes. It accepts no caller-selected identity, scope or method. The active HTTP operation is awaited until completion, with no fire-and-forget server work. The per-device opt-in and server allowlist remain unchanged.

D14 also removes the fixed lower-right diagnostic launcher that could intercept
the talk submit button. When the ordinary entry header is visible, use its
diagnostic button. When the app's compact header hides it, diagnostics occupy a
separate row outside the iframe, so they cannot cover a message, form or action.
This layout correction works with the deployed P086-FIX-1 backend and does not
require the FIX-2 backend installation. The FIX-2 speed path remains gated by the
backend's capability response.
