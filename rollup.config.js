module.exports = {
  input: 'src/main.js',
  output: {
    file: 'dist/main.js',
    format: 'cjs',
  },
  external: ['fs', 'gogocode', 'postcss', 'postcss-modules', 'base62'],
}
