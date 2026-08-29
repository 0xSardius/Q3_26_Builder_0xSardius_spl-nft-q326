// Task 5 — transfer the asset to another wallet.
// Does the recipient need anything? After this, who can update it and who can burn it?
import { fetchAsset, mplCore, transfer } from "@metaplex-foundation/mpl-core";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import wallet from "../../devnet-wallet.json";
import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";

const umi = createUmi(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

umi.use(mplCore());

//paste an asset address (mint a second one with nft_mint.ts — Task 4)
const asset = publicKey("9u6t3aPYjEfw6a4U1TB4gka9WfniaoxuzKvMFtRjVFMH");

//a WALLET address to send to
const newOwner = publicKey("");

(async () => {
  try {
    // your code

    // console.log(`transferred: https://core.metaplex.com/explorer/${asset}?env=devnet`);
  } catch (e) {
    console.log(`error ${e}`);
  }
})();
