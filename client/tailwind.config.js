/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#F7F6F2',
          secondary: '#EFEEE8',
          card: '#FFFFFF',
          cream: '#FAF9F5',
        },
        surface: {
          main: '#FFFFFF',
          card: '#FFFFFF',
          subtle: '#F4F5F1',
        },
        text: {
          primary: '#1F241E',
          secondary: '#6E7368',
          muted: '#94998E',
        },
        forest: {
          DEFAULT: '#244A38',
          dark: '#1B382B',
          hover: '#1B382B',
          soft: '#EAF2EC',
          sage: '#8FA896',
          vivid: '#10B981',
          accent: '#2D5A43',
        },
        ambernif: {
          card: '#234E39',
          hover: '#1B3E2D',
          badge: '#36684F',
          light: '#EAF3ED',
        },
        border: {
          main: '#E5E4DC',
          subtle: '#EFEFEA',
        },
        warm: {
          beige: '#EAE4D8',
          cream: '#FDFCFA',
        },
        status: {
          warning: '#B7833D',
          error: '#B75C52',
          success: '#244A38',
        },
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
        card: '16px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        card: '0 2px 10px rgba(31, 36, 30, 0.04)',
        elevated: '0 10px 30px rgba(31, 36, 30, 0.08)',
        ambernif: '0 12px 32px rgba(35, 78, 57, 0.18)',
      },
    },
  },
  plugins: [],
};
