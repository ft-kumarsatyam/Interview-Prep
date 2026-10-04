/** Layer rules that complement tests/architecture/boundaries.test.ts (which freezes module-to-module edges). */
module.exports = {
  forbidden: [
    {
      name: "core-not-to-app",
      comment: "core/ is the base layer and must not import routes or shared UI (core/components is UI and may)",
      severity: "error",
      from: { path: "^core/", pathNot: "^core/components/" },
      to: { path: "^(app|components)/" },
    },
    {
      name: "domain-is-pure",
      comment: "domain/ holds pure functions: no services, no Mongoose, no Next, no React",
      severity: "error",
      from: { path: "^(modules/[^/]+|core)/domain/" },
      to: { path: ["/services/", "^core/db/", "^app/"], dependencyTypes: ["local"] },
    },
    {
      name: "domain-no-io-packages",
      severity: "error",
      from: { path: "/domain/" },
      to: { path: "node_modules/(mongoose|next|react|react-dom)/" },
    },
    {
      name: "not-to-test",
      severity: "error",
      from: { pathNot: "^tests/" },
      to: { path: "^tests/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    exclude: { path: "^(extension|public|graphify-out|\\.next|node_modules)/" },
    includeOnly: "^(app|components|core|modules|tests|proxy\\.ts)",
  },
};
