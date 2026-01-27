import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0066FF',
        konkurs: '#dc3545',
        nyemission: '#28a745',
        styrelse: '#6f42c1',
        vdbyte: '#fd7e14',
        rekonstruktion: '#ffc107',
      },
    },
  },
  plugins: [],
}
export default config
