/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/__tests__/**/*.test.ts"],
  // uuid v13 ships ESM-only; tell Jest to transform it via ts-jest
  transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        noUnusedLocals:     false,
        noUnusedParameters: false,
      },
    }],
  },
}
