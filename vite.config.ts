import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

export default defineConfig({
  server: { port: 3000 },
  build: { outDir: "dist/client", emptyOutDir: true },
  plugins: [sites()],
});
