import path from "node:path";
import { globSync as findDirectories } from "tinyglobby";

// Next's ESLint plugin only uses globSync(pattern, { onlyDirectories: true }).
// Replace its vulnerable fast-glob -> micromatch -> braces chain, retaining
// directory, relative-path and absolute-path behavior for rootDir settings.
// The root file dependency anchors the scoped override to this repository.
export function globSync(pattern, options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const absolutePattern = path.isAbsolute(pattern);
  const relativePattern = absolutePattern
    ? path.relative(cwd, pattern).replaceAll("\\", "/") || "."
    : pattern;
  return findDirectories(relativePattern, {
    ...options,
    cwd,
    absolute: false,
    expandDirectories: false,
  }).map((match) => {
    const directory = match.replace(/\/+$/, "") || ".";
    return (options.absolute ?? absolutePattern) ? path.resolve(cwd, directory) : directory;
  });
}
