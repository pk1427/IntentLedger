import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createDryQuoteRequest,
  getSupportedTokens,
  quoteSignatureIsValid,
  requestDryQuote,
} from "../src/day1/oneclick.js";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function writeEvidence(fileName: string, value: unknown): Promise<{ fileName: string; sha256: string }> {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  const evidenceDirectory = resolve("day1/evidence/dry-quote-authenticated");
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(resolve(evidenceDirectory, fileName), body, { encoding: "utf8", mode: 0o600 });
  return { fileName, sha256: sha256(body) };
}

async function main() {
  console.log(`ONE_CLICK_API_KEY: ${process.env.ONE_CLICK_API_KEY ? "configured" : "missing"}`);
  if (!process.env.ONE_CLICK_API_KEY) process.exitCode = 1;
  if (!process.env.ONE_CLICK_API_KEY) return;

  const tokens = await getSupportedTokens();
  const request = createDryQuoteRequest(tokens);
  const quote = await requestDryQuote(request);
  const signatureValid = quoteSignatureIsValid(quote);
  const retrievedAt = new Date().toISOString();

  const requestEvidence = await writeEvidence("quote-request.json", {
    label: "PROVIDER_REQUEST / DRY_QUOTE / NOT_A_SETTLEMENT",
    retrievedAt,
    request,
  });
  const quoteEvidence = await writeEvidence("quote-response.json", {
    label: "PROVIDER_SIGNED / DRY_QUOTE / NOT_A_SETTLEMENT",
    retrievedAt,
    response: quote,
  });
  const verificationEvidence = await writeEvidence("quote-signature-verification.json", {
    label: "DERIVED",
    retrievedAt,
    sdk: "@defuse-protocol/one-click-sdk-typescript@0.1.26",
    signatureValid,
  });
  await writeEvidence("evidence-manifest.json", {
    label: "DERIVED",
    retrievedAt,
    source: "https://1click.chaindefuser.com",
    files: [requestEvidence, quoteEvidence, verificationEvidence],
  });

  const quoteFields = quote.quote;
  console.log(JSON.stringify({
    tokens: { httpStatus: 200, count: tokens.length, chains: [...new Set(tokens.map((token) => token.blockchain))].sort() },
    dryQuote: {
      httpStatus: 200,
      sourceAsset: request.originAsset,
      destinationAsset: request.destinationAsset,
      requestedAmount: request.amount,
      expectedOutput: quoteFields.amountOut ?? null,
      correlationId: quote.correlationId,
      hasSignature: Boolean(quote.signature),
      signatureValid,
      hasDepositAddress: "depositAddress" in quoteFields,
      statusLookup: "NOT_RUN: dry quotes do not contain a depositAddress; no committed quote was created.",
    },
  }, null, 2));

  if (!signatureValid) throw new Error("1Click returned a dry quote whose signature failed official SDK verification");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Authenticated validation failed");
  process.exitCode = 1;
});
