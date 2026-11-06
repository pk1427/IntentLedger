# Day 1E — Quote Artifact Recovery and Status Audit

Date: 2026-11-06 UTC  
Scope: Read-only investigation of committed quotes from Day 1B.  
No new quotes created. No funds transferred. No transactions signed or broadcast.

## Task 1 — Recover Original Quote Artifacts

### Quote 1
- correlationId: `0d1e2a9b-b0ae-4ae7-b509-b838bf810e43`
- **Address recovered: NO**

The full deposit address for Quote 1 was displayed in the Day 1B Phase B terminal output as `0x496c...ec0C` but was **never persisted to any evidence file**. No original response file exists for Quote 1. The address cannot be reconstructed from the masked prefix/suffix.

### Quote 2
- correlationId: `d9aed937-2f56-456e-af5a-ae4173750ac8`
- **Address recovered: NO**

The deposit address for Quote 2 was saved to `day1b/evidence/committed-quote/quote-summary.json` but was masked by the `maskAddr()` function during evidence saving, producing `0x05d4...0E6b`. The full address was **not persisted** to any local file.

### Recovery conclusion

| Quote | Full deposit address recoverable? | Source checked |
|-------|-----------------------------------|----------------|
| Quote 1 | NO | Terminal output only (not persisted) |
| Quote 2 | NO | Evidence file contains masked address only |

Neither full deposit address is recoverable from local evidence or independently authenticated provider records.

## Task 2 — Status Lookup

**Status lookup: STATUS_UNAVAILABLE for both quotes.**

The documented read-only endpoint `GET /v0/status` requires the full `depositAddress` (and `depositMemo` when applicable) as the lookup key. Since neither full deposit address is recoverable, no status API call can be constructed.

| Quote | Status | Reason |
|-------|--------|--------|
| Quote 1 | STATUS_UNAVAILABLE | Full deposit address not recovered |
| Quote 2 | STATUS_UNAVAILABLE | Full deposit address not recovered |

Consequently:
- No deposit status has been observed for either quote.
- No deposit has been confirmed or ruled out.
- Neither quote status can be confirmed as expired or active.
- The deadline timestamps (Quote 1: `2026-11-09T19:43:41.773Z`, Quote 2: `2026-11-09T19:44:49.593Z`) are provider-reported future timestamps, but current status is unknown without a provider status call.

## Task 3 — Duplicate-Request Root Cause

The Day 1B orchestration script (`scripts/day1b-committed-quote.ts`) and its inline execution variant caused a second `dry: false` committed quote request during the evidence-saving step:

1. **First request** (Phase B): The script requested a committed quote via `OneClickService.getQuote()` / `requestQuote()`, received response with correlationId `0d1e2a9b-b0ae-4ae7-b509-b838bf810e43`.
2. **Second request** (evidence saving): The evidence-saving step re-invoked the quote endpoint instead of reusing the already-obtained response, producing a new quote with correlationId `d9aed937-2f56-456e-af5a-ae4173750ac8`.

Root cause: Evidence generation was coupled to quote creation — saving evidence re-called `POST /v0/quote` with `dry:false` instead of persisting and reusing the original response.

## Task 4 — Duplicate-Request Prevention Changes

### File modified: `scripts/day1b-committed-quote.ts`

The script was refactored with the following safeguards:

| Safeguard | Implementation |
|-----------|---------------|
| Dedicated quote function | `requestCommittedQuoteOnce()` — exactly one `dry:false` call path |
| Evidence never calls quote endpoint | Evidence generation receives the already-obtained response as a parameter |
| Immediate response persistence | Original response saved to evidence immediately after signature verification |
| Evidence reuses response | Sanitized `quote-summary.json` built from the in-memory response, not a new API call |
| Local execution lock | `day1b/evidence/committed-quote/.submission.lock` — written before submission, removed after completion |
| Persistent request state | `day1b/evidence/committed-quote/.request-state.json` — records `SUBMISSION_IN_PROGRESS`, `COMPLETED`, or `FAILED_AMBIGUOUS` |
| Fail closed on lock | If lock exists, script exits with code 1 and requires manual investigation |
| Fail closed on timeout | `withTimeout()` rejects on timeout; state set to `FAILED_AMBIGUOUS` |
| No automatic retry | No retry logic for committed quote creation |
| SUBMISSION_IN_PROGRESS marker | Written to state file before the quote request is made |

**Important:** This local lock does **not** provide server-side idempotency. The 1Click API has not been confirmed to support idempotency keys for `POST /v0/quote`. The lock only prevents accidental duplicate requests from within this script.

### Script not tested with dry:false

The refactored script was **not executed** with `dry:false`. No new committed quote was created during Day 1E.

## Task 5 — Corrected Fee Arithmetic

Verified programmatically with `bigint`:

| Field | Value | Basis |
|-------|-------|-------|
| amountIn | 1,000,000 base units | 1 USDC at 6 decimals |
| amountOut | 994,498 base units | Provider-quoted output |
| Gross difference | 5,502 base units | 1,000,000 − 994,498 |
| withdrawFee | 5,300 base units | Provider-documented, already accounted in amountOut |
| Remaining difference | 202 base units | 5,502 − 5,300 |
| refundFee | 2,400 base units | Conditional — charged only if refund occurs |

**Fee relationship:**
- `amountOut` already has `withdrawFee` deducted; it is not an additional charge.
- `refundFee` (2,400) is **not charged on successful settlement** — applies only if the swap fails/times out and assets are refunded.
- The remaining 202 base units are **not classified as definitive market spread** unless the provider's documented fee breakdown establishes that interpretation.

### File modified: `day1d/DAY1D_RESULT.md`

Fee arithmetic corrected in Task 5 section:
- Gross difference: 5,501 → 5,502 base units
- Remaining difference: ~201 → 202 base units
- Removed classification of remainder as "market spread"
- Added note that remaining 202 units are not definitively classified

## Task 6 — Report

### Tests run

| Test | Result |
|------|--------|
| `npx tsc --noEmit` | PASS |
| `pnpm test` (vitest) | 1 passed, 1 skipped |
| Fee arithmetic verification | PASS (5,502 = 5,300 + 202) |

### Remaining limitations

- Neither quote's full deposit address is recoverable from local evidence.
- Provider status (`GET /v0/status`) cannot be checked without full deposit addresses.
- Quote signatures cannot be independently re-verified from saved evidence (full signature and unmasked response not persisted).
- The local execution lock does not provide server-side idempotency.
- Two committed quotes exist with different deposit addresses; no deposit should be made until the user determines which quote (if either) to use.

## Files modified

| File | Change |
|------|--------|
| `scripts/day1b-committed-quote.ts` | Refactored with single-request function, local lock, persistent state, fail-closed behavior |
| `day1d/DAY1D_RESULT.md` | Corrected fee arithmetic (5,502 gross, 202 remaining, removed "market spread" classification) |

## Files created

| File | Purpose |
|------|---------|
| `day1e/DAY1E_RESULT.md` | This incident report |

## Previous reports preserved

- `day1/DAY1_RESULT.md` — unchanged
- `day1b/DAY1B_RESULT.md` — unchanged
- `day1c/AUTH_DIAGNOSIS.md` — unchanged
- `day1d/DAY1D_RESULT.md` — fee arithmetic corrected only

## Final status

**B. QUOTE ARTIFACTS NOT RECOVERABLE**

Neither committed quote's full deposit address can be recovered from local evidence. Status lookup via `GET /v0/status` is therefore unavailable for both quotes. The duplicate-request bug has been fixed in `scripts/day1b-committed-quote.ts` with fail-closed locking and persistent request state. Fee arithmetic has been corrected. No new quotes were created. No funds were deposited.

**STOP — Awaiting human review.**
