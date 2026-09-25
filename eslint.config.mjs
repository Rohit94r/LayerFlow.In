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
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Frozen code: the legacy/ directories and the test suites that exercise
    // frozen (memory/rag/team/mcp/runs) or grand-tour features. Kept in git,
    // NOT actively shipped — silence the type-hygiene rules there so the live
    // wedge (gateway, budgets, keys, reports, notifications, billing,
    // workspace + their tests) is lint-clean while legacy stays tooled.
    files: [
      "apps/api/src/routes/legacy/**",
      "apps/api/src/services/legacy/**",
      "apps/api/src/test/memory-search.test.ts",
      "apps/api/src/test/rag-reindex.test.ts",
      "apps/api/src/test/runs-intelligence.test.ts",
      "apps/api/src/test/team.test.ts",
      "apps/api/src/test/mcp.test.ts",
      "apps/api/src/test/integration.test.ts",
      "apps/api/src/test/e2e-chat-flow.test.ts",
      "apps/api/src/test/multi-model.test.ts",
      "apps/api/scripts/form-filler.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
    "apps/web/.next/**",
    "apps/web/node_modules/**",
    "apps/web/next-env.d.ts",
    "apps/api/.next/**",
    "apps/api/dist/**",
    "apps/api/build/**",
    "apps/api/node_modules/**",
  ]),
]);
