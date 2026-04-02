import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'pact-data-model': path.resolve(__dirname, '../../packages/pact-data-model/src/index.ts'),
    },
  },
})
