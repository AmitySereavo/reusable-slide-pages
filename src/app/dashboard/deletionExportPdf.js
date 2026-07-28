"use client";

function escapePdfText(value) {
  return String(value || "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(line, maxLength = 92) {
  const value = String(line || "");
  if (value.length <= maxLength) return [value];

  const words = value.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxLength) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [value.slice(0, maxLength)];
}

function flattenRecordLines(record) {
  return JSON.stringify(record, null, 2)
    .split(/\r?\n/)
    .flatMap((line) => wrapLine(line));
}

function createPdfBlob({ title, record }) {
  const createdAt = new Date().toLocaleString();
  const lines = [
    title,
    `Exported before deletion: ${createdAt}`,
    "",
    ...flattenRecordLines(record),
  ];
  const linesPerPage = 58;
  const pages = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  const objects = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pages
      .map((_, index) => `${3 + index * 2} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`
  );

  pages.forEach((pageLines, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectNumber} 0 R >>`
    );

    const streamLines = [
      "BT",
      "/F1 10 Tf",
      "50 748 Td",
      "14 TL",
      ...pageLines.flatMap((line, lineIndex) => [
        lineIndex === 0 ? "" : "T*",
        `(${escapePdfText(line)}) Tj`,
      ]),
      "ET",
    ].filter(Boolean);
    const stream = streamLines.join("\n");

    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function sanitizeFilename(value) {
  return String(value || "deletion-record")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function getDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}-${hour}${minute}`;
}

export function makeDeletionExportFilename(parts) {
  const usefulParts = Array.isArray(parts)
    ? parts.map((part) => String(part || "").trim()).filter(Boolean)
    : [String(parts || "").trim()].filter(Boolean);

  return sanitizeFilename([
    "PRE-DELETE-EXPORT",
    ...usefulParts,
    getDateStamp(),
  ].join("-"));
}

export function downloadDeletionRecordPdf({ title, filename, record }) {
  const blob = createPdfBlob({ title, record });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFilename(filename)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
