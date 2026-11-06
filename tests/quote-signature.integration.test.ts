import { describe, expect, it } from "vitest";
import {
  createDryQuoteRequest,
  getSupportedTokens,
  quoteSignatureIsValid,
  requestDryQuote,
} from "../src/day1/oneclick.js";

describe.runIf(Boolean(process.env.ONE_CLICK_API_KEY))("authenticated 1Click dry quote signature", () => {
  it("accepts the returned quote and rejects modified signed fields", async () => {
    const quote = await requestDryQuote(createDryQuoteRequest(await getSupportedTokens()));
    expect(quoteSignatureIsValid(quote)).toBe(true);

    const modifiedAmount = structuredClone(quote);
    modifiedAmount.quoteRequest.amount = "1000001";
    expect(quoteSignatureIsValid(modifiedAmount)).toBe(false);

    const modifiedRecipient = structuredClone(quote);
    modifiedRecipient.quoteRequest.recipient = "0x0000000000000000000000000000000000000001";
    expect(quoteSignatureIsValid(modifiedRecipient)).toBe(false);

    const modifiedTimestamp = structuredClone(quote);
    modifiedTimestamp.timestamp = new Date(Date.parse(quote.timestamp) + 1_000).toISOString();
    expect(quoteSignatureIsValid(modifiedTimestamp)).toBe(false);

    const invalidSignature = structuredClone(quote);
    invalidSignature.signature = "11111111111111111111111111111111";
    expect(quoteSignatureIsValid(invalidSignature)).toBe(false);
  });

  it.skip("rejects a modified deposit address on a signed non-dry quote", () => {
    // A dry quote deliberately has no depositAddress. Creating a non-dry quote
    // is an explicit separate human action, so this test remains skipped until
    // an authorized controlled quote is supplied as local evidence.
  });
});
