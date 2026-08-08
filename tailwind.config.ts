import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      // Colores semánticos de la skin `ejecutiva` (tokens en globals.css).
      // Solo AGREGAN nombres: las escalas slate-*/emerald-* siguen intactas.
      // background/surface/line van por triplete RGB para soportar el
      // modificador de opacidad (bg-surface/60); el resto sigue en var().
      colors: {
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)',
          raised: 'var(--surface-raised)',
          muted: 'rgb(var(--surface-muted-rgb) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line-rgb) / <alpha-value>)',
          subtle: 'var(--line-subtle)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          ink: 'var(--accent-ink)',
        },
        success: {
          DEFAULT: 'var(--success)',
          muted: 'var(--success-muted)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          muted: 'var(--warning-muted)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          muted: 'var(--danger-muted)',
        },
        info: {
          DEFAULT: 'var(--info)',
          muted: 'var(--info-muted)',
        },
      },
    },
  },
  plugins: [],
}

export default config
