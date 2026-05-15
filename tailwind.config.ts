import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // CSS variable RGB tuples — supports opacity modifiers (e.g. bg-accent/15)
        // and automatically switches between dark/light theme classes on <html>.
        'bg-primary':    'rgb(var(--c-bg-primary)    / <alpha-value>)',
        'bg-secondary':  'rgb(var(--c-bg-secondary)  / <alpha-value>)',
        'bg-card':       'rgb(var(--c-bg-card)        / <alpha-value>)',
        'text-primary':  'rgb(var(--c-text-primary)  / <alpha-value>)',
        'text-secondary':'rgb(var(--c-text-secondary)/ <alpha-value>)',
        'text-muted':    'rgb(var(--c-text-muted)    / <alpha-value>)',
        accent:          'rgb(var(--c-accent)         / <alpha-value>)',
        'status-green':  'rgb(var(--c-status-green)  / <alpha-value>)',
        'status-red':    'rgb(var(--c-status-red)    / <alpha-value>)',
        'status-yellow': 'rgb(var(--c-status-yellow) / <alpha-value>)',
        border:          'rgb(var(--c-border)         / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
