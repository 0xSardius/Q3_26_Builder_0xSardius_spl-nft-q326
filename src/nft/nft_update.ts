// Task 3 — update the asset's name and uri as its update authority.
// Which role does the program check, and what stays untouched by an update?
import { fetchAsset, mplCore, update } from "@metaplex-foundation/mpl-core";
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

//paste the asset address from nft_mint.ts
const asset = publicKey("");

//a new metadata uri (upload a new JSON with nft_metadata.ts, or reuse the old one and only change the name)
const newUri = "";

(async () => {
  try {
    // your code

    // console.log(`updated: https://core.metaplex.com/explorer/${asset}?env=devnet`);
  } catch (e) {
    console.log(`error ${e}`);
  }
})();
