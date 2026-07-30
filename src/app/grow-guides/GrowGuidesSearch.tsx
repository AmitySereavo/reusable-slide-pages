"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type GrowGuideSummary = {
  href: string;
  title: string;
  description: string;
  image: string;
  keywords?: string[];
};

type GrowGuidesSearchProps = {
  guides: GrowGuideSummary[];
};

export default function GrowGuidesSearch({ guides }: GrowGuidesSearchProps) {
  const [query, setQuery] = useState("");

  const filteredGuides = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return guides;

    return guides.filter((guide) => {
      const haystack = [
        guide.title,
        guide.description,
        ...(guide.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [guides, query]);

  return (
    <section style={styles.section} aria-label="Available grow guides">
      <label style={styles.searchLabel}>
        <span style={styles.searchTitle}>Search grow guides</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by plant, herb, seedling, pest, or crop..."
          style={styles.searchInput}
        />
      </label>

      <div style={styles.resultCount}>
        {filteredGuides.length === 1
          ? "1 guide found"
          : `${filteredGuides.length} guides found`}
      </div>

      {filteredGuides.length > 0 ? (
        <div style={styles.grid}>
          {filteredGuides.map((guide) => (
            <Link key={guide.href} href={guide.href} style={styles.card}>
              <img src={guide.image} alt="" style={styles.image} />
              <span style={styles.cardTitle}>{guide.title}</span>
              <span style={styles.cardCopy}>{guide.description}</span>
              <span style={styles.cardAction}>Open guide</span>
            </Link>
          ))}
        </div>
      ) : (
        <p style={styles.empty}>
          No matching guide yet. Try another plant name or browse all products.
        </p>
      )}
    </section>
  );
}

const styles = {
  section: {
    margin: "34px auto 0",
    maxWidth: "980px",
  },
  searchLabel: {
    display: "grid",
    gap: "8px",
  },
  searchTitle: {
    color: "#7B3F2A",
    fontWeight: 900,
  },
  searchInput: {
    background: "rgba(255, 255, 255, 0.9)",
    border: "1px solid rgba(123, 63, 42, 0.34)",
    borderRadius: "8px",
    color: "#241F1A",
    font: "inherit",
    fontSize: "1rem",
    padding: "14px 16px",
    width: "100%",
  },
  resultCount: {
    color: "#5E5144",
    fontWeight: 700,
    margin: "12px 0 16px",
  },
  grid: {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  card: {
    background: "rgba(255, 255, 255, 0.82)",
    border: "1px solid rgba(123, 63, 42, 0.25)",
    borderRadius: "8px",
    color: "inherit",
    display: "grid",
    gap: "10px",
    padding: "14px",
    textDecoration: "none",
  },
  image: {
    aspectRatio: "4 / 3",
    borderRadius: "6px",
    objectFit: "cover" as const,
    width: "100%",
  },
  cardTitle: {
    color: "#2F6F3E",
    fontSize: "1.25rem",
    fontWeight: 900,
    lineHeight: 1.1,
  },
  cardCopy: {
    color: "#5E5144",
    lineHeight: 1.4,
  },
  cardAction: {
    color: "#7B3F2A",
    fontWeight: 800,
    marginTop: "4px",
  },
  empty: {
    background: "rgba(255, 255, 255, 0.82)",
    border: "1px solid rgba(123, 63, 42, 0.25)",
    borderRadius: "8px",
    color: "#5E5144",
    lineHeight: 1.45,
    margin: 0,
    padding: "18px",
  },
};
