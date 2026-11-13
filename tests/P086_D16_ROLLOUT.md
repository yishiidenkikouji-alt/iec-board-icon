# D16: default native startup and bounded concurrent read diagnostic

The owner confirmed the existing `enableNativeApplicationForAllP086` setup completed with `enabled:true`, `limitedUsers:0`, release `2026.11.12-r253-P014-P84` before this entry rollout.

The common entry now defaults to P086 for currently authorized eligible users. Existing identity/device checks remain authoritative. An explicit per-device ordinary-startup choice is honored; setting both rollout flags false still stops the native path. Unsupported account modes retain the existing ordinary-entry fallback.

The connection diagnostic has a manual **15件同時の速度を測る** button. After the current card is ready, it sends one own-card baseline read, then 15 concurrent own-card reads through the existing authenticated startupCard route. It does not send business writes, enroll new sessions, or copy private card data into its report. The normal replay-prevention records and normal read-side processing still occur on the server. It is capped at 16 requests per run, with no automatic retries, a 10-minute page-session cooldown, and only one run in flight. Startup metrics remain separate.

The report identifies its scope as `same-session-own-card-read`, includes failures and whether the page became hidden, and exports only timings and bounded error codes. This tests read contention from one connection, **not** 15 distinct device startups, initial enrollment, talk connection, or mobile rendering. A real simultaneous-startup check requires the 15 actual devices; finish their initial connection preparation first, then compare current-launch reports from a coordinated reopen.

Cloud Function build and capacity are unchanged: FIX3, 512 MiB, 1 CPU, minInstances 1, maxInstances 2, concurrency 4. The existing enrollment rate limit is 4 per source IP per minute per instance, so do not prepare all new devices simultaneously on one shared connection.

Rollback: set `nativeP086:false` and `nativeP086OptIn:false` in the public config and update the public shell cache version. No private source, credential, employee record, or runtime diagnostic belongs in this public repository.
