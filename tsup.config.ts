import { defineConfig } from "tsup";

export default defineConfig({
  name: "tsup",
  target: "es2020",
  sourcemap: true,
  entry: ["./src/index.ts"],
  cjsInterop: true,
  clean: true,
  dts: {
    resolve: true,
  },
});
