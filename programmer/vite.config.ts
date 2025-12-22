import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist/programmer',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    open: true,
    port: 3000,
  },
});
