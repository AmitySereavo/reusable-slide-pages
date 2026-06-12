"use client";

import { useEffect, useMemo, useState } from "react";
import { Slide, ThemeConfig } from "@/types/questionnaire";
import {
  AnnotatedTextCatalogItem,
  AnnotatedTextSegment,
  parseAnnotatedText,
} from "@/lib/questionnaire/annotatedText";
import { getAnnotatedTextCatalog } from "@/config/annotatedText/escapeAnnotations";

type Props = {
  slide: Slide;
  theme: ThemeConfig;
};

export default function AnnotatedTextSlideRenderer({ slide, theme }: Props) {
  const [sourceText, setSourceText] = useState("");
  const [loadError, setLoadError] = useState("");
  const [openAnnotationKey, setOpenAnnotationKey] = useState("");

  const catalog = useMemo(
    () => getAnnotatedTextCatalog(slide.annotationCatalogKey),
    [slide.annotationCatalogKey]
  );

  const blocks = useMemo(() => parseAnnotatedText(sourceText), [sourceText]);

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
      }}
    >
      {blocks.map((block, blockIndex) => {
        if (block.type === "break") {
          return <div key={`break-${blockIndex}`} style={{ height: 12 }} />;
        }

        if (block.type === "heading") {
          const HeadingTag = block.level === 1 ? "h2" : "h3";

          return (
            <HeadingTag
              key={`heading-${blockIndex}`}
              style={{
                margin: block.level === 1 ? "18px 0 6px" : "14px 0 4px",
                color: theme.colors.primary,
              }}
            >
              {block.text}
            </HeadingTag>
          );
        }

        return (
          <div
            key={`line-${blockIndex}`}
            style={{
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
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
                    onClick={() =>
                      setOpenAnnotationKey(isOpen ? "" : annotationKey)
                    }
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
          </div>
        );
      })}
    </div>
  );
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