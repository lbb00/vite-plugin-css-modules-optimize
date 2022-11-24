import { createCommonJS } from 'mlly'
import { resolve } from 'path'
import { defineConfig } from 'vite'

const { __dirname } = createCommonJS(import.meta.url)

export default defineConfig({
  root: '.',
  mode: 'production',
  build: {
    target: 'esnext',
    outDir: './dist',
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      formats: ['es', 'cjs'],
      fileName: 'main',
    },
    rollupOptions: {
      external: [
        'node:fs',
        'node:process',
        'base62',
        'gogocode',
        'postcss',
        'postcss-modules',
        'postcss-selector-parser',
      ],
    },
  },
})
