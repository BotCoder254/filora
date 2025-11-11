/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom dark mode palette
        dark: {
          bg: '#0D0D0D',
          surface1: '#1A1A1A',
          surface2: '#222222',
          nav: '#141414',
          hover: '#2A2A2A',
          border: '#2E2E2E',
          'border-hover': '#3A3A3A',
          input: '#1E1E1E',
          scroll: '#101010',
        },
        text: {
          primary: '#F3F3F3',
          secondary: '#B5B5B5',
          muted: '#7A7A7A',
        },
        accent: {
          primary: '#E63946',
          secondary: '#06D6A0',
          warning: '#FFD166',
          success: '#06D6A0',
          error: '#E63946',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

