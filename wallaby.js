module.exports = function () {
  return {
    name: 'bbot',
    files: [
      'src/**/*.ts',
      { pattern: 'src/**/*.spec.ts', ignore: true }
    ],
    tests: [
      'src/**/*.spec.ts'
    ],
    env: {
      type: 'node'
    },
    slowTestThreshold: 200,
    delays: { run: 2500 }
  }
}
