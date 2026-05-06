import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');

// `command` is `'serve'` for `vite` (dev) and `'build'` for `vite build` (prod).
// In dev, the app runs at http://localhost:2035 (base = '/'). In production,
// GitHub Pages serves project sites at https://<user>.github.io/<repo>/, so
// we set the base to '/stack-buddy/' for build output. Change this if the
// repo is ever renamed or moved to a custom domain.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/stack-buddy/' : '/',
  plugins: [react()],
  server: {
    // Bind to IPv4 explicitly. Without this, Vite 5 listens on IPv6-only
    // (`[::1]:2035`), and Chrome on macOS often resolves `localhost` to
    // IPv4 first and fails with ERR_CONNECTION_REFUSED.
    host: '127.0.0.1',
    port: 2035,
    fs: {
      // Whitelist the directories the web app needs to import from. Allows
      // `?raw` markdown imports from `private-ai/` and `docs/models/` without
      // exposing `.env`, `chats/`, etc.
      allow: [
        path.resolve(__dirname),                  // web/
        path.resolve(repoRoot, 'shared'),         // shared/ types + math
        path.resolve(repoRoot, 'scenarios'),      // bundled default.json
        path.resolve(repoRoot, 'private-ai'),     // prompt.md ?raw import
        path.resolve(repoRoot, 'docs/models'),    // docs/models/*.md
      ],
    },
  },
}));
