import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      sm: '375px',
      md: '768px',
      lg: '1280px',
    },
    extend: {
      fontFamily: {
        sans: [
          'var(--font-primary)',
          'var(--font-fallback)',
          'system-ui',
          'sans-serif',
        ],
      },
      lineHeight: {
        body: '1.6',
        heading: '1.3',
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
}
export default config
