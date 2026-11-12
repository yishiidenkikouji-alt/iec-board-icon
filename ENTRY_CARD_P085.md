# Normal entry own-card preview (P085 / D10)

The ordinary personal-card entry may show the last verified own card after an online device-bound Firebase read, while GAS prepares the latest operational screen. The preview is labelled with its previous confirmation time. It is not a statement that the latest card or operations are ready.

Requires the matching P085 addition in the compatibility P84 Code/Index and the editor-only `enableEntryCardP085` setup. Without it, the existing entry remains in use. No new trial URL or icon is required. Legacy D9 bundles remain for already cached pages.

Initial connection preparation is requested only from the trusted GAS frame after normal startup. Each subsequent preview is online, bound to the current saved ticket and endpoint, and subject to the deployed person/device/control rules. Cards are not stored in localStorage or Service Worker caches. Hiding, logout, normal screen readiness, offline state, changed navigation and rejected reads remove the preview; its maximum duration is 20 seconds.

Diagnostics expose only `entryCardP085`: firstCardMs, normalHomeMs, latestCardMs, sourceAgeMs, path and preparation state. These times start at entry navigation, excluding OS/browser launch time. Actual phone performance remains to be measured after GAS deployment.

Build: `node scripts/build-entry.cjs`; consistency: `node scripts/build-entry.cjs --check`.
The entry POST/cache suite, storage retention, IndexedDB, badge, diagnostic and startup regressions have been checked. Server, DOM and Firestore authorization tests are maintained in the matching P085 deployment package.
