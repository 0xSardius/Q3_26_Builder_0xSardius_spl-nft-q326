import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import wallet from "../../devnet-wallet.json";
import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import {
  addPlugin,
  fetchAsset,
  mplCore,
  ruleSet,
} from "@metaplex-foundation/mpl-core";
import { base58 } from "@metaplex-foundation/umi/serializers";

const umi = createUmi(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

umi.use(mplCore());

//paste the asset address from nft_mint.ts
const asset = publicKey("8HAbQYnRmYXpRBfzSZF9nDvaEPieJ5Q5FnU8njrihQbY");

(async () => {
  try {
    // Royalties are a plugin in Core, not a field on the asset.
    // addPlugin attaches one to an existing asset; only the update authority can do this.
    const tx = await addPlugin(umi, {
      asset,
      plugin: {
        type: "Royalties",
        basisPoints: 500, // 5% — 100 basis points = 1%
        creators: [
          // who receives royalties, and how the 5% is split. percentages must sum to 100
          { address: signer.publicKey, percentage: 100 },
        ],
        // which programs may transfer the asset. 'None' = no restriction;
        // 'ProgramAllowList' / 'ProgramDenyList' are how royalty enforcement is done.
        ruleSet: ruleSet("None"),
      },
    }).sendAndConfirm(umi);

    const signature = base58.deserialize(tx.signature)[0];
    console.log(`signature ${signature}`);

    // read the asset back to confirm the plugin is attached
    const onChain = await fetchAsset(umi, asset);
    console.log("royalties basisPoints:", onChain.royalties?.basisPoints);
    console.log("royalties creators:   ", onChain.royalties?.creators);
    console.log("royalties ruleSet:    ", onChain.royalties?.ruleSet);
    console.log(`https://core.metaplex.com/explorer/${asset}?env=devnet`);
  } catch (e) {
    console.log(`error ${e}`);
  }
})();
