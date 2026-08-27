// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        strategies: "generateSW",
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}"],
          // TanStack Start/Nitro emits browser files under a local "client/"
          // folder, but published hosting serves those files from the web
          // root. Without this mapping Workbox tries to precache
          // /client/assets/... URLs that 404 in production, so the service
          // worker never finishes installing and the installed app cannot
          // open offline.
          modifyURLPrefix: { "client/": "" },
          // "/" is served dynamically by SSR (no index.html on disk), so we
          // seed the precache with it manually. The SW will fetch and cache
          // "/" during install — this is what makes the app shell available
          // offline. The revision changes each build to bust the cache.
          additionalManifestEntries: [
            { url: "/", revision: `${Date.now()}` },
          ],
          navigateFallback: null,
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,

          runtimeCaching: [
            {
              // App shell / navigation: try network, fall back to cached HTML.
              // After first successful online visit, the response is stored in
              // the "html-nav" cache and served when offline.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-nav",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
                precacheFallback: { fallbackURL: "/" },
                matchOptions: { ignoreSearch: true },
              },
            },

            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:js|css|woff2?|ttf|otf)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Supabase Storage banner images (ad-banners bucket is public).
              // StaleWhileRevalidate keeps carousel banners available offline
              // while auto-refreshing them whenever the network returns.
              urlPattern: /\/storage\/v1\/object\/public\/ad-banners\//,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "ad-banners",
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
