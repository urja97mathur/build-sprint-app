import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Two pages: the private call page (index.html) and the public demo page (demo.html, served at /demo.html).
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        demo: fileURLToPath(new URL('./demo.html', import.meta.url)),
      },
    },
  },
});
