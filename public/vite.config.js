import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(new Date().getTime()),
  },
});