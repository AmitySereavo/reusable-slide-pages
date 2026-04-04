import fs from "node:fs/promises";
import path from "node:path";

export async function loadDslText(relativePathFromProjectRoot: string) {
  const absolutePath = path.join(process.cwd(), relativePathFromProjectRoot);
  const content = await fs.readFile(absolutePath, "utf8");
  return content.trim();
}