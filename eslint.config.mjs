import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Effect-based data loading is intentional (React's supported pattern for
    // client components). The react-hooks heuristic rules flag these; keep them
    // as warnings, not CI-blocking errors.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
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
