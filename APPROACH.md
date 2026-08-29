# Approach log

Written *before* coding each task, in my own words. Wrong is fine — this is the reasoning
record the program grades. Updated after, with what actually happened.

Template for each task:

```
## Task N — <name>

### Before
- Accounts involved (which exist already, which get created, who owns each):
- Who signs, and why each signature is needed:
- Who pays, for what:
- Instructions, in order, and which program each goes to:
- What I'm unsure about:

### After
- What was wrong in my plan:
- Errors I hit, my hypothesis for each, and what the real cause was:
- What I'd explain differently now:
```

---

## Task 1 — Mint and transfer an SPL token

### Before
- spl_init creates an SPL token mint. THe signature authorizes the creation of a keypair that can be used to create a mint account.
- The mint account needs to know the size determind by the token program.
- the person establishing the account pays the rent, and it is received by the account owner. 
- Where will the 100 tokens live? - they will live in the token account, which is associated with the mint account, and the owner of the wallet that holds the balance in the account
- The ATA is a specific PDA whose seeds are fixed by the associated Token Program: [ owner, tokenProgram, mint]. They are fixed so any wallet, explorer, or exchange can compute your "USDC account" (for example) from just your address, with no lookup. I Believe getCreateAssociatedTokenIdempotentInstructionAsync creates it. Idempotent variant succeeds silently if the account exists, and creates it if not. 
- InitializeMint stored your address as the authority. MintTo has to prove the caller is that authority, the proof on Solana is a signature. So the slot needs a signer object, not the address.
- It should be 100,000,000 base units if we are using 100 with 6 decimals, or 100n * 10n ** 6n
- Not clear on the instructions, may need to review this piece


### After
Successfully created both instructions for the creating the account and getting the instruction: 6gxbB27RCNTZpS1RHvL8FgwgwAt5bkgWgryih82NrB5s
- hit some type errors in the instructions I managed to solve by right clicking into the node_module pacakage and understanding the types, this was great at understanding what was required fast and why
- the Idempotent instruction also needed await, I ran into errors before I debugged and figured this out.

## Task 2 — Mint an NFT with MPL Core

### Before
- We worked on this in class together, following along I was able to build out the nft mint logic
- metaplex core was essential using the json scheme provided in the docs was essential to do this fast
- trading and collecting nfts on solana helped me understand why this was setup, I've seen the frontend version of this on many marketplaces
- I chose the name "Orichalcum" a mythic metal from Atlantic (I like mythology).


### After


## Task 3 — Update the NFT's name and metadata as update authority

### Before

- Update checks whether the signing pubket matches the asset's stored update authority. When you mint in nft_mint.ts, your wallet becoems the owner and update authiruty.
- An update changes metadata field, and optionally updateAuthroity if you pass those args in. It does not change the asset address, owner, or the updateAuthority itself (unless explicitly stated.)
- update will need the asset object, not just the address, because plugins on the asset can require extra accounts in the instrution, and the plugin list must be read by the helper from the fetched object.

### After
- had some slight issues with type errors in the async call. SOme exploration and awaiting both calls helped fix things.
- minor trailing spaces in the uri had to fix as well. 
- reanmed to Orichalcum Reforged, and added some new attributes.

## Task 4 (ext) — Mint a second NFT

### Before

-

### After


## Task 5 (ext) — Transfer the NFT to another wallet

### Before

 The transfer is signed by the owner, and the program compares the owner to the signer field.
- The recipient needs no SOL, signature, or account to receive an NFT.
- Second run fails — the first transfer rewrote owner to wallet 2, and the script still signs as wallet 1, so the owner check rejects it. Transfer isn't idempotent because it changes the field it authorizes against.

### After


## Task 6 (ext) — Burn the NFT and reclaim rent

### Before

### After
