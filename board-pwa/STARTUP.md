# Normal business app startup — P83 delivery / D8

D8 learns the optional `P083-DELIVERY-1` capability from the same validated
GAS hello used for P82. Only after that, four fixed, integrity-pinned public
program resources can be preloaded from the existing dedicated Firebase
Hosting site. This repository contains their URLs and hashes, not the private
GAS application source or runtime business data. The source and Hosting deploy
package are delivered separately.

The server defaults to the full inline app until its owner enables P83 after
checking the uploaded files. Old P82 deployments and D7 clients stay compatible.
A missing resource or integrity failure sends a nonce-bound fallback request;
the parent navigates its existing iframe once to the saved GAS URL in inline
mode. It never accepts a destination from the message or clears registration.
The P82 POST timeout also falls back to inline mode. No popup is opened.

This reduces repeated HTML delivery, not the platform's execution startup
latency. First download and cache eviction still require the public resources.
Live iPhone measurements are required before claiming a time reduction.

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
