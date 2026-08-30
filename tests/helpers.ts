/**
 * Plumbing shared by the tests: the same client setup the scripts use,
 * exported as functions so each test file can build what it needs.
 */
import {
  createDefaultRpcTransport,
  createKeyPairSignerFromBytes,
  createSolanaRpcFromTransport,
  createSolanaRpcSubscriptions,
  sendAndConfirmTransactionFactory,
  type RpcTransport,
} from "@solana/kit";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi";
import { mplCore } from "@metaplex-foundation/mpl-core";
import wallet from "../devnet-wallet.json";
import wallet2 from "../wallet2.json";

export const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const WS_URL = process.env.SOLANA_WS_URL ?? "wss://api.devnet.solana.com";

// ---- 429 handling: public devnet rate-limits under a full suite run ----
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BACKOFF_MS = [500, 1000, 2000, 4000, 8000];

function withRetry(transport: RpcTransport): RpcTransport {
  return async (...args) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await transport(...args);
      } catch (e) {
        const is429 = (e as any)?.context?.statusCode === 429;
        if (!is429 || attempt >= BACKOFF_MS.length) throw e;
        await sleep(BACKOFF_MS[attempt]);
      }
    }
  };
}

const retryingFetch: typeof fetch = async (input, init) => {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(input, init);
    if (res.status !== 429 || attempt >= BACKOFF_MS.length) return res;
    await sleep(BACKOFF_MS[attempt]);
  }
};

// ---- @solana/kit (SPL tests) ----
export const rpc = createSolanaRpcFromTransport(
  withRetry(createDefaultRpcTransport({ url: RPC_URL })),
);
export const rpcSubscriptions = createSolanaRpcSubscriptions(WS_URL);
export const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
export const loadKitSigner = () => createKeyPairSignerFromBytes(new Uint8Array(wallet));

// ---- umi (NFT tests) ----
/** umi with mpl-core registered and the given wallet bytes as identity + payer */
export function loadUmi(bytes: number[] = wallet) {
  const umi = createUmi(RPC_URL, { commitment: "confirmed", fetch: retryingFetch }).use(mplCore());
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(bytes));
  umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));
  return umi;
}
/** a umi Signer for wallet 2 (no identity change) — for `authority:` slots */
export function wallet2Signer(umi: ReturnType<typeof loadUmi>) {
  return createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet2)));
}

export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
