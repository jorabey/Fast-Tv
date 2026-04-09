import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // Yangilanish bo'lsa avtomat tatbiq qiladi
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"], // Hamma narsani keshlaydi
        navigateFallback: "/offline.html", // Internet uzilsa darhol bunga o'tadi
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst", // Rasmlarni keshdan oladi (Tezlik!)
          },
          {
            urlPattern: /^https:\/\/vzyoxwqydcxbpuf\.supabase\.co\/.*/i,
            handler: "NetworkFirst", // Supabase ma'lumotlarini tarmoqdan oladi, yo'qsa keshdan
          },
        ],
      },
    }),
  ],
});
