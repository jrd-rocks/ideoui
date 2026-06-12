import { defineConfig } from 'vite';

export default defineConfig({
  base: '/static/',
  build: {
    outDir: '../static',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, _res) => {
            console.error(`[Vite Proxy Error] Failed to proxy ${req.method} ${req.url}:`, err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`[Vite Proxy Request] ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`[Vite Proxy Response] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
          });
        },
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, _res) => {
            console.error(`[Vite Proxy Error] Failed to proxy websocket ${req?.url || '/ws'}:`, err.message);
          });
        },
      },
    },
  },
});