# D18: complete concurrent-read diagnostics

D18 retains the existing rollout choices and works with FIX3, FIX4 and FIX5. It accepts the FIX5 application revision and exports bounded GAS pre-dispatch timings, including configuration, signature verification, nonce lock waiting, nonce cache work and lock release. Older backends report unavailable fields as null.

P086-CONCURRENT-READ-3 stores the fifteen samples as a columns/rows table. Browser Resource Timing entries use a separate table: these rows are explicitly not correlated to individual request samples. The baseline and success/failure/latency summary are retained. The copied JSON is compact to avoid truncation. Export tests preserve all fifteen samples, keep unavailable timing distinct from zero and verify a representative maximum-duration result fits below 10,000 bytes.

The test remains manually invoked, limited to one baseline and fifteen concurrent own-card reads, with the existing cooldown and authorization checks. It does not submit reports or change business records. No private application source, request arguments, identities, tokens, report contents or raw upstream error text is included in the public entry or exported measurement.

Validation: 66 entry tests passed; the generated bundle matches its source modules. FIX5 private application/backend validation is performed separately before deployment. Production speed and billing require post-deployment observation; this report is not a fifteen-device startup test or a monthly cost forecast.
