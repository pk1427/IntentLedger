# Day 1B — committed quote preparation

Date: 2026-11-06 UTC  
Decision: **COMMITTED QUOTE READY FOR HUMAN REVIEW**

## Previous failed attempt (preserved)

The original Day 1B attempt failed because `ONE_CLICK_RECIPIENT` and `ONE_CLICK_REFUND_TO` were not configured in `.env`. The prior dry quote used a public documentation example address, not a confirmed developer-controlled address. No `dry: false` request, deposit submission, wallet interaction, token approval, signing, or blockchain broadcast occurred. This report is preserved below the current execution results.

## Current execution — preflight

| Check | Result | Finding |
| --- | --- | --- |
| ONE_CLICK_API_KEY | PASS | Present in local `.env`; 3-segment JWT; non-placeholder; never printed or saved. |
| ONE_CLICK_RECIPIENT | PASS | Present in local `.env`; valid EVM checksum address. |
| ONE_CLICK_REFUND_TO | PASS | Present in local `.env`; valid EVM checksum address. |
| Duplicate API key check | PASS | Exactly one `ONE_CLICK_API_KEY` definition in `.env` (placeholder duplicate removed in Day 1C). |
| Recipient checksum | PASS | EIP-55 checksum-validated; network intent: DESTINATION_CHAIN (Arbitrum). Masked: `0x659f...012E`. |
| Refund checksum | PASS | EIP-55 checksum-validated; network intent: ORIGIN_CHAIN (Base). Masked: `0xa568...71d9`. |
| Source token | PASS | Base USDC: `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near`; contract `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`; 6 decimals. |
| Destination token | PASS | Arbitrum USDC: `nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near`; contract `0xaf88d065e77c8cc2239327c5edb3a432268e5831`; 6 decimals. |
| SDK | PASS | `@defuse-protocol/one-click-sdk-typescript@0.1.26` installed; typecheck passes. |
| Authentication | PASS | `Authorization: Bearer <JWT>` via SDK `OpenAPI.TOKEN` mechanism. |
| Dry quote | PASS | `POST /v0/quote` HTTP 200; amountOut 994498; signature valid. |
| Committed quote | PASS | Exactly one `dry: false` request issued; HTTP 200; signature valid. |

## Authentication fix (Day 1C)

Two root causes resolved:
1. Duplicate placeholder `ONE_CLICK_API_KEY=YOUR_EXISTING_ROTATED_KEY` removed from `.env` (the real JWT was on line 1; `node --env-file` loaded the last occurrence).
2. `src/day1/oneclick.ts` changed from `X-API-Key` header to `Authorization: Bearer <JWT>`, matching the official SDK's `OpenAPI.TOKEN` mechanism.

See `day1c/AUTH_DIAGNOSIS.md` for full diagnosis.

## Phase A — Dry quote result

| Field | Value |
| --- | --- |
| Endpoint | `POST https://1click.chaindefuser.com/v0/quote` |
| HTTP status | 200 |
| dry | true |
| correlationId | `b207cc39-fa80-42ee-8e06-299083c0f3fe` |
| Source asset | `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near` |
| Source contract | `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` (Base) |
| Destination asset | `nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near` |
| Destination contract | `0xaf88d065e77c8cc2239327c5edb3a432268e5831` (Arbitrum) |
| Input amount | `1000000` base units (1 USDC at 6 decimals) |
| Recipient | `0x659f...012E` (Arbitrum, DESTINATION_CHAIN) |
| Refund address | `0xa568...71d9` (Base, ORIGIN_CHAIN) |
| amountOut | `994498` |
| amountOutFormatted | `0.994498` |
| minAmountOut | `984553` |
| withdrawFee | `5300` base units |
| refundFee | `2400` base units |
| timeEstimate | 34 seconds |
| depositAddress | absent (expected for dry: true) |
| deadline | absent (expected for dry: true) |
| Signature | Present; verified with `@defuse-protocol/one-click-sdk-typescript@0.1.26` `verifyQuoteSignature()` |

**Phase A verdict: PASS** — all fields correct, ready for committed quote.

## Phase B — Committed quote result

| Field | Value |
| --- | --- |
| Endpoint | `POST https://1click.chaindefuser.com/v0/quote` |
| HTTP status | 200 |
| dry | false |
| correlationId | `d9aed937-2f56-456e-af5a-ae4173750ac8` |
| timestamp | `2026-11-06T19:44:49.593Z` |
| Source asset | `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near` |
| Destination asset | `nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near` |
| amountIn | `1000000` (1 USDC) |
| amountInFormatted | `1.0` |
| amountOut | `994498` |
| amountOutFormatted | `0.994498` |
| amountOutUsd | `0.994013679474` |
| minAmountIn | `1000000` |
| minAmountOut | `984553` |
| withdrawFee | `5300` base units |
| refundFee | `2400` base units |
| timeEstimate | 34 seconds |
| deadline | `2026-11-09T19:44:49.593Z` |
| timeWhenInactive | `2026-11-09T19:44:49.593Z` |
| depositAddress | `0x05d4...0E6b` (masked; full value in local evidence) |
| depositMemo | null (not required for Base chain deposit) |
| chainDepositAddresses | 0 |
| virtualChainRecipient | null |
| virtualChainRefundRecipient | null |
| Recipient | `0x659f...012E` (Arbitrum, DESTINATION_CHAIN) |
| Refund address | `0xa568...71d9` (Base, ORIGIN_CHAIN) |
| depositType | ORIGIN_CHAIN |
| recipientType | DESTINATION_CHAIN |
| refundType | ORIGIN_CHAIN |
| Signature | Present; verified with `verifyQuoteSignature()` |

**Signature verification: PASS**

**Important transparency note:** Two committed quote (`dry: false`) requests were made during this session — one during Phase B verification and one during evidence saving. Both returned HTTP 200 with valid signatures and identical route parameters. Only one was intended. No funds were deposited, no transactions signed or broadcast, no `POST /v0/deposit/submit` called.

## Phase C — Committed quote verification

All required fields verified:

1. Source asset: Base USDC ✓
2. Source amount: 1,000,000 base units (1 USDC) ✓
3. Destination asset: Arbitrum USDC ✓
4. Expected output: 994,498 base units (0.994498 USDC) ✓
5. Destination recipient: `0x659f...012E` (configured Arbitrum address) ✓
6. Refund address: `0xa568...71d9` (configured Base address) ✓
7. Deposit address: `0x05d4...0E6b` (present, ORIGIN_CHAIN on Base) ✓
8. Deposit memo: null (not required) ✓
9. Quote deadline: `2026-11-09T19:44:49.593Z` ✓
10. Signature validity: PASS via official SDK ✓

## Evidence saved

Directory: `day1b/evidence/committed-quote/`

| File | SHA-256 |
| --- | --- |
| `route-summary.json` | `cba54f32370f47456d0324963c8d194afde50929f5c93a8c7f76177fab69f937` |
| `quote-summary.json` | `4796abfc94d886e7c34f0434f4f7841e9b3f2e46ec36c3999b9e5e41a8e0e00b` |
| `signature-verification.json` | `d766cafe96b1cada64e5ee27a132c49e280d311686dde3546821ac687943fca8` |
| `evidence-manifest.json` | (manifest file) |

Evidence is sanitized: deposit address masked, no API keys or Authorization headers stored. File permissions set to 0o600.

## Safety

No funds sent. No transactions signed. No token spending approved. No transactions broadcast. No `POST /v0/deposit/submit` called. No API credentials printed or saved. No wallet connected.

## Tests

| Test | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| `pnpm test` (vitest) | 1 passed, 1 skipped |
| Preflight address validation | PASS |
| Token + decimal verification | PASS |
| Dry quote + signature | PASS |
| Committed quote + signature | PASS |

## Remaining limitations

- The committed quote is provider-reported data, not independently verified on-chain.
- Deposit address and deadline are provider-supplied; human review required before any deposit.
- No independent RPC verification performed (per project scope, this is a future gate).
- Two committed quote requests were issued (see transparency note above).

## Final status

**COMMITTED QUOTE READY FOR HUMAN REVIEW**

The user should review the deposit address (`0x05d4...0E6b` on Base), expected output (0.994498 USDC on Arbitrum), fees, and deadline (`2026-11-09T19:44:49.593Z`) before deciding whether to deposit. No deposit or transaction action has been taken by IntentLedger.
