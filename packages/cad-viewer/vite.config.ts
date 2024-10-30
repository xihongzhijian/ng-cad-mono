import {isAbsolute, resolve} from "path";
import {defineConfig} from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import dts from "vite-plugin-dts";

export default defineConfig(({mode}) => {
  switch (mode) {
    case "development":
      return {
        plugins: [dts(), cssInjectedByJsPlugin()],
        build: {
          outDir: "lib",
          emptyOutDir: false,
          watch: {},
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            formats: ["es"],
            fileName: "index"
          },
          rollupOptions: {
            external: (id) => !(isAbsolute(id) || id.startsWith("."))
          },
          minify: false,
          sourcemap: true
        }
      };
    case "lib":
      return {
        mode: "production",
        plugins: [dts(), cssInjectedByJsPlugin()],
        build: {
          outDir: "lib",
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            formats: ["es"],
            fileName: "index"
          },
          rollupOptions: {
            external: (id) => !(isAbsolute(id) || id.startsWith("."))
          }
        }
      };
    case "dist":
      return {
        mode: "production",
        plugins: [cssInjectedByJsPlugin()],
        build: {
          outDir: "dist",
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            formats: ["umd"],
            fileName: () => "cad-viewer.js",
            name: "lucilor.cadViewer"
          }
        }
      };
    default:
      return {};
  }
});
