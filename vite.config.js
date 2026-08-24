import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,   // Electron opens its own window; browser auto-open disabled
  },
  build: {
    rollupOptions: {
      output: {
        // One chunk per top-level node_modules package, not one giant bundle —
        // the actual fix Vite's own warning suggests, done proactively rather
        // than just raising the size limit, since this app may run on the web
        // (not just Electron/local-disk) in the future: real network-served
        // pages benefit from browsers caching each vendor library separately,
        // only re-fetching whichever one actually changed between deploys,
        // instead of invalidating one monolithic chunk on every app-code edit.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const parts = id.split('node_modules/')[1].split('/');
          // Scoped packages (@xyflow/react) need both segments; unscoped
          // (react, zustand) need just the first.
          const pkg = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
          return `vendor/${pkg.replace('@', '').replace('/', '-')}`;
        },
      },
    },
  },
})
