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
const assetAddress = publicKey("8HAbQYnRmYXpRBfzSZF9nDvaEPieJ5Q5FnU8njrihQbY");

//a new metadata uri (created in nft_metadata.ts, added two new attributes)
const newUri = "https://gateway.irys.xyz/ARvTwn6oDHTFjvn3Nrbc8nVCW373pfi47JpLkG5sors8";

(async () => {
  try {
   const asset = await fetchAsset(umi, assetAddress);

   await update(umi, {
    asset,
    name: "Orichalcum Reforged",
    uri: newUri,
   }).sendAndConfirm(umi);

    console.log(`updated: https://core.metaplex.com/explorer/${assetAddress}?env=devnet`);
  } catch (e) {
    console.log(`error ${e}`);
  }
})();
