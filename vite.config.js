import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(({ mode }) => ({ define: mode === 'test-demo' ? { 'import.meta.env.VITE_SUPABASE_URL': '""', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '""' } : mode === 'test-merchant' ? { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://merchant-tests.supabase.co'), 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('sb_publishable_test_only') } : {}, plugins: [react(), tailwindcss(), VitePWA({
  registerType: 'prompt', includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
  manifest: { name: 'SafeReserve · Agendamentos', short_name: 'SafeReserve', description: 'Seu tempo, bem cuidado', theme_color: '#111713', background_color: '#111713', display: 'standalone', start_url: '/', scope: '/', lang: 'pt-BR', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }] },
  workbox: { navigateFallback: '/index.html', globPatterns: ['**/*.{js,css,html,svg,woff2}'], runtimeCaching: [] }
})], test: { include: ['tests/**/*.test.js'] } }));
