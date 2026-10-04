import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noSensitiveLogging from "./eslint-rules/no-sensitive-logging.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Plain-JS Chrome extension (uses chrome.* globals).
    "extension/**",
    // Vendored third-party build (sql.js).
    "public/vendor/**",
  ]),
  // Architecture boundary: domain code is pure (no I/O, models, UI or framework).
  {
    files: ["modules/*/domain/**/*.ts", "core/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/modules/*/services/*", "@/core/services/*", "@/core/models/*", "@/core/db"], message: "domain/ is pure: do I/O in services/." },
            { group: ["@/modules/*/components/*", "@/components/*", "@/app/*"], message: "domain/ must not import UI." },
            { group: ["mongoose", "next", "next/*", "react", "react-dom"], message: "domain/ must stay framework-free." },
          ],
        },
      ],
    },
  },
  // Architecture boundary: UI components are presentational. Data comes in as props. The only files that may call
  // services or models are the async server "sections" (`*-section.tsx`), pages and layouts. Type imports are fine.
  {
    files: ["modules/*/components/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "core/components/**/*.{ts,tsx}"],
    ignores: ["**/*-section.tsx"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/services/*", "@/core/services/*", "@/core/models/*", "@/core/db"],
              message: "Components are presentational: pass data in as props. A component that must load data is an async server section named *-section.tsx.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // Pages and layouts read through services, never through Mongoose models.
  {
    files: ["app/**/page.tsx", "app/**/layout.tsx"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/core/models/*", "@/core/db"], message: "Pages call services, never Mongoose directly.", allowTypeImports: true }] },
      ],
    },
  },
  // Observability: never log resume, profile, job-description or prompt text. Log counts, ids and kinds instead.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["tests/**", "scripts/**"],
    plugins: { prepos: { rules: { "no-sensitive-logging": noSensitiveLogging } } },
    rules: { "prepos/no-sensitive-logging": "error" },
  },
]);

export default eslintConfig;
