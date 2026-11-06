# IntentLedger engineering rules

## Scope and safety

- This repository is independent from VeilReceipt. Never read from or modify that project as part of IntentLedger work.
- Never fabricate transaction evidence, API responses, RPC results, or historical intent associations.
- Treat provider responses as provider-reported data, never as independent blockchain proof.
- Never claim to recover, refund, freeze, reverse, or control user funds.
- Do not publish secrets, private keys, authentication tokens, or identifiable wallet information without permission.

## Implementation

- Use TypeScript with strict type checking; validate untrusted input with Zod.
- Represent token quantities as `bigint` or decimal strings; never use JavaScript floating point arithmetic for verification.
- Keep raw evidence immutable and separate from normalized/derived records.
- Make classifications deterministic and include evidence references and remaining uncertainty.
- Label all test fixtures `SYNTHETIC`; they are not evidence of protocol behavior.

## Evidence and testing

- Use only documented API endpoints and schemas. Preserve retrieval time, request URL, provider, chain ID, and SHA-256 digest for acquired evidence.
- Do not create an evidence file for unavailable data. Document the gap instead.
- A second RPC is corroboration only when its infrastructure independence is substantiated; it is never absolute truth.
- Run formatting, type checking, and tests relevant to every change. Report commands actually executed.
