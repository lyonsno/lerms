import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const kaminosRoot = dirname(require.resolve('kaminos/finger-fluid-webgpu-core.js'));
const kaminosHdrEnvironment = readFileSync(
  resolve(kaminosRoot, 'assets/hdr/studio_small_09_1k.hdr'),
);

export default defineConfig({
  plugins: [{
    name: 'kaminos-pinned-hdr-environment',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/assets/hdr/studio_small_09_1k.hdr') {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/octet-stream');
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader(
          'X-LERMS-Source-SHA256',
          'e7cfda5f4e98e623db12b8bfd0184e048488e4855d9c83e2751fb44a32e80c45',
        );
        response.end(kaminosHdrEnvironment);
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'assets/hdr/studio_small_09_1k.hdr',
        source: kaminosHdrEnvironment,
      });
    },
  }],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        liveHand: resolve(import.meta.dirname, 'live-hand.html'),
      },
    },
  },
});
