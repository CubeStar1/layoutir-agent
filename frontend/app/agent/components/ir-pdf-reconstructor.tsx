"use client";

import { useMemo, useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  BlobProvider,
} from "@react-pdf/renderer";
import {
  Loader2Icon,
  ZoomInIcon,
  ZoomOutIcon,
  DownloadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ───────────────────────────────────────────────────────────────────

interface IRBlock {
  block_id: string;
  type: string;
  content?: string;
  content_preview?: string;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    page_width: number | null;
    page_height: number | null;
  };
  page_number?: number;
  order: number;
  metadata?: { label?: string };
  label?: string;
  level?: number | null;
  list_level?: number | null;
}

interface IrPdfReconstructorProps {
  blocks: IRBlock[];
}

// ── Font registration ───────────────────────────────────────────────────────

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.ttf",
      fontWeight: 600,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf",
      fontWeight: 700,
    },
  ],
});

// Disable hyphenation for cleaner output
Font.registerHyphenationCallback((word) => [word]);

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 64,
    fontFamily: "Inter",
    fontSize: 10.5,
    lineHeight: 1.6,
    color: "#1a1a1a",
  },
  h1: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 10,
    marginTop: 18,
    color: "#111",
  },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 16,
    color: "#222",
  },
  h3: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    marginTop: 12,
    color: "#333",
  },
  paragraph: {
    marginBottom: 8,
    textAlign: "justify" as const,
  },
  listItem: {
    flexDirection: "row" as const,
    marginBottom: 4,
    paddingLeft: 8,
  },
  listBullet: {
    width: 14,
    fontSize: 10.5,
    color: "#555",
  },
  listContent: {
    flex: 1,
  },
  tableContainer: {
    marginBottom: 10,
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: "#ccc",
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  tableCell: {
    flex: 1,
    padding: 4,
    fontSize: 9,
    borderRightWidth: 0.5,
    borderRightColor: "#eee",
  },
  imagePlaceholder: {
    height: 80,
    backgroundColor: "#f5f5f5",
    borderWidth: 0.5,
    borderColor: "#ddd",
    borderRadius: 2,
    marginBottom: 8,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  imagePlaceholderText: {
    fontSize: 9,
    color: "#999",
  },
  pageNumber: {
    position: "absolute" as const,
    bottom: 28,
    left: 0,
    right: 0,
    textAlign: "center" as const,
    fontSize: 9,
    color: "#999",
  },
});

// ── Block renderers ─────────────────────────────────────────────────────────

function HeadingBlock({ block }: { block: IRBlock }) {
  const level = block.level || 1;
  const text = block.content || block.content_preview || "";
  const style = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
  return <Text style={style}>{text}</Text>;
}

function ParagraphBlock({ block }: { block: IRBlock }) {
  const text = block.content || block.content_preview || "";
  return <Text style={styles.paragraph}>{text}</Text>;
}

function ListBlock({ block }: { block: IRBlock }) {
  const text = block.content || block.content_preview || "";
  // Split on newlines to handle multi-line list content
  const items = text.split(/\n/).filter((l) => l.trim());
  if (items.length <= 1) {
    return (
      <View style={styles.listItem}>
        <Text style={styles.listBullet}>•</Text>
        <Text style={styles.listContent}>{text}</Text>
      </View>
    );
  }
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={styles.listItem}>
          <Text style={styles.listBullet}>•</Text>
          <Text style={styles.listContent}>
            {item.replace(/^[-•*]\s*/, "")}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TableBlock({ block }: { block: IRBlock }) {
  const text = block.content || block.content_preview || "";
  // Best-effort: try to parse markdown-ish table or just show as text
  const lines = text.split(/\n/).filter((l) => l.trim() && !l.match(/^[-|]+$/));
  if (lines.length === 0) return <Text style={styles.paragraph}>{text}</Text>;

  const rows = lines.map((line) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
  );

  return (
    <View style={styles.tableContainer}>
      {rows.map((cells, ri) => (
        <View key={ri} style={styles.tableRow}>
          {cells.map((cell, ci) => (
            <Text
              key={ci}
              style={[
                styles.tableCell,
                ri === 0 ? { fontWeight: 600, backgroundColor: "#f9f9f9" } : {},
              ]}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ImageBlock({ block }: { block: IRBlock }) {
  const label =
    block.metadata?.label || block.label || "Image";
  return (
    <View style={styles.imagePlaceholder}>
      <Text style={styles.imagePlaceholderText}>[{label}]</Text>
    </View>
  );
}

function RenderBlock({ block }: { block: IRBlock }) {
  const label = block.metadata?.label || block.label || "";
  const type = block.type;

  if (type === "heading" || label === "section_header") {
    return <HeadingBlock block={block} />;
  }
  if (type === "list" || label === "list_item") {
    return <ListBlock block={block} />;
  }
  if (type === "table") {
    return <TableBlock block={block} />;
  }
  if (type === "image") {
    return <ImageBlock block={block} />;
  }
  return <ParagraphBlock block={block} />;
}

// ── PDF Document ────────────────────────────────────────────────────────────

function ReconstructedDocument({ blocks }: { blocks: IRBlock[] }) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);

  // Group by page_number if present; otherwise everything on page 1
  const pages = new Map<number, IRBlock[]>();
  for (const block of sorted) {
    const pg = block.page_number || 1;
    if (!pages.has(pg)) pages.set(pg, []);
    pages.get(pg)!.push(block);
  }

  const pageNumbers = Array.from(pages.keys()).sort((a, b) => a - b);

  return (
    <Document title="Reconstructed Document" author="LayoutIR Agent">
      {pageNumbers.map((pg) => (
        <Page key={pg} size="A4" style={styles.page} wrap>
          {pages.get(pg)!.map((block) => (
            <RenderBlock key={block.block_id} block={block} />
          ))}
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
            fixed
          />
        </Page>
      ))}
    </Document>
  );
}

// ── Main exported component ─────────────────────────────────────────────────

export function IrPdfReconstructor({ blocks }: IrPdfReconstructorProps) {
  const [scale, setScale] = useState(1);

  // Memoize the document element so BlobProvider doesn't re-render needlessly
  const doc = useMemo(
    () => <ReconstructedDocument blocks={blocks} />,
    [blocks]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <BlobProvider document={doc}>
        {({ url, loading, error }) => {
          if (loading) {
            return (
              <div className="flex h-full items-center justify-center">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Generating PDF…
                </span>
              </div>
            );
          }

          if (error) {
            return (
              <div className="flex h-full items-center justify-center">
                <span className="text-sm text-red-500">
                  Failed to generate PDF: {error.message}
                </span>
              </div>
            );
          }

          if (!url) return null;

          return (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-1 border-b px-3 py-1.5 shrink-0 bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
                  disabled={scale <= 0.5}
                >
                  <ZoomOutIcon className="size-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setScale((s) => Math.min(2.0, s + 0.15))}
                  disabled={scale >= 2.0}
                >
                  <ZoomInIcon className="size-3.5" />
                </Button>

                <div className="flex-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  asChild
                >
                  <a href={url} download="reconstructed.pdf">
                    <DownloadIcon className="size-3.5" />
                    Download
                  </a>
                </Button>
              </div>

              {/* PDF preview */}
              <div className="flex-1 overflow-hidden bg-muted/20">
                <iframe
                  src={url}
                  title="Reconstructed PDF Preview"
                  className="border-0"
                  style={{
                    width: `${100 * scale}%`,
                    height: `${100 * scale}%`,
                    transform: `scale(${1 / scale})`,
                    transformOrigin: "top left",
                  }}
                />
              </div>
            </>
          );
        }}
      </BlobProvider>
    </div>
  );
}
