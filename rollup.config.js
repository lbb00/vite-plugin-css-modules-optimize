module.exports = {
  input: 'src/main.js',
  output: {
    file: 'dist/main.js',
    format: 'cjs',
  },
  external: [
    'node:fs',
    'node:process',
    'gogocode',
    'postcss',
    'postcss-modules',
    'base62',
  ],
}
