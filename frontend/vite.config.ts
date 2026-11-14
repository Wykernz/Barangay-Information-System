import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        // Preserve same-origin cookies and CSRF while forwarding to Django.
        configure(proxy) {
          proxy.on("error", (_error, _request, response) => {
            // Report a stopped backend as service unavailability, not a blank 500.
            if ("writeHead" in response && !response.headersSent) {
              response.writeHead(503, { "Content-Type": "application/json" });
              response.end(
                JSON.stringify({
                  code: "backend_unavailable",
                  detail: "Django is not running on 127.0.0.1:8000.",
                }),
              );
            }
          });
        },
      },
    },
  },
});
