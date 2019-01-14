module.exports = function (wallaby) {
  return {
    name: 'bbot',
    files: [
      'tsconfig.json',
      'src/**/*.ts',
      'package.json',
      { pattern: 'src/**/*.spec.ts', ignore: true }
    ],
    tests: [
      'src/**/*.spec.ts'
    ],
    testFramework: 'mocha',
    env: { type: 'node' },
    compilers: {
      '**/*.ts?(x)': wallaby.compilers.typeScript({
        module: 'commonjs',
        useStandardDefaults: true
      })
    },
    slowTestThreshold: 200,
    delays: { run: 2500 }
  }
}
