import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  downloadCatalog,
  getDownloadCatalogItem,
} from "@/config/downloads/downloadCatalog";
import { NextRequest } from "next/server";
export const runtime = "nodejs";

function encodeDownloadFileName(fileName: string) {
  return encodeURIComponent(fileName).replace(/['()]/g, escape);
}

function getDownloadKeyFromRequest(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);

  return parts[parts.length - 1] ?? "";
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ downloadkey: string }>;
  }
) {
  const params = await context.params;

  const downloadKey =
    params.downloadkey || getDownloadKeyFromRequest(request);
  if (!downloadKey) {
    return new Response("Download key is missing.", { status: 400 });
  }

  const item = getDownloadCatalogItem(downloadKey);

  if (!item) {
    return new Response(
      `Download key "${downloadKey}" was not found. Available keys: ${downloadCatalog
        .map((catalogItem) => catalogItem.key)
        .join(", ")}`,
      { status: 404 }
    );
  }

  const allowedRoot = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    "private-downloads"
  );

  const relativeFilePath = item.filePath
    .replace(/\\/g, "/")
    .replace(/^private-downloads\//, "");

  const absoluteFilePath = path.resolve(allowedRoot, relativeFilePath);

  const isInsideAllowedRoot =
    absoluteFilePath === allowedRoot ||
    absoluteFilePath.startsWith(`${allowedRoot}${path.sep}`);

  if (!isInsideAllowedRoot) {
    return new Response("Invalid download path.", { status: 403 });
  }

  try {
    const fileStats = await stat(absoluteFilePath);
    const stream = createReadStream(absoluteFilePath);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": item.contentType,
        "Content-Length": String(fileStats.size),
        "Content-Disposition": `attachment; filename="${item.fileName}"; filename*=UTF-8''${encodeDownloadFileName(
          item.fileName
        )}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(
      `Download file is not available at path: ${item.filePath}`,
      { status: 404 }
    );
  }
}