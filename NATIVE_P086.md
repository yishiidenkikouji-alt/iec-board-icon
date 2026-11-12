The ordinary entry now removes the P085 previous-card splash and its extra preparation request. D11 preserves existing device tickets and normal GAS startup.

The private application adapter is installed but `nativeP086` is **false** in config.js. It must remain false until the separate `business-p086` Cloud Functions deployment passes its version, CORS, and unauthorized-access checks.

When enabled, the current device ticket enrolls a separate native Firebase session once. Subsequent launches authorize against current person/device/global/native generations and receive the private full application from the new function. The same existing form source is used. Talk token creation and private Admin/attendance UI code delivery no longer require a GAS request. Other operations still go through the unchanged GAS permission/audit/confirmation core; no save is acknowledged before its result. The latest own card is fetched normally, with no previous-card splash.

`operationReadyP086` separately reports `screenReadyMs`, `latestCardMs`, `talkReadyMs` and `gasCalls`. Screen readiness does not mean current card data or daily form choices are ready. No device timing claim has been made.

The paid project is unchanged. The backend package is private; no GAS source, credentials, private HTML, identity, or ledger data is committed here. Source transformations and backend tests are in the user's P086 package. Setting `nativeP086` back to false returns to ordinary GAS startup.

Validation: `node scripts/build-entry.cjs --check`; the new `tests/native-*.cjs` checks use Node's test runner and jsdom 26.1.0. Install jsdom in a temporary directory or use the backend package's node_modules through NODE_PATH when running them. Existing entry regression scripts use Node alone.
