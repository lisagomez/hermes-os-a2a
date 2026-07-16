// eslint-config-next v16 ya exporta un flat config array nativo (ESLint 9).
import next from 'eslint-config-next';

const eslintConfig = [
  ...next,
  { ignores: ['.next/**', 'node_modules/**'] },
];

export default eslintConfig;
