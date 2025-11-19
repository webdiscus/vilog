export default {
  test: {
    include: [
      'test/**/*.test.js',
      'test/**/*.test.ts',
    ],
    exclude: [
      'test/**/_*.test.js',
    ],
    coverage: {
      include: [
        'src/**/*',
      ],
    },
    server: {
      deps: {
        inline: [
          'AssertionError: ts',
        ]
      }
    },
  },
}
