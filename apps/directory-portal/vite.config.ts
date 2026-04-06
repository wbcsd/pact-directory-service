import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: [
      { find: /^pact-data-model\/(.+)$/, replacement: path.resolve(__dirname, '../../packages/pact-data-model/src/$1') },
      { find: 'pact-data-model', replacement: path.resolve(__dirname, '../../packages/pact-data-model/src/index.ts') },
    ],
  },
})
