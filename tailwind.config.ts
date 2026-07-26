import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colores semánticos de la skin `mission` (tokens en globals.css).
      // Solo AGREGAN nombres: las escalas slate-*/emerald-* siguen intactas.
      // Ojo: al ser var() no soportan modificador de opacidad (bg-surface/60);
      // para eso siguen las escalas Tailwind.
      colors: {
        background: 'var(--background)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          muted: 'var(--surface-muted)',
        },
        line: {
          DEFAULT: 'var(--line)',
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
