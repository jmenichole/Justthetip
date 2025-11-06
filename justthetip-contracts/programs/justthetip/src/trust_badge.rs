use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

#[program]
pub mod trust_badge {
    use super::*;

    pub fn mint_badge(ctx: Context<MintBadge>, initial_score: u64) -> Result<()> {
        require!(initial_score <= 10_000, TrustBadgeError::ScoreOutOfRange);

        let badge = &mut ctx.accounts.badge;
        badge.owner = ctx.accounts.recipient.key();
        badge.mint = ctx.accounts.badge_mint.key();
        badge.reputation_score = initial_score;
        badge.bump = *ctx.bumps.get("badge").ok_or(TrustBadgeError::MissingBump)?;
        badge.authority = ctx.accounts.authority.key();

        let cpi_accounts = MintTo {
            mint: ctx.accounts.badge_mint.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, 1)?;

        emit!(BadgeMinted {
            owner: badge.owner,
            mint: badge.mint,
            reputation_score: badge.reputation_score,
        });

        Ok(())
    }

    pub fn update_score(ctx: Context<UpdateScore>, delta: i64) -> Result<()> {
        let badge = &mut ctx.accounts.badge;
        require_keys_eq!(badge.authority, ctx.accounts.authority.key(), TrustBadgeError::Unauthorized);

        let updated_score = if delta.is_negative() {
            badge
                .reputation_score
                .checked_sub(delta.unsigned_abs())
                .ok_or(TrustBadgeError::ScoreOutOfRange)?
        } else {
            badge
                .reputation_score
                .checked_add(delta as u64)
                .ok_or(TrustBadgeError::ScoreOutOfRange)?
        };

        badge.reputation_score = updated_score;
        emit!(ScoreUpdated {
            owner: badge.owner,
            mint: badge.mint,
            reputation_score: badge.reputation_score,
        });
        Ok(())
    }

    pub fn get_score(ctx: Context<GetScore>) -> Result<()> {
        emit!(ScoreQueried {
            owner: ctx.accounts.badge.owner,
            mint: ctx.accounts.badge.mint,
            reputation_score: ctx.accounts.badge.reputation_score,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintBadge<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mint_authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = TrustBadge::LEN,
        seeds = [b"trust-badge", recipient.key().as_ref()],
        bump,
    )]
    pub badge: Account<'info, TrustBadge>;
    #[account(mut)]
    pub badge_mint: Account<'info, Mint>;
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = badge_mint,
        associated_token::authority = recipient,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>;
    pub recipient: SystemAccount<'info>;
    pub token_program: Program<'info, Token>;
    pub associated_token_program: Program<'info, AssociatedToken>;
    pub system_program: Program<'info, System>;
    pub rent: Sysvar<'info, Rent>;
}

#[derive(Accounts)]
pub struct UpdateScore<'info> {
    pub authority: Signer<'info>,
    #[account(mut, has_one = owner)]
    pub badge: Account<'info, TrustBadge>;
    /// Owner account used only for constraint verification
    #[account(address = badge.owner)]
    pub owner: SystemAccount<'info>;
}

#[derive(Accounts)]
pub struct GetScore<'info> {
    pub badge: Account<'info, TrustBadge>;
}

#[account]
pub struct TrustBadge {
    pub authority: Pubkey,
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub reputation_score: u64,
    pub bump: u8,
}

impl TrustBadge {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // owner
        32 + // mint
        8 +  // reputation_score
        1;   // bump
}

#[event]
pub struct BadgeMinted {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub reputation_score: u64,
}

#[event]
pub struct ScoreUpdated {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub reputation_score: u64,
}

#[event]
pub struct ScoreQueried {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub reputation_score: u64,
}

#[error_code]
pub enum TrustBadgeError {
    #[msg("Trust badge PDA missing bump seed")]
    MissingBump,
    #[msg("Caller is not authorized to update the reputation score")]
    Unauthorized,
    #[msg("Reputation score is out of range")]
    ScoreOutOfRange,
}
