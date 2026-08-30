import { describe, it, expect } from "vitest";
import { create, burn, fetchAsset, transfer, update } from "@metaplex-foundation/mpl-core";
import { generateSigner, type PublicKey } from "@metaplex-foundation/umi";
import { address, lamports } from "@solana/kit";
import wallet2 from "../wallet2.json";
import { loadUmi, rpc, wallet2Signer } from "./helpers";

const METADATA_URI =
  "https://gateway.irys.xyz/2PrGiSFzKwkYm8Y7siT4aAyt6U9JmH6egCJMutexaX1v";
const ASSET_NAME = "Orichalcum #2";
const UPDATED_NAME = "Orichalcum Reforged";
const UPDATED_URI =
  "https://gateway.irys.xyz/ARvTwn6oDHTFjvn3Nrbc8nVCW373pfi47JpLkG5sors8";
const SECOND_ASSET_NAME = "Orichalcum #3";

describe("NFT lifecycle on devnet", () => {
  let assetAddress: PublicKey;
  let secondAssetAddress: PublicKey;
  let recipientAddress: PublicKey;

  it("should mint a Core asset", async () => {
    const umi = loadUmi();
    const asset = generateSigner(umi);

    await create(umi, {
      asset,
      name: ASSET_NAME,
      uri: METADATA_URI,
    }).sendAndConfirm(umi);

    assetAddress = asset.publicKey;

    const onChain = await fetchAsset(umi, assetAddress);

    expect(onChain.name).toBe(ASSET_NAME);
    expect(onChain.uri).toBe(METADATA_URI);
    expect(onChain.owner).toBe(umi.identity.publicKey);
    expect(onChain.updateAuthority.type).toBe("Address");
    expect(onChain.updateAuthority.address).toBe(umi.identity.publicKey);
  });

  it("should update the asset name and uri as update authority", async () => {
    const umi = loadUmi();
    const asset = await fetchAsset(umi, assetAddress);
    const ownerBefore = asset.owner;
    const updateAuthorityBefore = asset.updateAuthority;

    await update(umi, {
      asset,
      name: UPDATED_NAME,
      uri: UPDATED_URI,
    }).sendAndConfirm(umi);

    const onChain = await fetchAsset(umi, assetAddress);

    expect(onChain.publicKey).toBe(assetAddress);
    expect(onChain.name).toBe(UPDATED_NAME);
    expect(onChain.uri).toBe(UPDATED_URI);
    expect(onChain.owner).toBe(ownerBefore);
    expect(onChain.updateAuthority).toEqual(updateAuthorityBefore);
  });

  it("should mint a second Core asset", async () => {
    const umi = loadUmi();
    const asset = generateSigner(umi);

    await create(umi, {
      asset,
      name: SECOND_ASSET_NAME,
      uri: METADATA_URI,
    }).sendAndConfirm(umi);

    secondAssetAddress = asset.publicKey;

    const onChain = await fetchAsset(umi, secondAssetAddress);

    expect(onChain.publicKey).not.toBe(assetAddress);
    expect(onChain.name).toBe(SECOND_ASSET_NAME);
    expect(onChain.uri).toBe(METADATA_URI);
    expect(onChain.owner).toBe(umi.identity.publicKey);
    expect(onChain.updateAuthority.type).toBe("Address");
    expect(onChain.updateAuthority.address).toBe(umi.identity.publicKey);
  });

  it("should transfer the second asset to wallet2", async () => {
    const umi = loadUmi();
    const recipient = wallet2Signer(umi);
    recipientAddress = recipient.publicKey;

    const asset = await fetchAsset(umi, secondAssetAddress);
    const updateAuthorityBefore = asset.updateAuthority;

    await transfer(umi, {
      asset,
      newOwner: recipientAddress,
    }).sendAndConfirm(umi);

    const onChain = await fetchAsset(umi, secondAssetAddress);

    expect(onChain.publicKey).toBe(secondAssetAddress);
    expect(onChain.owner).toBe(recipientAddress);
    expect(onChain.owner).not.toBe(umi.identity.publicKey);
    expect(onChain.updateAuthority).toEqual(updateAuthorityBefore);
    expect(onChain.name).toBe(SECOND_ASSET_NAME);
  });

  it("should reject a second transfer from the original owner", async () => {
    const umi = loadUmi();
    const thirdParty = generateSigner(umi);
    const asset = await fetchAsset(umi, secondAssetAddress);

    await expect(
      transfer(umi, {
        asset,
        newOwner: thirdParty.publicKey,
      }).sendAndConfirm(umi),
    ).rejects.toThrow();
  });

  it("should allow wallet2 to burn the transferred asset", async () => {
    await rpc
      .requestAirdrop(address(recipientAddress), lamports(1_000_000_000n))
      .send()
      .catch(() => undefined);

    const umi = loadUmi(wallet2);
    const asset = await fetchAsset(umi, secondAssetAddress);

    expect(asset.owner).toBe(umi.identity.publicKey);

    await burn(umi, {
      asset,
      authority: umi.identity,
    }).sendAndConfirm(umi);

    await expect(fetchAsset(umi, secondAssetAddress)).rejects.toThrow();
  });
});
