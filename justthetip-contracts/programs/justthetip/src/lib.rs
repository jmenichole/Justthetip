use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub mod trust_badge;

// IMPORTANT: Update this program ID after deployment
// This is a placeholder - run `anchor keys list` after building to get your actual program ID
// For production, use different program IDs for devnet and mainnet
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod justthetip {
    use super::*;

    /// Initialize a user's tip account (PDA)
    pub fn initialize_user(ctx: Context<InitializeUser>, discord_id: String) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.authority = ctx.accounts.authority.key();
        user_account.discord_id = discord_id;
        user_account.total_sent = 0;
        user_account.total_received = 0;
        user_account.tip_count = 0;
        user_account.bump = ctx.bumps.user_account;
        
        msg!("User account initialized for {}", user_account.discord_id);
        Ok(())
    }

    /// Send a SOL tip from one user to another
    pub fn tip_sol(ctx: Context<TipSol>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        // Transfer SOL
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.sender.to_account_info(),
                to: ctx.accounts.recipient.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;
        
        // Update sender stats
        let sender_account = &mut ctx.accounts.sender_account;
        sender_account.total_sent = sender_account.total_sent
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        sender_account.tip_count = sender_account.tip_count
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        // Update recipient stats
        let recipient_account = &mut ctx.accounts.recipient_account;
        recipient_account.total_received = recipient_account.total_received
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        emit!(TipEvent {
            sender: ctx.accounts.sender.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
            token_type: TokenType::Sol,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Tip sent: {} lamports from {} to {}", 
            amount, 
            ctx.accounts.sender.key(), 
            ctx.accounts.recipient.key()
        );
        
        Ok(())
    }

    /// Send an SPL token tip from one user to another
    pub fn tip_spl_token(ctx: Context<TipSplToken>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        // Transfer SPL tokens
        let cpi_accounts = Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        
        // Update sender stats (in token units)
        let sender_account = &mut ctx.accounts.sender_account;
        sender_account.total_sent = sender_account.total_sent
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        sender_account.tip_count = sender_account.tip_count
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        // Update recipient stats
        let recipient_account = &mut ctx.accounts.recipient_account;
        recipient_account.total_received = recipient_account.total_received
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        emit!(TipEvent {
            sender: ctx.accounts.sender.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
            token_type: TokenType::SplToken,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("SPL token tip sent: {} tokens from {} to {}", 
            amount, 
            ctx.accounts.sender.key(), 
            ctx.accounts.recipient.key()
        );
        
        Ok(())
    }

    /// Create a multi-recipient airdrop
    pub fn create_airdrop(
        ctx: Context<CreateAirdrop>,
        total_amount: u64,
        recipients_count: u8,
    ) -> Result<()> {
        require!(total_amount > 0, ErrorCode::InvalidAmount);
        require!(recipients_count > 0 && recipients_count <= 50, ErrorCode::TooManyRecipients);
        
        let airdrop = &mut ctx.accounts.airdrop;
        airdrop.creator = ctx.accounts.creator.key();
        airdrop.total_amount = total_amount;
        airdrop.amount_per_recipient = total_amount / recipients_count as u64;
        airdrop.recipients_count = recipients_count;
        airdrop.claimed_count = 0;
        airdrop.is_active = true;
        airdrop.created_at = Clock::get()?.unix_timestamp;
        airdrop.bump = ctx.bumps.airdrop;
        
        msg!("Airdrop created: {} lamports for {} recipients", total_amount, recipients_count);
        
        Ok(())
    }

    /// Claim from an airdrop
    pub fn claim_airdrop(ctx: Context<ClaimAirdrop>) -> Result<()> {
        let airdrop = &mut ctx.accounts.airdrop;
        
        require!(airdrop.is_active, ErrorCode::AirdropInactive);
        require!(airdrop.claimed_count < airdrop.recipients_count, ErrorCode::AirdropFullyClaimed);
        
        let amount = airdrop.amount_per_recipient;
        
        // Transfer SOL from airdrop PDA to claimer
        let seeds = &[
            b"airdrop",
            airdrop.creator.as_ref(),
            &airdrop.created_at.to_le_bytes(),
            &[airdrop.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.airdrop.to_account_info(),
                to: ctx.accounts.claimer.to_account_info(),
            },
            signer,
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;
        
        airdrop.claimed_count = airdrop.claimed_count
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        // Deactivate if fully claimed
        if airdrop.claimed_count >= airdrop.recipients_count {
            airdrop.is_active = false;
        }
        
        emit!(AirdropClaimEvent {
            airdrop: ctx.accounts.airdrop.key(),
            claimer: ctx.accounts.claimer.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Airdrop claimed: {} lamports by {}", amount, ctx.accounts.claimer.key());
        
        Ok(())
    }

    /// Close an airdrop and return remaining funds
    pub fn close_airdrop(ctx: Context<CloseAirdrop>) -> Result<()> {
        let airdrop = &ctx.accounts.airdrop;
        
        require!(
            ctx.accounts.creator.key() == airdrop.creator,
            ErrorCode::Unauthorized
        );
        
        msg!("Airdrop closed by creator");
        
        Ok(())
    }
}

// Context Structs

#[derive(Accounts)]
#[instruction(discord_id: String)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user", discord_id.as_bytes()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TipSol<'info> {
    #[account(
        mut,
        seeds = [b"user", sender_account.discord_id.as_bytes()],
        bump = sender_account.bump,
    )]
    pub sender_account: Account<'info, UserAccount>,
    
    #[account(
        mut,
        seeds = [b"user", recipient_account.discord_id.as_bytes()],
        bump = recipient_account.bump,
    )]
    pub recipient_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    /// CHECK: This is safe because we're just transferring SOL
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TipSplToken<'info> {
    #[account(
        mut,
        seeds = [b"user", sender_account.discord_id.as_bytes()],
        bump = sender_account.bump,
    )]
    pub sender_account: Account<'info, UserAccount>,
    
    #[account(
        mut,
        seeds = [b"user", recipient_account.discord_id.as_bytes()],
        bump = recipient_account.bump,
    )]
    pub recipient_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreateAirdrop<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Airdrop::INIT_SPACE,
        seeds = [b"airdrop", creator.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub airdrop: Account<'info, Airdrop>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimAirdrop<'info> {
    #[account(
        mut,
        seeds = [b"airdrop", airdrop.creator.as_ref(), &airdrop.created_at.to_le_bytes()],
        bump = airdrop.bump,
    )]
    pub airdrop: Account<'info, Airdrop>,
    
    /// CHECK: This is safe because we're just transferring SOL
    #[account(mut)]
    pub claimer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseAirdrop<'info> {
    #[account(
        mut,
        close = creator,
        seeds = [b"airdrop", airdrop.creator.as_ref(), &airdrop.created_at.to_le_bytes()],
        bump = airdrop.bump,
    )]
    pub airdrop: Account<'info, Airdrop>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// Account Structs

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub authority: Pubkey,           // 32
    #[max_len(50)]
    pub discord_id: String,           // 4 + 50
    pub total_sent: u64,              // 8
    pub total_received: u64,          // 8
    pub tip_count: u64,               // 8
    pub bump: u8,                     // 1
}

#[account]
#[derive(InitSpace)]
pub struct Airdrop {
    pub creator: Pubkey,              // 32
    pub total_amount: u64,            // 8
    pub amount_per_recipient: u64,    // 8
    pub recipients_count: u8,         // 1
    pub claimed_count: u8,            // 1
    pub is_active: bool,              // 1
    pub created_at: i64,              // 8
    pub bump: u8,                     // 1
}

// Events

#[event]
pub struct TipEvent {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub token_type: TokenType,
    pub timestamp: i64,
}

#[event]
pub struct AirdropClaimEvent {
    pub airdrop: Pubkey,
    pub claimer: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// Enums

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TokenType {
    Sol,
    SplToken,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount: must be greater than 0")]
    InvalidAmount,
    #[msg("Too many recipients: maximum is 50")]
    TooManyRecipients,
    #[msg("Airdrop is not active")]
    AirdropInactive,
    #[msg("Airdrop has been fully claimed")]
    AirdropFullyClaimed,
    #[msg("Unauthorized: only the creator can perform this action")]
    Unauthorized,
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
}
