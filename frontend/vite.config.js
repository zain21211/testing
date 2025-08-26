// vite.config.js
// import fs from 'fs';
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa"; // ✅ You missed this import
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  preview: {
    port: 4173,
    host: true, // important for allowing external access
    allowedHosts: ["spaniel-musical-shrew.ngrok-free.app"], // ✅ Add your ngrok domain here
  },
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
    // https: {
    //   key: fs.readFileSync(path.resolve(__dirname, './key.pem')),
    //   cert: fs.readFileSync(path.resolve(__dirname, './cert.pem')),
    // },
    // hmr: {
    //   host: '100.68.6.110', // use your local IP here
    //   protocol: 'wss',       // if using HTTPS
    //   port: 5174
    // },
    host: "0.0.0.0",
    port: 5174,
  },
  build: {
    sourcemap: true, // <-- add this
  },
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW", // ✅ correct
      filename: "sw.js", // Optional – defaults to 'sw.js'
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "ahmad internatinal",
        short_name: "Accounts",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#317EFB",
        icons: [
          {
            src: "/icons/icon.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
