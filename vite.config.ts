import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// `base` must match your GitHub Pages repo name for correct asset paths.
// For a project page served at https://<user>.github.io/SteigerDojoEsports/
// keep base = '/SteigerDojoEsports/'. For local dev it is ignored.
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/SteigerDojoEsports/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own chunks for better caching.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
});
