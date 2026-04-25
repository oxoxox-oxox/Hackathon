import { defineConfig } from 'vite';
import path from 'path';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl() // 启用 HTTPS，WebXR 需要安全上下文
  ],
  server: {
    host: '0.0.0.0', // 允许局域网访问
    port: 5173,
    https: true, // 启用 HTTPS
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false // 允许代理到 HTTP 后端
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  }
});
