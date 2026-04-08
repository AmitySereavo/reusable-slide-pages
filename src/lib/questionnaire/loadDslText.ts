import fs from "node:fs/promises";
import path from "node:path";

const QUESTIONNAIRES_DIR = path.join(
  process.cwd(),
  "src",
  "config",
  "questionnaires"
);

export async function loadDslText(relativePathFromProjectRoot: string) {
  const fileName = path.basename(relativePathFromProjectRoot);
  const absolutePath = path.join(QUESTIONNAIRES_DIR, fileName);
  const content = await fs.readFile(absolutePath, "utf8");
  return content.trim();
}