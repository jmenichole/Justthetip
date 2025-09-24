use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};

use borsh::{BorshDeserialize, BorshSerialize};

// Program ID - This will be set when the program is deployed
solana_program::declare_id!("11111111111111111111111111111112"); // Placeholder - will be replaced on deployment

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct TipData {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct AirdropRecipient {
    pub recipient: Pubkey,
    pub amount: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum JustTheTipInstruction {
    /// Initialize a user's tip account PDA
    InitializeUserAccount {
        user_id: String,
    },

    /// Create a tip transaction
    CreateTip {
        amount: u64,
        recipient: Pubkey,
    },

    /// Execute a tip (transfer SOL)
    ExecuteTip {
        tip_id: [u8; 32],
    },

    /// Cancel a pending tip
    CancelTip {
        tip_id: [u8; 32],
    },

    /// Collect funds into escrow for airdrop
    CollectFunds {
        total_amount: u64,
        airdrop_id: [u8; 32],
    },

    /// Distribute airdrop from escrow to multiple recipients
    DistributeAirdrop {
        airdrop_id: [u8; 32],
        recipients: Vec<AirdropRecipient>,
        fee_wallet: Pubkey,
        fee_percentage: u8, // Fee as percentage (0-100)
    },

    /// Refund escrow funds back to sender
    RefundEscrow {
        airdrop_id: [u8; 32],
    },

    /// Claim individual airdrop amount from escrow
    ClaimAirdrop {
        airdrop_id: [u8; 32],
        recipient: Pubkey,
        amount: u64,
    },
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = JustTheTipInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        JustTheTipInstruction::InitializeUserAccount { user_id } => {
            process_initialize_user_account(program_id, accounts, user_id)
        }
        JustTheTipInstruction::CreateTip { amount, recipient } => {
            process_create_tip(program_id, accounts, amount, recipient)
        }
        JustTheTipInstruction::ExecuteTip { tip_id } => {
            process_execute_tip(program_id, accounts, tip_id)
        }
        JustTheTipInstruction::CancelTip { tip_id } => {
            process_cancel_tip(program_id, accounts, tip_id)
        }
        JustTheTipInstruction::CollectFunds { total_amount, airdrop_id } => {
            process_collect_funds(program_id, accounts, total_amount, airdrop_id)
        }
        JustTheTipInstruction::DistributeAirdrop { airdrop_id, recipients, fee_wallet, fee_percentage } => {
            process_distribute_airdrop(program_id, accounts, airdrop_id, recipients, fee_wallet, fee_percentage)
        }
        JustTheTipInstruction::RefundEscrow { airdrop_id } => {
            process_refund_escrow(program_id, accounts, airdrop_id)
        }
        JustTheTipInstruction::ClaimAirdrop { airdrop_id, recipient, amount } => {
            process_claim_airdrop(program_id, accounts, airdrop_id, recipient, amount)
        }
    }
}

fn process_initialize_user_account(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    user_id: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let user_account = next_account_info(account_info_iter)?;
    let user_wallet = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Verify the user_account is the correct PDA
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[b"user", user_id.as_bytes()],
        program_id,
    );

    if *user_account.key != expected_pda {
        return Err(ProgramError::InvalidAccountData);
    }

    // Create the PDA account if it doesn't exist
    let account_len = 0; // We'll store tip data here
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(account_len);

    if user_account.lamports() == 0 {
        // Create account
        let create_account_ix = system_instruction::create_account(
            user_wallet.key,
            user_account.key,
            lamports,
            account_len as u64,
            program_id,
        );

        solana_program::program::invoke_signed(
            &create_account_ix,
            &[user_wallet.clone(), user_account.clone(), system_program.clone()],
            &[&[b"user", user_id.as_bytes(), &[_bump]]],
        )?;
    }

    msg!("User account initialized for: {}", user_id);
    Ok(())
}

fn process_create_tip(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
    recipient: Pubkey,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let tip_account = next_account_info(account_info_iter)?;
    let sender_wallet = next_account_info(account_info_iter)?;
    let user_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Verify sender is signer
    if !sender_wallet.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Create tip data
    let tip_data = TipData {
        sender: *sender_wallet.key,
        recipient,
        amount,
        timestamp: solana_program::clock::Clock::get()?.unix_timestamp,
    };

    // Store tip data in tip_account
    let tip_data_bytes = tip_data.try_to_vec()?;
    let account_len = tip_data_bytes.len();
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(account_len);

    if tip_account.lamports() == 0 {
        // Create tip account
        let create_account_ix = system_instruction::create_account(
            sender_wallet.key,
            tip_account.key,
            lamports,
            account_len as u64,
            program_id,
        );

        solana_program::program::invoke(
            &create_account_ix,
            &[sender_wallet.clone(), tip_account.clone(), system_program.clone()],
        )?;
    }

    // Store the tip data
    tip_account.data.borrow_mut().copy_from_slice(&tip_data_bytes);

    msg!("Tip created: {} SOL from {} to {}", amount, sender_wallet.key, recipient);
    Ok(())
}

fn process_execute_tip(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    tip_id: [u8; 32],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let tip_account = next_account_info(account_info_iter)?;
    let sender_wallet = next_account_info(account_info_iter)?;
    let recipient_wallet = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Verify sender is signer
    if !sender_wallet.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Load tip data
    let tip_data: TipData = TipData::try_from_slice(&tip_account.data.borrow())?;

    // Verify sender matches
    if tip_data.sender != *sender_wallet.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Transfer SOL
    let transfer_ix = system_instruction::transfer(
        sender_wallet.key,
        &tip_data.recipient,
        tip_data.amount,
    );

    solana_program::program::invoke(
        &transfer_ix,
        &[sender_wallet.clone(), recipient_wallet.clone(), system_program.clone()],
    )?;

    // Close tip account (refund rent)
    **sender_wallet.lamports.borrow_mut() += tip_account.lamports();
    **tip_account.lamports.borrow_mut() = 0;

    msg!("Tip executed: {} SOL transferred to {}", tip_data.amount, tip_data.recipient);
    Ok(())
}

fn process_cancel_tip(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    tip_id: [u8; 32],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let tip_account = next_account_info(account_info_iter)?;
    let sender_wallet = next_account_info(account_info_iter)?;

    // Verify sender is signer
    if !sender_wallet.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Load tip data
    let tip_data: TipData = TipData::try_from_slice(&tip_account.data.borrow())?;

    // Verify sender matches
    if tip_data.sender != *sender_wallet.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Close tip account (refund rent to sender)
    **sender_wallet.lamports.borrow_mut() += tip_account.lamports();
    **tip_account.lamports.borrow_mut() = 0;

    msg!("Tip cancelled: {} SOL returned to {}", tip_data.amount, sender_wallet.key);
    Ok(())
}

fn process_distribute_airdrop(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    airdrop_id: [u8; 32],
    recipients: Vec<AirdropRecipient>,
    fee_wallet: Pubkey,
    fee_percentage: u8,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let escrow_account = next_account_info(account_info_iter)?;
    let sender_wallet = next_account_info(account_info_iter)?;
    let fee_wallet_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Verify sender is signer
    if !sender_wallet.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify fee wallet matches provided address
    if *fee_wallet_account.key != fee_wallet {
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify escrow account
    let (expected_escrow, _bump) = Pubkey::find_program_address(
        &[b"escrow", &airdrop_id],
        program_id,
    );

    if *escrow_account.key != expected_escrow {
        return Err(ProgramError::InvalidAccountData);
    }

    // Load total amount from escrow
    let mut total_amount_bytes = [0u8; 8];
    total_amount_bytes.copy_from_slice(&escrow_account.data.borrow()[..8]);
    let total_amount = u64::from_le_bytes(total_amount_bytes);

    // Calculate fee amount
    let fee_amount = if fee_percentage > 0 && fee_percentage <= 100 {
        (total_amount * fee_percentage as u64) / 100
    } else {
        0
    };

    // Calculate distribution amount (total - fee)
    let distribution_total = total_amount - fee_amount;

    // Verify we have enough for distribution
    let required_total: u64 = recipients.iter().map(|r| r.amount).sum();
    if required_total > distribution_total {
        return Err(ProgramError::InsufficientFunds);
    }

    // Send fee to fee wallet if fee > 0
    if fee_amount > 0 {
        let fee_ix = system_instruction::transfer(
            escrow_account.key,
            &fee_wallet,
            fee_amount,
        );

        solana_program::program::invoke_signed(
            &fee_ix,
            &[escrow_account.clone(), fee_wallet_account.clone(), system_program.clone()],
            &[&[b"escrow", &airdrop_id, &[_bump]]],
        )?;

        msg!("Platform fee collected: {} lamports to {}", fee_amount, fee_wallet);
    }

    // Distribute to each recipient
    for recipient in recipients {
        let transfer_ix = system_instruction::transfer(
            escrow_account.key,
            &recipient.recipient,
            recipient.amount,
        );

        solana_program::program::invoke_signed(
            &transfer_ix,
            &[escrow_account.clone(), system_program.clone()],
            &[&[b"escrow", &airdrop_id, &[_bump]]],
        )?;

        msg!("Airdrop distributed: {} lamports to {}", recipient.amount, recipient.recipient);
    }

    // Refund remaining funds to sender
    let remaining = distribution_total - required_total;
    if remaining > 0 {
        let refund_ix = system_instruction::transfer(
            escrow_account.key,
            sender_wallet.key,
            remaining,
        );

        solana_program::program::invoke_signed(
            &refund_ix,
            &[escrow_account.clone(), sender_wallet.clone(), system_program.clone()],
            &[&[b"escrow", &airdrop_id, &[_bump]]],
        )?;

        msg!("Remaining funds refunded: {} lamports to {}", remaining, sender_wallet.key);
    }

    // Close escrow account
    **sender_wallet.lamports.borrow_mut() += escrow_account.lamports();
    **escrow_account.lamports.borrow_mut() = 0;

    msg!("Airdrop completed for {} with {}% fee", hex::encode(airdrop_id), fee_percentage);
    Ok(())
}

fn process_collect_funds(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    total_amount: u64,
    airdrop_id: [u8; 32],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let escrow_account = next_account_info(account_info_iter)?;
    let sender_wallet = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Verify sender is signer
    if !sender_wallet.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify escrow account is the correct PDA
    let (expected_escrow, _bump) = Pubkey::find_program_address(
        &[b"escrow", &airdrop_id],
        program_id,
    );

    if *escrow_account.key != expected_escrow {
        return Err(ProgramError::InvalidAccountData);
    }

    // Create escrow account if it doesn't exist
    if escrow_account.lamports() == 0 {
        let account_len = 8; // Store total amount (u64)
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(account_len);

        let create_account_ix = system_instruction::create_account(
            sender_wallet.key,
            escrow_account.key,
            lamports,
            account_len as u64,
            program_id,
        );

        solana_program::program::invoke_signed(
            &create_account_ix,
            &[sender_wallet.clone(), escrow_account.clone(), system_program.clone()],
            &[&[b"escrow", &airdrop_id, &[_bump]]],
        )?;
    }

    // Transfer funds to escrow
    let transfer_ix = system_instruction::transfer(
        sender_wallet.key,
        escrow_account.key,
        total_amount,
    );

    solana_program::program::invoke(
        &transfer_ix,
        &[sender_wallet.clone(), escrow_account.clone(), system_program.clone()],
    )?;

    // Store total amount in escrow account
    escrow_account.data.borrow_mut()[..8].copy_from_slice(&total_amount.to_le_bytes());

    msg!("Funds collected to escrow: {} SOL for airdrop {}", total_amount, hex::encode(airdrop_id));
    Ok(())
}


fn process_refund_escrow(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    airdrop_id: [u8; 32],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let escrow_account = next_account_info(account_info_iter)?;
    let sender_wallet = next_account_info(account_info_iter)?;

    // Verify sender is signer
    if !sender_wallet.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify escrow account
    let (expected_escrow, _bump) = Pubkey::find_program_address(
        &[b"escrow", &airdrop_id],
        program_id,
    );

    if *escrow_account.key != expected_escrow {
        return Err(ProgramError::InvalidAccountData);
    }

    // Load total amount from escrow
    let mut total_amount_bytes = [0u8; 8];
    total_amount_bytes.copy_from_slice(&escrow_account.data.borrow()[..8]);
    let total_amount = u64::from_le_bytes(total_amount_bytes);

    // Refund all funds to sender
    let refund_ix = system_instruction::transfer(
        escrow_account.key,
        sender_wallet.key,
        total_amount,
    );

    solana_program::program::invoke_signed(
        &refund_ix,
        &[escrow_account.clone(), sender_wallet.clone()],
        &[&[b"escrow", &airdrop_id, &[_bump]]],
    )?;

    // Close escrow account
    **sender_wallet.lamports.borrow_mut() += escrow_account.lamports();
    **escrow_account.lamports.borrow_mut() = 0;

    msg!("Escrow refunded: {} SOL returned to {}", total_amount, sender_wallet.key);
    Ok(())
}

fn process_claim_airdrop(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    airdrop_id: [u8; 32],
    recipient: Pubkey,
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let escrow_account = next_account_info(account_info_iter)?;
    let recipient_wallet = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Verify recipient is signer
    if !recipient_wallet.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify recipient wallet matches provided recipient
    if *recipient_wallet.key != recipient {
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify escrow account
    let (expected_escrow, _bump) = Pubkey::find_program_address(
        &[b"escrow", &airdrop_id],
        program_id,
    );

    if *escrow_account.key != expected_escrow {
        return Err(ProgramError::InvalidAccountData);
    }

    // Load total amount from escrow
    let mut total_amount_bytes = [0u8; 8];
    total_amount_bytes.copy_from_slice(&escrow_account.data.borrow()[..8]);
    let total_amount = u64::from_le_bytes(total_amount_bytes);

    // Verify escrow has enough funds
    if total_amount < amount {
        return Err(ProgramError::InsufficientFunds);
    }

    // Transfer claimed amount to recipient
    let transfer_ix = system_instruction::transfer(
        escrow_account.key,
        recipient_wallet.key,
        amount,
    );

    solana_program::program::invoke_signed(
        &transfer_ix,
        &[escrow_account.clone(), recipient_wallet.clone(), system_program.clone()],
        &[&[b"escrow", &airdrop_id, &[_bump]]],
    )?;

    // Update escrow balance (subtract claimed amount)
    let new_total = total_amount - amount;
    escrow_account.data.borrow_mut()[..8].copy_from_slice(&new_total.to_le_bytes());

    msg!("Airdrop claimed: {} lamports claimed by {}", amount, recipient);
    Ok(())
}