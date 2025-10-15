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
      functions: 100,
      lines: 94,
      statements: 94
    }
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js'
  ],
  transform: {}
};
