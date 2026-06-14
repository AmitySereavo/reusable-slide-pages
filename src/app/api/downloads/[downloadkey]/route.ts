import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getDownloadCatalogItem } from "@/config/downloads/downloadCatalog";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import {
  getRequiredPurchasedItemForDownload,
  userHasPurchasedItem,
} from "@/lib/entitlements/purchasedItems";

export const runtime = "nodejs";

function encodeDownloadFileName(fileName: string) {
  return encodeURIComponent(fileName).replace(/['()]/g, escape);
}

function parseRangeHeader(rangeHeader: string, fileSize: number) {
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);

  if (!match) {
    return null;
  }

  const startText = match[1];
  const endText = match[2];

  if (!startText && !endText) {
    return null;
  }

  let start: number;
  let end: number;

  if (!startText) {
    const suffixLength = Number(endText);

    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }

    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number(startText);
    end = endText ? Number(endText) : fileSize - 1;
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(end, fileSize - 1),
  };
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
    return new Response("Download was not found.", { status: 404 });
  }

  const requiredPurchasedItem = getRequiredPurchasedItemForDownload(item);

  if (requiredPurchasedItem) {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return new Response("Log in to access this download.", { status: 401 });
    }

    const hasPurchasedItem = await userHasPurchasedItem(
      session.userId,
      requiredPurchasedItem
    );

    if (!hasPurchasedItem) {
      return new Response("Purchase is required to access this download.", {
        status: 403,
      });
    }
  }

  const normalizedFilePath = item.filePath.replace(/\\/g, "/");

  const allowedRoots = [
    {
      directory: "protected-media",
      prefix: "protected-media/",
    },
    {
      directory: "private-downloads",
      prefix: "private-downloads/",
    },
  ];

  const allowedRootMatch = allowedRoots.find(
    (root) =>
      normalizedFilePath === root.directory ||
      normalizedFilePath.startsWith(root.prefix)
  );

  if (!allowedRootMatch) {
    return new Response("Invalid download path.", { status: 403 });
  }

  const allowedRoot = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    allowedRootMatch.directory
  );

  const relativeFilePath =
    normalizedFilePath === allowedRootMatch.directory
      ? ""
      : normalizedFilePath.replace(allowedRootMatch.prefix, "");

  const absoluteFilePath = path.resolve(allowedRoot, relativeFilePath);

  const isInsideAllowedRoot =
    absoluteFilePath === allowedRoot ||
    absoluteFilePath.startsWith(`${allowedRoot}${path.sep}`);

  if (!isInsideAllowedRoot) {
    return new Response("Invalid download path.", { status: 403 });
  }

  try {
    const fileStats = await stat(absoluteFilePath);
    const fileSize = fileStats.size;
    const rangeHeader = request.headers.get("range");

    const baseHeaders = {
      "Content-Type": item.contentType,
      "Content-Disposition": `attachment; filename="${item.fileName}"; filename*=UTF-8''${encodeDownloadFileName(
        item.fileName
      )}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    };

    if (rangeHeader) {
      const range = parseRangeHeader(rangeHeader, fileSize);

      if (!range) {
        return new Response("Requested range is not satisfiable.", {
          status: 416,
          headers: {
            ...baseHeaders,
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = range.end - range.start + 1;
      const stream = createReadStream(absoluteFilePath, {
        start: range.start,
        end: range.end,
      });

      return new Response(
        Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>,
        {
          status: 206,
          headers: {
            ...baseHeaders,
            "Content-Length": String(chunkSize),
            "Content-Range": `bytes ${range.start}-${range.end}/${fileSize}`,
          },
        }
      );
    }

    const stream = createReadStream(absoluteFilePath);

    return new Response(
      Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>,
      {
        status: 200,
        headers: {
          ...baseHeaders,
          "Content-Length": String(fileSize),
        },
      }
    );
  } catch {
    return new Response(
      `Download file is not available at path: ${item.filePath}`,
      { status: 404 }
    );
  }
}
