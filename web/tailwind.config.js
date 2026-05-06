/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#faf6f0',
          100: '#f5efe5',
          200: '#ebe3d5',
          300: '#ddd3c1',
          400: '#c4b8a4',
        },
        text: {
          primary: '#29261e',
          secondary: '#5d5748',
          muted: '#8a8272',
          faint: '#b3aa98',
        },
        terracotta: { 500: '#c4704b' },
        btc: {
          orange: '#f7931a',
          'orange-end': '#f97316',
        },
        success: '#3d8c5c',
        warning: '#c49234',
        error: '#c44b4b',
      },
      fontFamily: {
        sans: ['Source Sans 3', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};
