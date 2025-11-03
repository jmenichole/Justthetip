import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Justthetip } from "../target/types/justthetip";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("justthetip", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Justthetip as Program<Justthetip>;
  
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const discordId1 = "discord_user_123";
  const discordId2 = "discord_user_456";

  // PDAs
  let user1AccountPda: PublicKey;
  let user2AccountPda: PublicKey;
  let user1Bump: number;
  let user2Bump: number;

  before(async () => {
    // Airdrop SOL to test users
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user1.publicKey, 2 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user2.publicKey, 2 * LAMPORTS_PER_SOL)
    );

    // Derive PDAs
    [user1AccountPda, user1Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), Buffer.from(discordId1)],
      program.programId
    );

    [user2AccountPda, user2Bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), Buffer.from(discordId2)],
      program.programId
    );
  });

  it("Initializes user accounts", async () => {
    // Initialize user 1
    await program.methods
      .initializeUser(discordId1)
      .accounts({
        userAccount: user1AccountPda,
        authority: user1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Initialize user 2
    await program.methods
      .initializeUser(discordId2)
      .accounts({
        userAccount: user2AccountPda,
        authority: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // Verify user 1 account
    const user1Account = await program.account.userAccount.fetch(user1AccountPda);
    assert.ok(user1Account.authority.equals(user1.publicKey));
    assert.equal(user1Account.discordId, discordId1);
    assert.equal(user1Account.totalSent.toNumber(), 0);
    assert.equal(user1Account.totalReceived.toNumber(), 0);
    assert.equal(user1Account.tipCount.toNumber(), 0);

    // Verify user 2 account
    const user2Account = await program.account.userAccount.fetch(user2AccountPda);
    assert.ok(user2Account.authority.equals(user2.publicKey));
    assert.equal(user2Account.discordId, discordId2);
  });

  it("Sends a SOL tip from user1 to user2", async () => {
    const tipAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

    await program.methods
      .tipSol(tipAmount)
      .accounts({
        senderAccount: user1AccountPda,
        recipientAccount: user2AccountPda,
        sender: user1.publicKey,
        recipient: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Verify sender stats updated
    const senderAccount = await program.account.userAccount.fetch(user1AccountPda);
    assert.equal(senderAccount.totalSent.toNumber(), tipAmount.toNumber());
    assert.equal(senderAccount.tipCount.toNumber(), 1);

    // Verify recipient stats updated
    const recipientAccount = await program.account.userAccount.fetch(user2AccountPda);
    assert.equal(recipientAccount.totalReceived.toNumber(), tipAmount.toNumber());
  });

  it("Creates an airdrop", async () => {
    const creator = user1;
    const totalAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
    const recipientsCount = 10;

    const timestamp = Math.floor(Date.now() / 1000);
    const [airdropPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("airdrop"),
        creator.publicKey.toBuffer(),
        new anchor.BN(timestamp).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .createAirdrop(totalAmount, recipientsCount)
      .accounts({
        airdrop: airdropPda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // Verify airdrop account
    const airdrop = await program.account.airdrop.fetch(airdropPda);
    assert.ok(airdrop.creator.equals(creator.publicKey));
    assert.equal(airdrop.totalAmount.toNumber(), totalAmount.toNumber());
    assert.equal(airdrop.recipientsCount, recipientsCount);
    assert.equal(airdrop.claimedCount, 0);
    assert.equal(airdrop.isActive, true);
  });

  it("Multiple users can send tips", async () => {
    const tipAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);

    // User2 tips User1
    await program.methods
      .tipSol(tipAmount)
      .accounts({
        senderAccount: user2AccountPda,
        recipientAccount: user1AccountPda,
        sender: user2.publicKey,
        recipient: user1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // Verify stats
    const sender = await program.account.userAccount.fetch(user2AccountPda);
    assert.equal(sender.totalSent.toNumber(), tipAmount.toNumber());
    assert.equal(sender.tipCount.toNumber(), 1);

    const recipient = await program.account.userAccount.fetch(user1AccountPda);
    assert.ok(recipient.totalReceived.toNumber() > 0);
  });
});
