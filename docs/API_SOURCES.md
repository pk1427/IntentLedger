# API sources inspected

Inspection date: 2026-11-06 UTC

## Resumption verification

On 2026-11-06 UTC, the latest official authentication, quote, status, and quote-signature documentation was re-inspected. The installed official SDK is `@defuse-protocol/one-click-sdk-typescript@0.1.26`, which is newer than the documented minimum `0.1.24` for `verifyQuoteSignature()`.

An authenticated `GET /v0/tokens` returned HTTP 200 with 216 token records across 38 chain identifiers. An authenticated dry `POST /v0/quote` for Base USDC to Arbitrum USDC returned HTTP 200; its signature verified with the official SDK. The retained local dry-quote evidence is not an executed swap and contains no API credential.

## Official OpenAPI schema

- URL: `https://1click.chaindefuser.com/docs/v0/openapi.yaml`
- Retrieved successfully on 2026-11-06 UTC (public documentation source; it is not transaction evidence).

The schema documents:

| Capability | Endpoint | Authentication | Historical lookup key |
| --- | --- | --- | --- |
| Quote generation | `POST /v0/quote` | `X-API-Key` or JWT | None documented by intent ID |
| Execution status | `GET /v0/status` | `X-API-Key` or JWT | `depositAddress`, plus `depositMemo` when applicable |
| Account history | `GET /v0/account/history` | User session JWT; described as invite-only | Account/session-scoped filters |

`GET /v0/status` returns a provider-reported `quoteResponse`, status, update time, and swap details including provider-supplied transaction references. Its documented statuses include `KNOWN_DEPOSIT_TX`, `PENDING_DEPOSIT`, `INCOMPLETE_DEPOSIT`, `PROCESSING`, `SUCCESS`, `REFUNDED`, and `FAILED`.

The schema does not document a public, unauthenticated historical lookup by intent hash. A deposit-address mapping supplied by a quote remains provider-reported; it is not independently authenticated by an EVM RPC.

## Public explorer

- URL: `https://explorer.near-intents.org/`
- Purpose: discovery only. Explorer-rendered fields are provider-reported, not independent chain verification.

No explorer transaction was retained as project evidence because no project-owned or explicitly authorized transaction was supplied.

