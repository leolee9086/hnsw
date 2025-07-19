import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: './', // 支持GitHub Pages部署
  resolve: {
    alias: {
      'vue': 'vue/dist/vue.esm-bundler.js'
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'transformers': ['@xenova/transformers'],
          'hnsw': ['@leolee9086/hnsw']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@xenova/transformers']
  }
}); 