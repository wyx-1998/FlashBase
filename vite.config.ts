import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/renderer'),
  publicDir: path.resolve(__dirname, 'public'), // 指向项目根目录的public文件夹
  base: './', // 使用相对路径，解决Electron打包后资源加载问题
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: ['..'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  assetsInclude: ['**/*.svg'],
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})