import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import istanbul from 'vite-plugin-istanbul'

const isCoverage = process.env.VITE_COVERAGE === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    ...(isCoverage ? [istanbul({
      include: 'src/**',
      exclude: ['node_modules', 'e2e/', 'src/test/', 'src/mocking/'],
      extension: ['.ts', '.tsx'],
    })] : []),
  ],
  resolve: {
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.js', '.jsx', '.json'],
  },
})
