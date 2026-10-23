import path from "node:path"
import { fileURLToPath } from "node:url"

// resolved from this folder: the build runs from the dailymattr root
const dir = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(dir, "index.html"),
    path.join(dir, "src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      fontFamily: {
        // News Studio design system (Figma R0PWgZZF2fEQt7bn6V6KPx)
        bevietnam: ['"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        playfair: ['Playfair', '"Playfair Display"', 'Georgia', 'serif'],
        roboto: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Figma "Neutral colors | Light Mode" variables
        lm: {
          0: '#FFFFFF',
          50: '#FAFAFB',
          100: '#F2F2F7',
          200: '#E5E5EA',
          300: '#D1D1D6',
          400: '#B8B8C0',
          500: '#6B6B73',
          600: '#4A4A52',
          700: '#1C1C1E',
          800: '#141417',
        },
        primary: '#7c3aed',
        secondary: '#a855f7',
        accent: '#c084fc',
        purple: {
          300: '#c084fc',
          400: '#a855f7',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6b21a8',
          800: '#581c87',
          900: '#4c1d95',
        },
        dark: '#0a0118',
        'dark-secondary': '#1a0f2e',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'liquid': 'liquid 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        liquid: {
          '0%, 100%': { 
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' 
          },
          '50%': { 
            borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' 
          },
        }
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(20px)',
      },
    },
  },
  plugins: [],
}

