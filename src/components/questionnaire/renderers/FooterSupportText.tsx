"use client";

import { useEffect, useState } from "react";
import styles from "../QuestionnaireShell.module.css";

type FooterSupportTextProps = {
  sourceUrl: string;
  startText?: string;
};

export default function FooterSupportText({
  sourceUrl,
  startText,
}: FooterSupportTextProps) {
  const [supportLines, setSupportLines] = useState<string[]>([]);

  useEffect(() => {
    if (!sourceUrl) {
      setSupportLines([]);
      return;
    }

    let canceled = false;

    fetch(sourceUrl)
      .then((response) => {
        const contentType = response.headers.get("content-type") ?? "";

        if (
          !response.ok ||
          (!contentType.includes("text/plain") &&
            !contentType.includes("application/octet-stream"))
        ) {
          return "";
        }

        return response.text();
      })
      .then((rawText) => {
        if (canceled) {
          return;
        }

        if (
          !rawText.trim() ||
          /^\s*<!doctype\s+html/i.test(rawText) ||
          /^\s*<html[\s>]/i.test(rawText)
        ) {
          setSupportLines([]);
          return;
        }

        const footerSectionMatch = rawText.match(
          /^\[footer\]\s*([\s\S]*?)(?=^\[[^\]\r\n]+\]\s*$|$)/im
        );
        const sourceText = footerSectionMatch?.[1] ?? rawText;
        const normalizedStart = footerSectionMatch
          ? ""
          : startText?.trim().toLowerCase();
        const lines = sourceText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        if (normalizedStart) {
          const startIndex = lines.findIndex((line) =>
            line.toLowerCase().includes(normalizedStart)
          );

          setSupportLines(
            splitSupportTextLines(
              (startIndex >= 0 ? lines.slice(startIndex) : lines).join(" ")
            )
          );
          return;
        }

        setSupportLines(splitSupportTextLines(lines.join(" ")));
      })
      .catch(() => {
        if (!canceled) {
          setSupportLines([]);
        }
      });

    return () => {
      canceled = true;
    };
  }, [sourceUrl, startText]);

  if (!supportLines.length) {
    return null;
  }

  return (
    <div className={styles.slideFooterSupportText}>
      {supportLines.map((line, index) => (
        <p key={`${line}-${index}`}>{line}</p>
      ))}
    </div>
  );
}

function splitSupportTextLines(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
