import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Motor 3D do Plano de Corte CNC: sai como um único HTML (JS e CSS dentro),
// que o programa embute e abre num quadro, sem internet.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  base: './',
  build: { assetsInlineLimit: 100000000, chunkSizeWarningLimit: 10000 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
