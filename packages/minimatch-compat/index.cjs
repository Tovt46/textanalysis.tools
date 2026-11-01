// ESLint 9 and its plugins still require minimatch's pre-v9 callable CommonJS
// entry point. Keep that entry shape while delegating all glob parsing and
// matching to patched minimatch 11 (GHSA-g3hv-75wg-m249), with no legacy parser.
// The TypeScript parser receives minimatch 11 directly through its own override.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Legacy consumers synchronously require this CommonJS entry.
const engine = require("minimatch-engine");
module.exports = Object.assign(engine.minimatch, engine);
// Explicit assignments also expose the named APIs to Node's ESM CJS interop.
module.exports.Minimatch = engine.Minimatch;
module.exports.minimatch = engine.minimatch;
module.exports.filter = engine.filter;
module.exports.defaults = engine.defaults;
module.exports.braceExpand = engine.braceExpand;
module.exports.match = engine.match;
module.exports.escape = engine.escape;
module.exports.unescape = engine.unescape;
module.exports.sep = engine.sep;
module.exports.GLOBSTAR = engine.GLOBSTAR;
