"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Slide, ThemeConfig } from "@/types/questionnaire";
import {
  AnnotatedTextBlock,
  AnnotatedTextCatalogItem,
  AnnotatedTextSegment,
  parseAnnotatedText,
} from "@/lib/questionnaire/annotatedText";
import { getAnnotatedTextCatalog } from "@/config/annotatedText/escapeAnnotations";

type Props = {
  slide: Slide;
  theme: ThemeConfig;
  presentation?: "slide" | "panel";
  enableTimingRecorder?: boolean;
  mediaCurrentTimeSeconds?: number;
  onTimedLineClick?: (payload: {
    startSeconds: number;
    endSeconds?: number;
    playMode: TimedTextPlayMode;
  }) => void;
};

type TimedTextPlayMode = "continue" | "line";

const syncButtonStyle: CSSProperties = {
  border: "1px solid rgba(35, 31, 32, 0.22)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
  fontSize: 12,
  fontWeight: 800,
  padding: "5px 9px",
};

export default function AnnotatedTextSlideRenderer({
  slide,
  theme,
  presentation = "slide",
  enableTimingRecorder = false,
  mediaCurrentTimeSeconds,
  onTimedLineClick,
}: Props) {
  const [sourceText, setSourceText] = useState("");
  const [loadError, setLoadError] = useState("");
  const [openAnnotationKey, setOpenAnnotationKey] = useState("");
  const [timedTextPlayMode, setTimedTextPlayMode] =
    useState<TimedTextPlayMode>("continue");
  const [isSyncRecording, setIsSyncRecording] = useState(false);
  const [syncCursor, setSyncCursor] = useState(0);
  const [recordedLineTimings, setRecordedLineTimings] = useState<
    Record<number, { startSeconds: number; endSeconds?: number }>
  >({});
  const syncLineRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const catalog = useMemo(
    () => getAnnotatedTextCatalog(slide.annotationCatalogKey),
    [slide.annotationCatalogKey]
  );

  const blocks = useMemo(() => parseAnnotatedText(sourceText), [sourceText]);
  const sections = useMemo(() => buildAnnotatedTextSections(blocks), [blocks]);
  const hasTimedLines = useMemo(
    () => blocks.some((block) => block.type === "line" && block.timing),
    [blocks]
  );
  const syncableLineCount = useMemo(
    () =>
      blocks.filter(
        (block) =>
          block.type === "line" && getPlainTextFromSegments(block.segments).trim()
      ).length,
    [blocks]
  );
  const syncedText = useMemo(
    () => buildSyncedAnnotatedText(blocks, recordedLineTimings),
    [blocks, recordedLineTimings]
  );
  const syncLineOrdinalByBlockIndex = useMemo(
    () => buildSyncLineOrdinalByBlockIndex(blocks),
    [blocks]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadText() {
      setLoadError("");
      setSourceText("");

      if (!slide.annotatedTextSourceUrl) {
        setLoadError("No text source is configured for this slide.");
        return;
      }

      try {
        const response = await fetch(slide.annotatedTextSourceUrl);

        if (!response.ok) {
          throw new Error(`Text source failed with ${response.status}.`);
        }

        const text = await response.text();

        if (!cancelled) {
          setSourceText(text);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "The text source could not be loaded."
          );
        }
      }
    }

    void loadText();

    return () => {
      cancelled = true;
    };
  }, [slide.annotatedTextSourceUrl]);

  useEffect(() => {
    if (!enableTimingRecorder || !sourceText) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();

      recordSyncTick(mediaCurrentTimeSeconds);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    enableTimingRecorder,
    isSyncRecording,
    mediaCurrentTimeSeconds,
    sourceText,
    syncCursor,
    syncableLineCount,
  ]);

  useEffect(() => {
    if (!enableTimingRecorder) {
      return;
    }

    syncLineRefs.current[syncCursor]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [enableTimingRecorder, syncCursor]);

  function recordSyncTick(currentTime?: number) {
    if (typeof currentTime !== "number" || !Number.isFinite(currentTime)) {
      return;
    }

    if (!isSyncRecording) {
      setRecordedLineTimings((current) => ({
        ...current,
        [syncCursor]: {
          startSeconds: currentTime,
        },
      }));
      setIsSyncRecording(true);
      return;
    }

    setRecordedLineTimings((current) => {
      return {
        ...current,
        [syncCursor]: {
          ...(current[syncCursor] ?? { startSeconds: currentTime }),
          endSeconds: currentTime,
        },
      };
    });

    if (syncCursor + 1 >= syncableLineCount) {
      setIsSyncRecording(false);
      return;
    }

    setSyncCursor((current) => current + 1);
    setIsSyncRecording(false);
  }

  function stopSyncRecording(currentTime?: number) {
    if (!isSyncRecording) {
      return;
    }

    if (typeof currentTime === "number" && Number.isFinite(currentTime)) {
      setRecordedLineTimings((current) => ({
        ...current,
        [syncCursor]: {
          ...(current[syncCursor] ?? { startSeconds: currentTime }),
          endSeconds: currentTime,
        },
      }));
    }

    setIsSyncRecording(false);
  }

  if (loadError) {
    return (
      <div
        style={{
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 16,
          padding: 16,
          background: "#FFFFFF",
          color: theme.colors.text,
        }}
      >
        {loadError}
      </div>
    );
  }

  if (!sourceText) {
    return (
      <div style={{ color: theme.colors.subtitle ?? theme.colors.text }}>
        Loading text...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: slide.annotatedTextMode === "lyrics" ? 8 : 14,
        color: theme.colors.text,
        minHeight: 0,
        paddingBottom: presentation === "panel" ? 24 : undefined,
      }}
    >
      {hasTimedLines && onTimedLineClick ? (
        <div
          style={{
            display: "inline-flex",
            justifyContent: "center",
            gap: 8,
            margin: "4px 0 8px",
          }}
        >
          <TimedTextModeButton
            isActive={timedTextPlayMode === "continue"}
            label="Continue"
            onClick={() => setTimedTextPlayMode("continue")}
          />
          <TimedTextModeButton
            isActive={timedTextPlayMode === "line"}
            label="Line"
            onClick={() => setTimedTextPlayMode("line")}
          />
        </div>
      ) : null}

      {enableTimingRecorder ? (
        <div
          style={{
            border: "1px solid rgba(35, 31, 32, 0.16)",
            borderRadius: 8,
            display: "grid",
            gap: 8,
            margin: "2px 0 10px",
            padding: 10,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800 }}>
            Sync line {Math.min(syncCursor + 1, syncableLineCount)} of{" "}
            {syncableLineCount}
            {isSyncRecording ? " recording - press Space to stop" : " - press Space to record"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              onClick={() => recordSyncTick(mediaCurrentTimeSeconds)}
              style={syncButtonStyle}
            >
              {isSyncRecording ? "Stop Line" : "Record Line"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSyncRecording(false);
                setSyncCursor(0);
                setRecordedLineTimings({});
              }}
              style={syncButtonStyle}
            >
              Reset
            </button>
          </div>
          <textarea
            readOnly
            value={syncedText}
            rows={5}
            style={{
              border: "1px solid rgba(35, 31, 32, 0.18)",
              borderRadius: 6,
              boxSizing: "border-box",
              font: "12px/1.45 monospace",
              padding: 8,
              resize: "vertical",
              width: "100%",
            }}
          />
        </div>
      ) : null}

      {sections.map((section, sectionIndex) => (
        <section
          key={`section-${sectionIndex}`}
          style={{
            display: "grid",
            gap: slide.annotatedTextMode === "lyrics" ? 8 : 14,
            minHeight: 0,
          }}
        >
          {section.heading
            ? renderHeadingBlock(section.heading.block, section.heading.index, {
                presentation,
                theme,
              })
            : null}

          {section.blocks.map(({ block, index }) =>
            renderTextBlock(block, index, {
              catalog,
              enableTimingRecorder,
              mediaCurrentTimeSeconds,
              openAnnotationKey,
              onTimedLineClick,
              setSyncLineRef: (element) => {
                const ordinal = syncLineOrdinalByBlockIndex[index];

                if (typeof ordinal === "number") {
                  syncLineRefs.current[ordinal] = element;
                }
              },
              setOpenAnnotationKey,
              syncLineOrdinal: syncLineOrdinalByBlockIndex[index],
              theme,
              timedTextPlayMode,
              isCurrentSyncLine:
                syncLineOrdinalByBlockIndex[index] === syncCursor,
              isSyncRecording,
            })
          )}
        </section>
      ))}
    </div>
  );
}

type AnnotatedTextSection = {
  heading?: {
    block: Extract<AnnotatedTextBlock, { type: "heading" }>;
    index: number;
  };
  blocks: {
    block: Exclude<AnnotatedTextBlock, { type: "heading" }>;
    index: number;
  }[];
};

function buildAnnotatedTextSections(
  blocks: AnnotatedTextBlock[]
): AnnotatedTextSection[] {
  const sections: AnnotatedTextSection[] = [];

  blocks.forEach((block, index) => {
    if (block.type === "heading") {
      sections.push({
        heading: {
          block,
          index,
        },
        blocks: [],
      });
      return;
    }

    if (!sections.length) {
      sections.push({ blocks: [] });
    }

    sections[sections.length - 1].blocks.push({ block, index });
  });

  return sections;
}

function buildSyncLineOrdinalByBlockIndex(blocks: AnnotatedTextBlock[]) {
  const ordinals: Record<number, number> = {};
  let lineOrdinal = 0;

  blocks.forEach((block, blockIndex) => {
    if (
      block.type === "line" &&
      getPlainTextFromSegments(block.segments).trim()
    ) {
      ordinals[blockIndex] = lineOrdinal;
      lineOrdinal += 1;
    }
  });

  return ordinals;
}

function renderHeadingBlock(
  block: Extract<AnnotatedTextBlock, { type: "heading" }>,
  blockIndex: number,
  {
    presentation,
    theme,
  }: {
    presentation: "slide" | "panel";
    theme: ThemeConfig;
  }
) {
  const HeadingTag = block.level === 1 ? "h2" : "h3";

  return (
    <HeadingTag
      key={`heading-${blockIndex}`}
      style={{
        position: presentation === "panel" ? "sticky" : undefined,
        top: presentation === "panel" ? 0 : undefined,
        zIndex: presentation === "panel" ? 2 : undefined,
        margin: block.level === 1 ? "18px 0 6px" : "14px 0 4px",
        padding: presentation === "panel" ? "8px 0 6px" : undefined,
        background: presentation === "panel" ? "#FFFFFF" : undefined,
        color: theme.colors.primary,
      }}
    >
      {block.text}
    </HeadingTag>
  );
}

function renderTextBlock(
  block: Exclude<AnnotatedTextBlock, { type: "heading" }>,
  blockIndex: number,
  {
    catalog,
    enableTimingRecorder,
    isCurrentSyncLine,
    isSyncRecording,
    mediaCurrentTimeSeconds,
    openAnnotationKey,
    onTimedLineClick,
    setSyncLineRef,
    setOpenAnnotationKey,
    syncLineOrdinal,
    theme,
    timedTextPlayMode,
  }: {
    catalog: Record<string, AnnotatedTextCatalogItem>;
    enableTimingRecorder: boolean;
    isCurrentSyncLine: boolean;
    isSyncRecording: boolean;
    mediaCurrentTimeSeconds?: number;
    openAnnotationKey: string;
    onTimedLineClick?: (payload: {
      startSeconds: number;
      endSeconds?: number;
      playMode: TimedTextPlayMode;
    }) => void;
    setSyncLineRef: (element: HTMLDivElement | null) => void;
    setOpenAnnotationKey: (key: string) => void;
    syncLineOrdinal?: number;
    theme: ThemeConfig;
    timedTextPlayMode: TimedTextPlayMode;
  }
) {
  if (block.type === "break") {
    return <div key={`break-${blockIndex}`} style={{ height: 12 }} />;
  }

  const isTimed = Boolean(block.timing && onTimedLineClick);
  const isActive =
    typeof mediaCurrentTimeSeconds === "number" &&
    block.timing &&
    mediaCurrentTimeSeconds >= block.timing.startSeconds &&
    (typeof block.timing.endSeconds === "number"
      ? mediaCurrentTimeSeconds < block.timing.endSeconds
      : true);

  const lineContent = (
    <>
      {block.segments.map((segment, segmentIndex) => {
        if (segment.type === "text") {
          return (
            <span key={`text-${blockIndex}-${segmentIndex}`}>
              {segment.text}
            </span>
          );
        }

        const annotationKey = buildAnnotationKey(
          blockIndex,
          segmentIndex,
          segment
        );
        const isOpen = openAnnotationKey === annotationKey;
        const item = catalog[segment.id];

        return (
          <span key={annotationKey} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpenAnnotationKey(isOpen ? "" : annotationKey);
              }}
              style={{
                border: "none",
                borderBottom: `2px dotted ${theme.colors.primary}`,
                background: "transparent",
                color: theme.colors.primary,
                cursor: "pointer",
                font: "inherit",
                padding: 0,
              }}
            >
              {segment.text}
            </button>

            {isOpen ? (
              <AnnotationPanel
                item={item}
                fallbackSegment={segment}
                theme={theme}
              />
            ) : null}
          </span>
        );
      })}
    </>
  );

  return (
    <div
      ref={
        typeof syncLineOrdinal === "number" ? setSyncLineRef : undefined
      }
      key={`line-${blockIndex}`}
      style={{
        background:
          enableTimingRecorder && isCurrentSyncLine
            ? isSyncRecording
              ? "rgba(35, 31, 32, 0.14)"
              : "rgba(35, 31, 32, 0.08)"
            : undefined,
        borderRadius: enableTimingRecorder && isCurrentSyncLine ? 6 : undefined,
        lineHeight: 1.7,
        padding:
          enableTimingRecorder && typeof syncLineOrdinal === "number"
            ? "2px 4px"
            : undefined,
        whiteSpace: "pre-wrap",
      }}
    >
      {isTimed && block.timing ? (
        <button
          type="button"
          onClick={() =>
            onTimedLineClick?.({
              startSeconds: block.timing?.startSeconds ?? 0,
              endSeconds: block.timing?.endSeconds,
              playMode: timedTextPlayMode,
            })
          }
          style={{
            border: "none",
            borderRadius: 4,
            background: isActive ? "rgba(35, 31, 32, 0.08)" : "transparent",
            color: "inherit",
            cursor: "pointer",
            display: "block",
            font: "inherit",
            lineHeight: "inherit",
            padding: "2px 4px",
            textAlign: "left",
            whiteSpace: "pre-wrap",
            width: "100%",
          }}
        >
          {lineContent}
        </button>
      ) : (
        lineContent
      )}
    </div>
  );
}

function TimedTextModeButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid rgba(35, 31, 32, 0.22)",
        borderRadius: 999,
        background: isActive ? "#231f20" : "transparent",
        color: isActive ? "#FFFFFF" : "inherit",
        cursor: "pointer",
        font: "inherit",
        fontSize: 12,
        fontWeight: 800,
        padding: "5px 10px",
      }}
    >
      {label}
    </button>
  );
}

function buildSyncedAnnotatedText(
  blocks: AnnotatedTextBlock[],
  timingsByLineOrdinal: Record<number, { startSeconds: number; endSeconds?: number }>
) {
  let lineOrdinal = 0;

  return blocks
    .map((block) => {
      if (block.type === "heading") {
        return `${"#".repeat(block.level)} ${block.text}`;
      }

      if (block.type === "break") {
        return "";
      }

      const text = getPlainTextFromSegments(block.segments);

      if (!text.trim()) {
        return text;
      }

      const timing = timingsByLineOrdinal[lineOrdinal];
      lineOrdinal += 1;

      if (!timing) {
        return text;
      }

      const endLabel =
        typeof timing.endSeconds === "number"
          ? ` --> ${formatTimestamp(timing.endSeconds)}`
          : "";

      return `[${formatTimestamp(timing.startSeconds)}${endLabel}] ${text}`;
    })
    .join("\n");
}

function getPlainTextFromSegments(segments: AnnotatedTextSegment[]) {
  return segments.map((segment) => segment.text).join("");
}

function formatTimestamp(seconds: number) {
  const clampedSeconds = Math.max(0, seconds);
  const wholeSeconds = Math.floor(clampedSeconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const secondsPart = wholeSeconds % 60;
  const milliseconds = Math.round((clampedSeconds - wholeSeconds) * 1000);

  return `${String(minutes).padStart(2, "0")}:${String(secondsPart).padStart(
    2,
    "0"
  )}.${String(milliseconds).padStart(3, "0")}`;
}

function buildAnnotationKey(
  blockIndex: number,
  segmentIndex: number,
  segment: AnnotatedTextSegment
) {
  if (segment.type === "text") {
    return `${blockIndex}-${segmentIndex}-text`;
  }

  return `${blockIndex}-${segmentIndex}-${segment.kind}-${segment.id}`;
}

function AnnotationPanel({
  item,
  fallbackSegment,
  theme,
}: {
  item?: AnnotatedTextCatalogItem;
  fallbackSegment: Extract<AnnotatedTextSegment, { type: "annotation" }>;
  theme: ThemeConfig;
}) {
  const resolvedItem =
    item ??
    ({
      id: fallbackSegment.id,
      type: fallbackSegment.kind,
      title: fallbackSegment.text,
      body: "No annotation content is configured for this item yet.",
    } satisfies AnnotatedTextCatalogItem);

  return (
    <span
      style={{
        display: "block",
        margin: "10px 0 14px",
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 16,
        padding: 14,
        background: "#FFFFFF",
        color: theme.colors.text,
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
      }}
    >
      {resolvedItem.imageUrl ? (
        <img
          src={resolvedItem.imageUrl}
          alt=""
          style={{
            display: "block",
            width: "100%",
            maxWidth: 220,
            borderRadius: 12,
            marginBottom: 10,
          }}
        />
      ) : null}

      <strong style={{ display: "block", marginBottom: 6 }}>
        {resolvedItem.title}
      </strong>

      {resolvedItem.body ? (
        <span style={{ display: "block", marginBottom: 8 }}>
          {resolvedItem.body}
        </span>
      ) : null}

      {resolvedItem.priceLabel ? (
        <span
          style={{
            display: "block",
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          {resolvedItem.priceLabel}
        </span>
      ) : null}

      {resolvedItem.url ? (
        <a
          href={resolvedItem.url}
          target={
            resolvedItem.url.startsWith("http") ||
            resolvedItem.url.startsWith("/api/")
              ? "_blank"
              : undefined
          }
          rel={
            resolvedItem.url.startsWith("http") ||
            resolvedItem.url.startsWith("/api/")
              ? "noreferrer"
              : undefined
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            padding: "9px 14px",
            background: theme.colors.primary,
            color: "#FFFFFF",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          {resolvedItem.buttonLabel ?? "Open"}
        </a>
      ) : null}
    </span>
  );
}
