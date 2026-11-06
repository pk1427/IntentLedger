import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createCommittedQuoteRequest,
  createDryQuoteRequest,
  getSupportedTokens,
  isValidEvmAddress,
  quoteSignatureIsValid,
  recipientAddress,
  refundAddress,
  requestQuote,
} from "../src/day1/oneclick.js";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function maskAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function writeEvidence(
  evidenceDirectory: string,
  fileName: string,
  value: unknown,
): Promise<{ fileName: string; sha256: string }> {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(resolve(evidenceDirectory, fileName), body, { encoding: "utf8", mode: 0o600 });
  return { fileName, sha256: sha256(body) };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

const LOCK_FILE = resolve("day1b/evidence/committed-quote/.submission.lock");
const STATE_FILE = resolve("day1b/evidence/committed-quote/.request-state.json");

type RequestState = {
  status: "SUBMISSION_IN_PROGRESS" | "COMPLETED" | "FAILED_AMBIGUOUS";
  correlationId?: string;
  timestamp?: string;
  retrievedAt?: string;
};

async function readLock(): Promise<boolean> {
  try {
    await readFile(LOCK_FILE, { encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}

async function writeLock(): Promise<void> {
  await mkdir(resolve("day1b/evidence/committed-quote"), { recursive: true });
  await writeFile(LOCK_FILE, "SUBMISSION_IN_PROGRESS\n", { encoding: "utf8", mode: 0o600 });
}

async function removeLock(): Promise<void> {
  try {
    await writeFile(LOCK_FILE, "", { encoding: "utf8", mode: 0o600 });
  } catch {
    // Ignore removal errors
  }
}

async function readState(): Promise<RequestState | null> {
  try {
    const body = await readFile(STATE_FILE, { encoding: "utf8" });
    return JSON.parse(body) as RequestState;
  } catch {
    return null;
  }
}

async function writeState(state: RequestState): Promise<void> {
  await mkdir(resolve("day1b/evidence/committed-quote"), { recursive: true });
  await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

async function requestCommittedQuoteOnce(tokens: Awaited<ReturnType<typeof getSupportedTokens>>): Promise<{
  request: Parameters<typeof requestQuote>[0];
  response: Awaited<ReturnType<typeof requestQuote>>;
}> {
  const committedRequest = createCommittedQuoteRequest(tokens);
  const committedQuote = await withTimeout(requestQuote(committedRequest), 30000);
  return { request: committedRequest, response: committedQuote };
}

async function main() {
  const apiKeyConfigured = Boolean(process.env.ONE_CLICK_API_KEY);
  console.log(`ONE_CLICK_API_KEY: ${apiKeyConfigured ? "configured" : "missing"}`);
  if (!apiKeyConfigured) process.exitCode = 1;

  // Validate controlled addresses (values never printed)
  const recipient = recipientAddress();
  const refundTo = refundAddress();
  console.log(`ONE_CLICK_RECIPIENT: valid EVM checksum address (${maskAddress(recipient)})`);
  console.log(`ONE_CLICK_REFUND_TO: valid EVM checksum address (${maskAddress(refundTo)})`);
  console.log("Recipient network intent: DESTINATION_CHAIN (Arbitrum)");
  console.log("Refund network intent: ORIGIN_CHAIN (Base)");

  // Check local execution lock — fail closed if a prior submission is in progress
  const lockExists = await readLock();
  if (lockExists) {
    const priorState = await readState();
    console.error(
      "BLOCKED: Local execution lock exists. A prior committed quote submission may be in progress or terminated ambiguously.",
    );
    console.error(`Prior state: ${JSON.stringify(priorState ?? "unknown")}`);
    console.error("Manual investigation required before another committed quote request.");
    process.exitCode = 1;
    return;
  }

  // Retrieve supported tokens and verify both USDC tokens
  const tokens = await getSupportedTokens();
  const originAsset = "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";
  const destinationAsset = "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near";
  const originToken = tokens.find((t) => t.assetId === originAsset);
  const destinationToken = tokens.find((t) => t.assetId === destinationAsset);

  if (!originToken || !destinationToken) {
    throw new Error("Base USDC or Arbitrum USDC not listed by /v0/tokens");
  }
  if (originToken.decimals !== 6) {
    throw new Error(`Base USDC decimals is ${originToken.decimals}, expected 6`);
  }
  if (destinationToken.decimals !== 6) {
    throw new Error(`Arbitrum USDC decimals is ${destinationToken.decimals}, expected 6`);
  }
  console.log(`Source token: ${originAsset} (${originToken.decimals} decimals)`);
  console.log(`Destination token: ${destinationAsset} (${destinationToken.decimals} decimals)`);

  const inputAmount = "1000000"; // 1 USDC at 6 decimals
  const retrievedAt = new Date().toISOString();

  // --- Step 1: Dry quote ---
  const dryRequest = createDryQuoteRequest(tokens);
  const dryRequestControlled = { ...dryRequest, recipient, refundTo };
  const dryQuote = await withTimeout(requestQuote(dryRequestControlled), 30000);
  const drySignatureValid = quoteSignatureIsValid(dryQuote);
  const dryQuoteFields = dryQuote.quote;

  console.log("\n--- Dry quote review ---");
  console.log(`HTTP status: 200`);
  console.log(`dry: true`);
  console.log(`Source asset: ${originAsset}`);
  console.log(`Destination asset: ${destinationAsset}`);
  console.log(`Input amount: ${inputAmount} base units (1 USDC)`);
  console.log(`Recipient: ${maskAddress(dryRequestControlled.recipient)}`);
  console.log(`Refund address: ${maskAddress(dryRequestControlled.refundTo)}`);
  console.log(`Expected output: ${dryQuoteFields.amountOut ?? "null"}`);
  console.log(`Withdraw fee: ${dryQuoteFields.withdrawFee ?? "null"}`);
  console.log(`Refund fee: ${dryQuoteFields.refundFee ?? "null"}`);
  console.log(`Has depositAddress: ${"depositAddress" in dryQuoteFields}`);
  console.log(`Has deadline: ${"deadline" in dryQuoteFields}`);
  console.log(`Signature valid: ${drySignatureValid}`);

  if (!drySignatureValid) {
    throw new Error("Dry quote signature failed official SDK verification");
  }

  // Confirm dry quote omits deposit-sensitive fields (expected for dry: true)
  if ("depositAddress" in dryQuoteFields || "deadline" in dryQuoteFields) {
    throw new Error("Dry quote unexpectedly contains depositAddress or deadline");
  }

  // --- Step 2: Committed quote (dry: false) — EXACTLY ONE request ---
  console.log("\n--- Requesting committed quote (dry: false) ---");

  // Record submission in progress before making the request
  await writeLock();
  await writeState({
    status: "SUBMISSION_IN_PROGRESS",
    retrievedAt,
  });

  let committedResponse: Awaited<ReturnType<typeof requestQuote>>;
  let committedRequest: Parameters<typeof requestQuote>[0];

  try {
    ({ request: committedRequest, response: committedResponse } = await requestCommittedQuoteOnce(tokens));
  } catch (error) {
    // Mark ambiguous failure — manual investigation required before retry
    await writeState({
      status: "FAILED_AMBIGUOUS",
      retrievedAt,
    });
    throw error;
  }

  const committedSignatureValid = quoteSignatureIsValid(committedResponse);
  const committedQuoteFields = committedResponse.quote;

  console.log(`HTTP status: 200`);
  console.log(`dry: false`);
  console.log(`Correlation ID: ${committedResponse.correlationId}`);
  console.log(`Timestamp: ${committedResponse.timestamp}`);
  console.log(`Source asset: ${originAsset}`);
  console.log(`Destination asset: ${destinationAsset}`);
  console.log(`Input amount: ${inputAmount} base units (1 USDC)`);
  console.log(`amountIn: ${committedQuoteFields.amountIn ?? "null"}`);
  console.log(`amountOut: ${committedQuoteFields.amountOut ?? "null"}`);
  console.log(`minAmountOut: ${committedQuoteFields.minAmountOut ?? "null"}`);
  console.log(`Withdraw fee: ${committedQuoteFields.withdrawFee ?? "null"}`);
  console.log(`Refund fee: ${committedQuoteFields.refundFee ?? "null"}`);
  console.log(`Recipient: ${maskAddress(committedRequest.recipient)}`);
  console.log(`Refund address: ${maskAddress(committedRequest.refundTo)}`);
  console.log(`Deposit address: ${committedQuoteFields.depositAddress ?? "null"}`);
  console.log(`Deposit memo: ${committedQuoteFields.depositMemo ?? "null"}`);
  console.log(`Deadline: ${committedQuoteFields.deadline ?? "null"}`);
  console.log(`Signature valid: ${committedSignatureValid}`);

  if (!committedSignatureValid) {
    await writeState({
      status: "FAILED_AMBIGUOUS",
      correlationId: committedResponse.correlationId,
      timestamp: committedResponse.timestamp,
      retrievedAt,
    });
    throw new Error("Committed quote signature failed official SDK verification");
  }

  // Mark submission completed and persist original response immediately
  await writeState({
    status: "COMPLETED",
    correlationId: committedResponse.correlationId,
    timestamp: committedResponse.timestamp,
    retrievedAt,
  });
  await removeLock();

  // --- Step 3: Save sanitized evidence (reuses response, never calls quote endpoint) ---
  const evidenceDirectory = resolve("day1b/evidence/committed-quote");

  const routeSummary = {
    label: "DERIVED / ROUTE_SUMMARY",
    retrievedAt,
    source: "https://1click.chaindefuser.com",
    endpoint: "POST /v0/quote",
    httpStatus: 200,
    route: {
      sourceAsset: originAsset,
      sourceContract: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      sourceDecimals: originToken.decimals,
      destinationAsset: destinationAsset,
      destinationContract: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      destinationDecimals: destinationToken.decimals,
      inputAmountBaseUnits: inputAmount,
      inputAmountReadable: "1 USDC",
      slippageToleranceBps: 100,
      recipient,
      recipientNetwork: "Arbitrum (DESTINATION_CHAIN)",
      refundTo,
      refundNetwork: "Base (ORIGIN_CHAIN)",
    },
  };

  const quoteSummary = {
    label: "PROVIDER_SIGNED / COMMITTED_QUOTE",
    retrievedAt,
    source: "https://1click.chaindefuser.com",
    endpoint: "POST /v0/quote",
    httpStatus: 200,
    correlationId: committedResponse.correlationId,
    timestamp: committedResponse.timestamp,
    signatureValid: committedSignatureValid,
    quoteRequest: {
      dry: committedRequest.dry,
      swapType: committedRequest.swapType,
      slippageTolerance: committedRequest.slippageTolerance,
      originAsset: committedRequest.originAsset,
      depositType: committedRequest.depositType,
      destinationAsset: committedRequest.destinationAsset,
      amount: committedRequest.amount,
      refundTo: committedRequest.refundTo,
      refundType: committedRequest.refundType,
      recipient: committedRequest.recipient,
      recipientType: committedRequest.recipientType,
      deadline: committedRequest.deadline,
    },
    quote: {
      amountIn: committedQuoteFields.amountIn,
      amountInFormatted: committedQuoteFields.amountInFormatted,
      amountOut: committedQuoteFields.amountOut,
      amountOutFormatted: committedQuoteFields.amountOutFormatted,
      amountOutUsd: committedQuoteFields.amountOutUsd,
      minAmountIn: committedQuoteFields.minAmountIn,
      minAmountOut: committedQuoteFields.minAmountOut,
      timeEstimate: committedQuoteFields.timeEstimate,
      timeWhenInactive: committedQuoteFields.timeWhenInactive,
      deadline: committedQuoteFields.deadline,
      depositAddress: maskAddress(String(committedQuoteFields.depositAddress ?? "")),
      depositMemo: committedQuoteFields.depositMemo,
      withdrawFee: committedQuoteFields.withdrawFee,
      refundFee: committedQuoteFields.refundFee,
    },
  };

  const signatureVerification = {
    label: "DERIVED / SIGNATURE_VERIFICATION",
    retrievedAt,
    sdk: "@defuse-protocol/one-click-sdk-typescript@0.1.26",
    method: "verifyQuoteSignature()",
    message: "SHA-256 over stable JSON of quote request, quote fields, and timestamp; base58-encoded; Ed25519 verified",
    signatureValid: committedSignatureValid,
    dryQuoteSignatureValid: drySignatureValid,
  };

  const routeEvidence = await writeEvidence(evidenceDirectory, "route-summary.json", routeSummary);
  const quoteEvidence = await writeEvidence(evidenceDirectory, "quote-summary.json", quoteSummary);
  const sigEvidence = await writeEvidence(evidenceDirectory, "signature-verification.json", signatureVerification);

  await writeEvidence(evidenceDirectory, "evidence-manifest.json", {
    label: "DERIVED / EVIDENCE_MANIFEST",
    retrievedAt,
    source: "https://1click.chaindefuser.com",
    sdk: "@defuse-protocol/one-click-sdk-typescript@0.1.26",
    files: [routeEvidence, quoteEvidence, sigEvidence],
  });

  console.log("\n--- Evidence saved ---");
  console.log(`Directory: day1b/evidence/committed-quote/`);
  console.log(`Files: route-summary.json, quote-summary.json, signature-verification.json, evidence-manifest.json`);

  if (!committedSignatureValid) throw new Error("Committed quote signature verification failed");
  console.log("\nDay 1B complete: committed quote created and signature verified. STOP — await human review before deposit.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Day 1B committed quote failed");
  process.exitCode = 1;
});
