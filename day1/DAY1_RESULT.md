# Day-1 kill test result — NO-GO

Date: 2026-11-06 UTC  
Decision: **NO-GO for the reconciliation MVP as described**

## Decision summary

IntentLedger may not claim independent reconstruction until it has an authorized, real completed intent together with authenticated access to the documented 1Click quote/status data and independently reproducible chain evidence. Those prerequisites were not available in this workspace. Per the project decision rules, implementation of the reconciliation engine and CLI has not started.

## Selected intent

None. A public explorer listing was observable, but it was not project-owned and no permission to publish its wallet trail was provided. It was not used as evidence or recorded as a case.

## Five required tests

| Step | Result | Finding |
| --- | --- | --- |
| 1. Find a real completed intent | **FAIL** | No project-controlled or explicitly authorized completed intent was supplied. |
| 2. Retrieve quote and status | **FAIL** | The official schema requires `X-API-Key` or JWT for both `POST /v0/quote` and `GET /v0/status`. No credential or authorized historical quote/status response was available. Status is addressed by `depositAddress` (+ optional memo), not an intent ID. |
| 3. Verify source deposit | **NOT RUN** | No authorized quote supplied the deposit-address association or source transaction. Provider data cannot substitute for independent RPC evidence. |
| 4. Verify destination or refund | **NOT RUN** | No authorized case established the expected recipient, asset, amount, and deadline needed to evaluate a terminal transfer. |
| 5. Independent RPC reproduction | **NOT RUN** | No source/destination transaction was authorized for verification. |

## API inspection

The official OpenAPI schema at `https://1click.chaindefuser.com/docs/v0/openapi.yaml` was retrieved and inspected. See [`docs/API_SOURCES.md`](../docs/API_SOURCES.md) for the exact documented endpoints, authentication, and limitations.

## Evidence links

- [Evidence index](evidence/README.md)
- [API source inspection](../docs/API_SOURCES.md)

No transaction hashes, quote/status response files, or RPC artifacts are linked because none were actually retrieved for an authorized case.

## Trust assumptions and known gaps

- A 1Click quote's deposit address and a status response are provider-reported data, even when subsequently compared against chain data.
- Public RPC observations can corroborate included transactions and transfer logs but cannot independently prove that the provider's deposit address was assigned to a particular user request.
- Multiple RPC providers can improve reproducibility but do not establish absolute blockchain truth.
- A provider-reported `PROCESSING` status is not evidence that a solver holds funds. Missing terminal evidence would establish only **NO TERMINAL EVIDENCE BY DEADLINE**, not loss or theft.

## Required inputs to re-run the gate

1. A project-owned or explicitly authorized public completed 1Click intent.
2. The original quote response, or an authorized API credential and its deposit address/memo, so the documented status call can be made.
3. Permission to retain the public source and destination/refund transaction references.
4. Two named, public RPC endpoints for the involved EVM source and destination paths (or an explicit documented single-RPC limitation).

When these inputs exist, save only actually retrieved data beneath `day1/evidence/<case-id>/`, hash it, and rerun all five steps before beginning Phase 2.

## DAY-1 RESUMPTION — AUTHENTICATED API ACCESS

Date: 2026-11-06 UTC  
Decision: **CONDITIONAL GO for authenticated API integration; NO-GO for Phase 2 reconciliation**

The original NO-GO above is preserved. An approved distribution-channel key was loaded from the local, ignored `.env` file. Its value was neither printed nor written to evidence.

| Check | Result | Evidence / finding |
| --- | --- | --- |
| 1. Partner API authentication | **PASS** | `ONE_CLICK_API_KEY: configured`; authenticated official API calls returned HTTP 200. |
| 2. Supported token retrieval | **PASS** | `GET /v0/tokens` returned 216 records across 38 chain identifiers. |
| 3. Dry quote | **PASS** | Authenticated `POST /v0/quote` returned HTTP 200 for Base USDC → Arbitrum USDC, exact input `1000000` base units; returned `amountOut` was `994498`. It is explicitly a dry quote, not a settlement. |
| 4. Quote signature verification | **PASS** | `@defuse-protocol/one-click-sdk-typescript@0.1.26` accepted the received signature. Integration tests rejected altered amount, recipient, timestamp, and signature. |
| 5. Status lookup | **PARTIAL** | The documented endpoint requires the original deposit address (and memo where applicable). A dry quote correctly returned no deposit address, and no non-dry quote was created. |
| 6. Controlled quote generation readiness | **PARTIAL** | The request builder validates a dry quote only. A separate explicit human action is required before any `dry: false` workflow is added or invoked. |
| 7. Real deposit transaction | **NOT RUN** | No manual controlled-wallet deposit was provided. |
| 8. Origin-chain verification | **NOT RUN** | Awaiting a real source transaction hash and signed non-dry quote. |
| 9. Destination/refund verification | **NOT RUN** | Awaiting a real terminal outcome. |
| 10. Second RPC reproduction | **NOT RUN** | Awaiting real origin and destination/refund transactions. |

### Evidence retained locally

The only new evidence is a sanitized dry-quote package under `day1/evidence/dry-quote-authenticated/`:

- `quote-request.json` — `1f1ee37592a0f8b9c6d136b8850b4fa1eab070079927a5ccf881fb70eb5e10c8`
- `quote-response.json` — `4268aa57a5c69a4c68c886e7865be1cfb9d10c1297583144810c440f455fcdb3`
- `quote-signature-verification.json` — `92c4715b03edce4a95ac9c0a478f9d50c4e7d34e14151f6f0970512b4d209381`

Each is labelled `PROVIDER_REQUEST`, `PROVIDER_SIGNED`, or `DERIVED` as appropriate. The evidence manifest records retrieval time, source, and SHA-256 digests. There is no `status-response.json` because no status request with a valid deposit address was made.

### Signature scope and test limitation

The SDK verifies a stable-JSON, SHA-256, Base58 message over the quote request, quote response, and timestamp. This establishes 1Click origin and detects tampering to signed fields; it does not establish blockchain execution. The test for a modified `depositAddress` is intentionally skipped: dry quotes do not include that field, and fabricating or automatically obtaining a non-dry signed quote would breach the stop conditions. It must be enabled only after an authorized controlled non-dry quote is retained locally.

### Remaining conditions for full GO

1. The developer explicitly requests a reviewed `dry: false` quote for a controlled wallet.
2. The developer manually makes the deposit and provides its transaction hash.
3. IntentLedger verifies source, then status, then destination/refund evidence through two appropriately independent RPC providers.

Until then, IntentLedger must not claim independent reconstruction, recovery, completed settlement validation, or a full MVP GO.

