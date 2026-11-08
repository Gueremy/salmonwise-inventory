import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [{
    name: "offline-build-assets",
    apply: "build",
    writeBundle(options, bundle) {
      const assets = [...new Set(["/", "/index.html", "/manifest.webmanifest", "/favicon.ico", ...Object.keys(bundle).map((name) => `/${name}`)])];
      const version = createHash("sha256").update(JSON.stringify(assets)).digest("hex").slice(0, 16);
      writeFileSync(path.join(options.dir || "dist", "sw.js"),
        `self.__PRECACHE_ASSETS = ${JSON.stringify(assets)};\nself.__CACHE_VERSION = "salmotrack-shell-${version}";\n` + readFileSync("public/sw.js", "utf8"));
    },
  }, react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
