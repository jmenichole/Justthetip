/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./justthetip---external-wallet-helper/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'brand-dark': '#0A092B',
        'brand-card': '#101032',
      },
      backgroundImage: {
        'glow-gradient-purple': 'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.2), transparent 70%)',
        'glow-gradient-cyan': 'radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.2), transparent 70%)',
      },
      animation: {
        'marquee': 'marquee 60s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    }
  },
  plugins: [],
}