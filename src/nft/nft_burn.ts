// Task 6 — burn the asset and reclaim the rent.
// Who may burn, where do the lamports go — and does the account still exist afterwards? Predict, then check.
import { burn, fetchAsset, mplCore } from "@metaplex-foundation/mpl-core";
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

//paste the asset address to burn (must be owned by this wallet)
const asset = publicKey("");

(async () => {
  try {
    // your code

    // console.log(`burned: https://explorer.solana.com/address/${asset}?cluster=devnet`);
  } catch (e) {
    console.log(`error ${e}`);
  }
})();
