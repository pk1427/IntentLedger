# IntentLedger

> Cross-chain money should end with proof, not uncertainty.

IntentLedger is planned as an open-source reconciliation engine for NEAR Intents. It will compare a user request and provider-reported quote/status data with independently observed public-chain evidence, then produce a deterministic evidence package. It will not recover, reverse, freeze, or control funds.

## Current status

**Day-1 gate: CONDITIONAL GO for authenticated API integration; NO-GO for the reconciliation MVP.** Authenticated token retrieval, a provider-signed dry quote, and SDK signature verification now pass. No controlled on-chain deposit has occurred, so source/destination/refund and independent-RPC validation remain unproven. See [the Day-1 result](day1/DAY1_RESULT.md), [API source inspection](docs/API_SOURCES.md), and [trust model](docs/TRUST_MODEL.md).

This repository contains no synthetic case presented as real evidence and no transaction evidence for an unapproved third party.

## Next gate

Use a separate explicit human command to request a non-dry quote, inspect it, and manually deposit from a controlled wallet. Only then can the status, source chain, destination/refund, and second-RPC gates be tested. No code in this repository broadcasts transactions.

