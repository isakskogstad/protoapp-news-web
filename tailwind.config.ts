import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Centralized color system using CSS variables for theme consistency
      colors: {
        // ========================================
        // SEMANTIC COLOR TOKENS (5 core colors)
        // Use these for new components
        // ========================================
        ink: 'var(--ink)',           // Primary text
        paper: 'var(--paper)',       // Background
        stone: 'var(--stone)',       // Secondary text
        highlight: 'var(--highlight)', // Highlighting

        // Base colors (legacy support)
        background: 'var(--background)',
        foreground: 'var(--foreground)',

        // Muted/secondary colors
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--text-muted)',
        },

        // Card backgrounds
        card: {
          DEFAULT: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
        },

        // Border colors
        border: 'var(--border)',

        // Accent/primary (unified with semantic palette)
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: '#ffffff',
          light: 'var(--accent-light)',
        },

        // Secondary text
        secondary: {
          DEFAULT: 'var(--text-secondary)',
          foreground: 'var(--text-dynamic)',
        },

        // Protocol type semantic colors
        primary: '#0066FF',
        konkurs: {
          DEFAULT: '#dc3545',
          light: '#f8d7da',
          dark: '#721c24',
        },
        nyemission: {
          DEFAULT: '#28a745',
          light: '#d4edda',
          dark: '#155724',
        },
        styrelse: {
          DEFAULT: '#6f42c1',
          light: '#e2d9f3',
          dark: '#3d2168',
        },
        vdbyte: {
          DEFAULT: '#fd7e14',
          light: '#ffe5d0',
          dark: '#8a4500',
        },
        rekonstruktion: {
          DEFAULT: '#ffc107',
          light: '#fff3cd',
          dark: '#856404',
        },

        // Status colors
        success: {
          DEFAULT: '#22c55e',
          light: '#dcfce7',
          dark: '#166534',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7',
          dark: '#92400e',
        },
        error: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
          dark: '#991b1b',
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#dbeafe',
          dark: '#1e40af',
        },
      },

      // Typography scale
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        // Display sizes for headings
        'display-sm': ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        'display-md': ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.02em' }],
        'display-lg': ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em' }],
        // Body text with enhanced readability (17px base)
        'body': ['1.0625rem', { lineHeight: '1.8' }],
        'body-lg': ['1.1875rem', { lineHeight: '1.75' }],
        'body-sm': ['0.9375rem', { lineHeight: '1.7' }],
        // Caption text
        'caption': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
      },

      // Font families (matching globals.css)
      fontFamily: {
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },

      // Spacing scale extensions
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // Border radius tokens
      borderRadius: {
        'sm': '0.25rem',
        'DEFAULT': '0.5rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      // Box shadow tokens
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.12)',
        'float': '0 8px 30px rgba(0, 0, 0, 0.12)',
        // Dark mode shadows
        'dark-sm': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        'dark-md': '0 4px 6px -1px rgb(0 0 0 / 0.4)',
        'dark-lg': '0 10px 15px -3px rgb(0 0 0 / 0.5)',
      },

      // Animation durations
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },

      // Z-index scale
      zIndex: {
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },

      // Animation keyframes
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(8px)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-out-right': {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pulse-subtle': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.15)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(100%) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'toast-out': {
          '0%': { opacity: '1', transform: 'translateX(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateX(100%) scale(0.95)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'fade-out': 'fade-out 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.25s ease-out forwards',
        'slide-out-right': 'slide-out-right 0.25s ease-out forwards',
        'scale-in': 'scale-in 0.2s ease-out forwards',
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 0.5s ease-in-out',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'toast-in': 'toast-in 0.35s ease-out forwards',
        'toast-out': 'toast-out 0.35s ease-in forwards',
      },
    },
  },
  plugins: [],
}

export default config
