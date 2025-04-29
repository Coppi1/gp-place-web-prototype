import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/minio': {
        target: 'http://10.254.0.104:9005', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/minio/, ''),
      },
    },
  },
  server: {
    host: true,
    port: 5173
  }
});
