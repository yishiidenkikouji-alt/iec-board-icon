# Normal business app startup — P82 / D7

The entry stays at `board-pwa/`. Retired P076–P081 trial bookmarks redirect here.
Their executable JS, CSS and test suites have been removed. No trial worker is
started by this entry. The GAS replacement separately retires trial triggers.

For an existing registration, a nonce-bound hello from the configured GAS frame
advertises `P082-POST-1`. The next ordinary launch may send its signed restart
ticket in a native HTTPS form POST. The transient form belongs to the existing
blank application iframe and targets `_self`; it does not resolve a named window.
If that initial same-origin document is unavailable, use GET immediately.
The GAS response contains the normal application plus the result of the existing
live ticket/role/policy/own-card checks. It removes the separate startup RPC.
No claim is made that the entire application starts in the trial's 0.88 seconds.

First registration, legacy GAS, special routes, storage errors and unsupported
clients keep normal GET + RPC startup. A POST without a validated hello falls
back to GET after 25 seconds and clears only the transport capability hint.
It does not erase a saved registration. A mixed release, ticket/revision change,
hidden document or stale response uses the ordinary live RPC in the child.

The ticket is never in a URL, exported diagnostic or public shell cache. The
parent rereads the current authoritative record at hello. The child checks the
response nonce, revision and SHA-256 of that current ticket before adoption.
All previous origin/source/page binding, CAS writes and tombstones remain.

`index.html` loads `config.js`, then the generated `entry-startup.js`. The bundle
contains diagnostics, device storage and the normal app in order. After edits:

```sh
node scripts/build-entry.cjs
node scripts/build-entry.cjs --check
node --test tests/*.cjs
```

Bump the shell cache version in `sw.js`. Its allowlist remains public files only;
GAS HTML, private responses and credentials are never service-worker cached.

D6 retains the bounded D5 timing handoff. P82 additionally reports first home
and card readiness on the parent entry's clock. These times begin with page
navigation, not tapping the OS home icon, and include the combined server wait.
Only fixed phase names and bounded numeric times enter shared diagnostics.

D7 corrects the iOS popup reported during P82 startup. It removes parent-owned
forms and dynamic named targets; no popup permission or GAS update is needed.
