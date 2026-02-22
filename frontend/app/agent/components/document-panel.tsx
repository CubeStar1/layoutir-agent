"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { DocumentState } from "./agent-view";
import { IRBlockViewer } from "./ir-block-viewer";
import {
  FileIcon,
  UploadCloudIcon,
  Loader2Icon,
  CheckCircle2Icon,
  FileTextIcon,
  HashIcon,
  LayersIcon,
  LayoutIcon,
  FileOutputIcon,
} from "lucide-react";

// Dynamic imports — these use browser APIs that crash during SSR
const PdfBboxViewer = dynamic(
  () => import("./pdf-bbox-viewer").then((mod) => mod.PdfBboxViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <span className="ml-2 text-sm text-muted-foreground">Loading viewer...</span>
      </div>
    ),
  }
);

const IrPdfReconstructor = dynamic(
  () => import("./ir-pdf-reconstructor/index").then((mod) => mod.IrPdfReconstructor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <span className="ml-2 text-sm text-muted-foreground">Generating PDF...</span>
      </div>
    ),
  }
);
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentPanelProps {
  documentState: DocumentState;
}

export function DocumentPanel({ documentState }: DocumentPanelProps) {
  const irData = useMemo(() => {
    if (!documentState.irJson) return null;
    try {
      return JSON.parse(documentState.irJson);
    } catch {
      return null;
    }
  }, [documentState.irJson]);

  // Build PDF URL from the file path
  const pdfUrl = useMemo(() => {
    if (!documentState.filePath) return null;
    // Extract just the filename from the absolute path
    const parts = documentState.filePath.replace(/\\/g, "/").split("/");
    const filename = parts[parts.length - 1];
    return `/api/agent/file?path=${encodeURIComponent(filename)}`;
  }, [documentState.filePath]);

  // State 1: No document uploaded yet
  if (!documentState.filePath && !documentState.irJson) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 bg-muted/30">
        <div className="rounded-full bg-muted p-6">
          <UploadCloudIcon className="size-10 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Document Loaded</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Upload a PDF using the chat panel to see its intermediate
            representation here.
          </p>
        </div>
      </div>
    );
  }

  // State 2: File uploaded, agent is actively converting (no documentId yet)
  if (documentState.filePath && !documentState.documentId && !irData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 bg-muted/30">
        {documentState.isAgentWorking ? (
          <>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
              <span className="text-sm">Converting document...</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              <FileIcon className="size-4 text-muted-foreground" />
              <span className="text-sm">
                {documentState.fileName || "Document"}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-full bg-muted p-4">
              <FileTextIcon className="size-8 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              <FileIcon className="size-4 text-muted-foreground" />
              <span className="text-sm">
                {documentState.fileName || "Document"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs text-center">
              File uploaded. Ask the agent to convert it to IR.
            </p>
          </>
        )}
      </div>
    );
  }

  // State 3: Document converted (we have documentId) but IR not fetched yet
  if (documentState.documentId && !irData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 bg-muted/30">
        <div className="rounded-full bg-emerald-500/10 p-4">
          <CheckCircle2Icon className="size-8 text-emerald-500" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Document Converted</h3>
          <div className="mt-2 flex items-center gap-2 rounded-md bg-muted px-3 py-2 mx-auto">
            <FileIcon className="size-4 text-muted-foreground" />
            <span className="text-sm">
              {documentState.fileName || "Document"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <HashIcon className="size-3 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">
              {documentState.documentId.slice(0, 16)}…
            </span>
          </div>
        </div>
        {documentState.isAgentWorking ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            <span className="text-xs">Fetching IR structure...</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground max-w-xs text-center">
            IR structure will appear here once the agent reads it.
          </p>
        )}
      </div>
    );
  }

  // State 4: IR loaded — show tabbed view
  if (irData) {
    const blockCount = irData.blocks?.length || 0;
    const pageCount = irData.blocks
      ? new Set(
          irData.blocks
            .map((b: any) => b.page_number)
            .filter((p: any) => p != null)
        ).size
      : 0;

    return (
      <div className="flex h-full flex-col overflow-hidden">
        <Tabs defaultValue="blocks" className="flex h-full flex-col">
          {/* Header with tabs */}
          <div className="flex items-center justify-between border-b px-4 py-0 shrink-0">
            <TabsList className="h-10 bg-transparent p-0 gap-0">
              <TabsTrigger
                value="blocks"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none h-10 px-3 text-xs"
              >
                <LayersIcon className="size-3 mr-1.5" />
                Blocks
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-[10px] px-1 py-0 h-4"
                >
                  {blockCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="document"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none h-10 px-3 text-xs"
              >
                <LayoutIcon className="size-3 mr-1.5" />
                Document
                {pageCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-[10px] px-1 py-0 h-4"
                  >
                    {pageCount}p
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="reconstruct"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none h-10 px-3 text-xs"
              >
                <FileOutputIcon className="size-3 mr-1.5" />
                Reconstruct
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {documentState.fileName || "Document"}
              </span>
              {irData.document_id && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {irData.document_id.slice(0, 12)}…
                </span>
              )}
            </div>
          </div>

          {/* Tab: Blocks */}
          <TabsContent value="blocks" className="flex-1 overflow-y-auto p-4 mt-0">
            <IRBlockViewer blocks={irData.blocks || []} />
          </TabsContent>

          {/* Tab: Document with bounding boxes */}
          <TabsContent value="document" className="flex-1 overflow-hidden mt-0">
            {pdfUrl ? (
              <PdfBboxViewer
                pdfUrl={pdfUrl}
                blocks={irData.blocks || []}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  PDF file not available for preview.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Reconstructed PDF from IR blocks */}
          <TabsContent value="reconstruct" className="flex-1 overflow-hidden mt-0">
            <IrPdfReconstructor blocks={irData.blocks || []} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return null;
}
