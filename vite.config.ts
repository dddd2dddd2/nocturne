import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages 项目页部署在 /nocturne/ 子路径下，必须显式指定 base，否则资源按域名根路径解析 404
  base: "/nocturne/",
  plugins: [react()],
  server: {
    port: 5173,
    host: "127.0.0.1",
  },
});
