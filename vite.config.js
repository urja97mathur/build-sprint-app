import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const page = name => fileURLToPath(new URL(`./${name}`, import.meta.url));

// The main address (index.html) is Welcome, sign-in, setup and Home. /demo.html is the public demo,
// /call-test.html the private call test from milestone 1, and /app.html forwards old links to the main address.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: page('index.html'),
        demo: page('demo.html'),
        call: page('call-test.html'),
        app: page('app.html'),
      },
    },
  },
});
