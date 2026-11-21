import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// One .env at the repo root configures both the API and this frontend.
const envDir = decodeURIComponent(new URL('../..', import.meta.url).pathname);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, 'VITE_');
  // Absolute URL used for canonical/og tags in index.html. Empty means root-relative links.
  const publicUrl = (env.VITE_PUBLIC_URL ?? '').trim().replace(/\/$/, '');

  return {
    envDir,
    plugins: [
      react(),
      {
        name: 'public-url-meta',
        transformIndexHtml: (html) => html.replaceAll('__PUBLIC_URL__', publicUrl),
      },
    ],
  };
});
