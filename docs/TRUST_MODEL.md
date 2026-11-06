# Trust model

## Evidence classes

- **PROVIDER_SIGNED:** A 1Click quote/status payload accepted by the official SDK's `verifyQuoteSignature()`.
- **CHAIN_VERIFIED:** A transaction, receipt, block, and decoded transfer independently read from a public-chain RPC.
- **DERIVED:** A deterministic conclusion calculated from retained provider and chain evidence.
- **UNVERIFIED:** Information lacking sufficient evidence for the above classifications.

## What a quote signature establishes

1Click signs a deterministic stable-JSON serialization of `{ ...quoteRequest, ...quoteResponse, timestamp }`, hashes it with SHA-256, Base58-encodes the hash, and signs it. A valid signature establishes payload origin at 1Click and detects mutations to signed fields. It does not prove that an origin-chain deposit, destination transfer, or refund occurred.

Dry quotes contain no `depositAddress`; their signature cannot validate a hypothetical address that is not part of the returned signed payload. A deposit-address tampering test requires a separately authorized, signed non-dry quote. IntentLedger will not create one automatically.

## Remaining limitations

- A 1Click deposit-address association remains provider-reported even if the quote is provider-signed.
- A status payload is provider-reported; its transaction references require independent chain verification.
- Two RPC providers improve reproducibility but cannot guarantee absolute blockchain truth.
- No conclusion of loss, theft, or solver custody follows merely from a `PROCESSING` status or absent terminal evidence.
