import {
  createGenericFile,
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
  some,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import {
  fetchMetadataFromSeeds,
  updateMetadataAccountV2,
} from "@metaplex-foundation/mpl-token-metadata";
import { readFile } from "fs/promises";
import path from "path";
import bs58 from "bs58";
import wallet from "../../devnet-wallet.json";

//paste your mint address got from spl_init.ts
const mint = publicKey("3MadHmMPWUeCX6LCf8LKTY8f2vSrbp21YCnnhEeyrENT");

// image at the project root
const IMAGE_FILE = "orichalcum.jpg";

const umi = createUmi("https://api.devnet.solana.com").use(
  // devnet Irys node — uploads are paid in devnet SOL from the umi identity
  irysUploader({ address: "https://devnet.irys.xyz" }),
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(signer));

(async () => {
  try {
    // 1. upload the image
    const bytes = await readFile(path.join(__dirname, "../../", IMAGE_FILE));
    const image = createGenericFile(bytes, IMAGE_FILE, {
      contentType: "image/jpeg",
    });
    const [imageUri] = await umi.uploader.upload([image]);
    console.log("image uri:    ", imageUri);

    // 2. upload the off-chain metadata JSON that points at the image
    const metadataUri = await umi.uploader.uploadJson({
      name: "Orichalcum",
      symbol: "ORI",
      description:
        "The lost metal of Atlantis. Orichalcum, forged in the deep and claimed by Poseidon.",
      image: imageUri,
    });
    console.log("metadata uri: ", metadataUri);

    // 3. point the on-chain metadata account at the new JSON.
    //    We fetch the existing account and only replace `uri`, keeping the rest.
    const metadata = await fetchMetadataFromSeeds(umi, { mint });

    const tx = updateMetadataAccountV2(umi, {
      metadata: metadata.publicKey,
      updateAuthority: signer,
      data: some({
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
        creators: metadata.creators,
        collection: metadata.collection,
        uses: metadata.uses,
      }),
    });

    const result = await tx.sendAndConfirm(umi);
    console.log("signature:    ", bs58.encode(Buffer.from(result.signature)));
  } catch (error) {
    console.log("error", error);
  }
})();
