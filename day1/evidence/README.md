# Day-1 evidence index

No case directory or transaction evidence files were created.

The Day-1 kill test reached a NO-GO before selecting an authorized real intent and before retrieving authenticated quote/status data. Creating `quote-response.json`, `status-response.json`, or RPC transaction files without actual retrieval would violate the project's evidence rules.

The only successful network retrieval was the official OpenAPI schema, summarized in [`docs/API_SOURCES.md`](../../docs/API_SOURCES.md). It is documentation, not settlement evidence.

Evidence categories for a future authorized case:

- **Provider-reported:** quote/status responses and explorer records.
- **Independently observed:** raw public-RPC transaction, receipt, block timestamp, and transfer-log reads.
- **Derived:** deterministic reconciliation classification based on the preceding records.

