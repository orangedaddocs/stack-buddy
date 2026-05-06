import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to IPv4 explicitly. Without this, Vite 5 listens on IPv6-only
    // (`[::1]:2035`), and Chrome on macOS often resolves `localhost` to
    // IPv4 first and fails with ERR_CONNECTION_REFUSED.
    host: '127.0.0.1',
    port: 2035,
    proxy: {
      // Use 127.0.0.1 (not localhost) to force IPv4 — avoids IPv6/IPv4 routing
      // collision with other dev servers on the same machine.
      '/api': 'http://127.0.0.1:2034',
    },
    fs: {
      // Whitelist only the directories the web app needs to import from.
      // Allows ?raw markdown imports from docs/models/ without exposing
      // .env, scenarios/, exports/, or other repo files via /@fs/...
      allow: [
        path.resolve(__dirname),                  // web/
        path.resolve(repoRoot, 'shared'),         // shared/ types + math
        path.resolve(repoRoot, 'docs/models'),    // docs/models/*.md raw imports
      ],
    },
  },
});
