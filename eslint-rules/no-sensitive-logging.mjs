/**
 * Bans logging resume, profile, job-description or prompt text. It only inspects calls on `console`, `log` and
 * `logger`, so it is cheap. It flags a variable, shorthand property or template expression whose name says it holds
 * such text (`resume`, `profileText`, `prompt`, `jd`...). Counts and ids (`promptTokens`, `resumeId`) are fine.
 */
const LOGGERS = new Set(["console", "log", "logger"]);
const SENSITIVE = /^(resume|profile|prompt|jd|cv|resumetext|profiletext|jobdescription|fullprompt|resumebody)$/i;

function sensitiveName(node) {
  if (!node) return null;
  switch (node.type) {
    case "Identifier":
      return SENSITIVE.test(node.name) ? node.name : null;
    case "MemberExpression":
      // `base.resume`, `row.prompt`; `.text`/`.content` alone are too common to flag.
      return !node.computed && node.property.type === "Identifier" && SENSITIVE.test(node.property.name) ? node.property.name : sensitiveName(node.object);
    case "TemplateLiteral":
      for (const e of node.expressions) {
        const hit = sensitiveName(e);
        if (hit) return hit;
      }
      return null;
    case "ObjectExpression":
      for (const p of node.properties) {
        if (p.type === "SpreadElement") continue;
        const keyName = p.key?.type === "Identifier" ? p.key.name : null;
        if (keyName && SENSITIVE.test(keyName)) return keyName;
        const hit = sensitiveName(p.value);
        if (hit) return hit;
      }
      return null;
    case "BinaryExpression":
      return sensitiveName(node.left) ?? sensitiveName(node.right);
    case "CallExpression":
      for (const a of node.arguments) {
        const hit = sensitiveName(a);
        if (hit) return hit;
      }
      return null;
    default:
      return null;
  }
}

export default {
  meta: { type: "problem", schema: [], messages: { sensitive: "Do not log resume, profile, job-description or prompt text ('{{name}}'). Log counts, ids and kinds." } },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.object.type !== "Identifier" || !LOGGERS.has(callee.object.name)) return;
        for (const arg of node.arguments) {
          const name = sensitiveName(arg);
          if (name) context.report({ node: arg, messageId: "sensitive", data: { name } });
        }
      },
    };
  },
};
