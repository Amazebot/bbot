module.exports = function () {
  process.env.NODE_ENV = 'test'
  return {
    name: '@amazebot/bbot',
    files: [
      { pattern: 'packages/**/src/**/*.ts', load: true },
      { pattern: 'packages/**/src/**/*.spec.ts', ignore: true },
      { pattern: 'packages/**/node_modules/**', ignore: true }
    ],
    tests: [
      { pattern: 'packages/**/src/**/*.spec.ts', load: true },
      { pattern: 'packages/**/node_modules/**', ignore: true }
    ],
    filesWithNoCoverageCalculated: [
      'packages/**/src/index.ts'
    ],
    env: {
      type: 'node'
    },
    slowTestThreshold: 200,
    delays: { run: 2500 }
  }
}
