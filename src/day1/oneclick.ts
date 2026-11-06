import { verifyQuoteSignature, type OneClickQuoteResponse } from "@defuse-protocol/one-click-sdk-typescript";
import { keccak_256 } from "@noble/hashes/sha3";
import { z } from "zod";

const API_BASE_URL = "https://1click.chaindefuser.com";

const tokenSchema = z.object({
  assetId: z.string().min(1),
  blockchain: z.string().min(1),
  symbol: z.string().min(1),
  decimals: z.number().int().nonnegative(),
});

export const tokensSchema = z.array(tokenSchema);

export const dryQuoteRequestSchema = z.object({
  dry: z.literal(true),
  swapType: z.literal("EXACT_INPUT"),
  slippageTolerance: z.number().int().min(0),
  originAsset: z.string().min(1),
  depositType: z.literal("ORIGIN_CHAIN"),
  destinationAsset: z.string().min(1),
  amount: z.string().regex(/^\d+$/),
  refundTo: z.string().min(1),
  refundType: z.literal("ORIGIN_CHAIN"),
  recipient: z.string().min(1),
  recipientType: z.literal("DESTINATION_CHAIN"),
  deadline: z.string().datetime(),
});

export type DryQuoteRequest = z.infer<typeof dryQuoteRequestSchema>;

const signedQuoteSchema = z.object({
  correlationId: z.string(),
  timestamp: z.string(),
  signature: z.string(),
  quoteRequest: z.record(z.unknown()),
  quote: z.record(z.unknown()),
}).passthrough();

export type SignedQuote = z.infer<typeof signedQuoteSchema>;

const evmAddressRegex = /^0x[0-9a-fA-F]{40}$/;

export function isValidEvmAddress(address: string): boolean {
  if (!evmAddressRegex.test(address)) return false;
  const hex = address.slice(2).toLowerCase();
  const hash = keccak_256(new TextEncoder().encode(hex));
  for (let i = 0; i < 40; i++) {
    const originalCh = address[2 + i]!;
    const ch = hex[i]!;
    if (ch < "a" || ch > "f") continue;
    const byteIndex = i >> 1;
    const shift = (1 - (i & 1)) * 4;
    const nibble = (hash[byteIndex]! >> shift) & 0x0f;
    const shouldBeUpper = nibble >= 8;
    const isUpper = originalCh === originalCh.toUpperCase() && originalCh !== originalCh.toLowerCase();
    if (shouldBeUpper !== isUpper) return false;
  }
  return true;
}

function envAddress(varName: string): string {
  const value = process.env[varName];
  if (!value) throw new Error(`${varName}: missing`);
  if (!isValidEvmAddress(value)) throw new Error(`${varName}: invalid EVM checksum address`);
  return value;
}

export function recipientAddress(): string {
  return envAddress("ONE_CLICK_RECIPIENT");
}

export function refundAddress(): string {
  return envAddress("ONE_CLICK_REFUND_TO");
}

export const committedQuoteRequestSchema = z.object({
  dry: z.literal(false),
  swapType: z.literal("EXACT_INPUT"),
  slippageTolerance: z.number().int().min(0),
  originAsset: z.string().min(1),
  depositType: z.literal("ORIGIN_CHAIN"),
  destinationAsset: z.string().min(1),
  amount: z.string().regex(/^\d+$/),
  refundTo: z.string().min(1),
  refundType: z.literal("ORIGIN_CHAIN"),
  recipient: z.string().min(1),
  recipientType: z.literal("DESTINATION_CHAIN"),
  deadline: z.string().datetime(),
});

export type CommittedQuoteRequest = z.infer<typeof committedQuoteRequestSchema>;

export function createCommittedQuoteRequest(tokens: z.infer<typeof tokensSchema>): CommittedQuoteRequest {
  const originAsset = "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";
  const destinationAsset = "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near";
  if (!tokens.some((token) => token.assetId === originAsset) || !tokens.some((token) => token.assetId === destinationAsset)) {
    throw new Error("The controlled committed-quote route is no longer listed by /v0/tokens");
  }

  return committedQuoteRequestSchema.parse({
    dry: false,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset,
    depositType: "ORIGIN_CHAIN",
    destinationAsset,
    amount: "1000000",
    refundTo: refundAddress(),
    refundType: "ORIGIN_CHAIN",
    recipient: recipientAddress(),
    recipientType: "DESTINATION_CHAIN",
    deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
}

export async function requestQuote(request: DryQuoteRequest | CommittedQuoteRequest): Promise<SignedQuote> {
  const response = await authenticatedFetch("/v0/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return signedQuoteSchema.parse(await parseResponse(response));
}

function apiKey(): string {
  const key = process.env.ONE_CLICK_API_KEY;
  if (!key) throw new Error("ONE_CLICK_API_KEY: missing");
  return key;
}

async function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
      ...init.headers,
    },
  });
}

async function parseResponse(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    const problem = z.object({
      message: z.string().optional(),
      detail: z.string().optional(),
      code: z.string().optional(),
    }).passthrough().safeParse(body);
    const reason = problem.success
      ? [problem.data.code, problem.data.message, problem.data.detail].filter(Boolean).join(": ")
      : "no structured error body";
    throw new Error(`1Click ${response.url} returned HTTP ${response.status}: ${reason}`);
  }
  return body;
}

export async function getSupportedTokens() {
  return tokensSchema.parse(await parseResponse(await authenticatedFetch("/v0/tokens")));
}

export function createDryQuoteRequest(tokens: z.infer<typeof tokensSchema>): DryQuoteRequest {
  const originAsset = "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";
  const destinationAsset = "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near";
  if (!tokens.some((token) => token.assetId === originAsset) || !tokens.some((token) => token.assetId === destinationAsset)) {
    throw new Error("The controlled dry-quote route is no longer listed by /v0/tokens");
  }

  return dryQuoteRequestSchema.parse({
    dry: true,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset,
    depositType: "ORIGIN_CHAIN",
    destinationAsset,
    amount: "1000000",
    // Public documentation example; this is a dry quote and never creates a deposit address.
    refundTo: "0x2527D02599Ba641c19FEa793cD0F167589a0f10D",
    refundType: "ORIGIN_CHAIN",
    recipient: "0x2527D02599Ba641c19FEa793cD0F167589a0f10D",
    recipientType: "DESTINATION_CHAIN",
    deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
}

export async function requestDryQuote(request: DryQuoteRequest): Promise<SignedQuote> {
  const response = await authenticatedFetch("/v0/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return signedQuoteSchema.parse(await parseResponse(response));
}

export function quoteSignatureIsValid(quote: SignedQuote): boolean {
  // The API response is first structurally checked above; the SDK owns the
  // complete generated response type used by its cryptographic verifier.
  return verifyQuoteSignature(quote as unknown as OneClickQuoteResponse);
}
