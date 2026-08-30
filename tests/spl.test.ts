import { describe, it, expect } from "vitest";
import {
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createTransactionMessage,
  generateKeyPairSigner,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type KeyPairSigner,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getInitializeMintInstruction,
  getMintSize,
  getMintToInstruction,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { getCreateAccountInstruction } from "@solana-program/system";
import { loadKitSigner, rpc, sendAndConfirm } from "./helpers";

const EXPECTED_DECIMALS = 6;
const ONE_TOKEN = 10n ** 6n;
const MINT_AMOUNT = (100n * ONE_TOKEN).toString();
const TRANSFER_AMOUNT = (10n * ONE_TOKEN).toString();
const REMAINING_AMOUNT = (90n * ONE_TOKEN).toString();

describe("Create a mint account, mint 100 tokens, and send 10", () => {
  let signer: KeyPairSigner;
  let mint: KeyPairSigner;

  it("should successfully create a mint account", async () => {
    signer = await loadKitSigner();
    mint = await generateKeyPairSigner();

    const space = BigInt(getMintSize());
    const rent = await rpc.getMinimumBalanceForRentExemption(space).send();
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const msg = createTransactionMessage({ version: 0 });
    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);
    const msgWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer,
    );

    const txMessage = appendTransactionMessageInstructions(
      [
        getCreateAccountInstruction({
          payer: signer,
          newAccount: mint,
          lamports: rent,
          space,
          programAddress: TOKEN_PROGRAM_ADDRESS,
        }),
        getInitializeMintInstruction({
          mint: mint.address,
          decimals: EXPECTED_DECIMALS,
          mintAuthority: signer.address,
        }),
      ],
      msgWithLifetime,
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);
    assertIsTransactionWithBlockhashLifetime(signedTx);
    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    const { value: account } = await rpc
      .getAccountInfo(mint.address, { encoding: "jsonParsed" })
      .send();

    expect(account).not.toBeNull();
    expect(account!.owner).toBe(TOKEN_PROGRAM_ADDRESS);

    const info = (account!.data as { parsed: { info: Record<string, unknown> } })
      .parsed.info;
    expect(info.decimals).toBe(EXPECTED_DECIMALS);
    expect(info.mintAuthority).toBe(signer.address);
    expect(info.isInitialized).toBe(true);
    expect(info.supply).toBe("0");
  });

  it("should successfully mint 100 tokens to the signer", async () => {
    const [ata] = await findAssociatedTokenPda({
      mint: mint.address,
      owner: signer.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    const createAtaIx = await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer: signer,
      mint: mint.address,
      owner: signer.address,
    });

    const mintToIx = getMintToInstruction({
      mint: mint.address,
      token: ata,
      mintAuthority: signer,
      amount: 100n * ONE_TOKEN,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const msg = createTransactionMessage({ version: 0 });
    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);
    const msgWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer,
    );

    const txMessage = appendTransactionMessageInstructions(
      [createAtaIx, mintToIx],
      msgWithLifetime,
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);
    assertIsTransactionWithBlockhashLifetime(signedTx);
    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    const { value: tokenBalance } = await rpc.getTokenAccountBalance(ata).send();
    const { value: supply } = await rpc.getTokenSupply(mint.address).send();

    expect(tokenBalance?.amount).toBe(MINT_AMOUNT);
    expect(supply?.amount).toBe(MINT_AMOUNT);
  });

  it("should transfer 10 tokens to a recipient", async () => {
    const recipient = await generateKeyPairSigner();

    const [fromAta] = await findAssociatedTokenPda({
      mint: mint.address,
      owner: signer.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    const [toAta] = await findAssociatedTokenPda({
      mint: mint.address,
      owner: recipient.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    const createRecipientAtaIx =
      await getCreateAssociatedTokenIdempotentInstructionAsync({
        payer: signer,
        mint: mint.address,
        owner: recipient.address,
      });

    const transferIx = getTransferCheckedInstruction({
      source: fromAta,
      mint: mint.address,
      destination: toAta,
      authority: signer,
      amount: 10n * ONE_TOKEN,
      decimals: EXPECTED_DECIMALS,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const msg = createTransactionMessage({ version: 0 });
    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);
    const msgWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer,
    );

    const txMessage = appendTransactionMessageInstructions(
      [createRecipientAtaIx, transferIx],
      msgWithLifetime,
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);
    assertIsTransactionWithBlockhashLifetime(signedTx);
    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    const { value: senderBalance } = await rpc
      .getTokenAccountBalance(fromAta)
      .send();
    const { value: recipientBalance } = await rpc
      .getTokenAccountBalance(toAta)
      .send();
    const { value: supply } = await rpc.getTokenSupply(mint.address).send();

    expect(senderBalance?.amount).toBe(REMAINING_AMOUNT);
    expect(recipientBalance?.amount).toBe(TRANSFER_AMOUNT);
    expect(supply?.amount).toBe(MINT_AMOUNT);
  });
});
