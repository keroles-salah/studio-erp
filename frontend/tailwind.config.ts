import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Cairo', 'sans-serif'],
        arabic: ['Cairo', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fdf9ec',
          100: '#f9f0d4',
          200: '#f3e1a6',
          300: '#eccc70',
          400: '#e2b34b',
          500: '#d49c38',
          600: '#c68436',
          700: '#a96f2a',
          800: '#88581f',
          900: '#6c4619',
          950: '#3f270b',
        },
        accent: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#fecdca',
          300: '#fda29b',
          400: '#f97066',
          500: '#f04438',
          600: '#d92d20',
          700: '#b42318',
          800: '#912018',
          900: '#7a271a',
        },
        slate: {
          850: '#1a1f2e',
          950: '#0f1419',
        },
      },
    },
  },
  plugins: [],
};

export default config;
