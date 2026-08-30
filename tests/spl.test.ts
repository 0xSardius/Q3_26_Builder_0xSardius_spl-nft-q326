import { describe, it, expect } from "vitest";
import { rpc } from "./helpers";
import { address, mint } from "@solana/kit"
import { mintArgs } from "@metaplex-foundation/mpl-token-metadata";


const MINT = address("3MadHmMPWUeCX6LCf8LKTY8f2vSrbp21YCnnhEeyrENT");
const EXPECTED_DECIMALS = 6;
const EXPECTED_MINT_AUTHORITY = "47mxV9vnVUkX8i5V8qDoHgauurV7w5Uc3cjH7Nk4rqBg";



describe("Create a mint account", () => {
    it("should successfullycreate a mint account", async () => {
        // ACT
      const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
      // generate a new keypair for the mint account itself
      const mint = await generateKeyPairSigner();

      // size of a Mint account (82 bytes), as bigint for the system program
      const space = BigInt(getMintSize());

      // minimum lamports so the account is rent-exempt
      const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const sendAndConfirm = sendAndConfirmTransactionFactory({
        rpc,
        rpcSubscriptions,
      });

      const msg = createTransactionMessage({ version: 0 });

      const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

      const msgWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        latestBlockhash,
        msgWithPayer,
      );

      const txMessage = appendTransactionMessageInstructions(
        [
          // 1. system program: allocate the account, fund it, assign it to the token program
          getCreateAccountInstruction({
            payer: signer,
            newAccount: mint,
            lamports: rent,
            space,
            programAddress: TOKEN_PROGRAM_ADDRESS,
          }),

          // 2. token program: write the mint data into that account
          getInitializeMintInstruction({
            mint: mint.address,
            decimals: 6,
            mintAuthority: signer.address,
          }),
        ],
        msgWithLifetime,
      );

    // signs with every signer attached to the message: payer + mint (new account must sign)
    const signedTx = await signTransactionMessageWithSigners(txMessage);

    // this is a signed *transaction* now, not a message — so use the transaction assert
    assertIsTransactionWithBlockhashLifetime(signedTx);

    const signature = getSignatureFromTransaction(signedTx);

    await sendAndConfirm(signedTx, { commitment: "confirmed" });
        //Read
        const {value : account} = await rpc
        .getAccountInfo(mint.address, {encoding: "jsonParsed"})
        .send();

        expect(account).not.toBeNull();

        // ASSERT: parsed mint fields match what spl_init created
        const info = (account!.data as any).parsed.info;
        expect(info.decimals).toBe(EXPECTED_DECIMALS);
        expect(info.mintAuthority).toBe(EXPECTED_MINT_AUTHORITY);
        expect(info.isInitialized).toBe(true);
    });
});