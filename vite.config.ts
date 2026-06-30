import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/kaminos-hand-control': {
        target: 'http://127.0.0.1:8096',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kaminos-hand-control/, ''),
      },
    },
  },
});
