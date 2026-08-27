import {
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  assertIsTransactionMessageWithBlockhashLifetime,
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
  getMintToInstruction,
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
    const signer = createKeyPairSignerFromBytes(new Uint8Array(wallet));
    // generate a new mint signer for the address
    const mint = generateKeyPairSigner();

    // get the size of the mint
    const space = await BigInt(getMintSize());

    // get the minimum balance for rent exemtpion
    const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

    const {value: latestBlockhash} = await rpc.getLatestBlockhash().send();

    const sendAndConfirm = sendAndConfirmTransactionFactory({rpc, rpcSubscriptions});

    const msg = createTransactionMessage({version: 0});

    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

    const msgWithLifetime = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msgWithPayer);

    const txMessage = appendTransactionMessageInstructions([
      getCreateAccountInstruction({
        payer: signer,
        newAccount: mint,
        lamports: rent,
        space,
        programAddress: TOKEN_PROGRAM_ADDRESS,
      }),

      getInitializeMintInstruction({
        mint: mint.address,
        decimals: 6,
        mintAuthority: signer.address,
      }),
    ],
    msgWithLifetime,
  );

  const signedTx = await signTransactionMessageWithSigners(txMessage);

  assertIsTransactionMessageWithBlockhashLifetime(signedTx);

  await sendAndConfirm(signedTx, {commitment: 'confirmed'});
  
  console.log(`Mint created: ${mint.address}`);
    
  } catch (error) {
    console.log(error);
  }
})();
