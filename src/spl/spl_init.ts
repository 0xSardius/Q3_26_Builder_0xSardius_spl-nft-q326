import {
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import {
  getInitializeMintInstruction,
  getMintSize,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { getCreateAccountInstruction } from "@solana-program/system";

//import your wallet
import wallet from "../../devnet-wallet.json";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com",
);

(async () => {
  try {
    // both of these are async — without `await` you get a Promise, not a signer
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

    console.log(`Mint created: ${mint.address}`);
    console.log(`Tx: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (error) {
    console.log(error);
  }
})();
