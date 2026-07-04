import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // the dev server may be launched via the 8.3 short path (DAILYM~1),
    // which fails Vite's strict fs allow-list realpath check on Windows
    fs: { strict: false },
  },
});
