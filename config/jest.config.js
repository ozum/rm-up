const ignorePatterns = [
  ".nosync",
  "<rootDir>/<%- projectRoot %>/",
  "<rootDir>/node_modules/",
  "/test-helper/",
  "/__test__/",
  "<rootDir>/src/bin/",
];

module.exports = {
  preset: "ts-jest",
  testPathIgnorePatterns: ignorePatterns,
  coveragePathIgnorePatterns: ignorePatterns,
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
  modulePathIgnorePatterns: ["<rootDir>/node_modules.nosync/"],
};
