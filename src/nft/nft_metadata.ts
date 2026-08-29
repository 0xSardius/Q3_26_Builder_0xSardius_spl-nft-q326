import {
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import wallet from "../../devnet-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";

const umi = createUmi(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(
  irysUploader({
    address: "https://devnet.irys.xyz/",
  }),
);

umi.use(signerIdentity(signer));

(async () => {
  try {
    // updated with the irys image uri obtained from nft_image.ts
    const image =
      "https://gateway.irys.xyz/3Q74BVwutZWaHJDYNC851ALxAH16PD2HZTZ6N1TNqBzP";

    //json scheme : https://www.metaplex.com/docs/smart-contracts/core/json-schema

    const metadata = {
      name: "Orichalcum Reforged",
      symbol: "ORI",
      description: "The first coin struck from the lost metal of Atlantis",
      image,
      attributes: [
        {trait_type: "Metal", value: "Orichalcum"},
        {trait_type: "Deity", value: "Poseidon"},
        {trait_type: "Origin", value: "Atlantis"},
        {trait_type: "Edition", value: "Reforged"},
      ],
      properties: {
        files: [{uri: image, type: "image/jpeg"}],
        category: "image",
      },
    };

    const myUri = await umi.uploader.uploadJson(metadata);
    console.log(`metadata uri: ${myUri} `);
    
  } catch (error) {
    console.log("error", error);
  }
})();
