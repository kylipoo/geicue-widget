import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import replace from "@rollup/plugin-replace";

export default defineConfig({
  resolve: {
    alias: {
      langchain: "langchain/dist/langchain.js", // Adjust the path if necessary
    },
  },

  plugins: [
    react(),
    replace({
      "process.env.NODE_ENV": JSON.stringify("dev"),
      "process.env": "{}",
      preventAssignment: true,
    }),
  ],
  define: {
    global: "globalThis",
    "process.env": "{}",
  },
  build: {
    lib: {
      entry: "src/main.jsx",
      name: "VaultWidget",
      formats: ["iife"],
      fileName: "vault-widget",
    },
    sourcemap: true,
    rollupOptions: {
      // external: ['react', 'react-dom'],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
    watch: {
      // Enable watch mode for auto-rebuilding on file changes
      include: ["src/**"],
      exclude: ["node_modules/**", "dist/**"],
    },
  },
  // Add server configuration for hot reloading
  server: {
    watch: {
      usePolling: true,
      interval: 1000, // Check for changes every second
    },
  },
});
