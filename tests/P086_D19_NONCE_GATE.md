# D19: FIX6 nonce gate diagnostics

Prepared and validated on 2026-11-16. The user supplied successful FIX6 deployment evidence; the public backend health independently matches build 271e94636c86571e70a74274182f4181d4e1d40c23ad001cac7796e825018d0a. The existing deployment script gates backend publication on the signed nonce probe. Real-user speed and error measurements follow entry publication.

D19 adds bounded FIX6/READ5/nonceStoreP086 fields to the current startup report. It retains previous backend support, the all-user choice, manual 15-read test, cooldown, existing visibility handling, and registration. Versioned entry bundle and cache advance to d19/v63; display date is 2026.11.16-D19.

Validation: 67 entry tests pass. Generated bundles are built from the source modules. The additional test accepts only firestore-create-v2 or legacy-script-lock-v1 as nonce-store identifiers and excludes unknown strings. Existing tests preserve the compact fifteen-row export and its separate uncorrelated resource timings.

Publication scope: public entry files, builder, and corresponding tests/documentation only. Never publish backend/GAS/private app sources, credentials, attachments, or local logs. Verify existing D18 file hashes and branch head before publishing; no force update. Record actual commit, Pages build, and live byte verification after publication.
