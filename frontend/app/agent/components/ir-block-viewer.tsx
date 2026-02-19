"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface IRBlock {
  block_id: string;
  type: string;
  content?: string;
  content_preview?: string;
  order: number;
  page_number?: number;
  metadata?: {
    label?: string;
  };
  label?: string;
  level?: number | null;
  parent_id?: string | null;
}

interface IRBlockViewerProps {
  blocks: IRBlock[];
}

const TYPE_COLORS: Record<string, string> = {
  heading: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  paragraph: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/20",
  list: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  table: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  image: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS.paragraph;
}

function BlockCard({ block }: { block: IRBlock }) {
  const [isOpen, setIsOpen] = useState(false);
  const label = block.metadata?.label || block.label || block.type;
  const isHeading = block.type === "heading" || label === "section_header";
  const text = block.content || block.content_preview || "";
  const preview = text.slice(0, 120);
  const hasMore = text.length > 120;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "group rounded-lg border bg-card transition-colors hover:bg-accent/50",
          isHeading && "border-l-2 border-l-blue-500"
        )}
      >
        <CollapsibleTrigger className="flex w-full items-start gap-3 p-3 text-left">
          <ChevronRightIcon
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-90"
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", getTypeColor(block.type))}
              >
                {label}
              </Badge>
              <span className="text-[10px] font-mono text-muted-foreground">
                #{block.order}
              </span>
              {block.page_number && (
                <span className="text-[10px] text-muted-foreground">
                  p.{block.page_number}
                </span>
              )}
            </div>
            <p
              className={cn(
                "text-sm leading-relaxed",
                isHeading && "font-semibold"
              )}
            >
              {preview}
              {hasMore && !isOpen && "…"}
            </p>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {hasMore && (
            <div className="px-3 pb-3 pl-10">
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {text}
              </p>
            </div>
          )}
          <div className="border-t px-3 py-2 pl-10">
            <code className="text-[10px] font-mono text-muted-foreground select-all">
              {block.block_id}
            </code>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function IRBlockViewer({ blocks }: IRBlockViewerProps) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((block) => (
        <BlockCard key={block.block_id} block={block} />
      ))}
    </div>
  );
}
