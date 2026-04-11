import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        
        // 🌟 ASOSIY O'ZGARISH: Har qanday yangi linkka kirilganda index.html ochilishi shart!
        navigateFallback: "/index.html",
        
        // Sitemap va API larga aralashmaydi
        navigateFallbackDenylist: [/^\/sitemap\.xml$/, /^\/api\//], 

        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
          },
          {
            urlPattern: /^https:\/\/vzyoxwqydcxbpuf\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
          },
        ],
      },
    }),
  ],
});
