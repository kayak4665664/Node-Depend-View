module.exports = {
  root: true,
  env: { es2020: true, node: true, jest: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'airbnb-base',
    'plugin:jest/recommended',
  ],
  ignorePatterns: ['.eslintrc.cjs', 'dist', 'public'],
  overrides: [{
    env: { node: true },
    files: ['.eslintrc.{js,cjs}'],
    parserOptions: { sourceType: 'script' },
  }],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'jest',
  ],
  rules: {
    'import/extensions': [
      'warn',
      'ignorePackages',
      {
        js: 'never',
        ts: 'never',
      },
    ],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },

  },
};
