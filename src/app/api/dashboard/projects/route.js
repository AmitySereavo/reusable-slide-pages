import { NextResponse } from "next/server";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { parseQuestionnaireDsl } from "@/lib/questionnaire/parser";

const questionnairesDir = path.join(
  process.cwd(),
  "src",
  "config",
  "questionnaires"
);

export async function POST(request) {
  // Dev mode: project builder writes are intentionally ungated while the
  // dashboard is being built. Restore main-admin auth before production launch.
  const body = await request.json().catch(() => null);
  const slug = sanitizeSlug(body?.slug);
  const dsl = typeof body?.dsl === "string" ? body.dsl : "";

  if (!slug) {
    return NextResponse.json({ error: "A valid slug is required." }, { status: 400 });
  }

  if (!dsl.trim()) {
    return NextResponse.json({ error: "DSL content is required." }, { status: 400 });
  }

  const parsed = parseQuestionnaireDsl(dsl);

  if (!parsed.slides.length) {
    return NextResponse.json(
      { error: "DSL must include at least one valid slide." },
      { status: 400 }
    );
  }

  const fileName = `${toPascalish(slug)}Dsl.txt`;
  const filePath = path.join(questionnairesDir, fileName);
  const relativePath = `src/config/questionnaires/${fileName}`;

  if (!filePath.startsWith(questionnairesDir)) {
    return NextResponse.json({ error: "Invalid destination." }, { status: 400 });
  }

  await mkdir(questionnairesDir, { recursive: true });
  await writeFile(filePath, dsl.endsWith("\n") ? dsl : `${dsl}\n`, {
    encoding: "utf8",
    flag: "wx",
  }).catch((error) => {
    if (error?.code === "EEXIST") {
      throw new Error("A DSL file already exists for this slug.");
    }

    throw error;
  });

  return NextResponse.json({
    ok: true,
    path: relativePath,
    slideCount: parsed.slides.length,
  });
}

function sanitizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toPascalish(slug) {
  const parts = String(slug || "project")
    .split("-")
    .filter(Boolean);
  const [first = "project", ...rest] = parts;

  return `${first}${rest
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}`;
}
