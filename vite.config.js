import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    strictPort: true,
    port: 5190,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_DEPS__: JSON.stringify({
      react: pkg.dependencies.react,
      'react-dom': pkg.dependencies['react-dom'],
      electron: pkg.devDependencies.electron,
      vite: pkg.devDependencies.vite,
      'plotly.js': pkg.dependencies['plotly.js-basic-dist-min'],
      zustand: pkg.dependencies.zustand,
      papaparse: pkg.dependencies.papaparse,
    }),
  },
})
