module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  plugins: [
    'local-rules'
  ],
  rules: {
    // Custom rule to prevent NaN routes
    'local-rules/no-nan-route': 'error',
    
    // Standard React/TypeScript rules
    '@typescript-eslint/no-unused-vars': 'off', // Disabled for development
    'no-unused-vars': 'off', // Disabled for development
    'prefer-const': 'warn',
    
    // Security-related rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-script-url': 'error',
    
    // Code quality rules
    'no-console': 'off', // Disabled for development convenience
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // Rules to prevent common React mistakes
    'react-hooks/exhaustive-deps': 'off', // Disabled to prevent interference
    'react-hooks/rules-of-hooks': 'error',
    
    // Mixed operators rule
    'no-mixed-operators': 'off',
    
    // Accessibility rules
    'jsx-a11y/alt-text': 'warn',
    'jsx-a11y/anchor-is-valid': 'warn',
  },
  settings: {
    'local-rules': {
      'no-nan-route': require('./eslint-rules/no-nan-route.js')
    }
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      rules: {
        // TypeScript specific rules
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off', // Disabled for development
        
        // Enhanced NaN route checking for TypeScript
        'local-rules/no-nan-route': 'error'
      }
    }
  ],
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  }
};
