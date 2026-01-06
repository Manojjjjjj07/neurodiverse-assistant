import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  
  // Web Worker configuration
  worker: {
    format: 'es',
  },
  
  // Optimize dependencies for ML libraries
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  
  // Server configuration for development
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  
  // Build configuration
  build: {
    // Increase chunk size warning limit for ML model bundles
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Separate large dependencies into their own chunks
        manualChunks: {
          'onnxruntime': ['onnxruntime-web'],
          'transformers': ['@huggingface/transformers'],
        },
      },
    },
  },
});
