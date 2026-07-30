import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#fc8019',
          dark: '#e8730f',
          light: '#fff2e6',
        },
        accent: {
          DEFAULT: '#1ba672',
          dark: '#0f8a5c',
        },
        ink: {
          DEFAULT: '#3d4152',
          muted: '#93959f',
        },
        surface: {
          DEFAULT: '#ffffff',
          bg: '#f8f8f8',
          border: '#eaeaec',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(61, 65, 82, 0.06), 0 2px 8px rgba(61, 65, 82, 0.06)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
