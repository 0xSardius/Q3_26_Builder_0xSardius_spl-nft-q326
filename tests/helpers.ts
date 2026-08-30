/**
 * Plumbing shared by the tests: the same client setup the scripts use,
 * exported as functions so each test file can build what it needs.
 */
import {
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  sendAndConfirmTransactionFactory,
} from "@solana/kit";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi";
import { mplCore } from "@metaplex-foundation/mpl-core";
import wallet from "../devnet-wallet.json";
import wallet2 from "../wallet2.json";

export const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const WS_URL = process.env.SOLANA_WS_URL ?? "wss://api.devnet.solana.com";

// ---- @solana/kit (SPL tests) ----
export const rpc = createSolanaRpc(RPC_URL);
export const rpcSubscriptions = createSolanaRpcSubscriptions(WS_URL);
export const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
export const loadKitSigner = () => createKeyPairSignerFromBytes(new Uint8Array(wallet));

// ---- umi (NFT tests) ----
/** umi with mpl-core registered and the given wallet bytes as identity + payer */
export function loadUmi(bytes: number[] = wallet) {
  const umi = createUmi(RPC_URL, { commitment: "confirmed" }).use(mplCore());
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(bytes));
  umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));
  return umi;
}
/** a umi Signer for wallet 2 (no identity change) — for `authority:` slots */
export function wallet2Signer(umi: ReturnType<typeof loadUmi>) {
  return createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet2)));
}

export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
