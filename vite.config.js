import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.js'],
  },
});
