// ESLint 9 (flat config). Next 16 ELIMINÓ `next lint`: el script `npm run lint`
// hacía `next lint` y fallaba con "Invalid project directory ... /lint" (next
// interpretaba "lint" como un directorio). Sin config de ESLint el repo llevaba
// desde la migración a Next 16 SIN lint ejecutable — y un gate no ejecutable hace
// que el Supervisor del trío rechace tareas correctas. Verificado contra el paquete
// instalado (eslint-config-next@16.2.10 exporta flat config: array de configs).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'businessos/**', // servicios python + volúmenes/scaffolds: no son parte de la app Next
      'supabase/**',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
]

export default config
