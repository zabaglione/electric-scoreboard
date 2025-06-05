module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/tests/unit/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/'
  ],
  moduleNameMapper: {
    '^electron$': '<rootDir>/tests/__mocks__/electron.js',
    '^electron-store$': '<rootDir>/tests/__mocks__/electron-store.js'
  }
};