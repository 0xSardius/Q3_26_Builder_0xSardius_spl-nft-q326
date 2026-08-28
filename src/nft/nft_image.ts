import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createGenericFile,
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { readFile } from "fs/promises";
import path from "path";

import wallet from "../../devnet-wallet.json";

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
   
    // updated with the image file name and path
    const image = await readFile(path.join(__dirname, "../../orichalcum.jpg"));

    const file = createGenericFile(image, "orichalcum.jpg", {
      contentType: "image/jpeg",
    });

    const [myUri] = await umi.uploader.upload([file]);
    
    console.log("Your image URI: ", myUri);
  } catch (error) {
    console.log(error);
  }
})();
