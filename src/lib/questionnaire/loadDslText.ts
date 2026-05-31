import fs from "node:fs/promises";
import path from "node:path";

const QUESTIONNAIRE_DSL_ROOT = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "src",
  "config",
  "questionnaires"
);

export async function loadDslText(relativePathFromProjectRoot: string) {
  const normalizedRelativePath = relativePathFromProjectRoot.replace(/\\/g, "/");
  const fileName = path.basename(normalizedRelativePath);

  const absolutePath = path.join(QUESTIONNAIRE_DSL_ROOT, fileName);
  const content = await fs.readFile(absolutePath, "utf8");

  return content;
}