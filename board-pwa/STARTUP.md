## Entry startup

`index.html` loads `config.js`, then the generated `entry-startup.js`.
The bundle contains the connection diagnostic, device storage and app modules
in their original execution order. It reduces the critical entry scripts from
four requests to two. `config.js` remains independently editable.

After editing `connection-diagnostics.js`, `entry-session.js` or `app.js`:

```sh
node scripts/build-entry.cjs
node scripts/build-entry.cjs --check
node tests/connection-diagnostics.cjs
node tests/device-retention.cjs
node tests/entry-startup.cjs
node tests/badge-sync.cjs
```

Bump the public shell cache version in `sw.js` when publishing a new bundle.
Keep the old module URLs in the public cache allowlist for already-open pages.
Never bundle GAS source, device tickets, user data or any runtime credentials.

The D4 diagnostic times the parent entry page through the validated GAS hello
and device-ticket read. It does not measure browser launch before navigation,
claim a successful identity check, or export private device values.
# D5 timing handoff

D5 adds a bounded numeric `startupTimingD5` projection to the existing validated
restart `ready` reply. P75 includes it in the local loading diagnostic, so one
report can contain entry and app timings from the same navigation. Older GAS
versions ignore the optional field. Timing failure does not block restoration.
No extra requests, messages, persisted values, or changes to credentials are
introduced. D4 storage behavior and all nonce/origin/source checks remain.

