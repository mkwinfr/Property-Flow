import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : entry.name.endsWith(".tsx") ? [target] : [];
  });
}

describe("client UI conventions", () => {
  it("uses AppSelect instead of native select markup", () => {
    const violations = sourceFiles(path.join(process.cwd(), "src", "client"))
      .filter((file) => /<select\b|<option\b|<optgroup\b/.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));
    expect(violations).toEqual([]);
  });
});
