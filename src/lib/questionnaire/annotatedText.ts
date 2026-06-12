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
    }
  | {
      type: "break";
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

  return {
    type: "line",
    segments: parseAnnotatedTextSegments(line),
  };
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