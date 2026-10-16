import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];
  try {
    // @ts-ignore
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {}

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  // Vite rejects requests whose Host header it does not recognise (=403), which
  // breaks the hosted dev-server preview because it is proxied from *.e2b.app.
  // `localhost`, *.localhost and raw IPs are always allowed by Vite itself.
  // Add more hosts via VITE_ALLOWED_HOSTS="host-a,host-b" if needed.
  const allowedHosts = (env.VITE_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  if (!allowedHosts.includes('.e2b.app')) allowedHosts.push('.e2b.app');

  return {
    plugins,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
    server: {
      // Bind to all interfaces so the preview proxy can reach the dev server.
      host: true,
      allowedHosts,
    },
    preview: {
      host: true,
      allowedHosts,
    },
  };
})
