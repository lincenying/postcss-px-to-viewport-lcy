/**
 * @type {import('eslint').Linter.BaseConfig}
 */
module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: ['standard', 'prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    indent: 'off',
    'no-new': 'off',
    'no-undef': 'off',
    'no-useless-escape': 'off',
    'multiline-ternary': 'off',
    'no-return-await': 'off',
    'no-prototype-builtins': 'off',
    'import/no-webpack-loader-syntax': 'off',
    'space-before-function-paren': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  }
}
