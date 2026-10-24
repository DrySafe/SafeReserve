import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import manifestHandler from './api/manifest.js';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(({ mode }) => ({ define: mode === 'test-demo' ? { 'import.meta.env.VITE_SUPABASE_URL': '""', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '""' } : mode === 'test-merchant' ? { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://merchant-tests.supabase.co'), 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('sb_publishable_test_only') } : {}, plugins: [{name:'tenant-manifest',configureServer(server){server.middlewares.use('/api/manifest',(req,res)=>{req.url='/api/manifest'+req.url;manifestHandler(req,res);});},configurePreviewServer(server){server.middlewares.use('/api/manifest',(req,res)=>{req.url='/api/manifest'+req.url;manifestHandler(req,res);});}},react(), tailwindcss(), VitePWA({
  registerType: 'prompt', includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
  manifest: false,
  workbox: { navigateFallback: '/index.html', globPatterns: ['**/*.{js,css,html,svg,woff2}'], runtimeCaching: [] }
})], test: { include: ['tests/**/*.test.js'] } }));
