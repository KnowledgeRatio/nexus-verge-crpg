import js from '@eslint/js';

export default [
  // Apply recommended rules
  js.configs.recommended,

  // Global configuration for all JS files
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        prompt: 'readonly',
        confirm: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        HTMLCanvasElement: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        Image: 'readonly',
        Audio: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Promise: 'readonly',
        performance: 'readonly',
        process: 'readonly',

        // Project-specific globals
        game: 'readonly',
        gameState: 'readonly',
        questManager: 'readonly',
        audioManager: 'readonly'
      }
    },
    rules: {
      // Code style
      'indent': ['error', 4, { 'SwitchCase': 1 }],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'brace-style': ['error', '1tbs'],
      'arrow-spacing': ['error', { 'before': true, 'after': true }],
      'space-before-function-paren': ['error', {
        'anonymous': 'never',
        'named': 'never',
        'asyncArrow': 'always'
      }],
      'keyword-spacing': ['error', { 'before': true, 'after': true }],
      'space-infix-ops': 'error',
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],
      'max-len': ['warn', {
        'code': 120,
        'ignoreStrings': true,
        'ignoreTemplateLiterals': true,
        'ignoreComments': true
      }],

      // Code quality
      'no-unused-vars': ['warn', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }],
      'no-console': 'off',
      'no-debugger': 'warn',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'camelcase': ['warn', { 'properties': 'never' }],
      'no-magic-numbers': ['warn', {
        'ignore': [0, 1, -1, 2, 10, 100],
        'ignoreArrayIndexes': true,
        'ignoreDefaultValues': true
      }],

      // ES6+ rules
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn'
    }
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.min.js',
      '*.bundle.js',
      'coverage/**',
      '.vscode/**'
    ]
  },

  // Special rules for mathematical/algorithmic files
  {
    files: ['src/utils/simplexNoise.js', 'src/utils/rng.js'],
    rules: {
      'no-magic-numbers': 'off'
    }
  },

  // Special rules for SaveManager (timestamps)
  {
    files: ['src/systems/SaveManager.js'],
    rules: {
      'no-magic-numbers': 'off'
    }
  }
];
