import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // Bu Vite uchun standart output papka
    emptyOutDir: true,
    // APK ichidagi WebView telefon bilan birga eskiradi va o'zini
    // yangilamaydi. Shuning uchun Vite ning zamonaviy standart darajasi
    // emas, eskiroq brauzerga moslab yig'amiz.
    target: "chrome80",
    cssTarget: "chrome80",
  },
  server: {
    port: 3000,
  },
});
