// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu({
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: '@typescript-eslint/parser', // If you're using TypeScript
  },
  extends: [
    '@nuxtjs',
    'plugin:nuxt/recommended',
  ],
  // Add this to prevent recursive parsing
  settings: {
    'import/resolver': {
      nuxt: {
        extensions: ['.js', '.vue', '.ts'], // Add relevant extensions
        nuxtSrcDir: 'src', // Adjust if your source directory is different
      },
    },
  },
  // Increase the memory limit
  rules: {
    'prefer-const': ['error', {
      'destructuring': 'any',
      'ignoreReadBeforeAssign': false
    }]
  }
})
