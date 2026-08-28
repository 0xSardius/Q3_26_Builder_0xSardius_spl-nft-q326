import {
  address,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import wallet from "../../devnet-wallet.json";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com",
);

const token_decimals = 1_000_000n;

//paste your mint address got from spl_init.ts
const mint = address("3MadHmMPWUeCX6LCf8LKTY8f2vSrbp21YCnnhEeyrENT");

//paste the address of the recipient
// NOTE: this must be a *wallet* address, not a token account
const to = address("5Gi5TzJqQvbQo6RdwqBpKaKk1L3s4TChucgnLzSyFqP4");

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });

    const [fromAta] = await findAssociatedTokenPda({
      mint,
      owner: signer.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log(`Your fromAta is : ${fromAta}`);

    const [toAta] = await findAssociatedTokenPda({
      mint,
      owner: to,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log(`Your toAta is : ${toAta}`);

    // Instruction 1: make sure the *recipient* has an ATA for this mint.
    // Idempotent variant: creates it if missing, no-op if it already exists,
    // so this script is safe to run more than once.
    const createAtaIx = await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer: signer, // we pay the rent for the recipient's account
      mint,
      owner: to, // the recipient owns it — they don't need to sign
    });

    // Instruction 2: move tokens from our ATA to theirs.
    // `Checked` = the program verifies mint + decimals match, guarding against
    // sending the wrong token or misreading the amount.
    const transferTx = getTransferCheckedInstruction({
      source: fromAta,
      mint,
      destination: toAta,
      authority: signer, // owner of the source ATA must sign
      amount: 10n * token_decimals, // 10 tokens in base units
      decimals: 6, // must match the mint, or the tx fails
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const msg = createTransactionMessage({ version: 0 });

    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

    const msgWithLiftime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer,
    );

    const txMessage = appendTransactionMessageInstructions(
      [createAtaIx, transferTx],
      msgWithLiftime,
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);

    assertIsTransactionWithBlockhashLifetime(signedTx);

    const signature = getSignatureFromTransaction(signedTx);

    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    console.log(`transfer txid: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (error) {
    console.log(error);
  }
})();
