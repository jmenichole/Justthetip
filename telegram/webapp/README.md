# JustTheTip Telegram Mini App

Web-based wallet interface for JustTheTip, running as a Telegram Mini App (Web App).

## Overview

This Mini App provides a rich, interactive UI for managing your JustTheTip wallet directly within Telegram. Built with React, Vite, and Tailwind CSS, it offers a seamless mobile-first experience.

## Features

### ✅ Implemented

- **Dashboard**
  - Portfolio overview with total value
  - Token breakdown with pie chart visualization
  - User statistics (tips sent/received, leaderboard rank)
  - Quick actions (Send, History, Refresh)

- **Transaction History**
  - Filterable transaction list (All, Sent, Received)
  - Transaction status badges
  - Direct links to Solscan
  - Relative timestamps

- **Send Tips**
  - Token selection (SOL, USDC, BONK, USDT)
  - Real-time USD value conversion
  - Balance checking
  - Quick amount presets
  - Optional note/message

- **Settings**
  - User profile information
  - Wallet address with Solscan link
  - App configuration
  - Help and documentation links

- **Telegram Integration**
  - Full Web App SDK integration
  - Haptic feedback
  - Theme synchronization
  - Back button handling
  - Main button for actions

## Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Routing**: React Router 6
- **Charts**: Recharts 2
- **Telegram SDK**: @twa-dev/sdk 7
- **Blockchain**: @solana/web3.js

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Telegram bot configured (see parent README)
- Backend API running

### Installation

```bash
cd telegram/webapp
npm install
```

### Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=https://your-api-domain.com/api
VITE_BOT_USERNAME=your_bot_username
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3001`

**Testing in Telegram:**
1. Use [ngrok](https://ngrok.com/) to expose your local server:
   ```bash
   ngrok http 3001
   ```
2. Set the mini app URL in BotFather to the ngrok URL
3. Open the mini app in Telegram

### Production Build

```bash
npm run build
```

Output will be in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
webapp/
├── src/
│   ├── components/          # Reusable components
│   │   └── LoadingScreen.jsx
│   ├── pages/              # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Transactions.jsx
│   │   ├── Send.jsx
│   │   └── Settings.jsx
│   ├── hooks/              # Custom React hooks
│   │   └── useTelegram.js  # Telegram Web App SDK hook
│   ├── utils/              # Utility functions
│   │   ├── api.js          # API client
│   │   └── format.js       # Formatting helpers
│   ├── styles/             # CSS files
│   │   └── index.css       # Tailwind imports & custom styles
│   ├── App.jsx             # Root component with routing
│   └── main.jsx            # App entry point
├── public/                 # Static assets
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS configuration
└── package.json            # Dependencies and scripts
```

## Telegram Web App Features

### Haptic Feedback

The app uses Telegram's haptic feedback API for enhanced UX:

```javascript
const { hapticFeedback } = useTelegram();

// Selection feedback (e.g., button tap)
hapticFeedback('selection');

// Impact feedback (e.g., important action)
hapticFeedback('impact');

// Notification feedback (e.g., success)
hapticFeedback('notification');
```

### Main Button

The Telegram main button appears at the bottom of the screen:

```javascript
const { showMainButton, hideMainButton } = useTelegram();

// Show button
showMainButton('Send Tip', handleSend);

// Hide button
hideMainButton();
```

### Back Button

The back button appears in the header:

```javascript
const { showBackButton, hideBackButton } = useTelegram();

useEffect(() => {
  showBackButton();
  return () => hideBackButton();
}, []);
```

### Theme Integration

The app automatically adapts to Telegram's theme:

```css
/* Telegram theme colors */
background-color: var(--tg-theme-bg-color);
color: var(--tg-theme-text-color);
```

## API Integration

All API calls go through `src/utils/api.js`:

```javascript
import { fetchWalletData, fetchBalance } from '@/utils/api';

const wallet = await fetchWalletData(userId);
const balance = await fetchBalance(walletAddress);
```

Authentication uses Telegram's `initData`:

```javascript
headers: {
  'X-Telegram-Init-Data': window.Telegram.WebApp.initData
}
```

## Styling

### Brand Colors

The app uses JustTheTip's brand colors:

```css
--brand-purple: #667eea
--brand-pink: #764ba2
```

### Custom Components

Reusable component classes:

- `.btn-primary` - Primary gradient button
- `.btn-secondary` - Secondary button
- `.card` - Content card
- `.stat-card` - Stat display card
- `.transaction-item` - Transaction list item
- `.input-field` - Form input

### Responsive Design

Mobile-first design with:
- Touch-friendly tap targets (min 44px)
- Safe area insets for iOS
- Optimized for portrait orientation
- No horizontal scrolling

## Performance

### Code Splitting

Vite automatically splits code by vendor:
- `react-vendor` - React and React Router
- `solana-vendor` - Solana Web3.js
- `telegram-vendor` - Telegram SDK

### Lazy Loading

Routes can be lazy loaded:

```javascript
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

### Image Optimization

- Use WebP format for images
- Lazy load images below the fold
- Optimize icon sizes

## Security

### Input Validation

All user inputs are validated:
- Amount checks (positive, sufficient balance)
- Address validation
- Username sanitization

### API Security

- All requests include Telegram initData
- Server validates initData signature
- No sensitive data in localStorage

### Content Security Policy

Production builds include CSP headers:
- No inline scripts
- Telegram SDK allowed
- API domain whitelisted

## Deployment

### Telegram Mini App Setup

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Deploy to static hosting:**
   - Vercel, Netlify, GitHub Pages, etc.
   - Must use HTTPS

3. **Configure in BotFather:**
   ```
   /setmenubutton
   [Select your bot]
   [Enter button text]: 💼 Open Wallet
   [Enter Mini App URL]: https://your-domain.com
   ```

4. **Test the deployment:**
   - Open your bot in Telegram
   - Click the menu button
   - Mini App should open

### Environment Variables

Production `.env`:

```env
VITE_API_URL=https://api.your-domain.com/api
VITE_BOT_USERNAME=your_bot_username
VITE_SOLANA_NETWORK=mainnet-beta
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Hosting Recommendations

**Vercel (Recommended):**
- Zero configuration
- Automatic HTTPS
- Global CDN
- Free tier available

**Netlify:**
- Easy deploys from Git
- Form handling
- Serverless functions

**GitHub Pages:**
- Free for public repos
- Custom domain support
- Automatic builds

## Troubleshooting

### Mini App not loading

1. Check HTTPS is enabled
2. Verify URL in BotFather is correct
3. Check browser console for errors
4. Ensure Telegram SDK is loaded

### API requests failing

1. Check CORS configuration on backend
2. Verify `initData` is being sent
3. Check API URL in `.env`
4. Test API endpoints directly

### Theme colors not working

1. Ensure Telegram SDK script loads first
2. Check CSS variable fallbacks
3. Test in actual Telegram (not browser)

### Build errors

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check Node.js version (18+)

3. Update dependencies:
   ```bash
   npm update
   ```

## Contributing

See main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Mini App Specific

- Follow React best practices
- Use functional components and hooks
- Keep components small and focused
- Add PropTypes for component props
- Write unit tests for utilities
- Test on real Telegram mobile client

## Resources

- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [@twa-dev/sdk NPM Package](https://www.npmjs.com/package/@twa-dev/sdk)
- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## License

Custom MIT-based - See [LICENSE](../../LICENSE)

---

**Version**: 1.0.0
**Author**: 4eckd
**Last Updated**: 2025-11-12
