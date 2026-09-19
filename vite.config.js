import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'https://salahaddin-school-backend.onrender.com',
      '/uploads': 'https://salahaddin-school-backend.onrender.com',
    },
  },
});
