// ESLint 9 flat config. eslint-config-next@16 exporta flat config nativo
// (gotcha ya aprendido en el eslint.config.mjs del repo raíz): nada de FlatCompat.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'tests-e2e/**'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]

export default config
