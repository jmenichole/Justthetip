# JustTheTip GitHub Pages Documentation

This directory contains the GitHub Pages site for JustTheTip, deployed at https://jmenichole.github.io/Justthetip/

## 📄 Site Structure

### Main Pages
- **index.html** - GitHub Pages root using the modern landing experience
  - Mirrors docs/landing.html so public traffic sees the updated hero, onboarding modals, and CTA copy
  - Uses shared landing-styles.css and landing-app.js assets
- **landing.html** - Canonical marketing and verification landing page checked into the repo
  - Highlights non-custodial tipping, NFT verification, and Coinbase flows
  - Includes "Add to Discord" entry points and quick-start walkthrough
  - Serves as the single source of truth for future updates

- **support.html** - Support ticket submission page
  - Discord OAuth2 login integration
  - Ticket creation form
  - Categories: Bug Reports, Feature Requests, Payment Issues

- **investor.html** - Investor information and pitch deck
  - Business model
  - Market opportunity
  - Technical architecture
  - Growth metrics

- **terms.html** - Terms of Service
  - User agreements
  - Legal disclaimers
  - Usage terms

- **privacy.html** - Privacy Policy
  - Data collection practices
  - User privacy information
  - Data handling policies

### Alternative Landing Pages
- **landing.html** - Primary onboarding page with consolidated modals (same markup as index.html)
  - Guided onboarding flow
  - Direct call-to-action buttons
- **landing_NEW.html** - Legacy redirect to landing.html
  - Preserved for compatibility with older docs/tests
  - Instantly forwards visitors to the main page

### Assets
- **logo.png** - JustTheTip logo (947KB)
- **landing-styles.css** - Stylesheet for landing.html (15KB)
- **landing-app.js** - JavaScript for landing page interactions (24KB)

## 🔗 Navigation Structure

All pages properly link to:
- Home (index.html)
- Support (support.html)
- Terms of Service (terms.html)
- Privacy Policy (privacy.html)
- Investor Information (investor.html)
- GitHub Repository

## 🚀 Discord Bot Integration

Discord Bot OAuth2 URL used throughout:
```
https://discord.com/api/oauth2/authorize?client_id=1419742988128616479&permissions=2147534848&scope=bot%20applications.commands
```

Permissions included:
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands
- Manage Messages
- Add Reactions

## 📝 Recent Updates

**Latest Changes:**
- Fixed support.html to use index.html instead of landing.html for navigation
- Added Support link to main navigation on index.html
- Updated all Discord invite placeholder links to proper OAuth2 URLs
- Fixed README.md documentation links (TERMS.md → terms.md, etc.)
- Added SDK documentation reference in footer
- Ensured all pages have consistent navigation structure

## 🔄 Deployment

GitHub Pages automatically deploys from this directory when changes are pushed to the main branch.

Workflow: `.github/workflows/pages.yml`
- Triggered on push to main/master
- Deploys all files in ./docs directory
- Site URL: https://jmenichole.github.io/Justthetip/

## 🛠️ Development

To test locally:
1. Open index.html in a browser
2. Check all navigation links work
3. Verify Discord OAuth2 links are functional
4. Test responsive design on mobile

## 📚 Related Documentation

- [Main README](../README.md) - Project overview
- [Smart Contract SDK](../contracts/README.md) - SDK documentation
- [Deployment Guides](../DEPLOYMENT_SUMMARY.md) - Backend deployment
- [Documentation Index](../DOCUMENTATION_INDEX.md) - All project documentation
