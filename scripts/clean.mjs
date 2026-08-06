import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
for (const directory of ["dist", "dist-server"]) {
  const target = path.resolve(root, directory);
  if (path.dirname(target) !== root) throw new Error(`Refusing to clean unexpected path: ${target}`);
  fs.rmSync(target, { recursive: true, force: true });
}

