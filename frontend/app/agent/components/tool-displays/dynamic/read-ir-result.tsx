'use client'

import { Layers, FileStack, FileJson } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useArtifact } from '../../../hooks/use-artifact'
import { DocumentPanel } from '../../document-artifact/document-panel'

export function ReadIrResult({ data, toolCallId }: { data: any; toolCallId?: string }) {
  const { showArtifact } = useArtifact();

  // Use toolCallId if provided, otherwise fallback to document_id (not ideal but safe)
  // We add a random suffix if no toolCallId to ensure different calls are different
  const instanceId = useRef(toolCallId || `legacy-${Math.random().toString(36).substring(7)}`);

  if (!data) return null

  const parsed = parseMCPOutput(data)

  // If it's a string (raw IR content), show line count
  if (typeof parsed === 'string') {
    const lines = parsed.split('\n').filter((l: string) => l.trim()).length
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Layers className="size-3.5" />
        <span>{lines} lines of IR content</span>
      </div>
    )
  }

  const blockCount = parsed.blocks?.length ?? 0
  const pageCount = parsed.blocks
    ? new Set(parsed.blocks.map((b: any) => b.page_number).filter(Boolean)).size || 1
    : 0

  const blockTypes = parsed.blocks
    ? Object.entries(
        parsed.blocks.reduce((acc: Record<string, number>, b: any) => {
          const type = b.type || 'unknown'
          acc[type] = (acc[type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      )
    : []

  const identifier = `doc-${parsed.document_id}-${instanceId.current}`

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    showArtifact(
      <DocumentPanel key={identifier} irData={parsed} documentId={parsed.document_id} />, 
      { title: 'Document Viewer', displayType: 'document', identifier }
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 rounded-xl border border-border p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors w-full">
        <div className="flex h-12 w-10 flex-shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
          <FileJson className="h-5 w-5" />
        </div>
        
        <div className="flex flex-1 flex-col truncate">
          <span className="text-sm font-medium text-foreground truncate">
            Document IR Structure
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <div className="flex items-center gap-1">
              <Layers className="size-3" />
              <span>{blockCount} blocks</span>
            </div>
            <div className="flex items-center gap-1">
              <FileStack className="size-3" />
              <span>{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleOpen}
          className="flex h-8 items-center justify-center rounded-md border border-border bg-background px-4 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex-shrink-0 shadow-sm"
        >
          Open
        </button>
      </div>

      {blockTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {blockTypes.map(([type, count]) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-[10px] text-muted-foreground border border-border/30"
            >
              <span className="size-1 rounded-full bg-emerald-500/40" />
              <span className="capitalize">{type}</span>: {count as number}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function parseMCPOutput(data: any): any {
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return data }
  }
  if (data?.content && Array.isArray(data.content)) {
    const text = data.content
      .filter((item: any) => item.type === 'text' && item.text)
      .map((item: any) => item.text)
      .join('')
    try { return JSON.parse(text) } catch { return text }
  }
  return data
}

export function ReadIrAutoOpen({ data, toolCallId }: { data: any; toolCallId?: string }) {
  const { showArtifact } = useArtifact();
  const hasAutoOpened = useRef(false);
  const instanceId = useRef(toolCallId || `auto-${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    if (!data) return;
    const parsed = parseMCPOutput(data);
    const blockCount = parsed.blocks?.length ?? 0;

    if (blockCount > 0 && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const identifier = `doc-${parsed.document_id}-${instanceId.current}`;
      showArtifact(
        <DocumentPanel key={identifier} irData={parsed} documentId={parsed.document_id} />, 
        { title: 'Document Viewer', displayType: 'document', identifier }
      );
    }
  }, [data, showArtifact]);

  return null;
}
