# D20 / FIX7 notification status

Deployment order: verify the exact FIX7 backend/GAS rollout, then publish D20 and verify the public files.

Push status read failures now wait30/60/120/240/300seconds before the next automatic attempt, triggered only by existing ready/visibility events. No added timer. Automatic attempts skip hidden pages. Manual settings refresh bypasses cooldown. Current in-flight request remains deduplicated; identity reset suppresses stale results/cooldown. No send/register/unregister auto retry. Existing sender and notification contents are unchanged.

D20/v64 accepts both FIX6 and FIX7 diagnostics, retains manual15own-card measurement and all-user rollout. Private GAS/functions files must not be published to the public entry repository.

Entry70tests passed, including burst suppression, backoff cap, manual override, hidden/foreground, identity change. Backend91tests passed; see sibling preparation logs. These are simulated checks, not production latency/billing measurements.
