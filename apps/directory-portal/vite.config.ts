import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import istanbul from 'vite-plugin-istanbul'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    istanbul({
      include: 'src/**',
      exclude: ['node_modules', 'e2e/', 'src/test/', 'src/mocking/'],
      extension: ['.ts', '.tsx'],
      requireEnv: true,
    }),
  ],
  resolve: {
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.js', '.jsx', '.json'],
  },
})
