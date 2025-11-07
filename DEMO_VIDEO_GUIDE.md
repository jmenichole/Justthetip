# Demo Video Guide

## Overview
A 3-minute demo video is **REQUIRED** for the Solana x402 Hackathon submission.

## Video Requirements

### Duration
- **Maximum**: 3 minutes
- **Recommended**: 2:30-2:45 (leave buffer for timing)

### Content Requirements
- ✅ Project overview and value proposition
- ✅ x402 payment protocol demonstration
- ✅ Technical implementation highlights
- ✅ Live functionality demo
- ✅ Why it matters

## Suggested Script & Structure

### Opening (0:00-0:30) - 30 seconds
**What to show**: Landing page at https://jmenichole.github.io/Justthetip/landing.html

**What to say**:
> "Hi! I'm presenting JustTheTip, a non-custodial Discord tipping bot that integrates the x402 payment protocol on Solana. Unlike traditional bots where you must trust the bot operator with your funds, JustTheTip users maintain complete control of their wallets while enabling instant USDC micropayments for premium API features."

### Problem & Solution (0:30-1:00) - 30 seconds
**What to show**: Switch between HACKATHON.md problem statement and architecture diagram

**What to say**:
> "Traditional Discord bots face critical security issues - they're custodial, meaning users must hand over their private keys. We solve this with Solana smart contracts and x402 payments. Every transaction happens on-chain with full transparency, and our x402 integration enables pay-per-use API access without subscriptions or account setup."

### x402 Integration Demo (1:00-2:00) - 60 seconds
**What to show**: Terminal or Postman demonstrating x402 flow

**Script**:
1. **Initial Request** (15 sec):
   ```bash
   curl https://api.justthetip.io/api/x402/premium/analytics
   ```
   > "When I request a premium endpoint without payment, I receive HTTP 402 with payment details - the amount in USDC, the treasury address, and instructions."

2. **Payment Details** (15 sec):
   Show the 402 JSON response
   > "The response includes everything needed: send 1 USDC to this Solana address. The protocol is chain-agnostic but we chose Solana for sub-second finality and near-zero fees."

3. **Payment Execution** (15 sec):
   Show Phantom wallet or CLI sending USDC
   > "I send the USDC payment on Solana. This takes under a second to confirm. I copy the transaction signature."

4. **Access Granted** (15 sec):
   ```bash
   curl https://api.justthetip.io/api/x402/premium/analytics \
     -H "X-Payment: <signature>"
   ```
   > "Retrying the request with the signature in the X-Payment header, the server verifies the payment on-chain and grants access to the premium analytics."

### Smart Contracts & Discord Bot (2:00-2:30) - 30 seconds
**What to show**: Discord bot commands and Solscan

**What to say**:
> "Beyond x402, our Anchor smart contracts power the tipping functionality. Users can register wallets, send tips, create airdrops - all non-custodially. Here's the bot in Discord executing the slash command /sc-tip. The transaction appears instantly on-chain. Our program ID is deployed to devnet and fully tested."

**Show**: 
- `/register-wallet` command
- `/sc-tip` sending SOL
- Solscan showing the transaction
- Program ID: Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS

### Impact & Closing (2:30-3:00) - 30 seconds
**What to show**: GitHub repo, documentation, and code

**What to say**:
> "This is production-ready with comprehensive documentation, deployment guides, and 85 passing tests. We've created the first non-custodial Discord tipping bot on Solana with x402 payments. Other developers can build on this foundation. The entire project is open source at github.com/jmenichole/Justthetip. Thank you!"

## Recording Tips

### Tools to Use
- **Screen Recording**: 
  - Mac: QuickTime Player or ScreenFlow
  - Windows: OBS Studio or Camtasia
  - Linux: OBS Studio or SimpleScreenRecorder
  - Online: Loom (loom.com)

- **Video Editing** (optional):
  - Mac: iMovie or Final Cut Pro
  - Windows: DaVinci Resolve (free)
  - All: OpenShot (free, open source)

### Best Practices
1. **Audio Quality**:
   - Use a good microphone or headset
   - Record in a quiet room
   - Speak clearly and at moderate pace
   - Do a test recording first

2. **Video Quality**:
   - Record at 1080p minimum (1920x1080)
   - Use high contrast text/terminal
   - Increase terminal font size (14-16pt)
   - Close unnecessary windows/apps

3. **Presentation**:
   - Practice the script 2-3 times
   - Keep energy up throughout
   - Point with cursor when showing code
   - Use smooth transitions

4. **Content**:
   - Show, don't just tell
   - Focus on x402 (it's the hackathon theme!)
   - Keep technical details concise
   - Highlight the innovation

### Pre-Recording Checklist
- [ ] Test all demo URLs work
- [ ] Have devnet USDC in wallet
- [ ] Discord bot is online
- [ ] Terminal commands ready to copy/paste
- [ ] Browser tabs organized
- [ ] Screen resolution set appropriately
- [ ] Notifications disabled
- [ ] Script printed or on second monitor
- [ ] Test recording equipment

### What to Prepare

#### Terminal Commands (ready to paste)
```bash
# 1. Get x402 info
curl https://api.justthetip.io/api/x402/info

# 2. Request premium resource
curl https://api.justthetip.io/api/x402/premium/analytics

# 3. Check payment status (after payment)
curl https://api.justthetip.io/api/x402/payment/YOUR_TX_SIG

# 4. Access with payment
curl https://api.justthetip.io/api/x402/premium/analytics \
  -H "X-Payment: YOUR_TX_SIG"
```

#### Browser Tabs (in order)
1. Landing page: https://jmenichole.github.io/Justthetip/landing.html
2. GitHub repo: https://github.com/jmenichole/Justthetip
3. HACKATHON.md: https://github.com/jmenichole/Justthetip/blob/main/HACKATHON.md
4. Solscan (devnet): https://solscan.io/account/Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS?cluster=devnet
5. Discord (with bot added)
6. Phantom wallet (or Solflare)

#### Code Files to Show
1. `src/utils/x402PaymentHandler.js` - Main implementation
2. `api/server.js` - x402 routes (lines 1220-1380)
3. `docs/X402_INTEGRATION.md` - Documentation

## Alternative: Slide Deck + Voiceover

If live demo is risky, consider:
1. Create slides with screenshots
2. Record voiceover explaining each slide
3. Include screen recording clips of key moments
4. Edit together into 3-minute video

## Upload Locations

### Recommended Platforms
- **YouTube**: Unlisted or public video
- **Vimeo**: Good for professional submissions
- **Loom**: Quick and easy, built for demos
- **Google Drive**: Ensure link is publicly accessible

### Video Settings
- **Title**: "JustTheTip - Solana x402 Hackathon Submission"
- **Description**: Include GitHub link and summary
- **Privacy**: Public or unlisted (must be accessible to judges)
- **Format**: MP4 (H.264 codec recommended)
- **Resolution**: 1080p (1920x1080)
- **Frame Rate**: 30 FPS minimum

## After Recording

### Checklist
- [ ] Video is under 3 minutes
- [ ] Audio is clear throughout
- [ ] All demos worked correctly
- [ ] x402 payment flow shown completely
- [ ] GitHub link mentioned
- [ ] Video uploaded and publicly accessible
- [ ] Link added to HACKATHON.md
- [ ] Link added to SUBMISSION_CHECKLIST.md
- [ ] Link tested in incognito/private browser

### Where to Add Video Link

1. **HACKATHON.md** (line ~170):
   ```markdown
   ## Video Demo
   
   **Watch the 3-minute demo**: [YouTube Link Here]
   
   The video demonstrates:
   - x402 payment protocol flow
   - HTTP 402 challenge/response
   - USDC payment on Solana
   - On-chain verification
   - Discord bot functionality
   - Smart contract interactions
   ```

2. **README.md** (add near top):
   ```markdown
   ## 🎬 Demo Video
   
   Watch our [3-minute hackathon demo](YOUTUBE_LINK) showing the x402 payment protocol in action!
   ```

3. **SUBMISSION_CHECKLIST.md** (Video Demo section):
   ```markdown
   - [x] Record 3-minute demo video
   - [x] Upload to YouTube: [LINK]
   - [x] Add to HACKATHON.md
   - [x] Verify public accessibility
   ```

## Example Video Outline (Visual Storyboard)

```
[0:00] Title Card: "JustTheTip - x402 on Solana"
[0:05] Landing page fade-in
[0:10] Zoom to key features section
[0:15] Quick architecture diagram
[0:20] Terminal: curl command
[0:25] Show 402 JSON response
[0:30] Phantom wallet - send USDC
[0:35] Transaction confirming (1 second)
[0:40] Copy transaction signature
[0:45] Terminal: retry with X-Payment header
[0:50] Show successful 200 response with data
[0:55] Discord bot - /register-wallet
[1:05] Discord bot - /sc-tip
[1:15] Solscan - show transaction on-chain
[1:25] VS Code - show x402PaymentHandler.js
[1:40] VS Code - show API route with requirePayment
[1:55] GitHub repo - show test results
[2:10] GitHub - show documentation
[2:25] Quick recap: non-custodial + x402 + production-ready
[2:45] GitHub URL + "Thank you"
[2:55] Fade to black
```

## Need Help?

If you need assistance with the video:
1. Check YouTube tutorials on screen recording
2. Use Loom (simplest option): https://www.loom.com/
3. Keep it simple - clarity > production value
4. Focus on showing x402 working

## Final Tips

✅ **Do**:
- Show x402 payment flow completely
- Highlight Solana benefits (speed, fees)
- Be enthusiastic!
- Show actual working code/commands
- Mention it's production-ready

❌ **Don't**:
- Spend too long on any one thing
- Get bogged down in technical details
- Forget to show x402 (it's the theme!)
- Use copyrighted music
- Make it longer than 3 minutes

---

**Remember**: The video should answer these questions:
1. What is it? (Non-custodial Discord bot with x402 payments)
2. Why does it matter? (Solves custodial risk + API monetization)
3. How does x402 work? (Show the flow)
4. Is it real? (Show it working)
5. Can others use it? (Yes, open source, documented)

Good luck with your recording! 🎬
