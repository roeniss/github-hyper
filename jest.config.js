export default {
  testEnvironment: 'jsdom',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'scripts/**/*.js',
    '!scripts/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 81,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '!**/dist/**',
    '!**/node_modules/**'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  transform: {}
};
