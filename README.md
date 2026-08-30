# Turbin3 Q3 2026 — Week 1: SPL Token & MPL Core NFT

The full lifecycle of a fungible SPL token and an MPL Core NFT on Solana devnet: mint and
transfer a token, mint an NFT, update its metadata as the update authority, transfer it
between wallets, and burn it to reclaim the rent. Each step exists twice — as a standalone
script under `src/`, and as a test that performs the action and **asserts the resulting
chain state**.

```
npm test
```

![tests passing](docs/tests-passing.png)

## Assignment coverage

| # | Task | Script | Test — what is asserted |
|---|------|--------|--------------------------|
| 1 | Mint and transfer your own SPL token | `spl_init` · `spl_mint` · `spl_transfer` | `tests/spl.test.ts` — new mint is owned by the Token program with 6 decimals, my authority, supply 0; after minting 100, the ATA balance **and** `getTokenSupply` agree; after transferring 10 to a fresh recipient, balances are 90 / 10 and supply is unchanged (transfers must not create tokens) |
| 2 | Mint an NFT using MPL Core | `nft_image` · `nft_metadata` · `nft_mint` | `tests/nft.test.ts` — `name`, `uri`, `owner` and `updateAuthority` all verified on the fetched asset |
| 3 | Update the NFT's name and metadata as update authority | `nft_update` | `name` and `uri` change; `owner` and `updateAuthority` survive untouched |
| 4 | *(ext)* Recreate the steps for minting an NFT | `nft_mint` (again) | second asset exists, distinct address |
| 5 | *(ext)* Transfer the NFT between wallets | `nft_transfer` | `owner` becomes wallet 2, `updateAuthority` stays with the creator; **a second transfer by the original owner is rejected** (`NoApprovals` — authorization is checked against current chain state) |
| 6 | *(ext)* Permanently destroy the NFT and reclaim rent | `nft_burn` | wallet 2 (the owner) burns; `fetchAsset` now fails; the account is a 1-byte `Key::Uninitialized` tombstone |

The tests create everything fresh each run (new mint, new assets, new SPL recipient), so
they depend on no pre-existing devnet state. The NFT transfer/burn recipient is a second
local keypair, `wallet2.json`.

## Setup

1. **Wallets** — at the project root, both git-ignored:
   - `devnet-wallet.json` — a funded devnet keypair (`solana-keygen new -o devnet-wallet.json`,
     then `solana airdrop 2 -u devnet`). A full test run costs well under 0.01 SOL.
   - `wallet2.json` — a second keypair (`solana-keygen new -o wallet2.json`) with a little
     SOL (~0.05) to pay its own burn fee.
2. **Install** — `npm install`
3. **Test** — `npm test`. Optional: `SOLANA_RPC_URL=https://... npm test` for a private RPC.
4. **Scripts** — each step can also be run standalone via `npm run spl:init`, `spl:mint`,
   `spl:transfer`, `nft:image`, `nft:metadata`, `nft:mint`, `nft:update`, `nft:transfer`,
   `nft:burn`. Each logs the address/URI/signature to paste into the next.

## Layout

```
src/
  spl/   spl_init · spl_mint · spl_transfer         (@solana/kit + @solana-program/token)
         spl_metadata · spl_uri                      (extras: Token Metadata for the fungible)
  nft/   nft_image · nft_metadata · nft_mint         (umi + mpl-core, Irys uploads)
         nft_update · nft_transfer · nft_burn
         nft_royalty                                 (extra: Royalties plugin)
tests/
  helpers.ts     shared client setup + 429 backoff
  spl.test.ts    Task 1
  nft.test.ts    Tasks 2–6, sequential, sharing state
APPROACH.md      my reasoning log, per task: design before coding, corrections after
CLAUDE.md        the rules the AI assistant was held to
```

Two client stacks, matching the Turbin3 template: the SPL flow is built
instruction-by-instruction with **@solana/kit** (create account → initialize mint → create
ATA → mint-to → transfer-checked), and the NFT flow uses **umi + mpl-core**, where each
lifecycle step is a single instruction to a single program.

## Things worth knowing

**A Core asset is one account.** Owner, name and URI are fields on the asset itself — no
mint, no token account, no metadata PDA. The SPL half needs three programs and five
instructions to reach the same "someone owns a named thing" state.

**`symbol` is not on-chain for Core.** It lives only in the off-chain JSON, which is why
Solana Explorer shows "No symbol found" for every Core asset. Wallets read it from the JSON.

**Transfer ≠ control.** Transferring hands over `owner` only. `updateAuthority` stays with
the creator, so I can still update the metadata of an asset wallet 2 owns — and wallet 2,
as owner, is the only one who can burn it. The negative test proves the other direction:
once ownership moves, the original owner's transfer is rejected.

**Burn leaves a tombstone.** Core does not close the account. It shrinks it to 1 byte
(`Key::Uninitialized`) so the address can never be reused as an asset, and keeps the 1-byte
rent plus Metaplex's 0.0015 SOL protocol fee. On devnet that left 2,397,840 of the original
3,483,600 lamports in the tombstone; the remaining 1,085,760 came back to the payer.

**Royalties are a plugin.** `nft_royalty.ts` attaches one (500 bp, `ruleSet: None`) to an
existing asset. With `ProgramAllowList` / `ProgramDenyList` the same plugin becomes on-chain
royalty enforcement by gating which programs may transfer the asset.

**RPC reliability.** The public devnet endpoint rate-limits (HTTP 429) under a full suite
run. `tests/helpers.ts` retries throttled requests with exponential backoff on both client
stacks, and vitest retries a failed test once.

## Sample artifacts (devnet)

| | |
|---|---|
| SPL token (ORI) | [`3MadHmMPWUeCX6LCf8LKTY8f2vSrbp21YCnnhEeyrENT`](https://explorer.solana.com/address/3MadHmMPWUeCX6LCf8LKTY8f2vSrbp21YCnnhEeyrENT?cluster=devnet) — 100 minted, 10 transferred |
| NFT, updated as authority | [`8HAbQYnRmYXpRBfzSZF9nDvaEPieJ5Q5FnU8njrihQbY`](https://core.metaplex.com/explorer/8HAbQYnRmYXpRBfzSZF9nDvaEPieJ5Q5FnU8njrihQbY?env=devnet) — "Orichalcum Reforged", 5 % royalty plugin |
| NFT, transferred then burned | [`9u6t3aPYjEfw6a4U1TB4gka9WfniaoxuzKvMFtRjVFMH`](https://explorer.solana.com/address/9u6t3aPYjEfw6a4U1TB4gka9WfniaoxuzKvMFtRjVFMH?cluster=devnet) — 1-byte tombstone |
| Burn tx | [`2p5RsyYn…GdVoW`](https://explorer.solana.com/tx/2p5RsyYnWpEYdubLb5evA5pccioBVWELo37DCJZ6PHU9249VXM2twpy81y8MB8bgUCyp2v4znjDVFht7RodGdVoW?cluster=devnet) |

The tests mint fresh accounts every run, so test-run addresses will differ. One note for
readers of `spl_transfer.ts`: its recipient is the wallet behind the class template's
address — the template listed a token account where a wallet belongs, fixed during the
exercise.

## How AI was used

AI (Claude Code) was used as a reviewer and Socratic guide per the program's guidelines —
see `CLAUDE.md` for the rules it was held to. `APPROACH.md` is my reasoning log for each
task, written before coding and corrected after.
