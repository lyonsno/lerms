import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/kaminos-hand-control-sidecar-event': {
        target: 'http://127.0.0.1:8096',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/kaminos-hand-control-sidecar-event/, '/hand-control-sidecar-event')
      }
    }
  }
});
