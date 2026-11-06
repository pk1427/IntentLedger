# Day 1D — Duplicate Committed Quote Audit

Date: 2026-11-06 UTC  
Scope: Read-only investigation of committed quote requests from Day 1B.  
No new quotes created. No funds transferred. No transactions signed or broadcast.

## Task 1 — Locate Both Quote Responses

Two `dry: false` committed quote requests were identified from Day 1B execution records:

| Source | Quote | Location |
|--------|-------|----------|
| Day 1B Phase B terminal execution | Quote 1 | `day1b/DAY1B_RESULT.md` (lines 62-99) — terminal transcript |
| Day 1B evidence-saving execution | Quote 2 | `day1b/evidence/committed-quote/quote-summary.json` |

### Quote 1 (Phase B — first committed quote request)

This request was issued during Phase B verification. Its full response was printed to the terminal but was **not saved to an evidence file**.

| Field | Value |
|-------|-------|
| Endpoint | `POST https://1click.chaindefuser.com/v0/quote` |
| HTTP status | 200 |
| dry | false |
| correlationId | `0d1e2a9b-b0ae-4ae7-b509-b838bf810e43` |
| timestamp | `2026-11-06T19:13:42.247Z` |
| depositAddress | `0x496c...ec0C` (masked in transcript; full value NOT persisted) |
| depositMemo | null |
| deadline | `2026-11-09T19:43:41.773Z` |
| timeWhenInactive | `2026-11-09T19:43:41.773Z` |
| amountIn | `1000000` |
| amountOut | `994498` |
| withdrawFee | `5300` |
| refundFee | `2400` |
| Signature | Present; `signatureValid: true` (terminal output) |
| Recipient | `0x659f...012E` (Arbitrum, DESTINATION_CHAIN) |
| Refund address | `0xa568...71d9` (Base, ORIGIN_CHAIN) |

### Quote 2 (evidence saving — second committed quote request)

This request was issued during evidence saving. Its response was saved to `day1b/evidence/committed-quote/quote-summary.json`.

| Field | Value |
|-------|-------|
| Endpoint | `POST https://1click.chaindefuser.com/v0/quote` |
| HTTP status | 200 |
| dry | false |
| correlationId | `d9aed937-2f56-456e-af5a-ae4173750ac8` |
| timestamp | `2026-11-06T19:14:50.015Z` |
| depositAddress | `0x05d4...0E6b` (masked in evidence) |
| depositMemo | null |
| deadline | `2026-11-09T19:44:49.593Z` |
| timeWhenInactive | `2026-11-09T19:44:49.593Z` |
| amountIn | `1000000` |
| amountOut | `994498` |
| withdrawFee | `5300` |
| refundFee | `2400` |
| Signature | Present; `signatureValid: true` (saved in `signature-verification.json`) |
| Recipient | `0x659f1ddf3Afa31029B990D2202Df8B2094eE012E` (full in evidence) |
| Refund address | `0xa568860f02DEf6CC6420F6721B774aa3a71c71d9` (full in evidence) |

**Transparency note:** Both requests used identical route parameters (same source/destination assets, same amount, same recipient, same refund address, same slippage). Only one committed quote was intended; the second was issued incidentally during evidence saving.

## Task 2 — Compare the Two Quotes

| Field | Quote 1 | Quote 2 | Match? |
|-------|---------|---------|--------|
| correlationId | `0d1e2a9b-b0ae-...` | `d9aed937-2f56-...` | **NO** (different) |
| timestamp | `2026-11-06T19:13:42.247Z` | `2026-11-06T19:14:50.015Z` | **NO** (~82 seconds apart) |
| depositAddress | `0x496c...ec0C` | `0x05d4...0E6b` | **NO** (different deposit assignments) |
| deadline | `2026-11-09T19:43:41.773Z` | `2026-11-09T19:44:49.593Z` | **NO** (~82 seconds apart) |
| timeWhenInactive | `2026-11-09T19:43:41.773Z` | `2026-11-09T19:44:49.593Z` | **NO** (~82 seconds apart) |
| amountIn | `1000000` | `1000000` | YES |
| amountOut | `994498` | `994498` | YES |
| withdrawFee | `5300` | `5300` | YES |
| refundFee | `2400` | `2400` | YES |
| sourceAsset | `nep141:base-0x833589...2913.omft.near` | same | YES |
| destinationAsset | `nep141:arb-0xaf88d06...5831.omft.near` | same | YES |
| recipient | `0x659f...012E` | `0x659f...012E` | YES |
| refundTo | `0xa568...71d9` | `0xa568...71d9` | YES |
| depositType | ORIGIN_CHAIN | ORIGIN_CHAIN | YES |
| recipientType | DESTINATION_CHAIN | DESTINATION_CHAIN | YES |
| refundType | ORIGIN_CHAIN | ORIGIN_CHAIN | YES |
| signatureValid | true | true | YES |

**Finding:** Despite identical route parameters, the two quotes are **distinct** — different correlation IDs, timestamps, deposit addresses, and deadlines. Same request parameters do not produce identical quotes; each `dry: false` request generates a fresh deposit address and deadline.

## Task 3 — Verify Signatures

Both signatures were verified during Day 1B execution using `@defuse-protocol/one-click-sdk-typescript@0.1.26` `verifyQuoteSignature()`:

| Quote | Verification Source | Result |
|-------|---------------------|--------|
| Quote 1 | Day 1B Phase B terminal output | **PASS** (`signatureValid: true`) |
| Quote 2 | `day1b/evidence/committed-quote/signature-verification.json` | **PASS** (`signatureValid: true`) |

**Limitation for Day 1D independent re-verification:** The full original quote responses (including the `signature` field and unmasked `depositAddress`) were not persisted to local evidence files. Quote 1's full response was only in terminal output; Quote 2's saved `quote-summary.json` masks the deposit address and omits the signature field. Independent Day 1D re-verification using `verifyQuoteSignature()` is therefore not possible from saved evidence alone. The PASS results above reflect Day 1B execution-time verification.

## Task 4 — Check Quote Status

**Status check: NOT PERFORMED.**

Reason: The documented read-only status endpoint (`GET /v0/status`) requires the full `depositAddress` (and `depositMemo` when applicable) as the lookup key. Both deposit addresses are masked in all locally saved evidence (`0x496c...ec0C` and `0x05d4...0E6b`), and the full addresses were not persisted. Without the full deposit address, a status API call cannot be constructed.

Consequently:
- No deposit status has been observed for either quote.
- No deposit has been confirmed or ruled out.
- Neither quote status can be confirmed as expired or active via local evidence.
- The deadline timestamps (`2026-11-09T19:43:41.773Z` and `2026-11-09T19:44:49.593Z`) are both in the future relative to Day 1B execution time, but current status is unknown without a provider status call.

## Task 5 — Fee Reconciliation

| Field | Value | Description |
|-------|-------|-------------|
| amountIn | `1000000` base units | 1 USDC (6 decimals) — source asset input |
| amountOut | `994498` base units | 0.994498 USDC — destination asset output |
| Gross difference | `5502` base units | amountIn − amountOut |
| withdrawFee | `5300` base units | Destination asset withdrawal fee, already accounted for in amountOut |
| refundFee | `2400` base units | Origin asset refund fee, charged ONLY if a refund occurs |
| minAmountOut | `984553` base units | Minimum output after 1% slippage tolerance |

**Relationship:**

- `amountOut` = `amountIn` − market spread − `withdrawFee`. The withdrawFee of 5,300 is already deducted from the quoted amountOut; it is not an additional charge on top.
- `refundFee` of 2,400 is **not charged on successful settlement**. It applies only if the swap fails or times out and assets are refunded to the refund address.
- Gross difference (5,502) = withdrawFee (5,300) + remaining difference (202). The remaining 202 base units are not classified as a definitive market spread unless the provider's documented fee breakdown establishes that interpretation.
- `minAmountOut` (984,553) = amountOut (994,498) × 0.99 — reflects the 100 bps slippage tolerance as a minimum guaranteed output.

**Effective input-output difference:** 5,502 base units (0.005502 USDC), of which 5,300 is the documented withdrawFee and 202 is the remaining difference (not classified as definitive market spread without provider documentation).

## Task 6 — Incident Report

### Summary

Two distinct committed quote (`dry: false`) requests were created during Day 1B:

1. **Quote 1** — correlationId `0d1e2a9b-b0ae-4ae7-b509-b838bf810e43`, deposit address `0x496c...ec0C`
2. **Quote 2** — correlationId `d9aed937-2f56-456e-af5a-ae4173750ac8`, deposit address `0x05d4...0E6b`

Both quotes:
- Use identical route parameters (Base USDC → Arbitrum USDC, 1 USDC input, same recipient and refund address)
- Returned HTTP 200 with valid signatures
- Have different deposit addresses and different deadlines (~82 seconds apart)
- Are independent, active quote assignments from the provider

### Root Cause

The second committed quote was issued incidentally during the evidence-saving step of Day 1B execution. The Day 1B orchestration script (`scripts/day1b-committed-quote.ts`) made a committed quote request during Phase B verification, then made another committed quote request when re-running to save evidence files. Only one committed quote was intended.

### Recommendation

**B. TWO DISTINCT ACTIVE QUOTES — DO NOT DEPOSIT**

Two distinct, provider-signed committed quotes exist with different deposit addresses. Until the user confirms which quote (if either) to use, no deposit should be made to either deposit address. Depositing to the wrong address could result in funds being credited to an unintended quote assignment.

### Safety Confirmation

- No funds sent. No transactions signed. No token spending approved. No transactions broadcast.
- No `POST /v0/deposit/submit` called.
- No API credentials printed or saved.
- Evidence file permissions set to 0o600.

### Evidence Locations

- `day1b/evidence/committed-quote/quote-summary.json` — Quote 2 (sanitized)
- `day1b/evidence/committed-quote/route-summary.json` — Route summary
- `day1b/evidence/committed-quote/signature-verification.json` — Signature verification result
- `day1b/evidence/committed-quote/evidence-manifest.json` — SHA-256 manifest
- `day1b/DAY1B_RESULT.md` — Full Day 1B execution record (includes Quote 1 details in transcript)

### Previous Reports Preserved

- `day1/DAY1_RESULT.md` — unchanged
- `day1b/DAY1B_RESULT.md` — unchanged
- `day1c/AUTH_DIAGNOSIS.md` — unchanged

### STOP

Investigation complete. No further action. Awaiting human determination of which quote (if either) to use for deposit.
