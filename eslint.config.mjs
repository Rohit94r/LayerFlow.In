import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Legacy backend/package code predates this rebuild and is not owned by
    // the current frontend scope — keep it covered but non-blocking.
    files: ["apps/**", "packages/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
    "apps/api/dist/**",
    "apps/api/build/**",
    "apps/api/node_modules/**",
  ]),
]);
