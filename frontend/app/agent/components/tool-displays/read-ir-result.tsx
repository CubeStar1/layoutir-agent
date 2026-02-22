'use client'

import { Layers, FileStack, ExternalLink } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useArtifact } from '../../hooks/use-artifact'
import { DocumentPanel } from '../document-panel'

export function ReadIrResult({ data }: { data: any }) {
  const { showArtifact } = useArtifact();

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

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground w-full">
      {blockCount > 0 && (
        <div className="flex items-center gap-1.5">
          <Layers className="size-3.5" />
          <span>{blockCount} blocks</span>
        </div>
      )}
      {pageCount > 0 && (
        <div className="flex items-center gap-1.5">
          <FileStack className="size-3.5" />
          <span>{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
        </div>
      )}
      {blockCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const uniqueKey = `doc-${parsed.document_id}-${Date.now()}`;
            showArtifact(
              <DocumentPanel key={uniqueKey} irData={parsed} documentId={parsed.document_id} />, 
              { title: 'Document Viewer', displayType: 'document', identifier: uniqueKey }
            );
          }}
          className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 transition-colors ml-auto"
        >
          <ExternalLink className="size-3" />
          <span>View Document</span>
        </button>
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

export function ReadIrAutoOpen({ data }: { data: any }) {
  const { showArtifact } = useArtifact();
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (!data) return;
    const parsed = parseMCPOutput(data);
    const blockCount = parsed.blocks?.length ?? 0;

    if (blockCount > 0 && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const uniqueKey = `auto-${parsed.document_id}-${Date.now()}`;
      showArtifact(
        <DocumentPanel key={uniqueKey} irData={parsed} documentId={parsed.document_id} />, 
        { title: 'Document Viewer', displayType: 'document', identifier: uniqueKey }
      );
    }
  }, [data, showArtifact]);

  return null;
}
