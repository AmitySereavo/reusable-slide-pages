export type AnnotatedTextAnnotationKind =
  | "definition"
  | "product"
  | "url"
  | "video"
  | "note";

export type AnnotatedTextSegment =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "annotation";
      text: string;
      kind: AnnotatedTextAnnotationKind;
      id: string;
    };

export type AnnotatedTextBlock =
  | {
      type: "heading";
      level: 1 | 2;
      text: string;
    }
  | {
      type: "line";
      segments: AnnotatedTextSegment[];
      timing?: AnnotatedTextTiming;
    }
  | {
      type: "break";
    };

export type AnnotatedTextTiming = {
  startSeconds: number;
  endSeconds?: number;
};

export type AnnotatedTextCatalogItem = {
  id: string;
  type: AnnotatedTextAnnotationKind;
  title: string;
  body?: string;
  imageUrl?: string;
  priceLabel?: string;
  url?: string;
  buttonLabel?: string;
};

export type AnnotatedTextCatalog = Record<string, AnnotatedTextCatalogItem>;

const annotationPattern =
  /\[\[([^\]|]+)\|(definition|product|url|video|note):([^\]]+)\]\]/g;

export function parseAnnotatedText(input: string): AnnotatedTextBlock[] {
  return input.split(/\r?\n/).map((rawLine) => parseAnnotatedTextLine(rawLine));
}

function parseAnnotatedTextLine(rawLine: string): AnnotatedTextBlock {
  const line = rawLine.trimEnd();

  if (!line.trim()) {
    return { type: "break" };
  }

  if (line.startsWith("## ")) {
    return {
      type: "heading",
      level: 2,
      text: line.replace(/^##\s+/, "").trim(),
    };
  }

  if (line.startsWith("# ")) {
    return {
      type: "heading",
      level: 1,
      text: line.replace(/^#\s+/, "").trim(),
    };
  }

  const { timing, text } = parseTimingPrefix(line);

  return {
    type: "line",
    segments: parseAnnotatedTextSegments(text),
    timing,
  };
}

function parseTimingPrefix(line: string): {
  timing?: AnnotatedTextTiming;
  text: string;
} {
  const match = line.match(
    /^\[((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d{1,3})?(?:\s*-->\s*(?:(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d{1,3})?))?)\]\s*(.*)$/
  );

  if (!match) {
    return { text: line };
  }

  const [, timingPrefix, rawText] = match;
  const timingParts = timingPrefix
    .split("-->")
    .map((part) => part.trim());
  const startSeconds = parseTimestampToSeconds(timingParts[0]);
  const endSeconds = timingParts[1]
    ? parseTimestampToSeconds(timingParts[1])
    : undefined;

  if (startSeconds === null || endSeconds === null) {
    return { text: line };
  }

  return {
    timing: {
      startSeconds,
      endSeconds,
    },
    text: rawText,
  };
}

function parseTimestampToSeconds(value: string) {
  const parts = value.split(":").map((part) => part.trim());

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const numericParts = parts.map(Number);

  if (numericParts.some((part) => !Number.isFinite(part) || part < 0)) {
    return null;
  }

  if (numericParts.length === 2) {
    const [minutes, seconds] = numericParts;
    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = numericParts;
  return hours * 3600 + minutes * 60 + seconds;
}

function parseAnnotatedTextSegments(line: string): AnnotatedTextSegment[] {
  const segments: AnnotatedTextSegment[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(annotationPattern)) {
    const [fullMatch, text, kind, id] = match;
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        text: line.slice(lastIndex, matchIndex),
      });
    }

    segments.push({
      type: "annotation",
      text,
      kind: kind as AnnotatedTextAnnotationKind,
      id: id.trim(),
    });

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < line.length) {
    segments.push({
      type: "text",
      text: line.slice(lastIndex),
    });
  }

  return segments.length ? segments : [{ type: "text", text: line }];
}
