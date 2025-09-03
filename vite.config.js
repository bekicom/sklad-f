import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // Bu Vite uchun standart output papka
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});
