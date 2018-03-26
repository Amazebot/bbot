module.exports = function (wallaby) {
  return {
    name: 'bbot',
    files: [
      "src/**/*.ts",
      "package.json",
      { pattern: "src/**/*.spec.ts", ignore: true },
      { pattern: "src/**/*.d.ts", ignore: true },
    ],
    tests: ["src/lib/*.spec.ts"],
    testFramework: 'mocha',
    env: {
      type: 'node'
    },
    compilers: {
      '**/*.ts?(x)': wallaby.compilers.typeScript({ module: 'commonjs' })
    },
    debug: true,
    slowTestThreshold: 200
  }
}